// ==UserScript==
// @name        Google翻译 替换
// @name:ja 	Google Translate replace
// @name:en  	Google Translate replace
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.1
// @description 对翻译后的字符串进行替换。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @description:ja Replace the translated string. Github:https://github.com/Ahaochan/Tampermonkey. Star and fork is welcome.
// @description:en Replace the translated string. Github:https://github.com/Ahaochan/Tampermonkey. Star and fork is welcome.
// @author      Ahaochan
// @include     http*://translate.google.*
// @grant       GM_setValue
// @grant       GM_getValue
// @require     https://code.jquery.com/jquery-2.2.4.min.js
// ==/UserScript==

(function ($) {
    'use strict';

    var pattern = GM_getValue('pattern', ' ');
    var replace = GM_getValue('replace', '_');

    var $div = $('<div class="gt-lang-sugg-message goog-inline-block je"' +
        ' style="float: right; padding: 2px">' +
        '<input id="ahao-pattern" placeholder="pattern" style="width: 50px;" value="'+pattern+'"> >>' +
        '<input id="ahao-replace" placeholder="replace" style="width: 50px; margin: 0 4px;" value="'+replace+'">' +
        '<input id="ahao-button" type="button" class="jfk-button jfk-button-action" value="replace">' +
        '</div>');
    var $resultBox = $('#result_box');

    $div.find('#ahao-button').on('click', function () {
        var pattern = $div.find('#ahao-pattern').val();
        var replace = $div.find('#ahao-replace').val();
        GM_setValue('pattern', pattern);
        GM_setValue('replace', replace);

        var text = $resultBox.text();
        $resultBox.text(text.replace(new RegExp(pattern, 'gm'),replace));
    });

    $('#gt-lang-right').append($div);
})(jQuery);