jQuery.noConflict();
(($, PLUGIN_ID) => {
    'use strict';

    let getRecords = async (query) => {
        let res = await window.sv.kintoneRecord.getRecords(window.sv.appId, query);
        return res;
    }

    kintone.events.on(['mobile.app.record.index.show'], (event) => {
        let records = event.records;

        let recordIdList = [];
        for (let i = 0; i < records.length; i++) {
            recordIdList.unshift(Number(records[i].$id.value));
        }

        window.sv.saveLocalStorage(window.sv.lsListKey, recordIdList);

        if (event.viewId !== 5698734) {
            return event;
        }
        console.log('kokokara customize view');
    });

})(jQuery, kintone.$PLUGIN_ID);
