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

        let itemList = [], groupList = [], num = 0;
        groupList[0] = {};
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

                itemList.push({
                    num: num,
                    label: fieldLabel,
                    code: fieldCode,
                    type: type,
                    //required: fieldRequired,
                    column0: '×'
                });

                groupList[0][fieldCode].value = {
                    //required: fieldRequired,
                    //empty: true,
                    value: '×'
                };

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

                    itemList.push({
                        num: num,
                        label: fieldLabel,
                        code: fieldCode,
                        type: fieldType,
                        //required: fieldRequired,
                        column0: '×'
                    });

                    groupList[0][fieldCode] = {
                        //required: fieldRequired,
                        //empty: true,
                        shown: false
                    };

                    num++;
                }
            }
        }

        return [itemList, groupList];
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

    let pluginConfig = kintone.plugin.app.getConfig(PLUGIN_ID);
    let originalGroupList = JSON.parse(pluginConfig.svGroupList);
    console.log('save data', originalGroupList);
    //return false;

    let saveButton = new kintoneUIComponent.Button({
        text: 'Save',
        type: 'submit'
    });
    $('div#sv-save').append(saveButton.render());

    getFormFields().then((array) => {
        let itemList = array[0];
        let groupList = array[1];

        let columnNum = 0;
        let columnList = [columnNum];
        let options = {
            valueNames: createValueNames(columnList),
            item: createListHeader(columnList)
        };

        let list = new List('sv-list', options, itemList);

        // columntList = [0, 3, 2, 1]で2列目（4番目に追加された列）がクリックされた場合
        // groupListは1を取得したい（クリックされた列番号）
        // itemListは3を取得したい（クリックされた列番号の値）
        $(document).on('click', 'div#sv-list td div', (e) => {
            let $target = $(e.currentTarget);
            $target.text('〇'); // 画面上のデータを更新

            let configIndex = $target.parent('td')[0].cellIndex - 4; // 設定項目列の前に4列存在するため

            // groupList
            let fieldCode = $($target.parents('tr').children('td')[2]).text();
            if (groupList[configIndex][fieldCode] === undefined) {
                groupList[configIndex][fieldCode] = {};
                groupList[configIndex][fieldCode].shown = true;
            } else {
                groupList[configIndex][fieldCode].shown = true; // groupListのデータを更新
            }

            // itemList
            let itemIndex = columnList[configIndex];
            let num = $($target.parents('tr').children('td')[0]).text();
            let item = itemList.find(item => item.num === Number(num));
            item[`column${itemIndex}`] = '〇'; // itemListのデータを更新
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

            // テーブルヘッダー
            let $target = $(e.currentTarget);
            $target.parent('th').after(`<th>${columnNum}<span class="sv-minus">-</span><span class="sv-plus">+</span></th>`);

            // 何列目がクリックされたか
            let index = $target.parent('th')[0].cellIndex - 4; // 設定項目列の前に4列存在するため

            // groupList
            insertToArray(groupList, index + 1, $.extend(true, {}, groupList[index]));
            for (let k of Object.keys(groupList[index + 1])) {
                groupList[index + 1][k].shown = false; // groupListの初期化
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
        });

        $(document).on('keyup', 'input.sv-search', (e) => {
            let $target = $(e.currentTarget);
            list.search($target.val(), ['code', 'label']);
        });


        $('div#sv-save').on('click', (e) => {
            e.preventDefault();

            let newPluginConfig = {};
            newPluginConfig.svGroupList = JSON.stringify(groupList);

            // 未入力項目用の列を追加
            let noInputs = $.extend(true, {}, groupList[0]);
            for (let fieldCode of Object.keys(noInputs)) {
                delete noInputs[fieldCode].shown;
                noInputs[fieldCode].empty = true;
            }
            newPluginConfig.svNoInputs = JSON.stringify(noInputs);

            let changeEventList = [];
            for (let fieldCode of Object.keys(groupList[0])) {
                changeEventList.push(`mobile.app.record.create.change.${fieldCode}`);
                changeEventList.push(`mobile.app.record.edit.change.${fieldCode}`);
            }

            newPluginConfig.changeEventList = JSON.stringify(changeEventList);

            kintone.plugin.app.setConfig(newPluginConfig, () => {
                alert('Please update the app!');
                window.location.href = getSettingsUrl();
            });
        });
    });
})(jQuery, kintone.$PLUGIN_ID);
