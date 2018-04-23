// ==UserScript==
// @name        Greasy Fork replace original image
// @name:zh-CN  Greasy Fork 替换原图
// @name:zh-TW  Greasy Fork 替換原圖
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.1
// @description Replacement script details page preview is the original image, easy to drag and save. Github:https://github.com/Ahaochan/Tampermonkey. Star and fork is welcome.
// @description:zh-CN 脚本详情页预览图替换为原图, 方便拖拽保存。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @description:zh-TW 腳本詳情頁預覽圖替換為原圖, 方便拖拽保存。github:https://github.com/Ahaochan/Tampermonkey，歡迎star和fork。
// @author      Ahaochan
// @supportURL  https://github.com/Ahaochan/Tampermonkey
// @include     http*://greasyfork.org*
// @include     http*://www.greasyfork.org/*
// @require     https://code.jquery.com/jquery-2.2.4.min.js
// ==/UserScript==

(function ($) {
    'use strict';

    $('.script-screenshots a img').each(function () {
        var $this = $(this);
        var width = this.clientWidth, height = this.clientHeight;
        var url = $this.attr('src').replace('thumb', 'original');
        $this.attr('src', url)
            .attr('width', width)
            .attr('height', height);
    });
})(jQuery);