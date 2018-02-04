// ==UserScript==
// @name        fuck天猫
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.1
// @description 屏蔽淘宝下的天猫搜索结果, 还我一个干净的淘宝。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @author      Ahaochan
// @include     http*://*.taobao.com*
// @match       https://s.taobao.com
// @supportURL  https://github.com/Ahaochan/Tampermonkey
// @require     https://code.jquery.com/jquery-2.2.4.min.js
// @run-at      document-end
// ==/UserScript==

(function ($) {
    'use strict';
    setInterval(function () {
        $('.icon-service-tianmao').closest('div.item').remove();
    }, 1000);
})(jQuery);
