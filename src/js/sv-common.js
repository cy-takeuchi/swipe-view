((PLUGIN_ID) => {
    'use strict';

    let pluginConfig = {};
    try {
        pluginConfig = kintone.plugin.app.getConfig(PLUGIN_ID);
        for (let key of Object.keys(pluginConfig)) {
            pluginConfig[key] = JSON.parse(pluginConfig[key]);
        }
    } catch (e) {
        console.log(`[ERROR]: ${e}`);
        return;
    }

    const getAppId = () => {
        let id = kintone.mobile.app.getId();
        if (id === null) {
            id = kintone.app.getId();
        }

        return id;
    }

    const pickLocalStorage = (key) => {
        let data = localStorage.getItem(key);
        let result = null;
        if (data !== null) {
            result = JSON.parse(data);
        } else if (data === null && key === lsInitialKey) {
            result = 0;
        }

        return result;
    }

    const saveLocalStorage = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // 新規/編集画面で入力したフィールドの保存用
    let lsInputKey = '';
    const setLsInputKey = (recordId) => {
        if (recordId === undefined) {
            recordId = 0; // 新規画面の場合
        }
        lsInputKey = `sv-${subdomain}-${appId}-${recordId}-input`;
    }

    const getLsInputKey = () => {
        return lsInputKey;
    }

    const getPrettyDate = (unixTimestamp) => {
        let date = new Date(unixTimestamp);
        let y = date.getFullYear();
        let m = date.getMonth() + 1;
        let d = date.getDate();
        let w = date.getDay();
        let h = date.getHours();
        let mm = date.getMinutes();
        let wNames = ['日', '月', '火', '水', '木', '金', '土'];

        return `${y}年${m}月${d}日 (${wNames[w]}) ${h}時${mm}分`;
    }

    const isToday = (unixTimestamp1, unixTimestamp2) => {
        let date1 = new Date(unixTimestamp1);
        let date2 = new Date(unixTimestamp2);
        let y1 = date1.getFullYear();
        let y2 = date2.getFullYear();
        let m1 = date1.getMonth() + 1;
        let m2 = date2.getMonth() + 1;
        let d1 = date1.getDate();
        let d2 = date2.getDate();

        return (y1 === y2 && m1 === m2 && d1 === d2) ? true : false;
    }

    const isYesterday = (unixTimestamp1, unixTimestamp2) => {
        let date1 = new Date(unixTimestamp1);
        let date2 = new Date(unixTimestamp2);
        let y1 = date1.getFullYear();
        let y2 = date2.getFullYear();
        let m1 = date1.getMonth() + 1;
        let m2 = date2.getMonth() + 1;
        let d1 = date1.getDate();
        let d2 = date2.getDate();

        return (y1 === y2 && m1 === m2 && Math.abs(d1 - d2) === 1) ? true : false;
    }


    const conn = new kintoneJSSDK.Connection();
    const appId = getAppId();
    const subdomain = window.location.hostname.split('.')[0];
    const lsListKey = `sv-${subdomain}-${appId}-list`; // 一覧画面のレコードID保存用
    const lsInitialKey = `sv-${subdomain}-${appId}-initial`; // 詳細画面の項目番号保存用

    window.sv = window.sv || {};

    window.sv.pluginConfig = pluginConfig;
    window.sv.kintoneApp = new kintoneJSSDK.App(conn);
    window.sv.kintoneRecord = new kintoneJSSDK.Record(conn);
    window.sv.appId = appId;

    window.sv.pickLocalStorage = pickLocalStorage;
    window.sv.saveLocalStorage = saveLocalStorage;
    window.sv.lsListKey = lsListKey;
    window.sv.lsInitialKey = lsInitialKey;
    window.sv.setLsInputKey = setLsInputKey;
    window.sv.getLsInputKey = getLsInputKey;
    window.sv.getPrettyDate = getPrettyDate;
})(kintone.$PLUGIN_ID);
