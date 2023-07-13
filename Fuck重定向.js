// ==UserScript==
// @name        Fuck重定向
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.2
// @description 屏蔽链接自动跳转，目前支持QQ
// @author      Ahaochan
// @include     http*://c.pc.qq.com/middlem.html?pfurl=*
// @license     GPL-3.0
// @supportURL  https://github.com/Ahaochan/Tampermonkey
// @require     https://cdn.bootcdn.net/ajax/libs/jquery/2.2.4/jquery.min.js
// @run-at      document-end
// ==/UserScript==

(function ($) {
    'use strict';
    const url = location.href;

    const urlObject = new URL(url);
    const params = new URLSearchParams(urlObject.search);

    // QQ屏蔽
    const pfurl = params.get('pfurl');
    if (pfurl) {
        location.href = decodeURIComponent(pfurl);
    }
})(jQuery);
