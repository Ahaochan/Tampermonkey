// ==UserScript==
// @name        Pixiv 增强
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.1
// @description 屏蔽广告, 查看热门图片, 收藏数搜索, 下载gif。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @author      Ahaochan
// @match       *://*.pixiv.net*
// @match       *://*.pixiv.net/**
// @require     https://code.jquery.com/jquery-2.2.4.min.js
// ==/UserScript==

(function ($) {
    'use strict';

    (function () {
        // 删除广告模块
        $('._premium-lead-tag-search-bar').hide();
        $('.popular-introduction-overlay').hide();
    })();


    (function () {
        // 选项
        $('.navigation-menu-right').append(
            '<div class="menu-group">' +
            '    <a class="menu-item js-click-trackable-later">' +
            '           <img class="_howto-icon" src="https://source.pixiv.net/www/images/knowhow/icon/howto-brush.svg?20171004">' +
            '           <span class="label">收藏人数：</span>' +
            '           <select id="ahao_favourite_num_select">' +
            '               <option value=""></option>' +
            '               <option value="10000users入り">10000users入り</option>' +
            '               <option value="5000users入り" > 5000users入り</option>' +
            '               <option value="1000users入り" > 1000users入り</option>' +
            '               <option value="500users入り"  >  500users入り</option>' +
            '               <option value="300users入り"  >  300users入り</option>' +
            '               <option value="100users入り"  >  100users入り</option>' +
            '               <option value="50users入り"   >   50users入り</option>' +
            '           </select>' +
            '   </a>' +
            '</div>');

        // 如果已经有搜索字符串就在改变选项时直接搜索
        $('#ahao_favourite_num_select').on('change', function () {
            var $text = $('#suggest-input');
            if(!!$text.val()){
                $('#suggest-container').submit();
            }
        });

        // 在提交搜索前处理搜索关键字
        $('#suggest-container').submit(function () {
            var $text = $('#suggest-input');
            var $favourite = $('#ahao_favourite_num_select');
            // 去除旧的搜索选项
            $text.val($text.val().replace(/\d*users入り/, ''));
            // 添加新的搜索选项
            $text.val($text.val() + ' ' + $favourite.val());
        });
    })();

    (function () {
        if(window.location.href.indexOf('member_illust.php') === -1){
            return;
        }
        // 下载动图
        var hasGIF = !!$('div ._ugoku-illust-player-container');
        if(!hasGIF){
            return;
        }

        // 获取参数
        var param = $('.bookmark_modal_thumbnail')
            .attr('data-src')
            .match(/img-master\/img([\s\S]*?)_/)
            [1];
        var url = 'https://i.pximg.net/img-zip-ugoira/img'+param+'_ugoira600x600.zip';

        // 添加下载按钮
        $('div .bookmark-container').append(
            '<a href="'+url+'" class="_bookmark-toggle-button add-bookmark">' +
            '   <span class="bookmark-icon"></span><span class="description">下载动图</span>' +
            '</a>');
    })();

})(jQuery);


