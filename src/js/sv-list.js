(() => {
  'use strict';

  const saveLocalStorage = window.sv.saveLocalStorage;
  const kintoneRecord = window.sv.kintoneRecord;
  const appId = window.sv.appId;
  const lsListKey = window.sv.lsListKey;
  const lsQueryKey = window.sv.lsQueryKey;
  const lsCountKey = window.sv.lsCountKey;

  const getRecords = (query) => {
    return kintoneRecord.getRecords(appId, query);
  };

  const getTotalCount = async () => {
    const res = await kintoneRecord.getRecords(appId, '$id > 0 limit 1', ['$id'], true);
    return Number(res.totalCount);
  };

  const indexShowEventList = [
    'mobile.app.record.index.show'
  ];
  kintone.events.on(indexShowEventList, (event) => {
    getRecords(kintone.mobile.app.getQueryCondition()).then((res) => {
      let recordIdList = [];
      for (const record of res.records) {
        recordIdList.unshift(Number(record.$id.value));
      }
      saveLocalStorage(lsListKey, recordIdList);
    });

    const match = location.href.match(/(#offset=)(\d+)/); // ブラウザがlookbehind対応していない
    let offset = 0;
    if (match !== null) {
      offset = Number(match[2]);
    }

    const query = `${kintone.mobile.app.getQuery()} limit 50 offset ${offset}`;
    saveLocalStorage(lsQueryKey, query);

    getTotalCount().then((count) => {
      saveLocalStorage(lsCountKey, count);
    });

    return event;
  });

})();
