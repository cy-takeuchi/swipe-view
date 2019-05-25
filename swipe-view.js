jQuery.noConflict();
(($) => {
    'use strict';

    let conn = new kintoneJSSDK.Connection();
    let kintoneApp = new kintoneJSSDK.App(conn);
    const appId = kintone.mobile.app.getId();
    const subdomain = window.location.hostname.split('.')[0];
    const localStorageKey = `sv-${subdomain}-${appId}`;

    const swipeSpaceId = 'cy-swipe';
    const listId = 'cy-ul';

    let localStorageData = localStorage.getItem(localStorageKey);
    let localStorageJson = {};
    if (localStorageData !== null) {
        localStorageJson = JSON.parse(localStorageData);
    }

    let showSwipeArea = (el) => {
        let style = '';
        style += 'width: 100%; padding: 5px; line-height: 3; text-align: center;';
        style += 'z-index: 999; position: fixed; bottom: 70px; transform: translate3d(0, 0, 0);';
        style += 'background-color: gold; opacity: 0.6;';
        let html = `<div id="${swipeSpaceId}" style="${style}">ここをスワイプぅ</div>`;
        $(el).append(html);
    }

    class Form {
        constructor() {
            this.groupList = [];
            this.showMode = false;
        }

        setShowMode(showMode) {
            this.showMode = showMode;
        }

        getShowMode() {
            return this.showMode;
        }

        async getLayout() {
            let res = await kintoneApp.getFormLayout(appId);
            return res.layout;
        }

        grouping(layout, mode) {
            let array = {};
            let all = {};
            for (let i of Object.keys(layout)) {
                let type = layout[i].type;
                if (type === 'GROUP') {
                    let fieldCode = layout[i].code;
                    let obj = {
                        empty: true
                    }
                    array[fieldCode] = obj;
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
                            if (Object.keys(array).length > 0) {
                                this.groupList.push(array);
                                array = {};
                            }
                        } else {
                            array[fieldCode] = obj;
                            all[fieldCode] = obj;
                        }
                    }
                }
            }

            if (Object.keys(array).length > 0) {
                this.groupList.push(array);
            }

            // 未入力を設定
            if (this.getShowMode() === false) {
                this.groupList.push(all);
            }

            // 全件を設定
            this.groupList.push(all);
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

            this.setPage(0);

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

        getAllNum() {
            return this.max - 1;
        }

        isNoInputsPage(num) {
            return (num === this.getNoInputsNum()) ? true : false;
        }

        isAllPage(num) {
            return (num === this.getAllNum()) ? true : false;
        }

        getPage() {
            return this.current;
        }

        setPage(num) {
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

    let showSwipeView = (event) => {
        let record = event.record;

        if (event.type === 'mobile.app.record.detail.show') {
            form.setShowMode(true);
            pager.setShowMode(true);
        }


        // プラグインの設定値から取得する
        let el = kintone.mobile.app.record.getSpaceElement('pager');
        showSwipeArea(el);

        form.getLayout().then((layout) => {
            form.grouping(layout);

            pager.setMax(form.groupList.length);

            pager.show(el, pager.getNormalNum());
            form.first(pager.getNormalNum());
            pager.init();
        });

        if ((pager.getShowMode() === false) && (localStorageData !== null)) {
            $(el).append('<div>反映しますか？</div><span id="ok" style="padding: 10px;">OK</span><span id="ng" style="padding: 10px;">NG</span>');
        }

        var mc = new Hammer(document.getElementById(swipeSpaceId), {domEvents: true});
        if (pager.getShowMode() === true) {
            mc.get('swipe').set({direction: Hammer.DIRECTION_ALL});
        } else {
            mc.get('swipe').set({direction: Hammer.DIRECTION_HORIZONTAL});
        }

        mc.on('swiperight', () => {
            console.log('swipe right');
            let before = pager.getPage();
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

            pager.setPage(current);
        });

        mc.on('swipeleft', () => {
            console.log('swipe left');
            let before = pager.getPage();
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

            pager.setPage(current);
        });

        mc.on('swipeup', () => {
            console.log('swipe up');
        });

        mc.on('swipedown', () => {
            console.log('swipe down');
        });

        return event;
    }

    let restore = (event) => {
        let value = event.changes.field.value;
        let fieldCode = event.type.replace(/.*\./, '');

        localStorageJson[fieldCode] = value;
        localStorage.setItem(localStorageKey, JSON.stringify(localStorageJson));

        if (value !== '' && value !== undefined) {
            form.input(fieldCode, pager.getNoInputsNum());
        } else {
            form.empty(fieldCode, pager.getNoInputsNum());
        }
    }



    let form = new Form();
    let pager = new Pager(listId);



    let showEvent = [
        'mobile.app.record.detail.show',
        'mobile.app.record.create.show',
        'mobile.app.record.edit.show'
    ];

    kintone.events.on(showEvent, showSwipeView);



    let changeEvent = [
        'mobile.app.record.create.change.ドロップダウン',
        'mobile.app.record.create.change.ユーザー選択',
        'mobile.app.record.create.change.チェックボックス',
    ];

    kintone.events.on(changeEvent, restore);



    kintone.events.on(['mobile.app.record.create.submit.success', 'mobile.app.record.edit.submit.success'], (event) => {
        localStorage.removeItem(localStorageKey);
        return event;
    });



    $(document).on('click touchstart', 'span#ok', () => {
        let record = kintone.mobile.app.record.get();
        for (let fieldCode of Object.keys(localStorageJson)) {
            record.record[fieldCode].value = localStorageJson[fieldCode];
            form.input(fieldCode, pager.getNoInputsNum());
        }
        kintone.events.off(changeEvent, restore);
        kintone.mobile.app.record.set(record);
        kintone.events.on(changeEvent, restore);
    })

    $(document).on('click', `ul#${listId} li`, (event) => {
        let before = pager.getPage();
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

        pager.setPage(current);
    });
})(jQuery);
