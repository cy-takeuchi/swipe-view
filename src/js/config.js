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
        let res = await kintoneApp.getFormLayout(appId);
        let layout = res.layout;

        let itemList = [], item = {}, all = {};
        for (let i of Object.keys(layout)) {
            let type = layout[i].type;
            if (type === 'GROUP' || type === 'SUBTABLE') {
                let fieldCode = layout[i].code;
                let obj = {
                    empty: true
                }
                item[fieldCode] = obj;
                all[fieldCode] = obj;
            } else if (type === 'ROW') {
                let fields = layout[i].fields;
                for (let j = 0; j < fields.length; j++) {
                    let fieldCode = fields[j].code;
                    let fieldType = fields[j].type;
                    let id = fields[j].elementId;
                    let obj = {
                        empty: true
                    }

                    if (fieldType === 'SPACER') {
                        if (id === 'swipe') {
                            continue;
                        }
                    } else if (fieldType === 'HR') {
                        continue;
                    }

                    if (fieldType === 'SPACER') {
                        if (Object.keys(item).length > 0) {
                            itemList.push(item);
                            item = {};
                        }
                    } else {
                        item[fieldCode] = obj;
                        all[fieldCode] = obj;
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
    if (config.svSpace) {
        $svSpace.val(config.svSpace);
    }

    $svForm.on('submit', (e) => {
        e.preventDefault();

        grouping().then((itemGroupList) => {
            let itemAllList = itemGroupList.reduce((pre, current) => {
                return Object.assign(pre, current);
            });
            let svGroupListForRead = itemGroupList.concat(itemAllList);
            let svGroupListForWrite = svGroupListForRead.concat(itemAllList);

            let newConfig = {};
            newConfig.svSpace = $svSpace.val();
            newConfig.svGroupListForRead = JSON.stringify(svGroupListForRead);
            newConfig.svGroupListForWrite = JSON.stringify(svGroupListForWrite);
            console.log(newConfig);

            kintone.plugin.app.setConfig(newConfig, () => {
                alert('Please update the app!');
                window.location.href = getSettingsUrl();
            });
        });
    });
})(jQuery, kintone.$PLUGIN_ID);
