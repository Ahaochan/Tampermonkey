// ==UserScript==
// @name        Pixiv 增强
// @name:zh     Pixiv 增强
// @name:en     Pixiv Plus
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.1.0
// @description 屏蔽广告, 查看热门图片, 按收藏数搜索, 搜索pid和uid, 替换大图, 下载gif、多图, 显示画师id、画师背景图, 自动加载评论。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @description:zh 屏蔽广告, 查看热门图片, 按收藏数搜索, 搜索pid和uid, 替换大图, 下载gif、多图, 显示画师id、画师背景图, 自动加载评论。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @description:en Block ads. Hide mask layer of popular pictures. Search by favorites. Search pid and uid. Replace with big picture. Download gif, multiple pictures. Display artist id, background pictures. Automatically load comments. Github:https://github.com/Ahaochan/Tampermonkey. Star and fork is welcome.
// @author      Ahaochan
// @include     http*://www.pixiv.net*
// @match       http://www.pixiv.net/
// @connect     i.pximg.net
// @supportURL  https://github.com/Ahaochan/Tampermonkey
// @grant       GM.xmlHttpRequest
// @grant       GM.setClipboard
// @require     https://code.jquery.com/jquery-2.2.4.min.js
// @require     https://cdn.bootcss.com/jszip/3.1.4/jszip.min.js
// @require     https://cdn.bootcss.com/FileSaver.js/1.3.2/FileSaver.min.js
// @run-at      document-end
// ==/UserScript==

$(function () {
    'use strict';
    // 加载依赖
    var lang = document.documentElement.getAttribute('lang');
    var pid = pixiv.context.illustId || 'unknown';
    var uid = pixiv.context.userId || 'unknown';
    var i18n = function (key) {
        if(!lang) { lang = 'en'; }
        var lib = {
            ja: {
                favorites: 'users入り',
            },
            en: {
                favorites: 'favorites',
                illegal: 'illegal',
                not_found: 'not found',
                download_mode_single: 'download single picture',
                download_mode_more: 'download more picture',
                download_mode_gif: 'download gif',
                downloading: 'downloading',
                download_failure: 'download failure',
                copy_to_clipboard: 'copy to Clipboard',
                background: 'background',
                background_not_found: 'no-background'
            },
            ko: {},
            zh: {
                favorites: '收藏人数',
                illegal: '不合法',
                not_found: '没找到',
                download_mode_single: '下载单图',
                download_mode_more: '下载多图',
                download_mode_gif: '下载gif图',
                downloading: '下载中',
                download_failure: '下载失败',
                copy_to_clipboard: '已复制到剪贴板',
                background: '背景图',
                background_not_found: '无背景图'
            },
            'zh-tw': {
                favorites: '收藏人數',
                illegal: '不合法',
                not_found: '沒找到',
                download_mode_single: '下載單圖',
                download_mode_more: '下載多圖',
                download_mode_gif: '下載gif圖',
                downloading: '下載中',
                download_failure: '下載失敗',
                copy_to_clipboard: '已復製到剪貼板',
                background: '背景圖',
                background_not_found: '無背景圖'
            }
        };
        // TODO 待翻译
        lib.ja = $.extend({}, lib.en, lib.ja);
        lib.ko = $.extend({}, lib.en, lib.ko);
        return lib[lang][key] || 'i18n['+lang+']['+key+'] not found';
    };

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
        var label = i18n('favorites'); // users入り
        // 1. 初始化UI
        $('.navigation-menu-right').append(
            '<div class="menu-group">' +
            '    <a class="menu-item js-click-trackable-later">' +
            '           <img class="_howto-icon" src="' + icon + '">' +
            '           <span class="label">' + label + '：</span>' +
            '           <select id="select-ahao-favorites">' +
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

        // 2. 如果已经有搜索字符串, 就在改变选项时直接搜索
        $('#select-ahao-favorites').on('change', function () {
            if (!!$('#suggest-input').val()) {
                $('#suggest-container').submit();
            }
        });

        // 3. 在提交搜索前处理搜索关键字
        $('#suggest-container').submit(function () {
            var $text = $('#suggest-input');
            var $favorites = $('#select-ahao-favorites');
            // 3.1. 去除旧的搜索选项
            $text.val(function (index, val) { return val.replace(/\d*users入り/g, ''); });
            // 3.2. 去除多余空格
            $text.val(function (index, val) { return val.replace(/\s\s+/g, ' '); });
            // 3.3. 添加新的搜索选项
            $text.val(function (index, val) { return val + ' ' + $favorites.val(); });
        });
    })();

    // 搜索UID和PID
    (function ($) {
        var initSearch = function (option) {
            var options = $.extend({ right: '0px',  placeholder: '',  url: '' }, option);

            // 1. 初始化表单UI
            var $form = $('<form class="ui-search" ' +
                '    style="position: static;width: 100px;">' +
                '<div class="container" style="width:80%;">' +
                '    <input class="ahao-input" placeholder="' + options.placeholder + '" style="width:80%;"/>' +
                '</div>' +
                '<input type="submit" class="submit sprites-search-old" value="">' +
                '</form>');
            var $div = $('<div class="ahao-search"></div>').css('position', 'absolute')
                .css('bottom', '44px')
                .css('height', '30px')
                .css('right', options.right);
            $div.append($form);
            $('#suggest-container').before($div);

            // 2. 绑定submit事件
            $form.submit(function (e) {
                e.preventDefault();

                var $input = $(this).find('.ahao-input');
                var id = $input.val();
                // 2.1. ID 必须为纯数字
                if (!/^[0-9]+$/.test(id)) {
                    var label = options.placeholder + i18n('illegal');
                    alert(label);
                    return;
                }
                // 2.2. 新窗口打开url
                var url = option.url + id;
                window.open(url);
                // 2.3. 清空input等待下次输入
                $input.val('');
            });
        };

        // 1. UID搜索
        initSearch({ right: '235px', placeholder: 'UID', url: 'https://www.pixiv.net/member.php?id=' });
        // 2. PID搜索
        initSearch({ right: '345px', placeholder: 'PID', url: 'https://www.pixiv.net/member_illust.php?mode=medium&illust_id='});
    })(jQuery);

    // 下载图片
    (function () {
        if (!(location.href.indexOf('member_illust.php') !== -1)) { return; }
        // 获取参数
        var src = $('.bookmark_modal_thumbnail').attr('data-src');
        if (!src) {
            console.log(i18n('download_failure') + '!' + i18n('not_found') + ' $(".bookmark_modal_thumbnail")');
            return;
        }
        var param = src.match(/img-master\/img([\s\S]*?)_/)[1];

        // 1. 单图、多图、gif图三种模式
        var moreMode = !!$('a.read-more').length;
        var gifMode = !!$('div ._ugoku-illust-player-container').length;
        var singleMode = !moreMode && !gifMode;

        // 2. 替换单图为大图
        (function () {
            if (!singleMode) { return; }
            console.log(i18n('download_mode_single'));

            // 2.1. 替换大图
            var imgUrl = $('.original-image').attr('data-src');
            $('div.works_display img').attr('src', imgUrl).css('width', '100%');
        })();

        // 3. 下载动图
        (function () {
            if (!gifMode) { return; }
            console.log(i18n('download_mode_gif'));

            var url = 'https://i.pximg.net/img-zip-ugoira/img' + param + '_ugoira600x600.zip';
            var label = i18n('download_mode_gif');
            // 3.1. 添加下载按钮
            $('div .bookmark-container').append(
                '<a href="' + url + '" class="_bookmark-toggle-button add-bookmark">' +
                '   <span class="bookmark-icon"></span><span class="description">' + label + '</span>' +
                '</a>');
        })();

        // 4. 下载多图
        (function () {
            if (!moreMode) { return; }
            console.log(i18n('download_mode_more'));

            var downloaded = 0;                                         // 下载完成数量
            var num = parseInt($('a.read-more').text().match(/\d+/));   // 下载目标数量

            // 1. 添加下载按钮
            var zip = new JSZip();
            var $a = $('<a class="_bookmark-toggle-button add-bookmark">' +
                '   <span class="bookmark-icon"></span>' +
                '   <span class="description">' + i18n('downloading') + '</span>' +
                '</a>');
            $('div .bookmark-container').append($a);
            $a.on('click', function () {
                // 1.1. 手动sync, 避免下载不完全
                if (downloaded < num) { return; }
                // 1.2. 使用jszip.js和FileSaver.js压缩并下载图片
                zip.generateAsync({type: 'blob', base64: true})
                    .then(function (content) { saveAs(content, pid + '.zip'); });
            });

            // 2. 获取所有图片地址
            var ajaxArray = [];
            var imgUrlArray = [];
            // 2.1. 初始化所有Ajax, 并加入数组等待同步
            for (var i = 0; i < num; i++) {
                var url = 'https://www.pixiv.net/member_illust.php?mode=manga_big&illust_id=' + pid + '&page=' + i;
                var ajax = $.ajax({ type: 'GET', url: url });
                ajaxArray.push(ajax);
            }

            $.when.apply($, ajaxArray).then(function () {
                // 2.2. 所有Ajax完成之后, 解析 html , 正则提取图片url
                for (var arg in arguments) {
                    if (!arguments.hasOwnProperty(arg)) { continue; }
                    var html = arguments[arg][2].responseText,
                        pattern = /(<img.+">)/,
                        $img = $(html.match(pattern)[0]);
                    imgUrlArray.push($img.attr('src'));
                }

                for (var i = 0; i < num; i++) {
                    // 2.3. 下载并压缩图片, 闭包存入i值
                    (function (index) {
                        var url = imgUrlArray[index];
                        // 2.4. 下载图片, https://wiki.greasespot.net/GM.xmlHttpRequest
                        GM.xmlHttpRequest({
                            method: 'GET', url: url,
                            headers: { referer: 'https://www.pixiv.net/' },
                            overrideMimeType: 'text/plain; charset=x-user-defined',
                            onload: function (xhr) {
                                // 2.4.1. 转为blob类型
                                var r = xhr.responseText, data = new Uint8Array(r.length), i = 0;
                                while (i < r.length) { data[i] = r.charCodeAt(i); i++; }
                                var blob = new Blob([data], {type: 'image/jpeg'});

                                // 2.4.2. 压缩图片
                                var suffix = url.split('.').splice(-1);
                                zip.file(pid + '_' + index + '.' + suffix, blob, {binary: true});

                                // 2.4.3. 手动sync, 避免下载不完全的情况
                                downloaded++;
                                if (downloaded === num) {
                                    $a.find('.description').text(i18n('download_mode_more') + '(' + downloaded + '/' + num + ')');
                                } else {
                                    $a.find('.description').text(i18n('downloading') + ': ' + downloaded + '/' + num);
                                }
                            }
                        });
                    })(i);
                }
            }, function () {
                // 2.5. 失败回调，任意一个请求失败时返回
                $a.find('.description').text(i18n('download_failure') + ': ' + 0 + '/' + num);
            });
        })();
    })();

    // 显示画师id和背景图
    (function () {
        if (!(location.href.indexOf('member_illust.php') !== -1 ||
                location.href.indexOf('member.php') !== -1  )) {
            return;
        }
        // 1. 获取用户名的元素
        var $username = $('a.user-name');

        // 2. 显示画师id
        var $id = $('<span>ID: ' + uid + '</span>');
        // 2.1. 点击自动复制到剪贴板
        $id.on('click', function () {
            var $this = $(this);
            $this.text('UID' + i18n('copy_to_clipboard'));
            GM.setClipboard(uid);
            setTimeout(function () { $this.text('ID: ' + uid); }, 2000);
        });
        $username.after($id);

        // 3. 显示画师背景图
        var url = $('body').css('background-image').replace('url(', '').replace(')', '').replace(/"/gi, "");
        var $div = $('<div style="text-align: center"></div>');
        if (!!url && url !== 'none') {
            $div.append('<img src="' + url + '" width="10%">' +
                '<a target="_blank" href="' + url + ' ">' + i18n('background') + '</a>');
        } else {
            $div.append('<span>' + i18n('background_not_found') + '</span>');
        }
        $username.after($div);
    })();

    // 自动加载评论
    (function () {
        if (!(location.href.indexOf('member_illust.php') !== -1)) { return; }

        // 1秒加载一次评论
        setInterval(function () {
            $('._comment-item').next().find('div button').click();
        }, 1000);

    })();
});
