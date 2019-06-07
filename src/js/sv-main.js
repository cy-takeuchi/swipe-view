jQuery.noConflict();
(($, PLUGIN_ID) => {
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

    const conn = new kintoneJSSDK.Connection();
    const kintoneApp = new kintoneJSSDK.App(conn);
    const appId = kintone.mobile.app.getId();
    const subdomain = window.location.hostname.split('.')[0];
    const lsInputKey = `sv-${subdomain}-${appId}-input`; // 入力したフィールドの保存用
    const lsListKey = `sv-${subdomain}-${appId}-list`;   // 一覧画面のレコードID保存用
    const lsInitialKey = `sv-${subdomain}-${appId}-initial`; // 詳細画面の項目番号保存用

    const swipeSpaceId = 'sv-swipe';
    const pagerId = 'sv-pager';

    let lsInputData = localStorage.getItem(lsInputKey);
    let lsInputJson = {};
    if (lsInputData !== null) {
        lsInputJson = JSON.parse(lsInputData);
    }

    let lsListData = localStorage.getItem(lsListKey);
    let lsListJson = {};
    if (lsListData !== null) {
        lsListJson = JSON.parse(lsListData);
    }

    let lsInitialData = localStorage.getItem(lsInitialKey);
    let lsInitialNum = 0;
    if (lsInitialData !== null) {
        lsInitialNum = JSON.parse(lsInitialData);
    }

    class Form {
        constructor() {
            this.groupList = [];
            this.noInputs = {};
            this.showMode = false;
        }

        change(current, before) {
            if (pager.isNoInputsPage(before) === true) {
                for (let fieldCode of Object.keys(this.groupList[current])) {
                    if (this.groupList[current][fieldCode].shown !== this.noInputs[fieldCode].empty) {
                        kintone.mobile.app.record.setFieldShown(fieldCode, this.groupList[current][fieldCode].shown);
                    }
                }
            } else {
                for (let fieldCode of Object.keys(this.groupList[current])) {
                    if (this.groupList[current][fieldCode].shown !== this.groupList[before][fieldCode].shown) {
                        kintone.mobile.app.record.setFieldShown(fieldCode, this.groupList[current][fieldCode].shown);
                    }
                }
            }
        }

        initialView(initialNum) {
            for (let fieldCode of Object.keys(this.groupList[initialNum])) {
                kintone.mobile.app.record.setFieldShown(fieldCode, this.groupList[initialNum][fieldCode].shown);
            }
        }

        // 未入力項目用
        noInputsView() {
            for (let fieldCode of Object.keys(this.noInputs)) {
                kintone.mobile.app.record.setFieldShown(fieldCode, this.noInputs[fieldCode].empty);
            }
        }

        input(fieldCode) {
            this.noInputs[fieldCode].empty = false;
        }

        empty(fieldCode) {
            this.noInputs[fieldCode].empty = true;
        }
    }

    class Pager {
        constructor(initialNum) {
            this.min = 0;
            this.max = 0;

            this.setCurrentPage(initialNum);

            this.showMode = false;
        }

        setShowMode(showMode) {
            this.showMode = showMode;
        }

        getShowMode() {
            return this.showMode;
        }

        setMax(max) {
            this.max = max;
        }

        getMax() {
            return this.max;
        }

        getNoInputsNum() {
            return (this.getShowMode() === true) ? null : this.max - 1;
        }

        isNoInputsPage(num) {
            return (num === this.getNoInputsNum()) ? true : false;
        }

        getCurrentPage() {
            return this.current;
        }

        setCurrentPage(num) {
            this.current = num;
        }

        initialView(lsInitialNum) {
            $(`ul#${pagerId} li`).eq(lsInitialNum).click();
        }

        show(el) {
            let max = this.getMax();
            if (this.getShowMode() === false) {
                max = this.getMax() - 1;
            }

            let html = '';
            html += '<div>';
            html += `<ul id="${pagerId}">`;
            for (let i = 0; i < max; i++) {
                html += `<li><a href="javascript:void(0)">${i + 1}</a></li>`;
            }

            if (this.getShowMode() === false) {
                html += `<li><a href="javascript:void(0)">未入力項目</a></li>`;
            }
            html += '</ul>';
            html += '</div>';

            $(el).append(html);
        }

        active(num) {
            $(`ul#${pagerId} li`).eq(num).addClass('sv-pager-active');
        }

        passive(num) {
            $(`ul#${pagerId} li`).eq(num).removeClass('sv-pager-active');
        }
    }

    let showSwipeViewForRead = (event) => {
        let el = kintone.mobile.app.getHeaderSpaceElement();

        pager.setShowMode(true);

        form.groupList = pluginConfig.svGroupList;
        pager.setMax(form.groupList.length);

        pager.show(el);
        pager.active(lsInitialNum);
        form.initialView(lsInitialNum);

        let html = `<div id="${swipeSpaceId}">ここをスワイプぅ</div>`;
        $(el).append(html);

        let mc = new Hammer(document.getElementById(swipeSpaceId), {domEvents: true});
        mc.get('swipe').set({direction: Hammer.DIRECTION_ALL});

        mc.on('swiperight', () => {
            console.log('swipe right');
            let before = pager.getCurrentPage();
            let current = before + 1;
            if (current >= pager.getMax()) {
                return;
            }

            form.change(current, before);

            pager.passive(before);
            pager.active(current);

            pager.setCurrentPage(current);
        });

        mc.on('swipeleft', () => {
            console.log('swipe left');
            let before = pager.getCurrentPage();
            let current = before - 1;
            if (current < 0) {
                return;
            }

            form.change(current, before);

            pager.passive(before);
            pager.active(current);

            pager.setCurrentPage(current);
        });

        mc.on('swipeup', () => {
            console.log('swipe up');
            let match = location.href.match(/(record=)(\d+)/); // ブラウザがlookbehind対応していない
            let recordId = Number(match[2]);
            let index = lsListJson.indexOf(recordId);
            let nextRecordId = lsListJson[index + 1];
            if (nextRecordId !== undefined) {
                // 選択している項目を次レコードの初期値として利用する
                localStorage.setItem(lsInitialKey, JSON.stringify(pager.getCurrentPage()));
                let newUrl = location.href.replace(/(record=)\d+/, 'record=' + nextRecordId);
                location.href = newUrl;
            }
        });

        mc.on('swipedown', () => {
            console.log('swipe down');
            let match = location.href.match(/(record=)(\d+)/); // ブラウザがlookbehind対応していない
            let recordId = Number(match[2]);
            let index = lsListJson.indexOf(recordId);
            let nextRecordId = lsListJson[index - 1];
            if (nextRecordId !== undefined) {
                // 選択している項目を次レコードの初期値として利用する
                localStorage.setItem(lsInitialKey, JSON.stringify(pager.getCurrentPage()));
                let newUrl = location.href.replace(/(record=)\d+/, 'record=' + nextRecordId);
                location.href = newUrl;
            }
        });

        return event;
    }

    let showSwipeViewForWrite = (event) => {
        let el = kintone.mobile.app.getHeaderSpaceElement();

        pager.setShowMode(false);

        form.groupList = pluginConfig.svGroupList;
        form.noInputs = pluginConfig.svNoInputs;
        pager.setMax(form.groupList.length + 1); // +1は未入力項目分

        pager.show(el);
        pager.active(lsInitialNum);
        form.initialView(lsInitialNum);

        if (lsInputData !== null) {
            $(el).append('<div>反映しますか？</div><span id="ok" style="padding: 10px;">OK</span><span id="ng" style="padding: 10px;">NG</span>');
        }

        let html = `<div id="${swipeSpaceId}">ここをスワイプぅ</div>`;
        $(el).append(html);

        let mc = new Hammer(document.getElementById(swipeSpaceId), {domEvents: true});
        mc.get('swipe').set({direction: Hammer.DIRECTION_HORIZONTAL});

        mc.on('swiperight', () => {
            console.log('swipe right');
            let before = pager.getCurrentPage();
            let current = before + 1;
            if (current >= pager.getMax()) {
                return;
            }

            if (pager.isNoInputsPage(current) === true) {
                form.noInputsView(current);
            } else {
                form.change(current, before);
            }

            pager.passive(before);
            pager.active(current);

            pager.setCurrentPage(current);
        });

        mc.on('swipeleft', () => {
            console.log('swipe left');
            let before = pager.getCurrentPage();
            let current = before - 1;
            if (current < 0) {
                return;
            }

            if (pager.isNoInputsPage(current) === true) {
                form.noInputsView(current);
            } else {
                form.change(current, before);
            }

            pager.passive(before);
            pager.active(current);

            pager.setCurrentPage(current);
        });

        $(document).on('click touchstart', 'span#ok', restore);

        return event;
    }

    let restore = () => {
        let record = kintone.mobile.app.record.get();
        for (let fieldCode of Object.keys(lsInputJson)) {
            record.record[fieldCode].value = lsInputJson[fieldCode];
            form.input(fieldCode, pager.getNoInputsNum());
        }
        kintone.events.off(changeEvent, change);
        kintone.mobile.app.record.set(record);
        kintone.events.on(changeEvent, change);
    }

    let change = (event) => {
        let value = event.changes.field.value;
        let fieldCode = event.type.replace(/.*\./, '');

        lsInputJson[fieldCode] = value;
        localStorage.setItem(lsInputKey, JSON.stringify(lsInputJson));

        if (value !== '' && value !== undefined) {
            form.input(fieldCode);
        } else {
            form.empty(fieldCode);
        }
    }



    let form = new Form();
    let pager = new Pager(lsInitialNum);



    let readEventList = [
        'mobile.app.record.detail.show'
    ];
    kintone.events.on(readEventList, showSwipeViewForRead);

    let writeEventList = [
        'mobile.app.record.create.show',
        'mobile.app.record.edit.show'
    ];
    kintone.events.on(writeEventList, showSwipeViewForWrite);



    let changeEvent = pluginConfig.changeEventList;
    kintone.events.on(changeEvent, change);



    let submitSuccessEventList = [
        'mobile.app.record.create.submit.success',
        'mobile.app.record.edit.submit.success'
    ];
    kintone.events.on(submitSuccessEventList, (event) => {
        localStorage.removeItem(lsInputKey);
        return event;
    });

    kintone.events.on(['mobile.app.record.index.show'], (event) => {
        let records = event.records;

        let recordIdList = [];
        for (let i = 0; i < records.length; i++) {
            recordIdList.unshift(Number(records[i].$id.value));
        }

        localStorage.setItem(lsListKey, JSON.stringify(recordIdList));
    });



    $(document).on('click', `ul#${pagerId} li`, (event) => {
        let before = pager.getCurrentPage();
        let current = $(event.currentTarget).index();

        if (pager.isNoInputsPage(current) === true) {
            form.noInputsView(current);
        } else {
            form.change(current, before);
        }

        pager.passive(before);
        pager.active(current);

        pager.setCurrentPage(current);
    });

})(jQuery, kintone.$PLUGIN_ID);
