((PLUGIN_ID) => {
  'use strict';

  const subdomain = window.location.hostname.split('.')[0];

  const getAppId = () => {
    let id = kintone.mobile.app.getId();
    if (id === null) {
      id = kintone.app.getId();
    }

    return id;
  };
  const appId = getAppId();

  const lsListKey = `sv-${subdomain}-${appId}-list`; // 一覧画面のレコードID保存用
  const lsInitialKey = `sv-${subdomain}-${appId}-initial`; // 詳細画面の項目番号保存用

  let pluginConfig = {};
  try {
    pluginConfig = kintone.plugin.app.getConfig(PLUGIN_ID);
    for (let key of Object.keys(pluginConfig)) {
      pluginConfig[key] = JSON.parse(pluginConfig[key]);
    }
  } catch (err) {
    console.log('[ERROR]', err);
    throw new Error(err);
  }

  /*
   * フィールドコードがなく、本プラグインが対象外とするフィールドタイプ
   */
  const notCoveredFieldTypeList = [
    'HR',
    'SPACER',
    'LABEL'
  ];

  /*
   * 入力できないので未入力項目に表示しないフィールドタイプ
   */
  const noInputsFieldOptionList = [
    'RECORD_NUMBER',
    'CREATED_TIME',
    'CREATOR',
    'UPDATED_TIME',
    'MODIFIER',
    'REFERENCE_TABLE'
  ];

  /*
   * changeイベントが発動しないので項目移動時に保存するフィールドタイプ
   */
  const notWorkChangeEventFieldTypeList = [
    'SUBTABLE',
    'MULTI_LINE_TEXT',
    'RICH_TEXT',
    'LINK'
  ];


  const pickLocalStorage = (key) => {
    const data = localStorage.getItem(key);
    let result = null;
    if (data !== null) {
      result = JSON.parse(data);
    } else if (data === null && key === lsInitialKey) {
      result = 0;
    }

    return result;
  };

  const saveLocalStorage = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // 新規/編集画面で入力したフィールドの保存用
  let lsInputKey = '';
  const setLsInputKey = (recordId) => {
    if (recordId === undefined) {
      lsInputKey = `sv-${subdomain}-${appId}-0-input`; // 新規画面の場合
    } else {
      lsInputKey = `sv-${subdomain}-${appId}-${recordId}-input`; // 編集画面の場合
    }
  };

  const getLsInputKey = () => {
    return lsInputKey;
  };

  const getPrettyDate = (unixTimestamp) => {
    const date = new Date(unixTimestamp);
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const w = date.getDay();
    const h = date.getHours();
    const mm = date.getMinutes();
    const wNames = ['日', '月', '火', '水', '木', '金', '土'];

    return `${y}年${m}月${d}日 (${wNames[w]}) ${h}時${mm}分`;
  };

  const isToday = (unixTimestamp1, unixTimestamp2) => {
    const date1 = new Date(unixTimestamp1);
    const date2 = new Date(unixTimestamp2);
    const y1 = date1.getFullYear();
    const y2 = date2.getFullYear();
    const m1 = date1.getMonth() + 1;
    const m2 = date2.getMonth() + 1;
    const d1 = date1.getDate();
    const d2 = date2.getDate();

    return (y1 === y2 && m1 === m2 && d1 === d2);
  };

  const isYesterday = (unixTimestamp1, unixTimestamp2) => {
    const date1 = new Date(unixTimestamp1);
    const date2 = new Date(unixTimestamp2);
    const y1 = date1.getFullYear();
    const y2 = date2.getFullYear();
    const m1 = date1.getMonth() + 1;
    const m2 = date2.getMonth() + 1;
    const d1 = date1.getDate();
    const d2 = date2.getDate();

    return (y1 === y2 && m1 === m2 && Math.abs(d1 - d2) === 1);
  };

  window.sv = window.sv || {};

  window.sv.pluginConfig = pluginConfig;
  window.sv.notCoveredFieldTypeList = notCoveredFieldTypeList;
  window.sv.noInputsFieldOptionList = noInputsFieldOptionList;
  window.sv.notWorkChangeEventFieldTypeList = notWorkChangeEventFieldTypeList;

  window.sv.kintoneApp = new kintoneJSSDK.App();
  window.sv.kintoneRecord = new kintoneJSSDK.Record();
  window.sv.appId = appId;

  window.sv.pickLocalStorage = pickLocalStorage;
  window.sv.saveLocalStorage = saveLocalStorage;
  window.sv.lsListKey = lsListKey;
  window.sv.lsInitialKey = lsInitialKey;
  window.sv.setLsInputKey = setLsInputKey;
  window.sv.getLsInputKey = getLsInputKey;
  window.sv.getPrettyDate = getPrettyDate;
  window.sv.isToday = isToday;
  window.sv.isYesterday = isYesterday;
})(kintone.$PLUGIN_ID);
