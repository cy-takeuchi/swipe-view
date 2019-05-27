jQuery.noConflict();
(($, PLUGIN_ID) => {
    'use strict';

    var $form = $('.js-submit-settings');
    var $svSpaceId = $('#svSpaceId');

    let getSettingsUrl = () => {
        return '/k/admin/app/flow?app=' + kintone.app.getId();
    }

    var config = kintone.plugin.app.getConfig(PLUGIN_ID);
    if (config.svSpaceId) {
        $svSpaceId.val(config.svSpaceId);
    }

    $form.on('submit', (e) => {
        e.preventDefault();

        let saveData = {};
        saveData.svSpaceId = $svSpaceId.val();
        kintone.plugin.app.setConfig(saveData, () => {
            alert('Please update the app!');
            window.location.href = getSettingsUrl();
        });
    });
})(jQuery, kintone.$PLUGIN_ID);
