// ==UserScript==
// @name        Greasy Fork 替换原图
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.1
// @description 脚本详情页预览图替换为原图, 方便拖拽保存。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @author      Ahaochan
// @match       http://greasyfork.org*
// @match       https://greasyfork.org*
// @match       http://greasyfork.org/*
// @match       https://greasyfork.org/*
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