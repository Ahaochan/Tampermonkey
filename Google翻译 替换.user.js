// ==UserScript==
// @name        Google Translate replace
// @name:zh-CN  Google翻译 替换
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.3
// @description Replace the translated string. Github:https://github.com/Ahaochan/Tampermonkey. Star and fork is welcome.
// @description:zh-CN 对翻译后的字符串进行替换。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @author      Ahaochan
// @include     http*://translate.google.*
// @grant       GM.setValue
// @grant       GM.getValue
// @require     https://cdn.bootcdn.net/ajax/libs/jquery/2.2.4/jquery.min.js
// ==/UserScript==

jQuery(function ($) {
    'use strict';

    // 1. 初始化之前设置的 pattern 和 replace
    let $div = $('<div class="tlid-input-button input-button header-button tlid-input-button-docs documents-icon" role="tab" tabindex="-1">' +
        '<div class="text">' +
        '   <input id="ahao-pattern" placeholder="pattern" style="width: 50px;"> >>' +
        '   <input id="ahao-replace" placeholder="replace" style="width: 50px; margin: 0 4px;">' +
        '   <span id="ahao-button">替换</span>' +
        '</div></div>');
    $('.tlid-input-button-container').append($div);
    GM.getValue('pattern').then(function (value) { $('#ahao-pattern').val(value); });
    GM.getValue('replace').then(function (value) { $('#ahao-replace').val(value); });

    // 2. 绑定替换事件
    $('#ahao-button').on('click', function () {
        let pattern = $('#ahao-pattern').val();
        let replace = $('#ahao-replace').val();
        GM.setValue('pattern', pattern);
        GM.setValue('replace', replace);

        $('.translation').find('span').each(function () {
            let $this = $(this);
            $this.text($this.text().replace(new RegExp(pattern, 'gm'), replace));
        });
    });
});