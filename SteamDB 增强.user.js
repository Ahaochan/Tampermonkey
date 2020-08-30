// ==UserScript==
// @name        SteamDB Plus
// @name:zh-CN  SteamDB 增强
// @name:zh-TW  SteamDB 增強
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.1
// @icon        https://steamdb.info/favicon.ico
// @description 1. 排序功能 2. 自动生成ASF命令
// @author      Ahaochan
// @include     http*://steamdb.info/upcoming/free/*
// @license     GPL-3.0
// @supportURL  https://github.com/Ahaochan/Tampermonkey
// @grant       GM.setClipboard
// @grant       GM_setClipboard
// @require     https://cdn.bootcdn.net/ajax/libs/jquery/2.2.4/jquery.min.js
// @require     https://greasyfork.org/scripts/375359-gm4-polyfill-1-0-1/code/gm4-polyfill-101.js?version=652238
// @run-at      document-end
// @noframes
// ==/UserScript==

jQuery(function ($) {
    $('table.table-products').each(function () {
        let $table = $(this);
        let $thead = $table.find('thead');
        let $tbody = $table.find('tbody');

        (function ($table, $thead, $tbody) {
            // 1. 添加表头
            $thead.find('tr:first').append('<th style="width:120px">ASF</th>');

            // 2. 添加排序功能
            $thead.find('th').each(function (index, ele) {
                let $th = $(this);
                $th.text($th.text() + '  v');
                $th.attr('ahao-asc', 1);

                $th.click(function () {
                    let flag1 = parseInt($th.attr('ahao-asc'));
                    let flag2 = flag1 === 1 ? -1 : 1;

                    let $list = $tbody.children();
                    $list.sort((a, b) => {
                        let t1 = $(a).find('td').eq(index).text();
                        let t2 = $(b).find('td').eq(index).text();
                        if(t1 < t2) { return flag1; }
                        if(t1 > t2) { return flag2; }
                        return 0;
                    });
                    $tbody.html($list);

                    $th.attr('ahao-asc', flag2);
                });
            });
        })($table, $thead, $tbody);

        // 2. 添加表体
        (function ($table, $thead, $tbody) {
            $tbody.find('tr').each(function () {
                let $tr = $(this);
                let id = $tr.children('td').eq(1).find('a').attr('href').match(/\d+/);
                let command = `!addlicense ${id}`;
                let $td = $(`<td>${command}</td>`);
                $td.click(function () {
                    let $this = $(this);
                    $this.text('ASF command copied');
                    GM.setClipboard(command);
                    setTimeout(function () { $this.text(command); }, 2000);
                });
                $tr.append($td);
            });
        })($table, $thead, $tbody);
    });
});