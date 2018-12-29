// ==UserScript==
// @name        Pixiv Plus
// @name:zh-CN  Pixiv 增强
// @name:zh-TW  Pixiv 增強
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.4.4
// @icon        http://www.pixiv.net/favicon.ico
// @description Focus on immersive experience, 1. Block ads, directly access popular images 2. Search using users to search for 3. Search pid and uid 4. Display original image of single image, download original image|gif image|motion frame Zip|multiple map zip 5. display artist id, artist background image 6. auto load comment 7. dynamic markup work type 8. remove redirect 9. single page sort. github: https://github.com/Ahaochan/Tampermonkey, welcome star and fork.
// @description:ja    没入型の体験に焦点を当てる. 1. 広告をブロックして人気のある画像に直接アクセスする 2.ユーザーを使って検索する 3. pidとuidを検索する 4.単一の画像の元の画像を表示し、元の画像をダウンロードする| gif画像| Zip |複数のマップのジップ 5.表示アーティストID、アーティスト背景画像 6.自動読み込みコメント 7.動的マークアップ作業タイプ 8.リダイレクトを削除 9.シングルページソート github:https://github.com/Ahaochan/Tampermonkey, welcome star and fork.
// @description:zh-CN 专注沉浸式体验, 1. 屏蔽广告, 直接访问热门图片 2. 使用users入り的方式进行搜索 3. 搜索pid和uid 4. 显示单图多图的原图, 下载原图|gif图|动图帧zip|多图zip 5. 显示画师id、画师背景图 6. 自动加载评论 7. 对动态标记作品类型 8. 去除重定向 9.单页排序 github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @description:zh-TW 專注沉浸式體驗, 1. 屏蔽廣告, 直接訪問熱門圖片 2. 使用users入り的方式進行搜索 3. 搜索pid和uid 4. 顯示單圖多圖的原圖, 下載原圖|gif圖|動圖幀zip|多圖zip 5. 顯示畫師id、畫師背景圖 6. 自動加載評論 7. 對動態標記作品類型 8. 去除重定向 9.單頁排序 github:https://github.com/Ahaochan/Tampermonkey，歡迎star和fork。
// @author      Ahaochan
// @include     http*://www.pixiv.net*
// @match       http://www.pixiv.net/
// @connect     i.pximg.net
// @license     GPL-3.0
// @supportURL  https://github.com/Ahaochan/Tampermonkey
// @grant       unsafeWindow
// @grant       GM.xmlHttpRequest
// @grant       GM.setClipboard
// @grant       GM_addStyle
// @require     https://code.jquery.com/jquery-2.2.4.min.js
// @require     https://cdn.bootcss.com/jszip/3.1.4/jszip.min.js
// @require     https://cdn.bootcss.com/FileSaver.js/1.3.2/FileSaver.min.js
// @require     https://greasyfork.org/scripts/2963-gif-js/code/gifjs.js?version=8596
// @run-at      document-end
// @noframes
// ==/UserScript==

jQuery(function ($) {
    'use strict';
    // 加载依赖
    // ============================ jQuery插件 ====================================
    $.fn.extend({
        fitWindow: function () {
            this.css('width', 'auto').css('height', 'auto')
                .css('max-width', '').css('max-height', $(window).height());
        },
        replaceTagName: function(replaceWith) {
            var tags = [],
                i    = this.length;
            while (i--) {
                var newElement = document.createElement(replaceWith),
                    thisi      = this[i],
                    thisia     = thisi.attributes;
                for (var a = thisia.length - 1; a >= 0; a--) {
                    var attrib = thisia[a];
                    newElement.setAttribute(attrib.name, attrib.value);
                };
                newElement.innerHTML = thisi.innerHTML;
                $(thisi).after(newElement).remove();
                tags[i] = newElement;
            }
            return $(tags);
        },
        getBackgroundUrl: function () {
            let imgUrls = [];
            this.each(function (index, ele) {
                let bgUrl = ele.style.backgroundImage || 'url("")';
                bgUrl = bgUrl.match(/url\((['"])(.*?)\1\)/)[2];
                imgUrls.push(bgUrl);
            });
            return imgUrls.length === 1 ? imgUrls[0] : imgUrls;
        }
    });

    // ============================ 全局CSS ===================================
    GM_addStyle('._2lyPnMP._1dTH3iR:before { display: none }'); // 解决用户头像hack后的before内容填充整个页面的问题

    // ============================ 全局参数 ====================================
    let lang = document.documentElement.getAttribute('lang') || 'en',
        globalInitData = unsafeWindow.globalInitData,
        illustJson = {};
    let illust = function () {
        // 1. 判断是否已有作品id(兼容按左右方向键翻页的情况)
        let preIllustId = $('body').attr('ahao_illust_id');
        let urlIllustId = new URL(location.href).searchParams.get("illust_id");
        // 2. 如果illust_id没变, 则不更新json
        if (parseInt(preIllustId) === parseInt(urlIllustId)) {
            return illustJson;
        }
        // 3. 如果illust_id变化, 则持久化illust_id, 且同步更新json
        if(!!urlIllustId) {
            $('body').attr('ahao_illust_id', urlIllustId);
            $.ajax({
                url: '/ajax/illust/' + urlIllustId,
                dataType: 'json',
                async: false,
                success: response => illustJson = response.body
            });
        }
        return illustJson;
    };
    console.log(illust());
    let uid = illust().userId || (globalInitData && Object.keys(globalInitData.preload.user)[0]) || (pixiv && pixiv.context.userId) || 'unknown';
    let mimeType = suffix => {
        let lib = {png: "image/png", jpg: "image/jpeg", gif: "image/gif"};
        return lib[suffix] || 'mimeType[' + suffix + '] not found';
    };
    let observerFactory = function (option) {
        let options;
        if(typeof option === 'function'){
            options = {
                callback: option,
                node: document.getElementsByTagName('body')[0],
                option:{childList: true, subtree: true}
            };
        } else {
            options = $.extend({
                callback:()=>{},
                node: document.getElementsByTagName('body')[0],
                option:{childList: true, subtree: true}
            }, option);
        }
        let MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver,
            observer = new MutationObserver(options.callback);
        observer.observe(options.node, options.option);
        return observer;
    };
    let isLogin = function () {
        let status = 0;
        $.ajax({url: 'https://www.pixiv.net/setting_user.php', async: false})
            .done((data, statusText, xhr)=>status=xhr.status);
        return status === 200;
    };

    // ============================ i18n 国际化 ===============================
    let i18nLib = {
        ja: {
            favorites: 'users入り',
        },
        en: {
            favorites: 'favorites',
            illegal: 'illegal',
            download: 'download',
            download_wait: 'please wait download completed',
            copy_to_clipboard: 'copy to Clipboard',
            background: 'background',
            background_not_found: 'no-background',
            loginWarning: 'Pixiv Plus Script Warning! Please login to Pixiv for a better experience! Failure to login may result in unpredictable bugs!',
            illust_type_single: '[single pic]',
            illust_type_multiple: '[multiple pic]',
            illust_type_gif: '[gif pic]',
        },
        ko: {},
        zh: {
            favorites: '收藏人数',
            illegal: '不合法',
            download: '下载',
            download_wait: '请等待下载完成',
            copy_to_clipboard: '已复制到剪贴板',
            background: '背景图',
            background_not_found: '无背景图',
            loginWarning: 'Pixiv增强 脚本警告! 请登录Pixiv获得更好的体验! 未登录可能产生不可预料的bug!',
            illust_type_single: '[单图]',
            illust_type_multiple: '[多图]',
            illust_type_gif: '[gif图]',
        },
        'zh-CN': {},
        'zh-tw': {
            favorites: '收藏人數',
            illegal: '不合法',
            download: '下載',
            download_wait: '請等待下載完成',
            copy_to_clipboard: '已復製到剪貼板',
            background: '背景圖',
            background_not_found: '無背景圖',
            loginWarning: 'Pixiv增強 腳本警告! 請登錄Pixiv獲得更好的體驗! 未登錄可能產生不可預料的bug!',
            illust_type_single: '[單圖]',
            illust_type_multiple: '[多圖]',
            illust_type_gif: '[gif圖]',
        }
    };
    i18nLib['zh-CN'] = $.extend({}, i18nLib.zh);
    // TODO 待翻译
    i18nLib.ja = $.extend({}, i18nLib.en, i18nLib.ja);
    i18nLib.ko = $.extend({}, i18nLib.en, i18nLib.ko);
    let i18n = key => i18nLib[lang][key] || 'i18n[' + lang + '][' + key + '] not found';

    // ============================ url 页面判断 ==============================
    let isArtworkPage = () => /.+member_illust\.php\?.*illust_id=\d+.*/.test(location.href);

    let isMemberIndexPage = () => /.+member.php.*id=\d+.*/.test(location.href);
    let isMemberIllustPage = () => /.+\/member_illust\.php\?id=\d+/.test(location.href);
    let isMemberBookmarkPage = () => /.+\/bookmark\.php\?id=\d+/.test(location.href);
    let isMemberFriendPage = () => /.+\/mypixiv_all\.php\?id=\d+/.test(location.href);
    let isMemberDynamicPage = () => /.+\/stacc.+/.test(location.href);
    let isMemberPage =  () => isMemberIndexPage() || isMemberIllustPage() || isMemberBookmarkPage() || isMemberFriendPage || isMemberDynamicPage(),
        isSearchPage = () => /.+\/search\.php.*/.test(location.href);

    // ============================ 反混淆 ====================================
    let unique = function(array) {
        let seen = {}, out = [], len = array.length, j = 0;
        for(let i = 0; i < len; i++) {
            let item = array[i];
            if(seen[item] !== 1) {
                seen[item] = 1;
                out[j++] = item;
            }
        }
        return out;
    };
    let classLib = {
        userIcon: ['_2lyPnMP'],
        rightColumn: ['_2e0p8Qb']
    };
    setInterval(function () {
        let webpackJsonp = unsafeWindow.webpackJsonp;
        // 1. 格式化 webpackJsonp 变量, 取出反混淆所需的变量
        let filter = webpackJsonp.map(value => value[1]).filter(value => value && !Array.isArray(value) && typeof value === 'object');
        $.each(filter, (index, obj) => {
            for (let key in obj) {
                if (!obj.hasOwnProperty(key)) {
                    continue;
                }
                let tmp = {};
                // 2. 尝试导出反混淆变量到tmp
                try { obj[key](tmp); } catch(err) { continue; }
                // 3. 存在一个变量对应多个反混淆值的情况, 用数组存入
                if(tmp.hasOwnProperty('exports')) {
                    $.each(tmp.exports, function (k, v) {
                        classLib[k] = classLib[k] || [];
                        try { classLib[k].push(v); } catch(err) { return; }
                        classLib[k] = unique(classLib[k]); // 去重
                    });
                }
            }
        });
    }, 1000);
    let clazz = function (option) {
        let options = $.extend({key: '', dot: true, tag: '', join: undefined,}, option);
        let classItem = classLib[options.key] || [];
        if(options.dot) {
            classItem = classItem.map((v)=>'.'+v); // 是否加上点, 用于类选择器
        }
        classItem = classItem.map((v)=>options.tag+v); // 加上 tag 名, 用于限制标签的选择器
        if(!!options.join) {
            classItem = classItem.join(options.join); // 转化为字符串
        }
        return classItem;
    };

    // 判断是否登录
    if (!isLogin()) {
        alert(i18n('loginWarning'));
    }

    // 1. 屏蔽广告, 全局进行css处理
    (function () {
        // 1. 删除静态添加的广告
        $('._premium-lead-tag-search-bar').hide();
        $('.popular-introduction-overlay').hide();// 移除热门图片遮罩层

        // 2. 删除动态添加的广告
        let adSelectors = ['iframe', '._premium-lead-promotion-banner'];
        adSelectors = adSelectors.concat(clazz({key: 'alertContainer'}));
        adSelectors = adSelectors.concat(clazz({key: 'adContainer'}));

        observerFactory(function (mutations, observer) {
            mutations.forEach(function (mutation) {
                if (mutation.type !== 'childList') {
                    return;
                }
                let $parent = $(mutation.target).parent();
                // 2.1. 隐藏广告
                let $ad = $parent.find(adSelectors.join(','));
                $ad.hide();
            });
        });
    })();

    // 2. 使用users入り的方式进行搜索, 优先显示高质量作品
    (function () {
        let label = i18n('favorites'); // users入り
        let $select = $('<select id="select-ahao-favorites">' +
            '    <option value=""></option>' +
            '    <option value="10000users入り">10000users入り</option>' +
            '    <option value="5000users入り" > 5000users入り</option>' +
            '    <option value="1000users入り" > 1000users入り</option>' +
            '    <option value="500users入り"  >  500users入り</option>' +
            '    <option value="300users入り"  >  300users入り</option>' +
            '    <option value="100users入り"  >  100users入り</option>' +
            '    <option value="50users入り"   >   50users入り</option>' +
            '</select>');

        // 1. 初始化通用页面UI
        (function () {
            if (isArtworkPage()) {
                return;
            }
            console.log("初始化通用页面 按收藏数搜索");
            let icon = $('._discovery-icon').attr('src');
            let $menu = $('<div class="menu-group">' +
                '    <a class="menu-item js-click-trackable-later">' +
                '           <img class="_howto-icon" src="' + icon + '">' +
                '           <span class="label">' + label + '：</span>' +
                // select
                '   </a>' +
                '</div>');
            $menu.find('span.label').after($select);
            $('.navigation-menu-right').append($menu);

        })();

        // 2. 初始化作品页面UI
        (function () {
            if (!isArtworkPage()) {
                return;
            }
            console.log("初始化作品页面 按收藏数搜索");
            let discoverySelector = 'a[href="/discovery"]';
            observerFactory(function (mutations, observer) {
                for(let i = 0, len = mutations.length; i < len; i++) {
                    let mutation = mutations[i];

                    // 1. 判断是否改变节点, 或者是否有[发现]节点
                    let $discovery = $(mutation.target).find(discoverySelector);
                    if (mutation.type !== 'childList' || !$discovery.length) {
                        continue;
                    }

                    // 2. clone [发现]节点, 移除href属性, 避免死循环
                    let $tabGroup = $discovery.closest('div');
                    let $tab = $discovery.closest('ul').clone();
                    $tab.find(discoverySelector).attr('href', 'javascript:void(0)');

                    // 3. 加入dom中
                    $tabGroup.prepend($tab);
                    $tab.find('a').contents().last()[0].textContent = label;
                    $tab.find('a').after($select);

                    observer.disconnect();
                    break;
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
            let $text = $(this).find('input[name="word"]');
            let $favorites = $('#select-ahao-favorites');
            // 2.4.1. 去除旧的搜索选项
            $text.val((index, val) => val.replace(/\d*users入り/g, ''));
            // 2.4.2. 去除多余空格
            $text.val((index, val) => val.replace(/\s\s+/g, ' '));
            // 2.4.3. 添加新的搜索选项
            $text.val((index, val) => val + ' ' + $favorites.val());
        });
    })();

    // 3. 追加搜索pid和uid功能
    (function () {
        if (isArtworkPage()) {
            return;
        }
        console.log("初始化通用页面 搜索UID和PID");
        let initSearch = function (option) {
            let options = $.extend({right: '0px', placeholder: '', url: ''}, option);

            // 1. 初始化表单UI
            let $form = $('<form class="ui-search" ' +
                '    style="position: static;width: 100px;">' +
                '<div class="container" style="width:80%;">' +
                '    <input class="ahao-input" placeholder="' + options.placeholder + '" style="width:80%;"/>' +
                '</div>' +
                '<input type="submit" class="submit sprites-search-old" value="">' +
                '</form>');
            let $div = $('<div class="ahao-search"></div>').css('position', 'absolute')
                .css('bottom', '44px').css('height', '30px').css('right', options.right);
            $div.append($form);
            $('#suggest-container').before($div);

            // 2. 绑定submit事件
            $form.submit(function (e) {
                e.preventDefault();

                let $input = $(this).find('.ahao-input');
                let id = $input.val();
                // 2.1. ID 必须为纯数字
                if (!/^[0-9]+$/.test(id)) {
                    let label = options.placeholder + i18n('illegal');
                    alert(label);
                    return;
                }
                // 2.2. 新窗口打开url
                let url = option.url + id;
                window.open(url);
                // 2.3. 清空input等待下次输入
                $input.val('');
            });
        };
        // 1. UID搜索
        initSearch({right: '235px', placeholder: 'UID', url: 'https://www.pixiv.net/member.php?id='});
        // 2. PID搜索
        initSearch({right: '345px', placeholder: 'PID', url: 'https://www.pixiv.net/member_illust.php?mode=medium&illust_id='});
    })(); // 初始化通用页面UI
    (function () {
        if (!isArtworkPage() && !isMemberPage()) {
            return;
        }
        console.log("初始化作品页面 搜索UID和PID");
        let formSelector = 'form[action="/search.php"]';

        observerFactory(function (mutations, observer) {
            for(let i = 0, len = mutations.length; i < len; i++){
                let mutation = mutations[i];
                // 1. 判断是否改变节点, 或者是否有[form]节点
                let $form = $(mutation.target).find(formSelector);
                if (mutation.type !== 'childList' || !$form.length) {
                    continue;
                }

                // 2. 使用flex布局包裹
                let $flexBox = $('<div></div>').css('display', 'flex');
                $form.wrap($flexBox);
                $flexBox = $form.closest('div');

                let initSearch = function (option) {
                    let options = $.extend({ placeholder: '', url: ''}, option);

                    // 1. clone form表单
                    let $cloneForm = $form.clone();
                    $cloneForm.attr('action', '').addClass('ahao-search').css('margin-right', '15px').css('width', '126px');
                    $cloneForm.find('input[name="s_mode"]').remove(); // 只保留一个input
                    $cloneForm.find('input:first').attr('placeholder', options.placeholder).attr('name', options.placeholder).css('width', '64px');
                    $flexBox.prepend($cloneForm);

                    // 2. 绑定submit事件
                    $cloneForm.submit(function (e) {
                        e.preventDefault();

                        let $input = $(this).find('input[name="' + options.placeholder + '"]');
                        let id = $input.val();
                        // ID 必须为纯数字
                        if (!/^[0-9]+$/.test(id)) {
                            var label = options.placeholder + i18n('illegal');
                            alert(label);
                            return;
                        }
                        // 新窗口打开url
                        let url = option.url + id;
                        window.open(url);
                        // 清空input等待下次输入
                        $input.val('');
                    });
                };
                // 3. UID搜索
                initSearch({placeholder: 'UID', url: 'https://www.pixiv.net/member.php?id='});
                // 4. PID搜索
                initSearch({placeholder: 'PID', url: 'https://www.pixiv.net/member_illust.php?mode=medium&illust_id='});
                observer.disconnect();
                break;
            }
        });
    })(); // 初始化作品页面和画师页面UI

    // 4. 单张图片替换为原图格式. 追加下载按钮, 下载gif图、gif的帧压缩包、多图
    (function () {
        if (!isArtworkPage()) {
            return;
        }
        // 1. 初始化 下载按钮, 复制分享按钮并旋转180度
        let initDownloadBtn = function (option) {
            let options = $.extend({$shareButtonContainer: undefined, id: '', text: '', clickFun: ()=>{}}, option);
            let $downloadButtonContainer = options.$shareButtonContainer.clone();
            $downloadButtonContainer.addClass('ahao-download-btn')
                .attr('id', options.id)
                .removeClass(options.$shareButtonContainer.attr('class'))
                .css('margin-right', '10px')
                .css('position', 'relative')
                .css('border', '1px solid')
                .css('padding', '1px 10px')
                .append('<p style="display: inline">'+options.text+'</p>');
            $downloadButtonContainer.find('button').css('transform', 'rotate(180deg)')
                .on('click', options.clickFun);
            options.$shareButtonContainer.after($downloadButtonContainer);
            return $downloadButtonContainer;
        };
        let isMoreMode = () => illust().pageCount > 1,
            isGifMode  = () => illust().illustType === 2,
            isSingleMode = () => (illust().illustType === 0 || illust().illustType === 1) && illust().pageCount === 1;
        // 显示单图原图
        observerFactory({
            callback: function (mutations, observer) {
                for (let i = 0, len = mutations.length; i < len; i++) {
                    let mutation = mutations[i], $target = $(mutation.target),
                        index = $target.attr('data-index') || 0,
                        url = illust().urls.original.replace(/_p\d\./, '_p' + index + '.');
                    let replaceImg = function ($target, attr, value) {
                        let oldValue = $target.attr(attr);
                        if (new RegExp('.*i\.pximg\.net.*\/' + illust().id + '_.*').test(oldValue) && !/.+original.+/.test(oldValue)) {
                            $target.attr(attr, value).css('filter', 'none');
                            $target.fitWindow();
                        }
                    };
                    // 1. 只修改属性的情况(多图详情页)
                    if (mutation.type === 'attributes') {
                        replaceImg($target, mutation.attributeName, url);
                    }

                    // 2. 插入节点的情况(作品首页单图)
                    if (mutation.type === 'childList') {
                        // let $link = $target.find('a[href*="i.pximg.net"],img[src*="i.pximg.net"],img[srcset*="i.pximg.net"]');
                        let $link = $target.find('img[srcset]');
                        $link.each(function () {
                            let $item = $(this);
                            replaceImg($item, 'href', url);
                            replaceImg($item, 'src', url);
                            replaceImg($item, 'srcset', url);
                        });
                    }

                    // 3. 移除马赛克遮罩, https://www.pixiv.net/member_illust.php?mode=medium&illust_id=50358638
                    // $('.e2p8rxc2').hide(); // 懒得适配了, 自行去个人资料设置 https://www.pixiv.net/setting_user.php
                }
            },
            option: {attributes: true, childList: true, subtree: true, attributeFilter: ['src', 'srcset', 'href']}
        });
        // 下载动图帧zip, gif图
        observerFactory(function (mutations, observer) {
            for(let i = 0, len = mutations.length; i < len; i++){
                let mutation = mutations[i], $target = $(mutation.target);

                // 1. 单图、多图、gif图三种模式
                let $shareBtn = $target.find('._2Bc_aeW');
                if(!isGifMode() || mutation.type !== 'childList' || !$shareBtn.length || !!$target.find('#ahao-download-zip').length) {
                    continue
                }
                console.log('下载gif图');

                // 3. 初始化 下载按钮
                let $zipBtn = initDownloadBtn({
                    $shareButtonContainer: $shareBtn,
                    id: 'ahao-download-zip',
                    text: 'zip',
                });
                let $gifBtn = initDownloadBtn({
                    $shareButtonContainer: $shareBtn,
                    id: 'ahao-download-gif',
                    text: 'gif 0%'
                });

                // 4. 从 pixiv 官方 api 获取 gif 的数据
                $.ajax({url: '/ajax/illust/' + illust().illustId + '/ugoira_meta', dataType: 'json',
                    success: response => {
                        // 2.1. 初始化 zip 下载按钮 点击事件
                        $zipBtn.find('button').on('click', () => window.open(response.body.originalSrc));

                        // 2.2. 初始化 gif 下载按钮 点击事件
                        // GIF_worker_URL 来自 https://greasyfork.org/scripts/2963-gif-js/code/gifjs.js?version=8596
                        let gifUrl, gifFrames = [],
                            gifFactory = new GIF({workers: 1, quality: 10, workerScript: GIF_worker_URL});

                        for(let frameIdx = 0, frames = response.body.frames, framesLen = frames.length; frameIdx < framesLen; frameIdx++){
                            let frame = frames[i],
                                url = illust().urls.original.replace('ugoira0.', 'ugoira'+frameIdx+'.');
                            GM.xmlHttpRequest({
                                method: 'GET', url: url,
                                headers: {referer: 'https://www.pixiv.net/'},
                                overrideMimeType: 'text/plain; charset=x-user-defined',
                                onload: function (xhr) {
                                    // 2.2.1. 转为blob类型
                                    let r = xhr.responseText, data = new Uint8Array(r.length), i = 0;
                                    while (i < r.length) {
                                        data[i] = r.charCodeAt(i);
                                        i++;
                                    }
                                    let suffix = url.split('.').splice(-1);
                                    let blob = new Blob([data], {type: mimeType(suffix)});

                                    // 2.2.2. 压入gifFrames数组中, 手动同步sync
                                    let img = document.createElement('img');
                                    img.src = URL.createObjectURL(blob);
                                    img.width = illust().width;
                                    img.height = illust().height;
                                    img.onload = function(){
                                        gifFrames[frameIdx] = {frame: img, option: {delay: frame.delay}};
                                        if (Object.keys(gifFrames).length >= framesLen) {
                                            $.each(gifFrames, (i, f) => gifFactory.addFrame(f.frame, f.option));
                                            gifFactory.render();
                                        }
                                    };
                                }
                            });
                        }
                        gifFactory.on('progress', function (pct) {
                            $gifBtn.find('p').text('gif '+parseInt(pct*100)+'%');
                        });
                        gifFactory.on('finished', function(blob) {
                            gifUrl = URL.createObjectURL(blob);

                            let $a = $('<a></a>')
                                .attr('href', gifUrl)
                                .attr('download', illust().illustId+'.gif');
                            $gifBtn.find('button').wrap($a);
                        });
                        $gifBtn.find('button').on('click', () => {
                            if (!gifUrl) {
                                alert('Gif未加载完毕, 请稍等片刻!');
                                return;
                            }
                            // Adblock 禁止直接打开 blob url, https://github.com/jnordberg/gif.js/issues/71#issuecomment-367260284
                            // window.open(gifUrl);
                        });
                    }
                });
            }
        });
        // 下载多图zip
        observerFactory(function (mutations, observer) {
            for(let i = 0, len = mutations.length; i < len; i++){
                let mutation = mutations[i], $target = $(mutation.target);

                // 1. 单图、多图、gif图三种模式
                let $shareBtn = $target.find('._2Bc_aeW');
                if(!isMoreMode() || mutation.type !== 'childList' || !$shareBtn.length || !!$target.find('#ahao-download-zip').length) {
                    continue
                }
                console.log('下载多图');

                // 3. 初始化 图片数量, 图片url
                let zip = new JSZip();
                let downloaded = 0;           // 下载完成数量
                let num = illust().pageCount; // 下载目标数量
                let url = illust().urls.original;
                let imgUrls = Array(parseInt(num)).fill()
                    .map((value, index) => url.replace(/_p\d\./, '_p' + index + '.'));

                // 4. 初始化 下载按钮, 复制分享按钮并旋转180度
                let $zipBtn = initDownloadBtn({
                    $shareButtonContainer: $shareBtn,
                    id: 'ahao-download-zip',
                    text: i18n('download') + '0/' + num,
                    clickFun: function () {
                        // 3.1. 手动sync, 避免下载不完全
                        if (downloaded < num) {
                            alert(i18n('download_wait'));
                            return;
                        }
                        // 3.2. 使用jszip.js和FileSaver.js压缩并下载图片
                        zip.generateAsync({type: 'blob', base64: true})
                            .then(content => saveAs(content, illust().illustId + '.zip'));
                    }
                });

                // 5. 下载图片, https://wiki.greasespot.net/GM.xmlHttpRequest
                $.each(imgUrls, function (index, url) {
                    GM.xmlHttpRequest({
                        method: 'GET', url: url,
                        headers: {referer: 'https://www.pixiv.net/'},
                        overrideMimeType: 'text/plain; charset=x-user-defined',
                        onload: function (xhr) {
                            // 4.1. 转为blob类型
                            let r = xhr.responseText, data = new Uint8Array(r.length), i = 0;
                            while (i < r.length) {
                                data[i] = r.charCodeAt(i);
                                i++;
                            }
                            let suffix = url.split('.').splice(-1);
                            let blob = new Blob([data], {type: mimeType(suffix)});

                            // 4.2. 压缩图片
                            zip.file(illust().illustId + '_' + index + '.' + suffix, blob, {binary: true});

                            // 4.3. 手动sync, 避免下载不完全的情况
                            downloaded++;
                            $zipBtn.find('p').html(i18n('download') + '' + downloaded + '/' + num);
                        }
                    });
                });
            }
        });
    })();

    // 5. 在画师页面和作品页面显示画师id、画师背景图, 用户头像允许右键保存
    (function () {
        // 显示画师id、画师背景图
        observerFactory(function (mutations, observer) {
            if (!isMemberIndexPage()) {
                return;
            }
            for(let i = 0, len = mutations.length; i < len; i++){
                let mutation = mutations[i];
                // 1. 判断是否改变节点, 或者是否有[section]节点
                let $target = $(mutation.target);
                let $username = $target.find('._2VLnXNk');
                if (mutation.type !== 'childList' || !$username.length || !!$target.find('#uid').length) {
                    continue;
                }
                // 1. 获取用户名的元素
                let $banner   = $target.find('.ezjht4u0');
                let $mark     = $target.find('.cXGkZvO').closest('div');

                // 2. 显示画师id, 点击自动复制到剪贴板
                let $uid = $('<div class="'+$username.attr('class')+'" id="uid"> <span>UID: ' + uid + '</span></div>')
                    .on('click', function () {
                        let $this = $(this);
                        $this.text('UID' + i18n('copy_to_clipboard'));
                        GM.setClipboard(uid);
                        setTimeout(function () {
                            $this.text('UID: ' + uid);
                        }, 2000);
                    });
                $mark.append($uid);

                // 3. 显示画师背景图
                let backgroundImage = $banner.css('background-image') || '';
                let url = backgroundImage.replace('url(', '').replace(')', '').replace(/"/gi, "");
                let $div = $('<div class="'+$username.attr('class')+'"></div>');
                if (!!url && url !== 'none') {
                    $div.append('<img src="' + url + '" width="30px">' +
                        '<a target="_blank" href="' + url + ' ">' + i18n('background') + '</a>');
                } else {
                    $div.append('<span>' + i18n('background_not_found') + '</span>');
                }
                $mark.append($div);
            }
        });
    })(); // 画师页面UI
    (function () {

        // 显示画师id、画师背景图
        observerFactory(function (mutations, observer) {
            if (!isArtworkPage()) {
                return;
            }

            for(let i = 0, len = mutations.length; i < len; i++){
                let mutation = mutations[i];
                // 1. 判断是否改变节点, 或者是否有[section]节点
                let $aside = $(mutation.target).parent().find('._2e0p8Qb');
                if(!$aside.length || mutation.target.tagName.toLowerCase() !== 'aside'){
                    continue;
                }
                let $section = $(mutation.target).find('section');
                if (mutation.type !== 'childList' || !$section.length || !!$section.find('#ahao-background').length) {
                    continue;
                }
                let $userIcon = $section.find('._2lyPnMP');
                let $row = $userIcon.parent().closest('div');

                // 2. 显示画师背景图
                let background = globalInitData.preload.user[uid].background;
                let url = (background && background.url) || '';
                let $bgDiv = $row.clone().attr('id', 'ahao-background');
                $bgDiv.children('a').remove();
                $bgDiv.prepend('<img src="' + url + '" width="10%"/>');
                $bgDiv.find('div a').attr('href', !!url ? url : 'javascript:void(0)').attr('target', '_blank')
                    .text(!!url ? i18n('background') : i18n('background_not_found'));
                $row.after($bgDiv);

                // 3. 显示画师id, 点击自动复制到剪贴板
                let $uid = $row.clone();
                $uid.children('a').remove();
                $uid.find('a').attr('href', 'javascript:void(0)').attr('id', 'ahao-uid').text('UID: ' + uid);
                $uid.on('click', function () {
                    let $this = $(this);
                    $this.find('a').text('UID' + i18n('copy_to_clipboard'));
                    GM.setClipboard(uid);
                    setTimeout(function () {
                        $this.find('a').text('UID: ' + uid);
                    }, 2000);
                });
                $bgDiv.after($uid);
            }
        });
    })(); // 作品页面UI
    // 解除 用户头像 的background 限制, 方便保存用户头像
    observerFactory(function (mutations, observer) {
        for(let i = 0, len = mutations.length; i < len; i++){
            let mutation = mutations[i];
            // 1. 判断是否改变节点
            if (mutation.type !== 'childList') {
                continue;
            }

            // 2. 将作者头像由 background 转为 <img>
            let $target = $(mutation.target);
            $target.find('._2lyPnMP').each(function () {
                let $this = $(this);
                let tagName = $this.prop('tagName');

                let imgUrl = $this.getBackgroundUrl();
                if(!imgUrl) {
                    return;
                }

                let $userImg = $('<img class="ahao-user-img" src=""/>').attr('src', imgUrl);
                $userImg.css('width', $this.css('width'))
                    .css('height', $this.css('height'));

                if(tagName.toLowerCase() === 'a') {
                    $this.html($userImg);
                    $this.css('background-image', '');
                    return;
                }

                if(tagName.toLowerCase() === 'div') {
                    $userImg.attr('class', $this.attr('class'));
                    $userImg.html($this.html());
                    $this.replaceWith(()=>$userImg);
                    return;
                }
            });

            // 3. 将评论头像由 background 转为 <img>
            $target.find('a[data-user_id][data-src]').each(function () {
                let $this = $(this), $div = $this.find('div'),
                    $img = $('<img/>');
                $img.attr('src', $this.attr('data-src'));
                if(!!$div.length) {
                    $img.attr('class', $div.attr('class'))
                        .css('width', $div.css('width'))
                        .css('height', $div.css('height'));
                    $this.html($img);
                }

            });

            // 2.2. 解除图片不允许新窗口打开的限制, 如用户头像
            $('._2lyPnMP').each(function () {
                let $this = $(this);
                if($this.css('position') === 'relative') {
                    $this.css('position', 'static');
                }
            });
        }
    });

    // 6. 自动加载评论
    (function () {
        if (!isArtworkPage()) {
            return;
        }
        let moreCommentSelector = '._3JLvVMw';
        observerFactory(function (mutations, observer) {
            for(let i = 0, len = mutations.length; i < len; i++){
                let mutation = mutations[i];
                // 1. 判断是否改变节点
                if (mutation.type !== 'childList') {
                    continue;
                }
                // 2. 模拟点击加载按钮
                let $moreCommentBtn = $(mutation.target).find(moreCommentSelector);
                $moreCommentBtn.click();
            }
        });
    })();

    // 7. 对主页动态中的图片标记作品类型
    (function () {
        if(!isMemberDynamicPage()) {
            return;
        }

        let illustTitleSelector = '.stacc_ref_illust_title';
        observerFactory(function (mutations, observer) {
            for(let i = 0, len = mutations.length; i < len; i++){
                let mutation = mutations[i];
                // 1. 判断是否改变节点
                let $title = $(mutation.target).find(illustTitleSelector);
                if (mutation.type !== 'childList' || !$title.length) {
                    continue;
                }

                $title.each(function () {
                    let $a = $(this).find('a');
                    // 1. 已经添加过标记的就不再添加
                    if(!!$a.attr('ahao-illust-id')){
                        return;
                    }
                    // 2. 获取pid, 设置标记避免二次生成
                    let illustId = new URL(location.origin + '/' + $a.attr('href')).searchParams.get('illust_id');
                    $a.attr('ahao-illust-id', illustId);
                    // 3. 调用官方api, 判断作品类型
                    $.ajax({
                        url: '/ajax/illust/' + illustId, dataType: 'json',
                        success: response => {
                            let illustType = parseInt(response.body.illustType);
                            let isMultiPic = parseInt(response.body.pageCount) > 1;
                            switch (illustType) {
                                case 0:
                                case 1:$a.after('<p>' + (isMultiPic ? i18n('illust_type_multiple') : i18n('illust_type_single')) + '</p>');break;
                                case 2:$a.after('<p>'+i18n('illust_type_gif')+'</p>');break;
                            }
                        }
                    });
                })
            }
        });
    })();

    // 8. 对jump.php取消重定向
    (function () {
        let jumpSelector = 'a[href*="jump.php"]';

        observerFactory(function (mutations, observer) {
            for(let i = 0, len = mutations.length; i < len; i++){
                let mutation = mutations[i];
                // 1. 判断是否改变节点
                if (mutation.type !== 'childList') {
                    continue;
                }
                // 2. 修改href
                let $jump = $(mutation.target).find(jumpSelector);
                $jump.each(function () {
                    let $this = $(this), url = $this.attr('href').match(/jump\.php\?(url=)?(.*)$/)[2];
                    $this.attr('href', decodeURIComponent(url));
                });
            }
        });
    })();

    // 9. 单页排序
    (function () {
        if (!isSearchPage()) {
            return;
        }
        observerFactory({
            callback: function (mutations, observer) {
                for (let i = 0, len = mutations.length; i < len; i++) {
                    let mutation = mutations[i];
                    // 1. 判断是否改变节点, 或者是否有[userIcon]节点
                    let $container = $(mutation.target).find('._1BUAfFH');
                    if (mutation.type !== 'childList' || !$container.length) {
                        continue;
                    }

                    // 2. 获取所有的item, 排序并填充
                    let $list = $container.children();
                    let getCount = $ => parseInt($.find('ul.count-list a').text()) || 0;
                    $list.sort((a, b) => getCount($(b)) - getCount($(a)));
                    $container.html($list);
                }
            },
            node: document.getElementById('js-react-search-mid')
        });
    })();

    //TODO 图片下载 重命名规则
    //TODO 增强新页面fanbox https://www.pixiv.net/fanbox/creator/22926661?utm_campaign=www_profile&utm_medium=site_flow&utm_source=pixiv
    //TODO 日语化
    //TODO 搜索框ui混乱 https://www.pixiv.net/member_illust.php?mode=medium&illust_id=899657
});