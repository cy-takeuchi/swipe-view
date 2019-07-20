jQuery.noConflict();
(($) => {
  'use strict';

  const originalPluginConfig = window.sv.pluginConfig;
  const noInputsFieldOptionList = window.sv.noInputsFieldOptionList;
  const kintoneApp = window.sv.kintoneApp;
  const appId = window.sv.appId;
  const notCoveredFieldTypeList = window.sv.notCoveredFieldTypeList;

  const getSettingsUrl = () => {
    return `/k/admin/app/flow?app=${appId}`;
  };

  const insertToArray = (array, index, value) => {
    array.splice(index, 0, value);
  };

  const getFormFields = async () => {
    let res = await kintoneApp.getFormLayout(appId, true);
    const formLayoutList = res.layout;

    res = await kintoneApp.getFormFields(appId, 'DEFAULT', true);
    const fieldPropertyList = res.properties;

    /*
     * itemListは表（プラグイン設定画面の見た目）のデータ
     *   => テーブルのみ、グループのみ
     * groupListは裏（詳細画面で利用する）のデータ
     *   => テーブルのみ、グループのみ
     * noInputsは未入力項目用のデータ
     *   => テーブルのみ、グループのみ
     * requiredInputsは必須入力項目用のデータ
     *   => テーブルのみ、グループのみ
     */
    let itemList = [];
    let groupList = [{}];
    let noInputs = {};
    let requiredInputs = {};
    let num = 0;

    /*
     * changeイベントで利用するフィールドコードのデータ
     * テーブルはテーブルのみ、グループは配下のフィールドのみ
     */
    let fieldCodeListForChangeEvent = [];

    /*
    * changeイベントが発動しないので項目移動時に保存するフィールドコード
    */
    let notWorkChangeEventFieldCodeList = [];

    for (const formLayout of formLayoutList) {
      const rowType = formLayout.type;
      // グループ内フィールドはグループ配下と分かる状態で一覧に追加したい
      // サブテーブルはサブテーブル配下の必須入力状態でrequiredを設定したい
      if (rowType === 'GROUP') {
        let fieldCode = formLayout.code;
        let fieldLabel = fieldPropertyList[fieldCode].label;
        let fieldRequired = false;

        noInputs[fieldCode] = {
          fields: []
        };

        let fieldCodeListTwoDim = formLayout.layout.map(row => row.fields.map(field => field.code));
        let fieldCodeListOneDim = [].concat(...fieldCodeListTwoDim);
        let underFieldList = fieldCodeListOneDim.map(underFieldCode => fieldPropertyList[underFieldCode]);
        for (const underField of underFieldList) {
          itemList.push({
            num: num++,
            label: underField.label,
            code: underField.code,
            type: underField.type,
            column0: '×',
            underGroup: true
          });

          groupList[0][underField.code] = {
            shown: true
          };

          // グループ内フィールドに必須フィールドがあればグループを必須とする
          if (underField.required === true) {
            fieldRequired = true;
          }

          noInputs[fieldCode].fields.push(underField.code);
          noInputs[underField.code] = {
            shown: !noInputsFieldOptionList.includes(underField.type),
            group: fieldCode
          };

          if (noInputsFieldOptionList.includes(underField.type) === false) {
            requiredInputs[underField.code] = {
              shown: underField.required
            };
          } else if (noInputsFieldOptionList.includes(underField.type) === true) {
            requiredInputs[underField.code] = {
              shown: false
            };
          }
        }

        for (const row of formLayout.layout) {
          for (const field of row.fields) {
            if (noInputsFieldOptionList.includes(field.type) === false) {
              fieldCodeListForChangeEvent.push(field.code);
            }
          }
        }

        itemList.push({
          num: num++,
          label: fieldLabel,
          code: fieldCode,
          type: rowType,
          column0: '×',
          underGroup: false
        });

        groupList[0][fieldCode] = {
          shown: false
        };

        requiredInputs[fieldCode] = {
          shown: fieldRequired
        };
      } else if (rowType === 'SUBTABLE') {
        let fieldCode = formLayout.code;

        // サブテーブルはラベルがないのでサブテーブルとする
        let fieldLabel = 'サブテーブル';
        let fieldRequired = false;

        noInputs[fieldCode] = {
          shown: true
        };

        // サブテーブル内フィールドに必須フィールドがあればサブテーブルを必須とする
        let underFieldList = fieldPropertyList[fieldCode].fields;
        for (const underFieldCode of Object.keys(underFieldList)) {
          if (underFieldList[underFieldCode].required === true) {
            fieldRequired = true;
            break;
          }
        }

        fieldCodeListForChangeEvent.push(fieldCode);

        itemList.push({
          num: num++,
          label: fieldLabel,
          code: fieldCode,
          type: rowType,
          column0: '×',
          underGroup: false
        });

        groupList[0][fieldCode] = {
          shown: false
        };

        requiredInputs[fieldCode] = {
          shown: fieldRequired
        };
      } else if (rowType === 'ROW') {
        let fieldList = formLayout.fields;
        for (const field of fieldList) {
          let fieldType = field.type;
          if (notCoveredFieldTypeList.includes(fieldType) === true) {
            continue;
          }

          let fieldCode = field.code;
          let fieldProperty = fieldPropertyList[fieldCode];
          let fieldLabel = fieldProperty.label;
          let fieldRequired = fieldProperty.required;
          if (fieldRequired === undefined) {
            fieldRequired = false;
          }

          itemList.push({
            num: num++,
            label: fieldLabel,
            code: fieldCode,
            type: fieldType,
            column0: '×',
            underGroup: false
          });

          groupList[0][fieldCode] = {
            shown: false
          };

          noInputs[fieldCode] = {
            shown: !noInputsFieldOptionList.includes(fieldType)
          };

          requiredInputs[fieldCode] = {
            shown: fieldRequired
          };

          if (noInputsFieldOptionList.includes(fieldType) === false) {
            fieldCodeListForChangeEvent.push(fieldCode);
          }
        }
      }
    }

    let mappingFieldList = [];
    for (const fieldCode of Object.keys(fieldPropertyList)) {
      const fieldProperty = fieldPropertyList[fieldCode];

      if (fieldProperty.lookup !== undefined) {
        notWorkChangeEventFieldCodeList.push(fieldProperty.code);
        for (const fieldMapping of fieldProperty.lookup.fieldMappings) {
          mappingFieldList.push(fieldMapping.field);
        }
      }
    }

    // ルックアップフィールドのコピー先フィールドを除外する
    fieldCodeListForChangeEvent = fieldCodeListForChangeEvent.filter((fieldCode) => mappingFieldList.indexOf(fieldCode) === -1);

    return [itemList, groupList, noInputs, requiredInputs, fieldCodeListForChangeEvent, notWorkChangeEventFieldCodeList];
  };

  const createValueNames = (columnList) => {
    let valueNames = ['num', 'code', 'label', 'type'];
    for (const column of columnList) {
      valueNames.push(`column${column}`);
    }

    return valueNames;
  };

  const createListHeader = (columnList) => {
    let item = '<tr>';
    item += '<td class="num sv-display-none"></td>';
    item += '<td class="label"></td>';
    item += '<td class="code"></td>';
    item += '<td class="type"></td>';
    for (const column of columnList) {
      item += `<td><div class="column${column}"></div></td>`;
    }
    item += '</tr>';

    return item;
  };

  const changeMinusButton = () => {
    const $minusButtonList = $('div#sv-list span.sv-minus');
    const $plusButtonList = $('div#sv-list span.sv-plus');
    if ($minusButtonList.length === 1) {
      $minusButtonList.addClass('sv-display-none');
    } else if ($plusButtonList.length > 1) {
      $minusButtonList.removeClass('sv-display-none');
    }
  };

  const createThColumn = (num) => {
    let html = '';
    html += '<th nowrap>';
    html += `${num}<br />`;
    html += '<span class="sv-plus">+</span>';
    html += '<span class="sv-minus">-</span>';
    html += '</th>';

    return html;
  };

  const kUiSaveButton = new kintoneUIComponent.Button({
    text: 'Save',
    type: 'submit'
  });
  $('div#sv-save-button').append(kUiSaveButton.render());

  getFormFields().then((array) => {
    let [itemList, groupList, noInputs, requiredInputs, fieldCodeListForChangeEvent, notWorkChangeEventFieldCodeList] = array;

    let originalGroupList = originalPluginConfig.svGroupList;

    let columnNum = 0;
    let columnList = [];
    if (originalGroupList === undefined) { // プラグイン未設定の場合
      columnNum = 0;
      columnList = [columnNum];
      $('div#sv-list thead tr').append(createThColumn(0));
    } else { // プラグイン設定済みの場合
      let i = 0;
      for (; i < originalGroupList.length; i++) {
        columnList.push(i);
        $('div#sv-list thead tr').append(createThColumn(i));
      }
      columnNum = i - 1;

      // プラグイン設定時と現在のフィールドコードのリストを作成
      const fieldCodeList = $.merge(Object.keys(groupList[0]), Object.keys(originalGroupList[0]));
      const fieldCodeUniqueList = fieldCodeList.filter((ele, index) => fieldCodeList.indexOf(ele) === index);

      for (const [index, originalGroup] of originalGroupList.entries()) {
        for (const fieldCode of fieldCodeUniqueList) {
          let item = itemList.find(itemDetail => itemDetail.code === fieldCode);

          if (item === undefined) { // プラグイン設定後にフィールドを削除した場合
            delete originalGroup[fieldCode];
          } else if (item.underGroup === true) { // グループ配下のフィールドの場合
            originalGroup[fieldCode] = {shown: true};
          } else if (originalGroup[fieldCode] === undefined) { // プラグイン設定後にフィールドを追加した場合
            originalGroup[fieldCode] = {shown: false};
            item[`column${index}`] = '×';
          } else if (originalGroup[fieldCode].shown === true) {
            item[`column${index}`] = '〇';
          } else if (originalGroup[fieldCode].shown === false) {
            item[`column${index}`] = '×';
          }
        }
      }

      groupList = originalGroupList;
    }

    let options = {
      valueNames: createValueNames(columnList),
      item: createListHeader(columnList)
    };

    itemList = itemList.filter(item => item.underGroup === false); // グループ配下のフィールドを除く
    let list = new List('sv-list', options, itemList);

    changeMinusButton();

    const searchList = () => {
      const label = $('input#sv-search-label').val();
      const code = $('input#sv-search-code').val();
      const type = $('select#sv-search-type').val();

      const regexpLabel = new RegExp(label);
      const regexpCode = new RegExp(code);
      const regexpType = new RegExp(type);

      list.filter((item) => {
        if (item.values().label.search(regexpLabel) !== -1
          && item.values().code.search(regexpCode) !== -1
          && item.values().type.search(regexpType) !== -1) {
          return true;
        }
        return false;
      });
    };

    // columntList = [0, 3, 2, 1]で2列目（4番目に追加された列）がクリックされた場合
    // groupListは1を取得したい（クリックされた列番号）
    // itemListは3を取得したい（クリックされた列番号の値）
    $(document).on('click', 'div#sv-list td div', (e) => {
      const $target = $(e.currentTarget);
      const configIndex = $target.parent('td')[0].cellIndex - 4; // 設定項目列の前に4列存在するため

      let shown = true;
      let value = '〇';
      if ($target.text() === '〇') {
        shown = false;
        value = '×';
      }

      // 画面上
      $target.text(value);

      // groupList
      const fieldCode = $($target.parents('tr').children('td')[2]).text();
      groupList[configIndex][fieldCode] = {shown: shown};

      // itemList
      const itemIndex = columnList[configIndex];
      const num = $($target.parents('tr').children('td')[0]).text();
      const item = itemList.find(itemDetail => itemDetail.num === Number(num));
      item[`column${itemIndex}`] = value;
    });

    /*
    $(document).on('click', 'div#sv-list th', (e) => {
      list.filter((item) => {
        return item.values().column0 === '〇' ? true : false;
      });
    });
    */

    $(document).on('click', 'span.sv-plus', (e) => {
      list.clear();

      columnNum++;

      const $target = $(e.currentTarget);

      // テーブルヘッダー
      $target.parent('th').after(createThColumn(columnNum));
      changeMinusButton();

      // 何列目がクリックされたか
      const index = $target.parent('th')[0].cellIndex - 4; // 設定項目列の前に4列存在するため

      // groupList
      insertToArray(groupList, index + 1, $.extend(true, {}, groupList[index]));
      for (const fieldCode of Object.keys(groupList[index + 1])) {
        groupList[index + 1][fieldCode].shown = false; // groupListの初期化
      }

      // list
      insertToArray(columnList, index + 1, columnNum); // +はその列の後ろに追加するため
      options = {
        valueNames: createValueNames(columnList),
        item: createListHeader(columnList)
      };
      itemList.forEach((item) => {
        item[`column${columnNum}`] = '×'; // itemListの初期化
      });
      list = new List('sv-list', options, itemList);
      searchList();
    });

    // columntList = [0, 3, 2, 1]で3列目を削除する場合は[0, 3, 1]とする
    $(document).on('click', 'span.sv-minus', (e) => {
      list.clear();

      const $target = $(e.currentTarget);

      // 何列目がクリックされたか
      const index = $target.parent('th')[0].cellIndex - 4; // 設定項目列の前に4列存在するため

      const itemIndex = columnList[index];

      // テーブルヘッダー
      $target.parent('th').remove();
      changeMinusButton();

      // groupList
      groupList = groupList.filter((ele, i) => i !== index);

      // list
      columnList = columnList.filter((ele, i) => i !== index);
      options = {
        valueNames: createValueNames(columnList),
        item: createListHeader(columnList)
      };
      itemList.forEach((item) => {
        delete item[`column${itemIndex}`];
      });
      list = new List('sv-list', options, itemList);
      searchList();
    });

    $(document).on('keyup', 'input#sv-search-code,input#sv-search-label', searchList);
    $(document).on('change', 'select#sv-search-type', searchList);

    kUiSaveButton.on('click', (e) => {
      e.preventDefault();

      const newPluginConfig = {};
      newPluginConfig.svGroupList = JSON.stringify(groupList);
      newPluginConfig.svNoInputs = JSON.stringify(noInputs);
      newPluginConfig.svRequiredInputs = JSON.stringify(requiredInputs);
      newPluginConfig.notWorkChangeEventFieldCodeList= JSON.stringify(notWorkChangeEventFieldCodeList);

      const changeEventList = [];
      for (const fieldCodeForChangeEvent of fieldCodeListForChangeEvent) {
        changeEventList.push(`mobile.app.record.create.change.${fieldCodeForChangeEvent}`);
        changeEventList.push(`mobile.app.record.edit.change.${fieldCodeForChangeEvent}`);
      }
      newPluginConfig.changeEventList = JSON.stringify(changeEventList);

      kintone.plugin.app.setConfig(newPluginConfig, () => {
        alert('Please update the app!');
        window.location.href = getSettingsUrl();
      });
    });
  });
})(jQuery);
