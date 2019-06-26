jQuery.noConflict();
(($) => {
    'use strict';

    const swipeElementId = 'sv-swipe-element';
    const swipeAreaId = 'sv-swipe-area';
    const pagerId = 'sv-pager';

    const pluginConfig = window.sv.pluginConfig;

    class Pager {
        constructor() {
            this.min = 0;
            this.max = 0;

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
            return (num === this.getRequiredInputsNum());
        }

        getNoInputsNum() {
            return (this.getShowMode() === true) ? null : this.max - 2;
        }

        isNoInputsPage(num) {
            return (num === this.getNoInputsNum());
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
            html += '<div id="sv-main">';
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

    let pager = new Pager();

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
            if (before === null) { // 初期表示（前項目がない場合）
                beforeData = null;
            } else if (pager.isRequiredInputsPage(before) === true) {
                beforeData = this.requiredInputs;
            } else if (pager.isNoInputsPage(before) === true) {
                beforeData = this.noInputs;
            } else {
                beforeData = this.groupList[before];
            }

            for (let fieldCode of Object.keys(currentData)) {
                if (currentData[fieldCode].fields !== undefined) { // グループフィールドの場合
                    let shownList = currentData[fieldCode].fields.map((field) => currentData[field].shown);
                    if (shownList.includes(true) === true) { // グループ配下のフィールドが1つでも表示の場合はグループも表示
                        kintone.mobile.app.record.setFieldShown(fieldCode, true);
                    } else {
                        kintone.mobile.app.record.setFieldShown(fieldCode, false);
                    }
                } else if (beforeData === null) { // 初期表示（前項目がない場合）
                    kintone.mobile.app.record.setFieldShown(fieldCode, currentData[fieldCode].shown);
                } else if (beforeData[fieldCode] === undefined) {
                    kintone.mobile.app.record.setFieldShown(fieldCode, currentData[fieldCode].shown);
                } else if (currentData[fieldCode].shown !== beforeData[fieldCode].shown) {
                    kintone.mobile.app.record.setFieldShown(fieldCode, currentData[fieldCode].shown);
                }
            }
        }

        input(fieldCode) {
            this.noInputs[fieldCode].shown = false;
        }

        empty(fieldCode) {
            this.noInputs[fieldCode].shown = true;
        }
    }

    let form = new Form();

    let saveData = (fieldCode, value) => {
        if (pager.getShowMode() === false && value !== '' && value !== undefined) {
            let lsInputJson = window.sv.pickLocalStorage(window.sv.getLsInputKey());
            if (lsInputJson === null) {
                lsInputJson = {
                    updatedTime: new Date().getTime(),
                    records: {
                        [fieldCode]: value
                    }
                };
            } else {
                lsInputJson.updatedTime = new Date().getTime();
                lsInputJson.records[fieldCode] = value;
            }
            window.sv.saveLocalStorage(window.sv.getLsInputKey(), lsInputJson);
            form.input(fieldCode);
        }
    };

    let saveDataNotWorkChangeEventField = () => {
        let record = kintone.mobile.app.record.get();

        let fieldCodeList = Object.keys(record.record).filter((fieldCode) =>
            window.sv.notWorkChangeEventFieldTypeList.includes(record.record[fieldCode].type));
        fieldCodeList.map((fieldCode) => {
            let value = record.record[fieldCode].value;
            saveData(fieldCode, value);
        });
    };

    let nextColumn = () => {
        let before = pager.getCurrentPage();
        let current = before + 1;
        if (current >= pager.getMax()) {
            return;
        }

        form.change(current, before);

        pager.passive(before);
        pager.active(current);
        pager.setCurrentPage(current);

        window.sv.saveLocalStorage(window.sv.lsInitialKey, current);
        saveDataNotWorkChangeEventField();
    };

    let prevColumn = () => {
        let before = pager.getCurrentPage();
        let current = before - 1;
        if (current < 0) {
            return;
        }

        form.change(current, before);

        pager.passive(before);
        pager.active(current);
        pager.setCurrentPage(current);

        window.sv.saveLocalStorage(window.sv.lsInitialKey, current);
        saveDataNotWorkChangeEventField();
    };

    let nextRecord = () => {
        let match = location.href.match(/(record=)(\d+)/); // ブラウザがlookbehind対応していない
        let recordId = Number(match[2]);
        let index = window.sv.pickLocalStorage(window.sv.lsListKey).indexOf(recordId);
        let nextRecordId = window.sv.pickLocalStorage(window.sv.lsListKey)[index + 1];
        if (nextRecordId !== undefined) {
            // 選択している項目を次レコードの初期値として利用する
            window.sv.saveLocalStorage(window.sv.lsInitialKey, pager.getCurrentPage());
            let newUrl = location.href.replace(/(record=)\d+/, 'record=' + nextRecordId);
            location.href = newUrl;
        }
    };

    let prevRecord = () => {
        let match = location.href.match(/(record=)(\d+)/); // ブラウザがlookbehind対応していない
        let recordId = Number(match[2]);
        let index = window.sv.pickLocalStorage(window.sv.lsListKey).indexOf(recordId);
        let nextRecordId = window.sv.pickLocalStorage(window.sv.lsListKey)[index - 1];
        if (nextRecordId !== undefined) {
            // 選択している項目を次レコードの初期値として利用する
            window.sv.saveLocalStorage(window.sv.lsInitialKey, pager.getCurrentPage());
            let newUrl = location.href.replace(/(record=)\d+/, 'record=' + nextRecordId);
            location.href = newUrl;
        }
    };

    let getDirection = (x, y) => {
        let direction = {message: ''};

        // 少しのスワイプで動作するのを防ぐ
        if (Math.abs(x) < 30 && Math.abs(y) < 30) {
            return direction;
        }

        if (Math.abs(x) > Math.abs(y)
            // 編集画面はX軸のみ動作で、少しのスワイプで動作するのを防ぐ
            || (pager.getShowMode() === false && Math.abs(x) > Math.abs(y) * 2)) {
            if (x >= 0) {
                direction.course = 'right';
                direction.message = '次の項目';
            } else if (x < 0) {
                direction.course = 'left';
                direction.message = '前の項目';
            }
        } else if (Math.abs(x) < Math.abs(y) && pager.getShowMode() === true) {
            if (y >= 0) {
                direction.course = 'bottom';
                direction.message = '次のレコード';
            } else if (y < 0) {
                direction.course = 'top';
                direction.message = '前のレコード';
            }
        }

        return direction;
    };

    let dragMoveListener = (event) => {
        let target = event.target;
        let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        let direction = getDirection(x, y);
        $(`div#${swipeAreaId}`).attr('data-value', direction.message);

        target.style.webkitTransform = `translate(${x}px, ${y}px)`;
        target.style.transform = `translate(${x}px, ${y}px)`;

        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    };

    let dragEndListener = (event) => {
        let target = event.target;
        let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        // デバッグ用
        //$(`ul#${pagerId}`).parent().append(`<br />${x}:${y}`);
        if (x === 0 && y === 0) {
            return;
        }

        let direction = getDirection(x, y);
        if (direction.course === 'right') {
            nextColumn();
        } else if (direction.course === 'left') {
            prevColumn();
        } else if (direction.course === 'top') {
            nextRecord();
        } else if (direction.course === 'bottom') {
            prevRecord();
        }

        $(`div#${swipeAreaId}`).attr('data-value', '');

        target.style.webkitTransform = 'translate(0px, 0px)';
        target.style.transform = 'translate(0px, 0px)';

        target.setAttribute('data-x', 0);
        target.setAttribute('data-y', 0);
    };

    let showSwipeArea = (el) => {
        let html = '';
        html += '<div id="sv-swipe-area">';
        html += `<img id="${swipeElementId}" src="${window.sv.imageFingerPrint}" /></div>`;
        html += '</div>';
        $(el).append(html);
    };

    let changeData = (event) => {
        let value = event.changes.field.value;
        let fieldCode = event.type.replace(/.*\./, '');
        saveData(fieldCode, value);
    };

    let restoreData = async(lsInputJson) => {
        let record = kintone.mobile.app.record.get();
        let inputRecords = lsInputJson.records;

        for (let fieldCode of Object.keys(inputRecords)) {
            // ローカルルストレージ保存時に、テーブルの空フィールドはvalueプロパティが削除される
            if (Array.isArray(inputRecords[fieldCode]) === true
                && inputRecords[fieldCode].length > 0
                && inputRecords[fieldCode][0].id !== undefined) {
                let table = inputRecords[fieldCode];
                for (let i = 0; i < table.length; i++) {
                    for (let key of Object.keys(table[i].value)) {
                        if (table[i].value[key].value === undefined) {
                            table[i].value[key].value = '';
                        }
                    }
                }
            }
            record.record[fieldCode].value = inputRecords[fieldCode];
            form.input(fieldCode, pager.getNoInputsNum());
        }
        kintone.events.off(pluginConfig.changeEventList, changeData);
        kintone.mobile.app.record.set(record);
        kintone.events.on(pluginConfig.changeEventList, changeData);
    };

    let removeData = () => {
        localStorage.removeItem(window.sv.getLsInputKey());
    };

    let confirmRestore = (lsInputJson, lsInitialNum) => {
        let updatedTime = lsInputJson.updatedTime;
        let now = new Date().getTime();
        let diff = (now - updatedTime) / 1000;

        let content = '';
        if (diff < 60 * 60) {
            content += '先程入力していたデータがあります。<br />';
        } else if (window.sv.isToday(now, updatedTime) === true) {
            content += '本日入力していたデータがあります。<br />';
        } else if (window.sv.isYesterday(now, updatedTime) === true) {
            content += '昨日入力していたデータがあります。<br />';
        } else {
            content += '入力途中のデータがあります。<br />';
        }
        content += 'リストアしますか？<br />';
        content += `入力日時: ${window.sv.getPrettyDate(updatedTime)}`;

        $.confirm({
            title: false,
            content: content,
            //backgroundDismiss: true,
            useBootstrap: false,
            buttons: {
                cancel: {
                    text: 'キャンセル',
                    btnClass: 'btn-default',
                    action: () => {
                        form.change(lsInitialNum, null);
                        removeData();
                    }
                },
                confirm: {
                    text: 'リストア',
                    btnClass: 'btn-blue',
                    action: () => {
                        restoreData(lsInputJson).then((e) => {
                            form.change(lsInitialNum, null);
                        });
                    }
                }
            }
        });
    };



    let showSwipeViewForRead = (event) => {
        let el = kintone.mobile.app.getHeaderSpaceElement();

        pager.setShowMode(true);

        form.groupList = pluginConfig.svGroupList;
        pager.setMax(form.groupList.length);

        pager.show(el);

        // プラグインの設定変更で項目数が減った場合
        let lsInitialNum = window.sv.pickLocalStorage(window.sv.lsInitialKey);
        if (lsInitialNum >= pager.getMax()) {
            lsInitialNum = pager.getMax() - 1;
        }

        pager.active(lsInitialNum);
        pager.setCurrentPage(lsInitialNum);
        form.change(lsInitialNum, null);

        showSwipeArea(el);

        interact(`#${swipeElementId}`).draggable({
            inertia: true,
            modifiers: [
                interact.modifiers.restrict({
                    restriction: 'parent',
                    endOnly: false,
                    elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
                })
            ],
            onmove: dragMoveListener,
            onend: dragEndListener
        });

        return event;
    };

    let showSwipeViewForWrite = (event) => {
        if (event.type === 'mobile.app.record.create.show') {
            window.sv.setLsInputKey(event.recordId);
        } else if (event.type === 'mobile.app.record.edit.show') {
            window.sv.setLsInputKey(event.recordId);
        }

        let el = kintone.mobile.app.getHeaderSpaceElement();

        pager.setShowMode(false);

        form.groupList = pluginConfig.svGroupList;
        form.noInputs = pluginConfig.svNoInputs;
        form.requiredInputs = pluginConfig.svRequiredInputs;
        pager.setMax(form.groupList.length + 2); // +2は必須入力、未入力項目分

        pager.show(el);

        // プラグインの設定変更で項目数が減った場合
        let lsInitialNum = window.sv.pickLocalStorage(window.sv.lsInitialKey);
        if (lsInitialNum >= pager.getMax()) {
            lsInitialNum = pager.getMax() - 1;
        }
        pager.active(lsInitialNum);
        pager.setCurrentPage(lsInitialNum);

        let lsInputJson = window.sv.pickLocalStorage(window.sv.getLsInputKey());
        if (lsInputJson !== null) { // 未入力項目への反映はリストアしてから
            confirmRestore(lsInputJson, lsInitialNum);
        } else {
            form.change(lsInitialNum, null);
        }

        showSwipeArea(el);

        interact(`#${swipeElementId}`).draggable({
            inertia: false,
            modifiers: [
                interact.modifiers.restrict({
                    restriction: 'parent',
                    endOnly: false,
                    elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
                })
            ],
            onmove: dragMoveListener,
            onend: dragEndListener
        });

        return event;
    };






    let readEventList = [
        'mobile.app.record.detail.show'
    ];
    kintone.events.on(readEventList, showSwipeViewForRead);

    let writeEventList = [
        'mobile.app.record.create.show',
        'mobile.app.record.edit.show'
    ];
    kintone.events.on(writeEventList, showSwipeViewForWrite);



    kintone.events.on(pluginConfig.changeEventList, changeData);



    let submitSuccessEventList = [
        'mobile.app.record.create.submit.success',
        'mobile.app.record.edit.submit.success'
    ];
    kintone.events.on(submitSuccessEventList, (event) => {
        removeData();
        return event;
    });



    $(document).on('click', `ul#${pagerId} li`, (event) => {
        let before = pager.getCurrentPage();
        let current = $(event.currentTarget).index();

        form.change(current, before);

        pager.passive(before);
        pager.active(current);
        pager.setCurrentPage(current);

        window.sv.saveLocalStorage(window.sv.lsInitialKey, current);
        saveDataNotWorkChangeEventField();
    });

})(jQuery);
