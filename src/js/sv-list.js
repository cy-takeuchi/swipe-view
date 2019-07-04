(() => {
  'use strict';

  const saveLocalStorage = window.sv.saveLocalStorage;
  const lsListKey = window.sv.lsListKey;
  const lsQueryKey = window.sv.lsQueryKey;

  const indexShowEventList = [
    'mobile.app.record.index.show'
  ];
  kintone.events.on(indexShowEventList, (event) => {
    const records = event.records;

    let recordIdList = [];
    for (let record of records) {
      recordIdList.unshift(Number(record.$id.value));
    }

    saveLocalStorage(lsListKey, recordIdList);

    const match = location.href.match(/(#offset=)(\d+)/); // ブラウザがlookbehind対応していない
    let offset = 0;
    if (match !== null) {
      offset = Number(match[2]);
    }

    const query = `${kintone.mobile.app.getQuery()} limit 50 offset ${offset}`;
    saveLocalStorage(lsQueryKey, query);
  });

})();
