// ==UserScript==
// @name        Google Translate replace
// @name:zh     Google翻译 替换
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.2
// @description Replace the translated string. Github:https://github.com/Ahaochan/Tampermonkey. Star and fork is welcome.
// @description:zh 对翻译后的字符串进行替换。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @author      Ahaochan
// @include     http*://translate.google.*
// @grant       GM.setValue
// @grant       GM.getValue
// @require     https://code.jquery.com/jquery-2.2.4.min.js
// ==/UserScript==

$(function () {
    'use strict';

    // 1. 初始化之前设置的 pattern 和 replace
    var $div = $('<div class="gt-lang-sugg-message goog-inline-block je"' +
        ' style="float: right; padding: 2px">' +
        '<input id="ahao-pattern" placeholder="pattern" style="width: 50px;"> >>' +
        '<input id="ahao-replace" placeholder="replace" style="width: 50px; margin: 0 4px;">' +
        '<input id="ahao-button" type="button" class="jfk-button jfk-button-action" value="replace">' +
        '</div>');
    $('#gt-lang-right').append($div);
    GM.getValue('pattern').then(function (value) { $('#ahao-pattern').val(value); });
    GM.getValue('replace').then(function (value) { $('#ahao-replace').val(value); });

    // 2. 绑定替换事件
    var $resultBox = $('#result_box');
    $('#ahao-button').on('click', function () {
        var pattern = $('#ahao-pattern').val();
        var replace = $('#ahao-replace').val();
        GM.setValue('pattern', pattern);
        GM.setValue('replace', replace);

        var text = $resultBox.text();
        $resultBox.text(text.replace(new RegExp(pattern, 'gm'), replace));
    });
});