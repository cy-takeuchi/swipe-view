jQuery.noConflict();
(($) => {
    'use strict';

    const originalPluginConfig = window.sv.pluginConfig;
    const noInputsFieldOptionList = window.sv.noInputsFieldOptionList;

    let getSettingsUrl = () => {
        return '/k/admin/app/flow?app=' + window.sv.appId;
    }

    let insertToArray = (array, index, value) => {
        array.splice(index, 0, value);
    }

    let getFormFields = async () => {
        let res = await window.sv.kintoneApp.getFormLayout(window.sv.appId, true);
        let formLayoutList = res.layout;

        res = await window.sv.kintoneApp.getFormFields(window.sv.appId, 'DEFAULT', true);
        let fieldPropertyList = res.properties;

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
        let itemList = [], groupList = [{}], noInputs = {}, requiredInputs = {}, num = 0;

        /*
         * changeイベントで利用するフィールドコードのデータ
         * テーブルはテーブルのみ、グループは配下のフィールドのみ
         */
        let fieldCodeListForChangeEvent = [];

        for (let i of Object.keys(formLayoutList)) {
            let formLayout = formLayoutList[i];
            let rowType = formLayout.type;
            if (rowType === 'GROUP' || rowType === 'SUBTABLE') {
                // グループ内フィールドはグループ配下と分かる状態で一覧に追加したい
                // サブテーブルはサブテーブル配下の必須入力状態でrequiredを設定したい
                let fieldCode = formLayout.code;
                let fieldProperty = fieldPropertyList[fieldCode];

                let fieldLabel = '';
                let fieldRequired = false;
                if (rowType === 'GROUP') {
                    fieldLabel = fieldProperty.label;

                    noInputs[fieldCode] = {
                        fields: []
                    };

                    // グループ内フィールドに必須フィールドがあればグループを必須とする
                    let fieldCodeListTwoDim = formLayout.layout.map(row => row.fields.map(field => field.code));
                    let fieldCodeListOneDim = [].concat(...fieldCodeListTwoDim);
                    let underFieldList = fieldCodeListOneDim.map(fieldCode => fieldPropertyList[fieldCode]);
                    for (let underField of underFieldList) {
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

                        // noInputsFieldOptionListの場合、.requiredはundefinedになる
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
                            }
                        } else if (noInputsFieldOptionList.includes(underField.type) === true) {
                            requiredInputs[underField.code] = {
                                shown: false
                            }
                        }
                    }

                    formLayout.layout.map(row => row.fields.map(field => {
                        if (noInputsFieldOptionList.includes(field.type) === false) {
                            fieldCodeListForChangeEvent.push(field.code);
                        }
                    }));
                } else if (rowType === 'SUBTABLE') {
                    // サブテーブルはラベルがないのでサブテーブルとする
                    fieldLabel = 'サブテーブル';

                    noInputs[fieldCode] = {
                        shown: true
                    };

                    // サブテーブル内フィールドに必須フィールドがあればサブテーブルを必須とする
                    let underFieldList = fieldProperty.fields;
                    for (let underFieldCode of Object.keys(underFieldList)) {
                        if (underFieldList[underFieldCode].required === true) {
                            fieldRequired = true;
                            break;
                        }
                    }

                    fieldCodeListForChangeEvent.push(fieldCode);
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
            } else if (rowType === 'ROW') {
                let fieldList = formLayout.fields;
                for (let j = 0; j < fieldList.length; j++) {
                    let fieldType = fieldList[j].type;
                    if (fieldType === 'HR' || fieldType === 'SPACER') {
                        continue;
                    }

                    let fieldCode = fieldList[j].code;
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

        return [itemList, groupList, noInputs, requiredInputs, fieldCodeListForChangeEvent];
    }

    let createValueNames = (columnList) => {
        let valueNames = ['num', 'code', 'label', 'type'];
        for (let column of columnList) {
            valueNames.push(`column${column}`);
        }

        return valueNames;
    }

    let createListHeader = (columnList) => {
        let item = '<tr>';
        item += '<td class="num sv-display-none"></td>';
        item += '<td class="label"></td>';
        item += '<td class="code"></td>';
        item += '<td class="type"></td>';
        for (let column of columnList) {
            item += `<td><div class="column${column}"></div></td>`;
        }
        item += '</tr>';

        return item;
    }

    let changeMinusButton = () => {
        let $minusButtonList = $('div#sv-list span.sv-minus');
        let $plusButtonList = $('div#sv-list span.sv-plus');
        if ($minusButtonList.length === 1) {
            $minusButtonList.addClass('sv-display-none');
        } else if ($plusButtonList.length > 1) {
            $minusButtonList.removeClass('sv-display-none');
        }
    }

    let createThColumn = (num) => {
        let html = '';
        html += '<th nowrap>';
        html += num + '<br />';
        html += '<span class="sv-plus">+</span>';
        html += '<span class="sv-minus">-</span>';
        html += '</th>';

        return html;
    }

    let saveButton = new kintoneUIComponent.Button({
        text: 'Save',
        type: 'submit'
    });
    $('div#sv-save').append(saveButton.render());

    getFormFields().then((array) => {
        let itemList = array[0];
        let groupList = array[1];
        let noInputs = array[2];
        let requiredInputs = array[3];

        let fieldCodeListForChangeEvent = array[4];

        let originalGroupList = originalPluginConfig.svGroupList;

        let columnNum = 0, columnList = [];
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
            let fieldCodeList = $.merge(Object.keys(groupList[0]), Object.keys(originalGroupList[0]));
            let fieldCodeUniqueList = fieldCodeList.filter((ele, i) => fieldCodeList.indexOf(ele) === i);

            for (let j = 0; j < originalGroupList.length; j++) {
                for (let fieldCode of fieldCodeUniqueList) {
                    let item = itemList.find(item => item.code === fieldCode);

                    if (item === undefined) { // プラグイン設定後にフィールドを削除した場合
                        delete originalGroupList[j][fieldCode];
                    } else if (item.underGroup === true) { // グループ配下のフィールドの場合
                        originalGroupList[j][fieldCode] = {shown: true};
                    } else if (originalGroupList[j][fieldCode] === undefined) { // プラグイン設定後にフィールドを追加した場合
                        originalGroupList[j][fieldCode] = {shown: false};
                        item[`column${j}`] = '×';
                    } else if (originalGroupList[j][fieldCode].shown === true) {
                        item[`column${j}`] = '〇';
                    } else if (originalGroupList[j][fieldCode].shown === false) {
                        item[`column${j}`] = '×';
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

        // columntList = [0, 3, 2, 1]で2列目（4番目に追加された列）がクリックされた場合
        // groupListは1を取得したい（クリックされた列番号）
        // itemListは3を取得したい（クリックされた列番号の値）
        $(document).on('click', 'div#sv-list td div', (e) => {
            let $target = $(e.currentTarget);
            let configIndex = $target.parent('td')[0].cellIndex - 4; // 設定項目列の前に4列存在するため

            let shown = true;
            let value = '〇';
            if ($target.text() === '〇') {
                shown = false;
                value = '×';
            }

            // 画面上
            $target.text(value);

            // groupList
            let fieldCode = $($target.parents('tr').children('td')[2]).text();
            groupList[configIndex][fieldCode] = {shown: shown};

            // itemList
            let itemIndex = columnList[configIndex];
            let num = $($target.parents('tr').children('td')[0]).text();
            let item = itemList.find(item => item.num === Number(num));
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

            let $target = $(e.currentTarget);

            // テーブルヘッダー
            $target.parent('th').after(createThColumn(columnNum));
            changeMinusButton();

            // 何列目がクリックされたか
            let index = $target.parent('th')[0].cellIndex - 4; // 設定項目列の前に4列存在するため

            // groupList
            insertToArray(groupList, index + 1, $.extend(true, {}, groupList[index]));
            for (let fieldCode of Object.keys(groupList[index + 1])) {
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

            let $target = $(e.currentTarget);

            // 何列目がクリックされたか
            let index = $target.parent('th')[0].cellIndex - 4; // 設定項目列の前に4列存在するため

            let itemIndex = columnList[index];

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

        let searchList = () => {
            let label = $('input#sv-search-label').val();
            let code = $('input#sv-search-code').val();
            let type = $('select#sv-search-type').val();

            let regexpLabel = new RegExp(label);
            let regexpCode = new RegExp(code);
            let regexpType = new RegExp(type);

            list.filter((item) => {
                if (item.values().label.search(regexpLabel) !== -1
                    && item.values().code.search(regexpCode) !== -1
                    && item.values().type.search(regexpType) !== -1) {
                    return true;
                } else {
                    return false;
                }
            });
        }
        $(document).on('keyup', 'input#sv-search-code,input#sv-search-label', searchList);
        $(document).on('change', 'select#sv-search-type', searchList);

        saveButton.on('click', (e) => {
            e.preventDefault();

            let newPluginConfig = {};
            newPluginConfig.svGroupList = JSON.stringify(groupList);
            newPluginConfig.svNoInputs = JSON.stringify(noInputs);
            newPluginConfig.svRequiredInputs = JSON.stringify(requiredInputs);

            let changeEventList = [];
            for (let fieldCodeForChangeEvent of fieldCodeListForChangeEvent) {
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
