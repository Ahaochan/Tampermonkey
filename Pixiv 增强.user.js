// ==UserScript==
// @name        Pixiv Plus
// @name:zh-CN  Pixiv 增强
// @name:zh-TW  Pixiv 增強
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.2.5
// @description Block ads. Hide mask layer of popular pictures. Search by favorites. Search pid and uid. Replace with big picture. Download gif, multiple pictures. Display artist id, background pictures. Automatically load comments. Github:https://github.com/Ahaochan/Tampermonkey. Star and fork is welcome.
// @description:zh-CN 屏蔽广告, 查看热门图片, 按收藏数搜索, 搜索pid和uid, 替换大图, 下载gif、多图, 显示画师id、画师背景图, 自动加载评论。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @description:zh-TW 屏蔽廣告, 查看熱門圖片, 按收藏數搜索, 搜索pid和uid, 替換大圖, 下載gif、多圖, 顯示畫師id、畫師背景圖, 自動加載評論。github:https://github.com/Ahaochan/Tampermonkey，歡迎star和fork。
// @author      Ahaochan
// @include     http*://www.pixiv.net*
// @match       http://www.pixiv.net/
// @connect     i.pximg.net
// @supportURL  https://github.com/Ahaochan/Tampermonkey
// @grant       unsafeWindow
// @grant       GM.xmlHttpRequest
// @grant       GM.setClipboard
// @require     https://code.jquery.com/jquery-2.2.4.min.js
// @require     https://cdn.bootcss.com/jszip/3.1.4/jszip.min.js
// @require     https://cdn.bootcss.com/FileSaver.js/1.3.2/FileSaver.min.js
// @run-at      document-end
// ==/UserScript==

jQuery(function ($) {
    'use strict';
    // 加载依赖
    var executeMutationObserver = function (option) {
        var options = $.extend({
            type: 'childList',
            attributeName: [],
            isValid: function () {
                return false;
            },
            execute: function (addedNodes) {
            }
        }, option);

        // 2.1. MutationObserver 处理
        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        var mutationObserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (options.type !== mutation.type) {
                    return;
                }
                if (options.type === 'attributes' && options.attributeName && options.attributeName.indexOf(mutation.attributeName) < 0) {
                    return;
                }
                if (mutation.target && typeof mutation.target !== 'object') {
                    return;
                }
                var $parent = $(mutation.target).parent();
                if (!options.isValid($parent)) {
                    return;
                }
                options.execute($parent);

            });
        });
        mutationObserver.observe(document.getElementsByTagName('body')[0], {
            childList: true,
            subtree: true,
            attributes: true
        });

        // 2.2. 定时处理, 避免 MutationObserver 来不及加载的情况, 10秒后交由 MutationObserver 接管
        var intervalId = setInterval(function () {
            var $body = $('body');
            if (!options.isValid($body)) {
                return;
            }
            options.execute($body);
        }, 1000);
        setTimeout(function () {
            window.clearInterval(intervalId);
        }, 10000);
    };

    // ============================ i18n 国际化 ===============================
    var lang = document.documentElement.getAttribute('lang'),
        pixiv = unsafeWindow.pixiv, globalInitData = unsafeWindow.globalInitData;
    var i18n = function (key) {
        if (!lang) {
            lang = 'en';
        }
        var lib = {
            ja: {
                favorites: 'users入り',
                loginWarning: 'Pixiv Plus Script Warning! Please login to Pixiv for a better experience! Failure to login may result in unpredictable bugs!'
            },
            en: {
                favorites: 'favorites',
                illegal: 'illegal',
                not_found: 'not found',
                download_mode_single: 'download single picture',
                download_mode_more: 'download more picture',
                download_mode_gif: 'download gif',
                download: 'download',
                download_wait: 'please wait download completed',
                download_failure: 'download failure',
                copy_to_clipboard: 'copy to Clipboard',
                background: 'background',
                background_not_found: 'no-background',
                loginWarning: 'Pixiv Plus Script Warning! Please login to Pixiv for a better experience! Failure to login may result in unpredictable bugs!'
            },
            ko: {},
            zh: {
                favorites: '收藏人数',
                illegal: '不合法',
                not_found: '没找到',
                download_mode_single: '下载单图',
                download_mode_more: '下载多图',
                download_mode_gif: '下载gif图',
                download: '下载',
                download_wait: '请等待下载完成',
                download_failure: '下载失败',
                copy_to_clipboard: '已复制到剪贴板',
                background: '背景图',
                background_not_found: '无背景图',
                loginWarning: 'Pixiv增强 脚本警告! 请登录Pixiv获得更好的体验! 未登录可能产生不可预料的bug!'
            },
            'zh-tw': {
                favorites: '收藏人數',
                illegal: '不合法',
                not_found: '沒找到',
                download_mode_single: '下載單圖',
                download_mode_more: '下載多圖',
                download_mode_gif: '下載gif圖',
                download: '下載',
                download_wait: '請等待下載完成',
                download_failure: '下載失敗',
                copy_to_clipboard: '已復製到剪貼板',
                background: '背景圖',
                background_not_found: '無背景圖',
                loginWarning: 'Pixiv增強 腳本警告! 請登錄Pixiv獲得更好的體驗! 未登錄可能產生不可預料的bug!'
            }
        };
        lib['zh-CN'] = $.extend({}, lib.zh);
        // TODO 待翻译
        lib.ja = $.extend({}, lib.en, lib.ja);
        lib.ko = $.extend({}, lib.en, lib.ko);

        return lib[lang][key] || 'i18n[' + lang + '][' + key + '] not found';
    };

    // ============================ url 页面判断 ==============================
    var isArtworkPage = /.+member_illust.php?.*illust_id=\d+.*/.test(location.href);
    var isMemberPage = /.+member.php?.*id=\d+.*/.test(location.href);

    // ============================ 反混淆 ====================================
    let confusedLib = {};
    setInterval(function () {
        let webpackJsonp = unsafeWindow.webpackJsonp;
        let filter = webpackJsonp.map(value => value[1]).filter(value => value && !Array.isArray(value) && typeof value === 'object');
        $.each(filter, (index, obj) => {
            for(let key in obj){
                if(!obj.hasOwnProperty(key)) {
                    continue;
                }
                let tmp = {};
                try { obj[key](tmp); } catch(err) { continue; };
                if(tmp.hasOwnProperty('exports')) {
                    confusedLib = $.extend(confusedLib, tmp.exports);
                }
            }
        });
    }, 1000);
    var confused = function (key) {
        return confusedLib[key] || 'confused[' + key + '] not found';
    };

    // ============================ 全局参数 ====================================
    var pid = (pixiv && pixiv.context.illustId) || (globalInitData && Object.keys(globalInitData.preload.illust)[0]) || 'unknown';
    var uid = (pixiv && pixiv.context.userId) || (globalInitData && Object.keys(globalInitData.preload.user)[0]) || 'unknown';

    // 判断是否登录
    if (dataLayer[0].login === 'no') {
        alert(i18n('loginWarning'));
    }

    // 1. 删除广告、查看热门图片
    (function () {
        // 1. 删除静态添加的广告
        $('._premium-lead-tag-search-bar').hide();
        $('.popular-introduction-overlay').hide();// 移除热门图片遮罩层

        // 2. 删除动态添加的广告
        executeMutationObserver({
            type: 'childList',
            isValid: function () {
                return true;
            },
            execute: function ($parent) {
                // 2.1. 隐藏广告
                (function () {
                    var adSelector = ['iframe', '._premium-lead-promotion-banner', '.'+confused('alertContainer')];
                    var $ad = $parent.find(adSelector.join(','));
                    if (!$ad.length) {
                        return;
                    }
                    $ad.hide();
                })();

                // 2.2. 移除class
                (function () {
                    var $figure = $parent.find('figure');
                    if (!$figure.length) {
                        return false;
                    }
                    var classSelector = ['.'+confused('blur')];
                    var $class = $parent.find(classSelector.join(','));
                    if (!$class.length) {
                        return;
                    }
                    $class.removeClass(classSelector.map(function (value) { return value.replace('.', ''); }).join(' '));
                })();
            }
        });
    })();

    // 2. 按收藏数搜索
    (function () {
        var label = i18n('favorites'); // users入り

        // 1. 初始化通用页面UI
        (function () {
            if (isArtworkPage) {
                return;
            }
            console.log("初始化通用页面 按收藏数搜索");
            var icon = $('._discovery-icon').attr('src');
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
        })();

        // 2. 初始化作品页面UI
        (function () {
            if (!isArtworkPage) {
                return;
            }
            console.log("初始化作品页面 按收藏数搜索");
            executeMutationObserver({
                type: 'childList',
                isValid: function ($parent) {
                    // 1. 判断是否添加完毕
                    if (!!$parent.find('#select-ahao-favorites').length) {
                        return false;
                    }

                    // 2. 判断[发现]节点是否加入dom
                    var $discovery = $parent.find('a[href="/discovery"]');
                    if (!$discovery.length) {
                        return false;
                    }
                    return true;
                },
                execute: function ($parent) {
                    var $discovery = $parent.find('a[href="/discovery"]');
                    // 3. clone [发现]节点, 移除href属性, 避免死循环
                    var $tabGroup = $discovery.closest('div');
                    var $tab = $discovery.closest('ul').clone();
                    $tab.find('a[href="/discovery"]').attr('href', 'javascript:void(0)');

                    // 4. 加入dom中
                    $tabGroup.prepend($tab);
                    $tab.find('a').contents().last()[0].textContent = label;
                    $tab.find('a').after('' +
                        '<select id="select-ahao-favorites">' +
                        '    <option value=""></option>' +
                        '    <option value="10000users入り">10000users入り</option>' +
                        '    <option value="5000users入り" > 5000users入り</option>' +
                        '    <option value="1000users入り" > 1000users入り</option>' +
                        '    <option value="500users入り"  >  500users入り</option>' +
                        '    <option value="300users入り"  >  300users入り</option>' +
                        '    <option value="100users入り"  >  100users入り</option>' +
                        '    <option value="50users入り"   >   50users入り</option>' +
                        '</select>');
                }
            });
        })();

        // 3. 如果已经有搜索字符串, 就在改变选项时直接搜索
        $('body').on('change', '#select-ahao-favorites', function () {
            if (!!$('input[name="word"]').val()) {
                $('form[action="/search.php"]').submit();
            }
        });

        // 4. 在提交搜索前处理搜索关键字
        $('form[action="/search.php"]').submit(function () {
            var $text = $(this).find('input[name="word"]');
            var $favorites = $('#select-ahao-favorites');
            // 3.1. 去除旧的搜索选项
            $text.val(function (index, val) {
                return val.replace(/\d*users入り/g, '');
            });
            // 3.2. 去除多余空格
            $text.val(function (index, val) {
                return val.replace(/\s\s+/g, ' ');
            });
            // 3.3. 添加新的搜索选项
            $text.val(function (index, val) {
                return val + ' ' + $favorites.val();
            });
        });
    })();

    // 3. 搜索UID和PID
    (function () {
        // 1. 初始化通用页面UI
        (function () {
            if (isArtworkPage) {
                return;
            }
            console.log("初始化通用页面 搜索UID和PID");
            var initSearch = function (option) {
                var options = $.extend({right: '0px', placeholder: '', url: ''}, option);

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
            initSearch({right: '235px', placeholder: 'UID', url: 'https://www.pixiv.net/member.php?id='});
            // 2. PID搜索
            initSearch({
                right: '345px',
                placeholder: 'PID',
                url: 'https://www.pixiv.net/member_illust.php?mode=medium&illust_id='
            });
        })();

        // 2. 初始化作品页面UI
        (function () {
            if (!isArtworkPage) {
                return;
            }
            console.log("初始化作品页面 搜索UID和PID");
            executeMutationObserver({
                type: 'childList',
                isValid: function ($parent) {
                    // 1. 判断是否添加完毕
                    if (!!$parent.find('.ahao-search').length) {
                        return false;
                    }

                    // 2. 判断 form 节点是否加入dom
                    var $form = $parent.find('form[action="/search.php"]');
                    if (!$form.length) {
                        return false;
                    }
                    return true;
                },
                execute: function ($parent) {
                    var $form = $parent.find('form[action="/search.php"]');
                    // 3. 使用flex布局包裹
                    var $flexBox = $('<div></div>').css('display', 'flex');
                    $form.wrap($flexBox);
                    $flexBox = $form.closest('div');

                    var initSearch = function (option) {
                        var options = $.extend({
                            placeholder: '',
                            url: ''
                        }, option);

                        // 4. clone form表单
                        var $cloneForm = $form.clone();
                        $cloneForm.attr('action', '').addClass('ahao-search').css('margin-right', '15px').css('width', '126px');
                        $cloneForm.find('input[name="s_mode"]').remove(); // 只保留一个input
                        $cloneForm.find('input:first').attr('placeholder', options.placeholder).attr('name', options.placeholder).css('width', '64px');
                        $flexBox.prepend($cloneForm);

                        // 5. 绑定submit事件
                        $cloneForm.submit(function (e) {
                            e.preventDefault();

                            var $input = $(this).find('input[name="' + options.placeholder + '"]');
                            var id = $input.val();
                            // ID 必须为纯数字
                            if (!/^[0-9]+$/.test(id)) {
                                var label = options.placeholder + i18n('illegal');
                                alert(label);
                                return;
                            }
                            // 新窗口打开url
                            var url = option.url + id;
                            window.open(url);
                            // 清空input等待下次输入
                            $input.val('');
                        });
                    };
                    // 1. UID搜索
                    initSearch({placeholder: 'UID', url: 'https://www.pixiv.net/member.php?id='});
                    // 2. PID搜索
                    initSearch({
                        placeholder: 'PID',
                        url: 'https://www.pixiv.net/member_illust.php?mode=medium&illust_id='
                    });
                }
            });
        })();
    })();

    // 4. 下载图片
    (function () {
        if (!isArtworkPage) {
            return;
        }
        executeMutationObserver({
            type: 'attributes',
            attributeName: ['src', 'srcset'],
            isValid: function ($parent) {
                // 1. 判断 执行完毕
                var $img = $parent.find('img.' + confused('illust'));
                if (!$img.length || (/.+original.+/.test($img.attr('src')) && !$img.attr('srcset'))) {
                    return false;
                }
                return true;
            },
            execute: function ($parent) {
                // 1. 单图、多图、gif图三种模式
                var moreMode = !!$('a.' + confused('mangaViewLink')).length;
                var gifMode = !!$('button.' + confused('play')).length;
                var singleMode = !moreMode && !gifMode;
                if (!singleMode) {
                    return;
                }
                console.log(i18n('download_mode_single'));

                // 2. 替换大图
                var $img = $parent.find('img.' + confused('illust'));
                var url = $img.closest('a').attr('href');
                if(!url) {
                    // 当 18R 等情况下, 通过a标签获取原图失败, 则从 globalInitData 获取数据
                    url = globalInitData && globalInitData.preload.illust[pid].urls.original;
                }
                $img.attr('src', url).attr('srcset', '');

            }
        });
        executeMutationObserver({
            type: 'childList',
            isValid: function ($parent) {
                // 1. 判断 figure 节点是否加入dom
                var $figure = $parent.find('figure');
                if (!$figure.length) {
                    return false;
                }

                // 2. 判断 执行完毕
                var $sharBtn = $parent.find('.' + confused('shareButtonContainer'));
                if (!$sharBtn.length || !!$parent.find('#ahao-download-btn').length) {
                    return false;
                }
                return true;
            },
            execute: function ($parent) {
                // 1. 单图、多图、gif图三种模式
                var moreMode = !!$('a.' + confused('mangaViewLink')).length;
                var gifMode = !!$('button.' + confused('play')).length;
                var singleMode = !moreMode && !gifMode;
                if (!gifMode) {
                    return;
                }
                console.log(i18n('download_mode_gif'));

                // 2. 初始化 zip url
                var url = (pixiv && pixiv.context.ugokuIllustData.src) || (globalInitData && globalInitData.preload.illust[pid].urls.original);
                url = url.replace('img-original', 'img-zip-ugoira').replace(/ugoira0\.\w+/, 'ugoira1920x1080.zip');

                // 3. 初始化 下载按钮, 复制分享按钮并旋转180度
                var $shareButtonContainer = $parent.find('.' + confused('shareButtonContainer'));
                var $downloadButtonContainer = $shareButtonContainer.clone();
                $downloadButtonContainer.attr('id', 'ahao-download-btn')
                    .removeClass(confused('shareButtonContainer'))
                    .css('margin-right', '10px')
                    .css('position', 'relative');
                $downloadButtonContainer.find('button').css('transform', 'rotate(180deg)')
                    .on('click', function () {
                        window.open(url);
                    });
                $shareButtonContainer.after($downloadButtonContainer);
            }
        });
        executeMutationObserver({
            type: 'childList',
            isValid: function ($parent) {
                // 1. 判断 figure 节点是否加入dom
                var $figure = $parent.find('figure');
                if (!$figure.length) {
                    return false;
                }

                // 2. 判断 执行完毕
                var $sharBtn = $parent.find('.' + confused('shareButtonContainer'));
                if (!$sharBtn.length || !!$parent.find('#ahao-download-btn').length) {
                    return false;
                }
                return true;
            },
            execute: function ($parent) {
                // 1. 单图、多图、gif图三种模式
                var moreMode = !!$('a.' + confused('mangaViewLink')).length;
                var gifMode = !!$('button.' + confused('play')).length;
                var singleMode = !moreMode && !gifMode;
                if (!moreMode) {
                    return;
                }
                console.log(i18n('download_mode_more'));

                // 2. 初始化 图片数量, 图片url
                var zip = new JSZip();
                var downloaded = 0;                                                         // 下载完成数量
                var num = (globalInitData && globalInitData.preload.illust[pid].pageCount); // 下载目标数量
                var url = globalInitData.preload.illust[Object.keys(globalInitData.preload.illust)[0]].urls.original;
                var imgUrls = Array(num).fill().map(function (value, index) {
                    return url.replace(/_p\d\./, '_p' + index + '.');
                });

                // 3. 初始化 下载按钮, 复制分享按钮并旋转180度
                var $shareButtonContainer = $parent.find('.' + confused('shareButtonContainer'));
                var $downloadButtonContainer = $shareButtonContainer.clone();
                $downloadButtonContainer.attr('id', 'ahao-download-btn')
                    .removeClass(confused('shareButtonContainer'))
                    .css('margin-right', '10px')
                    .css('position', 'relative')
                    .append('<p>' + i18n('download') + '0/' + num + '</p>');
                $downloadButtonContainer.find('button').css('transform', 'rotate(180deg)')
                    .on('click', function () {
                        // 3.1. 手动sync, 避免下载不完全
                        if (downloaded < num) {
                            alert(i18n('download_wait'));
                            return;
                        }
                        // 3.2. 使用jszip.js和FileSaver.js压缩并下载图片
                        zip.generateAsync({type: 'blob', base64: true})
                            .then(function (content) {
                                saveAs(content, pid + '.zip');
                            });
                    });
                $shareButtonContainer.after($downloadButtonContainer);

                // 4. 下载图片, https://wiki.greasespot.net/GM.xmlHttpRequest
                var mimeType = function (suffix) {
                    var lib = {
                        png: "image/png",
                        jpg: "image/jpeg",
                        gif: "image/gif"
                    };
                    return lib[suffix] || 'mimeType[' + suffix + '] not found';
                };
                $.each(imgUrls, function (index, url) {
                    GM.xmlHttpRequest({
                        method: 'GET', url: url,
                        headers: {referer: 'https://www.pixiv.net/'},
                        overrideMimeType: 'text/plain; charset=x-user-defined',
                        onload: function (xhr) {
                            // 4.1. 转为blob类型
                            var r = xhr.responseText, data = new Uint8Array(r.length), i = 0;
                            while (i < r.length) {
                                data[i] = r.charCodeAt(i);
                                i++;
                            }
                            var suffix = url.split('.').splice(-1);
                            var blob = new Blob([data], {type: mimeType(suffix)});

                            // 4.2. 压缩图片
                            zip.file(pid + '_' + index + '.' + suffix, blob, {binary: true});

                            // 4.3. 手动sync, 避免下载不完全的情况
                            downloaded++;
                            $downloadButtonContainer.find('p').html(i18n('download') + '' + downloaded + '/' + num);
                        }
                    });
                });
            }
        });
    })();

    // 5. 显示画师id和背景图
    (function () {

        // 画师页面UI
        (function () {
            if (!isMemberPage) {
                return;
            }

            // 1. 获取用户名的元素
            var $username = $('a.user-name');

            // 2. 显示画师背景图
            var url = $('body').css('background-image').replace('url(', '').replace(')', '').replace(/"/gi, "");
            var $div = $('<div style="text-align: center"></div>');
            if (!!url && url !== 'none') {
                $div.append('<img src="' + url + '" width="10%">' +
                    '<a target="_blank" href="' + url + ' ">' + i18n('background') + '</a>');
            } else {
                $div.append('<span>' + i18n('background_not_found') + '</span>');
            }
            $username.after($div);

            // 3. 显示画师id, 点击自动复制到剪贴板
            var $uid = $('<span>UID: ' + uid + '</span>')
                .on('click', function () {
                    var $this = $(this);
                    $this.text('UID' + i18n('copy_to_clipboard'));
                    GM.setClipboard(uid);
                    setTimeout(function () {
                        $this.text('UID: ' + uid);
                    }, 2000);
                });
            $username.after($uid);
        })();

        // 作品页面UI
        (function () {
            if (!isArtworkPage) {
                return;
            }

            executeMutationObserver({
                type: 'childList',
                isValid: function ($parent) {
                    // 1. 判断 画师名称 节点是否加入dom
                    var $authorName = $parent.find('.' + confused('authorName'));
                    if (!$authorName.length) {
                        return false;
                    }

                    // 2. 判断 执行完毕
                    var $uid = $parent.find('#ahao-uid'), $background = $parent.find('#ahao-background');
                    if (!!$uid.length || !!$background.length) {
                        return false;
                    }
                    return true;
                },
                execute: function ($parent) {
                    console.log("显示画师id和背景图");
                    var $authorName = $parent.find('.' + confused('authorName'));
                    var $authorMeta = $authorName.closest('div.' + confused('authorMeta'));

                    // 1. 显示画师背景图
                    var background = globalInitData.preload.user[uid].background;
                    var url = (background && background.url) || '';
                    var $authorTopRow = $authorName.closest('div.' + confused('authorTopRow'));
                    var $authorSecondRow = $authorTopRow.clone().attr('id', 'ahao-background');
                    $authorSecondRow.children('a').remove();

                    $authorSecondRow.prepend('<img src="' + url + '" width="10%"/>');
                    $authorSecondRow.find('div a').attr('href', !!url ? url : 'javascript:void(0)').attr('target', '_blank')
                        .text(!!url ? i18n('background') : i18n('background_not_found'));
                    $authorTopRow.after($authorSecondRow);

                    // 2. 显示画师id, 点击自动复制到剪贴板
                    var $uid = $authorMeta.clone();
                    $uid.find('a').attr('href', 'javascript:void(0)').attr('id', 'ahao-uid').text('UID: ' + uid);
                    $uid.on('click', function () {
                        var $this = $(this);
                        $this.find('a').text('UID' + i18n('copy_to_clipboard'));
                        GM.setClipboard(uid);
                        setTimeout(function () {
                            $this.find('a').text('UID: ' + uid);
                        }, 2000);
                    });
                    $authorMeta.after($uid);
                }
            });
        })();
    })();

    // 6. 自动加载评论
    (function () {
        if (!isArtworkPage) {
            return;
        }
        executeMutationObserver({
            type: 'childList',
            isValid: function ($parent) {
                // 1. 判断 查看更多评论 节点是否加入dom
                var $showMoreButton = $parent.find('.' + confused('showMoreButton'));
                if (!$showMoreButton.length) {
                    return false;
                }
                return true;
            },
            execute: function ($parent) {
                $parent.find('.' + confused('showMoreButton')).click();
            }
        });
    })();
});
