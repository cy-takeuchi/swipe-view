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

    let grouping = async () => {
        let res = await kintoneApp.getFormLayout(appId, true);
        let layout = res.layout;

        let itemList = [], item = {};
        for (let i of Object.keys(layout)) {
            let type = layout[i].type;
            if (type === 'GROUP' || type === 'SUBTABLE') {
                let fieldCode = layout[i].code;
                let obj = {
                    empty: true
                }
                item[fieldCode] = obj;
            } else if (type === 'ROW') {
                let fields = layout[i].fields;
                for (let j = 0; j < fields.length; j++) {
                    let fieldCode = fields[j].code;
                    let fieldType = fields[j].type;
                    let id = fields[j].elementId;
                    let obj = {
                        empty: true
                    }

                    if (fieldType === 'HR') {
                        continue;
                    }

                    if (fieldType === 'SPACER') {
                        if (Object.keys(item).length > 0) {
                            itemList.push(item);
                            item = {};
                        }
                    } else {
                        item[fieldCode] = obj;
                    }
                }
            }
        }

        if (Object.keys(item).length > 0) {
            itemList.push(item);
        }

        return itemList;
    }




    var config = kintone.plugin.app.getConfig(PLUGIN_ID);
    /*
    if (config.svSpace) {
        $svSpace.val(config.svSpace);
    }
    */

    $svForm.on('submit', (e) => {
        e.preventDefault();

        grouping().then((itemGroupList) => {
            let itemAllList = {};
            for (let i = 0; i < Object.keys(itemGroupList).length; i++) {
                Object.assign(itemAllList, itemGroupList[i]);
            }
            let svGroupListForRead = itemGroupList.concat(itemAllList);
            let svGroupListForWrite = svGroupListForRead.concat(itemAllList);

            let newConfig = {};
            //newConfig.svSpace = JSON.stringify($svSpace.val());
            newConfig.svGroupListForRead = JSON.stringify(svGroupListForRead);
            newConfig.svGroupListForWrite = JSON.stringify(svGroupListForWrite);

            let changeEventList = [];
            for (let key of Object.keys(itemAllList)) {
                changeEventList.push(`mobile.app.record.create.change.${key}`);
                changeEventList.push(`mobile.app.record.edit.change.${key}`);
            }
            newConfig.changeEventList = JSON.stringify(changeEventList);

            kintone.plugin.app.setConfig(newConfig, () => {
                alert('Please update the app!');
                window.location.href = getSettingsUrl();
            });
        });
    });
})(jQuery, kintone.$PLUGIN_ID);
