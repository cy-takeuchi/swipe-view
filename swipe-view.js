// プラグインの設定画面で入力時に表示するメッセージを変えれるように
// 各ステップでデータ保存、ネットが切れても途中から入力できる
jQuery.noConflict();
(($) => {
    'use strict';

    let conn = new kintoneJSSDK.Connection();
    let kintoneApp = new kintoneJSSDK.App(conn);
    const appId = kintone.mobile.app.getId();

    const swipeSpaceId = 'cy-swipe';
    const listId = 'cy-ul';

    let showSwipeArea = (el) => {
        let style = '';
        style += 'width: 100%; padding: 5px; line-height: 3; text-align: center;';
        style += 'z-index: 999; position: absolute; bottom: 5px;';
        style += 'background-color: gold; opacity: 0.6;';
        let html = `<div id="${swipeSpaceId}" style="${style}">ここをスワイプぅ</div>`;
        $(el).append(html);
    }

    class Form {
        constructor() {
            this.groupList = [];
        }

        async getLayout() {
            let res = await kintoneApp.getFormLayout(appId);
            return res.layout;
        }

        async grouping(layout) {
            let array = [];
            let all = [];
            for (let i of Object.keys(layout)) {
                let fields = layout[i].fields;
                for (let j = 0; j < fields.length; j++) {
                    let code = fields[j].code;
                    let type = fields[j].type;
                    let id = fields[j].elementId;
                    let obj = {
                        code: code,
                        type: type,
                        empty: true
                    }

                    if (type === 'SPACER') {
                        if (id === 'swipe') {
                            continue;
                        }
                    } else if (type === 'HR') {
                        continue;
                    }

                    if (type === 'SPACER') {
                        if (array.length > 0) {
                            this.groupList.push(array);
                            array = [];
                        }
                    } else {
                        array.push(obj);
                        all.push(obj);
                    }
                }
            }

            if (array.length > 0) {
                this.groupList.push(array);
                array = [];
            }

            // 未入力を設定
            this.groupList.push(all);

            // 全件を設定
            this.groupList.push(all);
        }

        async parseForm() {
            let layout = await this.getLayout();
            console.log('layout', layout);

            await this.grouping(layout);
            console.log('groupList', this.groupList);
        }

        active(num) {
            for (let i = 0; i < this.groupList[num].length; i++) {
                let field = this.groupList[num][i];
                kintone.mobile.app.record.setFieldShown(field.code, true);
            }
        }

        passive(num) {
            for (let i = 0; i < this.groupList[num].length; i++) {
                let field = this.groupList[num][i];
                kintone.mobile.app.record.setFieldShown(field.code, false);
            }
        }

        // 初期表示用
        first() {
            // 最初のグループリストは表示するから開始は1
            // 未入力項目、全項目は外すから -2
            for (let i = 1; i < this.groupList.length - 2; i++) {
                let group = this.groupList[i];
                for (let j = 0; j < group.length; j++) {
                    let field = group[j];
                    kintone.mobile.app.record.setFieldShown(field.code, false);
                }
            }
        }

        // 未入力項目用
        noInputs(num) {
            for (let i = 0; i < this.groupList[num].length; i++) {
                let field = this.groupList[num][i];
                if (field.empty === true) {
                    kintone.mobile.app.record.setFieldShown(field.code, true);
                } else if (field.empty === false) {
                    kintone.mobile.app.record.setFieldShown(field.code, false);
                }
            }
        }
    }

    class Pager {
        constructor() {
            this.current = 0;
            this.min = 0;
            this.max = 0;

            this.setPage(0);
        }

        getMax() {
            return this.max;
        }

        setMax(max) {
            this.max = max;
        }

        getPage() {
            return this.current;
        }

        setPage(num) {
            this.current = num;
        }
    }

    class List {
        constructor(id) {
            this.id = id;
            this.el = `ul#${id} li`;
            this.max = 0;
        }

        init() {
            $(this.el).eq(0).click();
        }

        setMax(max) {
            this.max = max;
        }

        show(el) {
            let html = '';
            html += '<div>';
            html += `<ul id="${this.id}" style="display: inline-block; margin: 20px; padding: 0px;">`;
            for (let i = 0; i < this.max - 2; i++) {
                html += `<li style="display: inline; padding: 8px 16px;"><a href="javascript:void(0)">${i + 1}</a></li>`;
            }
            html += `<li style="display: inline; padding: 8px 16px;"><a href="javascript:void(0)">未入力項目</a></li>`;
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



    let form = new Form();

    kintone.events.on(['mobile.app.record.create.show', 'mobile.app.record.edit.show'], (event) => {
        console.log('abc');

        // プラグインの設定値から取得する
        let el = kintone.mobile.app.record.getSpaceElement('pager');
        showSwipeArea(el);

        let pager = new Pager();
        let list = new List(listId);

        form.parseForm().then(() => {
            pager.setMax(form.groupList.length);
            list.setMax(form.groupList.length);

            list.show(el);
            form.first();
            list.init();
        });

        $(document).on('click', `ul#${listId} li`, (event) => {
            let before = pager.getPage();
            let current = $(event.currentTarget).index();

            if (current === pager.getMax() - 2) { // 未入力項目
                form.noInputs(current);
            } else if (current === pager.getMax() - 1) { // 全項目
                form.active(current);
            } else {
                form.passive(before);
                form.active(current);
            }

            list.passive(before);
            list.active(current);

            pager.setPage(current);
        });

        $(`div#${swipeSpaceId}`).hammer().bind('swiperight', () => {
            console.log('swipe right');
            let before = pager.getPage();
            let current = before + 1;
            if (current >= pager.getMax()) {
                return;
            }

            if (current === pager.getMax() - 2) { // 未入力項目
                form.noInputs(current);
            } else if (current === pager.getMax() - 1) { // 全項目
                form.active(current);
            } else {
                form.passive(before);
                form.active(current);
            }

            list.passive(before);
            list.active(current);

            pager.setPage(current);
        });
        $(`div#${swipeSpaceId}`).hammer().bind('swipeleft', () => {
            console.log('swipe left');
            let before = pager.getPage();
            let current = before - 1;
            if (current < 0) {
                return;
            }

            if (current === pager.getMax() - 2) { // 未入力項目
                form.noInputs(current);
            } else if (current === pager.getMax() - 1) { // 全項目
                form.active(current);
            } else {
                form.passive(before);
                form.active(current);
            }

            list.passive(before);
            list.active(current);

            pager.setPage(current);
        });
    });

    let changeEvent = [
        'mobile.app.record.create.change.ドロップダウン',
        'mobile.app.record.create.change.ユーザー選択',
    ];
    kintone.events.on(changeEvent, (event) => {
        let noInputsNum = form.groupList.length - 2;
        let value = event.changes.field.value;
        let fieldCode = event.type.replace(/.*\./, '');
        for (let i = 0; i < form.groupList[noInputsNum].length; i++) {
            if (form.groupList[noInputsNum][i].code === fieldCode) {
                if (value !== '' && value !== undefined) {
                    form.groupList[noInputsNum][i]['empty'] = false;
                } else {
                    form.groupList[noInputsNum][i]['empty'] = true;
                }
            }
        }
    });

})(jQuery);