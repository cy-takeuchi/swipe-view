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

    const swipeElement = 'sv-swipe-element';
    const pagerId = 'sv-pager';

    class Form {
        constructor() {
            this.groupList = [];
            this.noInputs = {};
            this.requiredInputs = {};
            this.showMode = false;
        }

        change(current, before) {
            let currentData = [];
            if (pager.isRequiredInputsPage(current) === true) {
                currentData = this.requiredInputs;
            } else if (pager.isNoInputsPage(current) === true) {
                currentData = this.noInputs;
            } else {
                currentData = this.groupList[current];
            }

            let beforeData = [];
            if (pager.isRequiredInputsPage(before) === true) {
                beforeData = this.requiredInputs;
            } else if (pager.isNoInputsPage(before) === true) {
                beforeData = this.noInputs;
            } else {
                beforeData = this.groupList[before];
            }

            for (let fieldCode of Object.keys(currentData)) {
                if (currentData[fieldCode].shown !== beforeData[fieldCode].shown) {
                    kintone.mobile.app.record.setFieldShown(fieldCode, currentData[fieldCode].shown);
                }
            }
        }

        initialView(num) {
            for (let fieldCode of Object.keys(this.groupList[num])) {
                kintone.mobile.app.record.setFieldShown(fieldCode, this.groupList[num][fieldCode].shown);
            }
        }

        input(fieldCode) {
            this.noInputs[fieldCode].shown = false;
        }

        empty(fieldCode) {
            this.noInputs[fieldCode].shown = true;
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

        getRequiredInputsNum() {
            return (this.getShowMode() === true) ? null : this.max - 1;
        }

        isRequiredInputsPage(num) {
            return (num === this.getRequiredInputsNum()) ? true : false;
        }

        getNoInputsNum() {
            return (this.getShowMode() === true) ? null : this.max - 2;
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

        initialView(num) {
            $(`ul#${pagerId} li`).eq(num).click();
        }

        show(el) {
            let max = this.getMax();
            if (this.getShowMode() === false) {
                max = this.getMax() - 2;
            }

            let html = '';
            html += '<div>';
            html += `<ul id="${pagerId}">`;
            for (let i = 0; i < max; i++) {
                html += `<li><a href="javascript:void(0)">${i + 1}</a></li>`;
            }

            if (this.getShowMode() === false) {
                html += `<li><a href="javascript:void(0)">未入力</a></li>`;
                html += `<li><a href="javascript:void(0)">必須入力</a></li>`;
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



    let nextColumn = () => {
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
    }

    let prevColumn = () => {
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
    }

    let nextRecord = () => {
        console.log('swipe up');
        let match = location.href.match(/(record=)(\d+)/); // ブラウザがlookbehind対応していない
        let recordId = Number(match[2]);
        let index = window.sv.lsListJson.indexOf(recordId);
        let nextRecordId = window.sv.lsListJson[index + 1];
        if (nextRecordId !== undefined) {
            // 選択している項目を次レコードの初期値として利用する
            window.sv.saveLocalStorage(window.sv.lsInitialKey, pager.getCurrentPage());
            let newUrl = location.href.replace(/(record=)\d+/, 'record=' + nextRecordId);
            location.href = newUrl;
        }
    }

    let prevRecord = () => {
        console.log('swipe down');
        let match = location.href.match(/(record=)(\d+)/); // ブラウザがlookbehind対応していない
        let recordId = Number(match[2]);
        let index = window.sv.lsListJson.indexOf(recordId);
        let nextRecordId = window.sv.lsListJson[index - 1];
        if (nextRecordId !== undefined) {
            // 選択している項目を次レコードの初期値として利用する
            window.sv.saveLocalStorage(window.sv.lsInitialKey, pager.getCurrentPage());
            let newUrl = location.href.replace(/(record=)\d+/, 'record=' + nextRecordId);
            location.href = newUrl;
        }
    }

    let getDirection = (x, y) => {
        let direction = '';

        if (Math.abs(x) > Math.abs(y) || pager.getShowMode() === false) {
            if (x >= 0) {
                direction = 'right';
            } else if (x < 0) {
                direction = 'left';
            }
        } else if (Math.abs(x) < Math.abs(y)) {
            if (y >= 0) {
                direction = 'bottom';
            } else if (y < 0) {
                direction = 'top';
            }
        }

        return direction;
    }

    let dragMoveListener = (event) => {
        let target = event.target;
        let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        let text = getDirection(x, y);
        target.setAttribute('data-value', text);

        target.style.webkitTransform = `translate(${x}px, ${y}px)`;
        target.style.transform = `translate(${x}px, ${y}px)`;

        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    }

    let dragEndListener = (event) => {
        let target = event.target;
        let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        let text = getDirection(x, y);
        if (text === 'right') {
            nextColumn();
        } else if (text === 'left') {
            prevColumn();
        } else if (text === 'top') {
            nextRecord();
        } else if (text === 'bottom') {
            prevRecord();
        }

        target.setAttribute('data-value', '');

        target.style.webkitTransform = 'translate(0px, 0px)';
        target.style.transform = 'translate(0px, 0px)';

        target.setAttribute('data-x', 0);
        target.setAttribute('data-y', 0);
    }

    let showSwipeArea = (el) => {
        let html = '';
        html += '<div id="sv-swipe-area">';
        html += `<div id="${swipeElement}"></div>`;
        html += '</div>';
        $(el).append(html);
    }

    let restore = () => {
        let record = kintone.mobile.app.record.get();
        for (let fieldCode of Object.keys(window.sv.lsInputJson)) {
            // ローカルルストレージ保存時に、テーブルの空フィールドはvalueプロパティが削除される
            if (pluginConfig.svOptionList[fieldCode].type === 'SUBTABLE') {
                let table = window.sv.lsInputJson[fieldCode];
                for (let i = 0; i < table.length; i++) {
                    for (let key of Object.keys(table[i].value)) {
                        if (table[i].value[key].value === undefined) {
                            table[i].value[key].value = '';
                        }
                    }
                }
            }
            record.record[fieldCode].value = window.sv.lsInputJson[fieldCode];
            form.input(fieldCode, pager.getNoInputsNum());
        }
        kintone.events.off(changeEvent, change);
        kintone.mobile.app.record.set(record);
        kintone.events.on(changeEvent, change);
    }

    let confirmRestore = () => {
        $.confirm({
            title: false,
            content: '入力途中のデータがあります。<br />リストアしますか？',
            backgroundDismiss: true,
            useBootstrap: false,
            buttons: {
                cancel: {
                    text: 'キャンセル',
                    btnClass: 'btn-default'
                },
                confirm: {
                    text: 'リストア',
                    btnClass: 'btn-blue',
                    action: () => {restore()}
                }
            }
        });
    }

    let change = (event) => {
        let value = event.changes.field.value;
        let fieldCode = event.type.replace(/.*\./, '');

        window.sv.lsInputJson[fieldCode] = value;
        window.sv.saveLocalStorage(window.sv.lsInputKey, window.sv.lsInputJson);

        if (value !== '' && value !== undefined) {
            form.input(fieldCode);
        } else {
            form.shown(fieldCode);
        }
    }



    let showSwipeViewForRead = (event) => {
        let el = kintone.mobile.app.getHeaderSpaceElement();

        pager.setShowMode(true);

        form.groupList = pluginConfig.svGroupList;
        pager.setMax(form.groupList.length);

        pager.show(el);

        // プラグインの設定変更で項目数が減った場合
        if (window.sv.lsInitialNum >= form.groupList.length) {
            window.sv.lsInitialNum = 0;
        }
        pager.active(window.sv.lsInitialNum);
        form.initialView(window.sv.lsInitialNum);

        showSwipeArea(el);

        interact(`#${swipeElement}`).draggable({
            inertia: true,
            modifiers: [
                interact.modifiers.restrict({
                    restriction: 'parent',
                    endOnly: false,
                    elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
                }),
            ],
            onmove: dragMoveListener,
            onend: dragEndListener
        });

        return event;
    }

    let showSwipeViewForWrite = (event) => {
        let el = kintone.mobile.app.getHeaderSpaceElement();

        pager.setShowMode(false);

        form.groupList = pluginConfig.svGroupList;
        form.noInputs = pluginConfig.svNoInputs;
        form.requiredInputs = pluginConfig.svRequiredInputs;
        pager.setMax(form.groupList.length + 2); // +2は必須入力、未入力項目分

        pager.show(el);

        // プラグインの設定変更で項目数が減った場合
        if (window.sv.lsInitialNum >= form.groupList.length) {
            window.sv.lsInitialNum = 0;
        }
        pager.active(window.sv.lsInitialNum);
        form.initialView(window.sv.lsInitialNum);

        if (Object.keys(window.sv.lsInputJson).length > 0) {
            confirmRestore();
        }

        showSwipeArea(el);

        interact(`#${swipeElement}`).draggable({
            inertia: true,
            modifiers: [
                interact.modifiers.restrict({
                    restriction: 'parent',
                    endOnly: false,
                    elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
                }),
            ],
            onmove: dragMoveListener,
            onend: dragEndListener
        });

        $(document).on('click touchstart', 'span#ok', restore);

        return event;
    }



    let form = new Form();
    let pager = new Pager(window.sv.lsInitialNum);



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
        localStorage.removeItem(window.sv.lsInputKey);
        return event;
    });



    $(document).on('click', `ul#${pagerId} li`, (event) => {
        let before = pager.getCurrentPage();
        let current = $(event.currentTarget).index();

        form.change(current, before);

        pager.passive(before);
        pager.active(current);

        pager.setCurrentPage(current);
    });

})(jQuery, kintone.$PLUGIN_ID);
