// ==UserScript==
// @name        Pixiv 增强
// @name:ja 	Pixiv Plus
// @name:en  	Pixiv Plus
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.9
// @description 屏蔽广告, 查看热门图片, 按收藏数搜索, 搜索pid和uid, 替换大图, 下载gif、多图, 显示画师id、画师背景图, 自动加载评论。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @description:ja 広告をブロックし、人気のある写真のマスクを隠す. お気に入りの数で検索. 検索pidとuid. 大きな画像を置き換える. ダウンロードgif、複数の写真、アーティストID、アーティストの背景、コメントを自動的に読み込む. Github:https://github.com/Ahaochan/Tampermonkey. Star and fork is welcome.
// @description:en Block ads. Hide mask layer of popular pictures. Search by favorites. Search pid and uid. Replace with big picture. Download gif, multiple pictures. Display artist id, background pictures. Automatically load comments. Github:https://github.com/Ahaochan/Tampermonkey. Star and fork is welcome.
// @author      Ahaochan
// @match       https://www.pixiv.net*
// @match       https://www.pixiv.net/*
// @include     *://www.pixiv.net/*
// @connect     i.pximg.net
// @supportURL  https://github.com/Ahaochan/Tampermonkey
// @grant       GM_xmlhttpRequest
// @grant       GM_setClipboard
// @require     https://code.jquery.com/jquery-2.2.4.min.js
// @require     https://cdn.bootcss.com/jszip/3.1.4/jszip.min.js
// @require     https://cdn.bootcss.com/FileSaver.js/1.3.2/FileSaver.min.js
// @run-at      document-end
// ==/UserScript==

(function ($) {
    'use strict';
    var lang = document.documentElement.getAttribute('lang');
    var pid = pixiv.context.illustId || 'unknown';
    var uid = pixiv.context.userId || 'unknown';

    // 删除广告、查看热门图片
    (function () {
        // 删除广告
        $('._premium-lead-tag-search-bar').hide();
        // 查看热门图片
        $('.popular-introduction-overlay').hide();
    })();

    // 按收藏数搜索
    (function () {
        var icon = $('._discovery-icon').attr('src');
        var label = lang === 'zh' ? '收藏人数' : 'users入り';
        $('.navigation-menu-right').append(
            '<div class="menu-group">' +
            '    <a class="menu-item js-click-trackable-later">' +
            '           <img class="_howto-icon" src="' + icon + '">' +
            '           <span class="label">' + label + '：</span>' +
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
            if (!!$text.val()) {
                $('#suggest-container').submit();
            }
        });

        // 在提交搜索前处理搜索关键字
        $('#suggest-container').submit(function () {
            var $text = $('#suggest-input');
            var $favourite = $('#ahao_favourite_num_select');
            // 去除旧的搜索选项
            $text.val($text.val().replace(/\d*users入り/, ''));
            // 去除多余空格
            while ($text.val().indexOf('  ') > -1) {
                $text.val($text.val().replace('  ', ' '));
            }
            // 添加新的搜索选项
            $text.val($text.val() + ' ' + $favourite.val());
        });
    })();

    // 搜索UID和PID
    (function () {
        $.extend({
            search: function (option) {
                var options = $.extend({
                    right: '0px',
                    placeholder: '',
                    url: ''
                }, option);

                var $form = $('<form class="ui-search" ' +
                    '    style="position: static;width: 100px;" action="javascript:void(0);">' +
                    '<div class="container" style="width:80%;">' +
                    '    <input class="ahao-input" placeholder="' + options.placeholder + '" style="width:80%;"/>' +
                    '</div>' +
                    '<input type="submit" class="submit sprites-search-old" value="">' +
                    '</form>');
                $form.submit(function () {
                    var $input = $(this).find('.ahao-input');
                    var id = $input.val();
                    if (!/^[0-9]+$/.test(id)) {
                        var label = options.placeholder + (lang === 'zh' ? '不合法' : ' must digit');
                        alert(label);
                        return;
                    }
                    var url = option.url + id;
                    window.open(url);
                    $input.val('');
                });
                var $div = $('<div class="ahao-search"></div>').css('position', 'absolute')
                    .css('bottom', '44px')
                    .css('height', '30px')
                    .css('right', options.right);
                $div.append($form);
                $('#suggest-container').before($div);
            }
        });

        $.search({
            right: '235px',
            placeholder: 'UID',
            url: 'https://www.pixiv.net/member.php?id='
        });
        $.search({
            right: '345px',
            placeholder: 'PID',
            url: 'https://www.pixiv.net/member_illust.php?mode=medium&illust_id='
        });
    })();

    // 下载图片
    (function () {
        if (!(location.href.indexOf('member_illust.php') !== -1)) {
            return;
        }
        // 获取参数
        var src = $('.bookmark_modal_thumbnail').attr('data-src');
        if (!src) {
            console.log('下载图片失败! 找不到$(".bookmark_modal_thumbnail")');
            return;
        }
        var param = src.match(/img-master\/img([\s\S]*?)_/)[1];

        // 单图、多图、gif图三种模式
        var moreMode = !!$('a.read-more').length;
        var gifMode = !!$('div ._ugoku-illust-player-container').length;
        var singleMode = !moreMode && !gifMode;

        // 替换单图为大图
        (function () {
            if (!singleMode) {
                return;
            }
            console.log('加载单图模式');

            var img = $('.original-image').attr('data-src');
            $('div.works_display')
                .find('img')
                .attr('src', img)
                .css('width', '100%');
        })();

        // 下载动图
        (function () {
            if (!gifMode) {
                return;
            }
            console.log('加载gif图模式');

            var url = 'https://i.pximg.net/img-zip-ugoira/img' + param + '_ugoira600x600.zip';
            var label = lang === 'zh' ? '下载动图' : 'download gif';
            // 添加下载按钮
            $('div .bookmark-container').append(
                '<a href="' + url + '" class="_bookmark-toggle-button add-bookmark">' +
                '   <span class="bookmark-icon"></span><span class="description">' + label + '</span>' +
                '</a>');
        })();

        // 下载多图
        (function () {
            if (!moreMode) {
                return;
            }
            console.log('加载多图模式');

            var downloaded = 0;                             // 下载完成数量
            var num = parseInt($('a.read-more').text().match(/\d+/)); // 下载目标数量

            // 1. 添加下载按钮
            var zip = new JSZip();
            var label = lang === 'zh' ? '下载中' : 'downloading';
            var $a = $('<a class="_bookmark-toggle-button add-bookmark">' +
                '   <span class="bookmark-icon"></span><span class="description">' + label + '</span>' +
                '</a>');
            $a.on('click', function () {
                if (downloaded < num) {
                    return;
                }
                zip.generateAsync({type: 'blob', base64: true})
                    .then(function (content) {
                        saveAs(content, pid + '.zip'); // see FileSaver.js'
                    });
            });
            $('div .bookmark-container').append($a);

            // 2. 获取图片地址
            var ajaxs = [];
            var imgUrls = [];
            for (var i = 0; i < num; i++) {
                var url = 'https://www.pixiv.net/member_illust.php?mode=manga_big&illust_id=' + pid + '&page=' + i;
                var ajax = $.ajax({
                    type: 'GET',
                    url: url
                });
                ajaxs.push(ajax);
            }
            // 3. 获取所有图片url后
            $.when.apply($, ajaxs).then(function () {
                for (var i in arguments) {
                    if (arguments.hasOwnProperty(i)) {
                        var html = arguments[i][2].responseText;
                        var pattern = /(<img.+">)/;
                        var $img = $(html.match(pattern)[0]);
                        imgUrls.push($img.attr('src'));
                    }
                }

                // 4. 下载并压缩图片
                (function () {
                    for (var i = 0; i < num; i++) {
                        (function (index) {
                            var url = imgUrls[i];
                            // 4.1. 下载图片
                            GM_xmlhttpRequest({
                                method: 'GET',
                                headers: {referer: 'https://www.pixiv.net/'},
                                overrideMimeType: 'text/plain; charset=x-user-defined',
                                url: url,
                                onload: function (xhr) {
                                    // 转为blob类型
                                    var r = xhr.responseText,
                                        data = new Uint8Array(r.length),
                                        i = 0;
                                    while (i < r.length) {
                                        data[i] = r.charCodeAt(i);
                                        i++;
                                    }
                                    var blob = new Blob([data], {type: 'image/jpeg'});

                                    // 压缩图片
                                    downloaded++;
                                    var suffix = url.split('.').splice(-1);
                                    zip.file(pid + '_' + index + '.' + suffix, blob, {binary: true});

                                    if (downloaded === num) {
                                        var label1 = lang === 'zh' ? '下载多图' : 'download gif';
                                        $a.find('.description').text(label1 + '(' + downloaded + '/' + num + ')');
                                    } else {
                                        var label2 = lang === 'zh' ? '下载中' : 'downloading';
                                        $a.find('.description').text(label2 + ': ' + downloaded + '/' + num);
                                    }
                                }
                            });
                        })(i);
                    }
                })();
            }, function () {
                //失败回调，任意一个请求失败时返回
                var label = lang === 'zh' ? '下载失败' : 'download failure';
                $a.find('.description').text(label + ': ' + 0 + '/' + num);
            });
        })();
    })();

    // 显示画师id和背景图
    (function () {
        if (!(location.href.indexOf('member_illust.php') !== -1 ||
            location.href.indexOf('member.php') !== -1  )) {
            return;
        }
        // 用户名
        var $username = $('a.user-name');

        // 显示画师id
        console.log('画师id:' + uid);
        var $id = $('<span>ID: ' + uid + '</span>');
        $id.on('click', function () {
            var $this = $(this);
            var label = lang === 'zh' ? 'UID已复制到剪贴板' : 'UID copy to clipboard';
            $this.text(label);
            GM_setClipboard(uid);
            setTimeout(function () {
                $this.text('ID: ' + uid);
            }, 2000);
        });
        $username.after($id);

        // 显示画师背景图
        var url = $('body').css('background-image').replace('url(', '').replace(')', '').replace(/"/gi, "");
        var $div = $('<div style="text-align: center"></div>');
        if (!!url) {
            var tip1 = lang === 'zh' ? '背景图' : 'background';
            $div.append('<img src="' + url + '" width="10%">' +
                '<a target="_blank" href="' + url + ' ">' + tip1 + '</a>');
        } else {
            var tip2 = lang === 'zh' ? '无背景图' : 'no background';
            $div.append('<span>' + tip2 + '</span>');
        }
        $username.after($div);
    })();

    // 自动加载评论
    (function () {
        if (!(location.href.indexOf('member_illust.php') !== -1)) {
            return;
        }

        // 1秒加载一次评论
        var clickEvent = document.createEvent('MouseEvents');
        clickEvent.initEvent('click', true, true);
        setInterval(function () {
            var more = document.getElementsByClassName('_3aAuVt-')[0];
            if (!!more) {
                more.dispatchEvent(clickEvent);
            }
        }, 1000);
    })();
})(jQuery);
