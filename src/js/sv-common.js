(() => {
    'use strict';

    const getAppId = () => {
        let id = kintone.mobile.app.getId();
        if (id === null) {
            id = kintone.app.getId();
        }

        return id;
    }

    const pickLocalStorage = (key) => {
        let data = localStorage.getItem(key);
        let result = {}
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

    const conn = new kintoneJSSDK.Connection();
    const kintoneApp = new kintoneJSSDK.App(conn);
    const kintoneRecord = new kintoneJSSDK.Record(conn);
    const appId = getAppId();
    const subdomain = window.location.hostname.split('.')[0];
    const lsInputKey = `sv-${subdomain}-${appId}-input`; // 入力したフィールドの保存用
    const lsListKey = `sv-${subdomain}-${appId}-list`;   // 一覧画面のレコードID保存用
    const lsInitialKey = `sv-${subdomain}-${appId}-initial`; // 詳細画面の項目番号保存用

    const lsInputJson = pickLocalStorage(lsInputKey);
    const lsListJson = pickLocalStorage(lsListKey);
    const lsInitialNum = pickLocalStorage(lsInitialKey);

    window.sv = window.sv || {};

    window.sv.kintoneApp = kintoneApp;
    window.sv.kintoneRecord = kintoneRecord;
    window.sv.appId = appId;

    window.sv.saveLocalStorage = saveLocalStorage;
    window.sv.lsInputKey = lsInputKey;
    window.sv.lsInputJson = lsInputJson;
    window.sv.lsListKey = lsListKey;
    window.sv.lsListJson = lsListJson;
    window.sv.lsInitialKey = lsInitialKey;
    window.sv.lsInitialNum = lsInitialNum;
})();