jQuery.noConflict();
(($, PLUGIN_ID) => {
    'use strict';

    const conn = new kintoneJSSDK.Connection();
    const kintoneApp = new kintoneJSSDK.App(conn);
    const appId = kintone.app.getId();

    var $svForm = $('#sv-form');
    var $svSpace = $('#sv-space');

    let getSettingsUrl = () => {
        return '/k/admin/app/flow?app=' + appId;
    }

    let insertToArray = (array, index, value) => {
        array.splice(index, 0, value);
    }

    let getFormFields = async () => {
        let res = await kintoneApp.getFormLayout(appId, true);
        let formLayoutList = res.layout;

        res = await kintoneApp.getFormFields(appId, 'DEFAULT', true);
        let fieldPropertyList = res.properties;

        let itemList = [], configList = [], num = 0;
        configList[0] = {};
        for (let i of Object.keys(formLayoutList)) {
            let type = formLayoutList[i].type;
            if (type === 'GROUP' || type === 'SUBTABLE') {
                // グループ内フィールドはグループ配下と分かる状態で一覧に追加したい
                // サブテーブルはサブテーブル配下の必須入力状態でrequiredを設定したい
                let fieldCode = formLayoutList[i].code;
                let fieldLabel = fieldPropertyList[fieldCode].label;
                if (type === 'SUBTABLE' && fieldLabel === undefined) {
                    fieldLabel = 'サブテーブル';
                }
                let fieldRequired = fieldPropertyList[fieldCode].required;

                let item = {
                    num: num,
                    label: fieldLabel,
                    code: fieldCode,
                    type: type,
                    //required: fieldRequired,
                    flag0: '×'
                }
                itemList.push(item);

                let config = {
                    //required: fieldRequired,
                    //empty: true,
                    value: '×'
                }
                configList[0][fieldCode] = config;

                num++;
            } else if (type === 'ROW') {
                let fieldList = formLayoutList[i].fields;
                for (let j = 0; j < fieldList.length; j++) {
                    let fieldType = fieldList[j].type;
                    if (fieldType === 'HR' || fieldType === 'SPACER') {
                        continue;
                    }

                    let fieldCode = fieldList[j].code;
                    let fieldLabel = fieldPropertyList[fieldCode].label;
                    let fieldRequired = fieldPropertyList[fieldCode].required;

                    let item = {
                        num: num,
                        label: fieldLabel,
                        code: fieldCode,
                        type: fieldType,
                        //required: fieldRequired,
                        flag0: '×'
                    }
                    itemList.push(item);

                    let config = {
                        //required: fieldRequired,
                        //empty: true,
                        shown: false
                    }
                    configList[0][fieldCode] = config;

                    num++;
                }
            }
        }

        return [itemList, configList];
    }

    let createValueNames = (columnList) => {
        let valueNames = ['num', 'code', 'label', 'type'];
        for (let column of columnList) {
            valueNames.push(`flag${column}`);
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
            item += `<td><div class="flag${column}"></div></td>`;
        }
        item += '</tr>';

        return item;
    }

    var config = kintone.plugin.app.getConfig(PLUGIN_ID);

    let saveButton = new kintoneUIComponent.Button({
        text: 'Save',
        type: 'submit'
    });
    $('div#sv-save').append(saveButton.render());

    getFormFields().then((array) => {
        let itemList = array[0];
        let configList = array[1];

        let columnNum = 0;
        let columnList = [columnNum];
        let options = {
            valueNames: createValueNames(columnList),
            item: createListHeader(columnList)
        };

        let list = new List('sv-list', options, itemList);

        // columntList = [0, 3, 2, 1]で2列目（4番目に追加された列）がクリックされた場合
        // configListは1を取得したい（クリックされた列番号）
        // itemListは3を取得したい（クリックされた列番号の値）
        $(document).on('click', 'div#sv-list td div', (e) => {
            let $target = $(e.currentTarget);
            $target.text('〇'); // 画面上のデータを更新

            let configIndex = $target.parent('td')[0].cellIndex - 4; // 設定項目列の前に4列存在するため

            // configList
            let fieldCode = $($target.parents('tr').children('td')[2]).text();
            if (configList[configIndex][fieldCode] === undefined) {
                configList[configIndex][fieldCode] = {};
                configList[configIndex][fieldCode].shown = true;
            } else {
                configList[configIndex][fieldCode].shown = true; // configListのデータを更新
            }

            // itemList
            let itemIndex = columnList[configIndex];
            let num = $($target.parents('tr').children('td')[0]).text();
            let item = itemList.find(item => item.num === Number(num));
            item[`flag${itemIndex}`] = '〇'; // itemListのデータを更新
        });

        /*
        $(document).on('click', 'div#sv-list th', (e) => {
            list.filter((item) => {
                return item.values().flag0 === '〇' ? true : false;
            });
        });
        */

        $(document).on('click', 'span.sv-plus', (e) => {
            list.clear();

            columnNum++;

            // テーブルヘッダー
            let $target = $(e.currentTarget);
            $target.parent('th').after(`<th>${columnNum}<span class="sv-minus">-</span><span class="sv-plus">+</span></th>`);

            // 何列目がクリックされたか
            let index = $target.parent('th')[0].cellIndex - 4; // 設定項目列の前に4列存在するため

            // configList
            insertToArray(configList, index + 1, $.extend(true, {}, configList[index]));
            for (let k of Object.keys(configList[index + 1])) {
                configList[index + 1][k].shown = false; // configListの初期化
            }

            // list
            insertToArray(columnList, index + 1, columnNum); // +はその列の後ろに追加するため
            options = {
                valueNames: createValueNames(columnList),
                item: createListHeader(columnList)
            };
            itemList.forEach((item) => {
                item[`flag${columnNum}`] = '×'; // itemListの初期化
            });
            list = new List('sv-list', options, itemList);
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

            // configList
            configList = configList.filter((ele, i) => i !== index);

            // list
            columnList = columnList.filter((ele, i) => i !== index);
            options = {
                valueNames: createValueNames(columnList),
                item: createListHeader(columnList)
            };
            itemList.forEach((item) => {
                delete item[`flag${itemIndex}`];
            });
            list = new List('sv-list', options, itemList);
        });

        $(document).on('keyup', 'input.sv-search', (e) => {
            let $target = $(e.currentTarget);
            list.search($target.val(), ['code', 'label']);
        });


        $('div#sv-save').on('click', (e) => {
            e.preventDefault();

            let newConfig = {};
            newConfig.svGroupList = JSON.stringify(configList);

            // 未入力項目用の列を追加
            let noInputs = $.extend(true, {}, configList[0]);
            for (let fieldCode of Object.keys(noInputs)) {
                delete noInputs[fieldCode].shown;
                noInputs[fieldCode].empty = true;
            }
            newConfig.svNoInputs = JSON.stringify(noInputs);

            let changeEventList = [];
            for (let fieldCode of Object.keys(configList[0])) {
                changeEventList.push(`mobile.app.record.create.change.${fieldCode}`);
                changeEventList.push(`mobile.app.record.edit.change.${fieldCode}`);
            }

            newConfig.changeEventList = JSON.stringify(changeEventList);

            kintone.plugin.app.setConfig(newConfig, () => {
                alert('Please update the app!');
                window.location.href = getSettingsUrl();
            });
        });
    });
})(jQuery, kintone.$PLUGIN_ID);
