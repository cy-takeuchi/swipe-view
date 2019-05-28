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

    const swipeSpaceId = 'cy-swipe';
    const listId = 'cy-ul';

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

    class Form {
        constructor() {
            this.groupList = [];
            this.showMode = false;
        }

        active(num) {
            for (let fieldCode of Object.keys(this.groupList[num])) {
                kintone.mobile.app.record.setFieldShown(fieldCode, true);
            }
        }

        passive(num) {
            for (let fieldCode of Object.keys(this.groupList[num])) {
                kintone.mobile.app.record.setFieldShown(fieldCode, false);
            }
        }

        // 初期表示用
        first(num) {
            // 最初のグループリストは表示するから開始は1
            // 未入力項目以前が対象
            for (let i = 1; i < num; i++) {
                let group = this.groupList[i];
                for (let fieldCode of Object.keys(this.groupList[i])) {
                    kintone.mobile.app.record.setFieldShown(fieldCode, false);
                }
            }
        }

        // 未入力項目用
        noInputs(num) {
            for (let fieldCode of Object.keys(this.groupList[num])) {
                if (this.groupList[num][fieldCode].empty === true) {
                    kintone.mobile.app.record.setFieldShown(fieldCode, true);
                } else if (this.groupList[num][fieldCode].empty === false) {
                    kintone.mobile.app.record.setFieldShown(fieldCode, false);
                }
            }
        }

        input(fieldCode, noInputsNum) {
            this.groupList[noInputsNum][fieldCode].empty = false;
        }

        empty(fieldCode, noInputsNum) {
            this.groupList[noInputsNum][fieldCode].empty = true;
        }
    }

    class Pager {
        constructor(id) {
            this.id = id;
            this.el = `ul#${id} li`;

            this.current = 0;
            this.min = 0;
            this.max = 0;

            this.setCurrentPage(0);

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

        getNormalNum() {
            return (this.getShowMode() === true) ? this.max - 1 : this.max - 2;
        }

        getNoInputsNum() {
            return (this.getShowMode() === true) ? null : this.max - 2;
        }

        isNoInputsPage(num) {
            return (num === this.getNoInputsNum()) ? true : false;
        }

        isAllPage(num) {
            return (num === this.max - 1) ? true : false;
        }

        getCurrentPage() {
            return this.current;
        }

        setCurrentPage(num) {
            this.current = num;
        }

        init() {
            $(this.el).eq(0).click();
        }

        show(el, num) {
            let html = '';
            html += '<div>';

            html += `<ul id="${this.id}" style="display: inline-block; margin: 20px; padding: 0px;">`;
            for (let i = 0; i < num; i++) {
                html += `<li style="display: inline; padding: 8px 16px;"><a href="javascript:void(0)">${i + 1}</a></li>`;
            }

            if (this.getShowMode() === false) {
                html += `<li style="display: inline; padding: 8px 16px;"><a href="javascript:void(0)">未入力項目</a></li>`;
            }
            html += `<li style="display: inline; padding: 8px 16px;"><a href="javascript:void(0)">全項目</a></li>`;
            html += '</ul>';
            html += '</div>';

            $(el).append(html);
        }

        active(num) {
            $(this.el).eq(num).css('background-color', 'gold');
            $(this.el).eq(num).children('a').css('color', 'royalblue').css('font-weight', 'bold');
        }

        passive(num) {
            $(this.el).eq(num).css('background-color', 'white');
            $(this.el).eq(num).children('a').css('color', 'royalblue').css('font-weight', 'normal');
        }
    }

    let showSwipeViewForRead = (event) => {
        let el = kintone.mobile.app.getHeaderSpaceElement();

        pager.setShowMode(true);

        form.groupList = pluginConfig.svGroupListForRead;
        pager.setMax(form.groupList.length);

        pager.show(el, pager.getNormalNum());
        form.first(pager.getNormalNum());
        pager.init();

        let style = '';
        style += 'width: 100%; padding: 5px; line-height: 3; text-align: center;';
        style += 'z-index: 999; position: fixed; bottom: 70px; transform: translate3d(0, 0, 0);';
        style += 'background-color: gold; opacity: 0.6;';
        let html = `<div id="${swipeSpaceId}" style="${style}">ここをスワイプぅ</div>`;
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

            if (pager.isNoInputsPage(current) === true) {
                form.noInputs(pager.getNoInputsNum());
            } else if (pager.isAllPage(current) === true) {
                form.active(current);
            } else {
                form.passive(before);
                form.active(current);
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
                form.noInputs(pager.getNoInputsNum());
            } else if (pager.isAllPage(current) === true) {
                form.active(current);
            } else {
                form.passive(before);
                form.active(current);
            }

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
                let newUrl = location.href.replace(/(record=)\d+/, 'record=' + nextRecordId);
                location.href = newUrl;
            }
        });

        return event;
    }

    let showSwipeViewForWrite = (event) => {
        let el = kintone.mobile.app.getHeaderSpaceElement();

        pager.setShowMode(false);

        form.groupList = pluginConfig.svGroupListForWrite;
        pager.setMax(form.groupList.length);

        pager.show(el, pager.getNormalNum());
        form.first(pager.getNormalNum());
        pager.init();

        if (lsInputData !== null) {
            $(el).append('<div>反映しますか？</div><span id="ok" style="padding: 10px;">OK</span><span id="ng" style="padding: 10px;">NG</span>');
        }

        let style = '';
        style += 'width: 100%; padding: 5px; line-height: 3; text-align: center;';
        style += 'z-index: 999; position: fixed; bottom: 70px; transform: translate3d(0, 0, 0);';
        style += 'background-color: gold; opacity: 0.6;';
        let html = `<div id="${swipeSpaceId}" style="${style}">ここをスワイプぅ</div>`;
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
                form.noInputs(pager.getNoInputsNum());
            } else if (pager.isAllPage(current) === true) {
                form.active(current);
            } else {
                form.passive(before);
                form.active(current);
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
                form.noInputs(pager.getNoInputsNum());
            } else if (pager.isAllPage(current) === true) {
                form.active(current);
            } else {
                form.passive(before);
                form.active(current);
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
            form.input(fieldCode, pager.getNoInputsNum());
        } else {
            form.empty(fieldCode, pager.getNoInputsNum());
        }
    }



    let form = new Form();
    let pager = new Pager(listId);



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



    $(document).on('click', `ul#${listId} li`, (event) => {
        let before = pager.getCurrentPage();
        let current = $(event.currentTarget).index();

        if (pager.isNoInputsPage(current) === true) {
            form.noInputs(pager.getNoInputsNum());
        } else if (pager.isAllPage(current) === true) {
            form.active(current);
        } else {
            form.passive(before);
            form.active(current);
        }

        pager.passive(before);
        pager.active(current);

        pager.setCurrentPage(current);
    });

})(jQuery, kintone.$PLUGIN_ID);
