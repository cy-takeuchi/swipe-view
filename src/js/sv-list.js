(() => {
  'use strict';

  const saveLocalStorage = window.sv.saveLocalStorage;
  const lsListKey = window.sv.lsListKey;

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
  });

})();
