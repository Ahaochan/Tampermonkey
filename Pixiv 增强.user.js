// ==UserScript==
// @name        Pixiv Plus
// @name:zh-CN  Pixiv 增强
// @name:zh-TW  Pixiv 增強
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.5.7
// @icon        http://www.pixiv.net/favicon.ico
// @description Focus on immersive experience, 1. Block ads, directly access popular pictures 2. Use user to enter the way to search 3. Search pid and uid 4. Display original image and size, picture rename, download original image | gif map | Zip|multiple map zip 5. display artist id, artist background image 6. auto load comment 7. dynamic markup work type 8. remove redirection 9. single page sort 10. control panel select desired function github: https:/ /github.com/Ahaochan/Tampermonkey, welcome to star and fork.
// @description:ja    没入型体験に焦点を当てる、1.人気の写真に直接アクセスする広告をブロックする2.検索する方法を入力するためにユーザーを使用する3.検索pidとuid 4.元の画像とサイズを表示する Zip | multiple map zip 5.アーティストID、アーティストの背景画像を表示します。6.自動ロードコメントを追加します。7.動的マークアップ作業タイプを指定します。8.リダイレクトを削除します。9.シングルページソート10.コントロールパネルを選択します。github：https：/ /github.com/Ahaochan/Tampermonkey、スターとフォークへようこそ。
// @description:zh-CN 专注沉浸式体验，1.屏蔽广告,直接访问热门图片 2.使用users入り的方式搜索 3.搜索pid和uid 4.显示原图及尺寸，图片重命名，下载原图|gif图|动图帧zip|多图zip 5.显示画师id、画师背景图 6.自动加载评论 7.对动态标记作品类型 8.去除重定向 9.单页排序 10.控制面板选择想要的功能 github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @description:zh-TW 專注沉浸式體驗，1.屏蔽廣告,直接訪問熱門圖片2.使用users入り的方式搜索3.搜索pid和uid 4.顯示原圖及尺寸，圖片重命名，下載原圖|gif圖|動圖幀zip|多圖zip 5.顯示畫師id、畫師背景圖6.自動加載評論7.對動態標記作品類型8.去除重定向9.單頁排序10.控制面板選擇想要的功能github:https:/ /github.com/Ahaochan/Tampermonkey，歡迎star和fork。
// @author      Ahaochan
// @include     http*://www.pixiv.net*
// @match       http://www.pixiv.net/
// @connect     i.pximg.net
// @license     GPL-3.0
// @supportURL  https://github.com/Ahaochan/Tampermonkey
// @grant       unsafeWindow
// @grant       GM.xmlHttpRequest
// @grant       GM.setClipboard
// @grant       GM.setValue
// @grant       GM.getValue
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// @grant       GM_setClipboard
// @grant       GM_setValue
// @grant       GM_getValue
// @require     https://code.jquery.com/jquery-2.2.4.min.js
// @require     https://cdn.bootcss.com/jszip/3.1.4/jszip.min.js
// @require     https://cdn.bootcss.com/FileSaver.js/1.3.2/FileSaver.min.js
// @require     https://greasyfork.org/scripts/2963-gif-js/code/gifjs.js?version=8596
// @require     https://greasyfork.org/scripts/375359-gm4-polyfill-1-0-1/code/gm4-polyfill-101.js?version=652238
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
        replaceTagName: function (replaceWith) {
            var tags = [],
                i = this.length;
            while (i--) {
                var newElement = document.createElement(replaceWith),
                    thisi = this[i],
                    thisia = thisi.attributes;
                for (var a = thisia.length - 1; a >= 0; a--) {
                    var attrib = thisia[a];
                    newElement.setAttribute(attrib.name, attrib.value);
                }
                newElement.innerHTML = thisi.innerHTML;
                $(thisi).after(newElement).remove();
                tags[i] = newElement;
            }
            return $(tags);
        },
        getBackgroundUrl: function () {
            let imgUrls = [];
            this.each(function (index, ele) {
                let bgUrl = $(this).css('background-image') || ele.style.backgroundImage || 'url("")';
                bgUrl = bgUrl.match(/url\((['"])(.*?)\1\)/)[2];
                imgUrls.push(bgUrl);
            });
            return imgUrls.length === 1 ? imgUrls[0] : imgUrls;
        }
    });

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
        if (!!urlIllustId) {
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
    let uid = illust().userId || (globalInitData && Object.keys(globalInitData.preload.user)[0]) || (pixiv && pixiv.context.userId) || 'unknown';
    let observerFactory = function (option) {
        let options;
        if (typeof option === 'function') {
            options = {
                callback: option,
                node: document.getElementsByTagName('body')[0],
                option: {childList: true, subtree: true}
            };
        } else {
            options = $.extend({
                callback: () => {
                },
                node: document.getElementsByTagName('body')[0],
                option: {childList: true, subtree: true}
            }, option);
        }
        let MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver,
            observer = new MutationObserver((mutations, observer) => {
                options.callback.call(this, mutations, observer);
                // GM.getValue('MO', true).then(function (v) { if(!v) observer.disconnect(); });
            });
        observer.observe(options.node, options.option);
        return observer;
    };
    let isLogin = function () {
        let status = 0;
        $.ajax({url: 'https://www.pixiv.net/setting_user.php', async: false})
            .done((data, statusText, xhr) => status = xhr.status);
        return status === 200;
    };

    // ============================ 配置信息 ====================================
    let GMkeys = {
        MO: 'MO',                                   // MutationObserver 的开关
        selectorShareBtn: 'selectorShareBtn',       // 下载按钮的selector
        selectorRightColumn: 'selectorRightColumn', // 作品页面的作者信息selector

        switchImgSize:  'switch-img-size',              // 是否显示图片大小的开关
        switchImgPreload: 'switch-img-preload',         // 是否预下载的开关
        switchComment: 'switch-comment',                // 是否自动加载评论的开关
        switchOrderByPopular: 'switch-order-by-popular',// 是否按收藏数排序的开关(单页排序)

        downloadName: 'download-name',  // 下载名pattern
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
            sort_by_popularity: 'Sort_by_popularity(single page)'
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
            sort_by_popularity: '按收藏数搜索(单页)'
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
            sort_by_popularity: '按收藏數搜索(單頁)'
        }
    };
    i18nLib['zh-CN'] = $.extend({}, i18nLib.zh);
    // TODO 待翻译
    i18nLib.ja = $.extend({}, i18nLib.en, i18nLib.ja);
    i18nLib.ko = $.extend({}, i18nLib.en, i18nLib.ko);
    let i18n = key => i18nLib[lang][key] || `i18n[${lang}][${key}] not found`;

    // ============================ url 页面判断 ==============================
    let isArtworkPage = () => /.+member_illust\.php\?.*illust_id=\d+.*/.test(location.href);

    let isMemberIndexPage = () => /.+member.php.*id=\d+.*/.test(location.href);
    let isMemberIllustPage = () => /.+\/member_illust\.php\?id=\d+/.test(location.href);
    let isMemberBookmarkPage = () => /.+\/bookmark\.php\?id=\d+/.test(location.href);
    let isMemberFriendPage = () => /.+\/mypixiv_all\.php\?id=\d+/.test(location.href);
    let isMemberDynamicPage = () => /.+\/stacc.+/.test(location.href);
    let isMemberPage = () => isMemberIndexPage() || isMemberIllustPage() || isMemberBookmarkPage() || isMemberFriendPage(),
        isSearchPage = () => /.+\/search\.php.*/.test(location.href);

    // 判断是否登录
    if (!isLogin()) {
        alert(i18n('loginWarning'));
    }

    // 1. 屏蔽广告, 全局进行css处理
    (function () {
        // 1. 删除静态添加的广告
        $('.ad').remove();
        $('._premium-lead-tag-search-bar').hide();
        $('.popular-introduction-overlay').hide();// 移除热门图片遮罩层

        // 2. 删除动态添加的广告
        let adSelectors = ['iframe', '._premium-lead-promotion-banner'];

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
        let $select = $(`
        <select id="select-ahao-favorites">
            <option value=""></option>
            <option value="10000users入り">10000users入り</option>
            <option value="5000users入り" > 5000users入り</option>
            <option value="1000users入り" > 1000users入り</option>
            <option value="500users入り"  >  500users入り</option>
            <option value="300users入り"  >  300users入り</option>
            <option value="100users入り"  >  100users入り</option>
            <option value="50users入り"   >   50users入り</option>
        </select>`);

        // 1. 初始化通用页面UI
        (function () {
            if (isArtworkPage() || isMemberPage()) {
                return;
            }
            console.log("初始化通用页面 按收藏数搜索");
            let icon = $('._discovery-icon').attr('src');
            let $menu = $(`
                <div class="menu-group">
                    <a class="menu-item js-click-trackable-later">
                        <img class="_howto-icon" src="${icon}">
                        <span class="label">${label}：</span>
                    <!--select-->
                    </a>
                </div>`);
            $menu.find('span.label').after($select);
            $('.navigation-menu-right').append($menu);

        })();

        // 2. 初始化作品页面和画师页面UI
        (function () {
            if (!isArtworkPage() && !isMemberPage()) {
                return;
            }
            console.log("初始化作品页面 按收藏数搜索");
            let discoverySelector = 'a[href="/discovery"]';
            observerFactory(function (mutations, observer) {
                for (let i = 0, len = mutations.length; i < len; i++) {
                    let mutation = mutations[i];

                    // 1. 判断是否改变节点, 或者是否有[发现]节点
                    // let $discovery = $(mutation.target).find(discoverySelector);
                    let $discovery = $(discoverySelector);
                    if (mutation.type !== 'childList' || $discovery.length <= 0) {
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
            $text.val((index, val) => `${val} ${$favorites.val()}`);
        });
    })();

    // 3. 追加搜索pid和uid功能
    (function () {
        if (isArtworkPage() || isMemberPage()) {
            return;
        }
        console.log("初始化通用页面 搜索UID和PID");
        let initSearch = function (option) {
            let options = $.extend({right: '0px', placeholder: '', url: ''}, option);

            // 1. 初始化表单UI
            let $form = $(`<form class="ui-search" style="position: static;width: 100px;">
                <div class="container" style="width:80%;">
                    <input class="ahao-input" placeholder="${options.placeholder}" style="width:80%;"/>
                </div>
                <input type="submit" class="submit sprites-search-old" value="">
                </form>`);
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
        initSearch({
            right: '345px',
            placeholder: 'PID',
            url: 'https://www.pixiv.net/member_illust.php?mode=medium&illust_id='
        });
    })(); // 初始化通用页面UI
    (function () {
        if (!isArtworkPage() && !isMemberPage()) {
            return;
        }
        console.log("初始化作品页面 搜索UID和PID");
        let formSelector = 'form[action="/search.php"]';

        observerFactory(function (mutations, observer) {
            for (let i = 0, len = mutations.length; i < len; i++) {
                let mutation = mutations[i];
                // 1. 判断是否改变节点, 或者是否有[form]节点
                // let $form = $(mutation.target).find(formSelector);
                let $form = $(formSelector);
                if (mutation.type !== 'childList' || !$form.length) {
                    continue;
                }

                // 2. 使用flex布局包裹
                let $flexBox = $('<div></div>').css('display', 'flex');
                $form.wrap($flexBox);
                $flexBox = $form.closest('div');

                let initSearch = function (option) {
                    let options = $.extend({placeholder: '', url: ''}, option);

                    // 1. clone form表单
                    let $cloneForm = $form.clone();
                    $cloneForm.attr('action', '').addClass('ahao-search').css('margin-right', '15px').css('width', '126px');
                    $cloneForm.find('input[name="s_mode"]').remove(); // 只保留一个input
                    $cloneForm.find('input:first').attr('placeholder', options.placeholder).attr('name', options.placeholder).css('width', '64px');
                    $flexBox.prepend($cloneForm);

                    // 2. 绑定submit事件
                    $cloneForm.submit(function (e) {
                        e.preventDefault();

                        let $input = $(this).find(`input[name="${options.placeholder}"]`);
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
    (async function () {
        if (!isArtworkPage()) {
            return;
        }
        // 1. 初始化方法
        let initDownloadBtn = function (option) {
            // 下载按钮, 复制分享按钮并旋转180度
            let options = $.extend({ $shareButtonContainer: undefined, id: '', text: '', clickFun: () => {} }, option);
            let $downloadButtonContainer = options.$shareButtonContainer.clone();
            $downloadButtonContainer.addClass('ahao-download-btn')
                .attr('id', options.id)
                .removeClass(options.$shareButtonContainer.attr('class'))
                .css('margin-right', '10px')
                .css('position', 'relative')
                .css('border', '1px solid')
                .css('padding', '1px 10px')
                .append(`<p style="display: inline">${options.text}</p>`);
            $downloadButtonContainer.find('button').css('transform', 'rotate(180deg)')
                .on('click', options.clickFun);
            options.$shareButtonContainer.after($downloadButtonContainer);
            return $downloadButtonContainer;
        };
        let addImgSize = async function (option) {
            // 从 $img 获取图片大小, after 到 $img
            let options = $.extend({
                $img: undefined,
                position: 'absolute',
            }, option);
            let $img = options.$img, position = options.position;
            if ($img.length !== 1) {
                return;
            }
            // 1. 找到 显示图片大小 的 span, 没有则添加
            let $span = $img.next('span');
            if ($span.length <= 0) {
                // 添加前 去除失去依赖的 span
                $('body').find('.ahao-img-size').each(function () {
                    let $this = $(this), $prev = $this.prev('canvas, img');
                    if ($prev.length <= 0) {
                        $this.remove();
                    }
                });
                $img.after(`<span class="ahao-img-size" style="position: ${position}; right: 0; top: 28px;
                    color: #ffffff; font-size: x-large; font-weight: bold; -webkit-text-stroke: 1.0px #000000;"></span>`);
            }
            // 2. 根据标签获取图片大小, 目前只有 canvas 和 img 两种
            if ($img.prop('tagName') === 'IMG') {
                let img = new Image();
                img.src = $img.attr('src');
                img.onload = function () {
                    $span.text(`${this.width}x${this.height}`);
                };
            } else {
                let width = $img.attr('width') || $img.css('width').replace('px', '') || $img.css('max-width').replace('px', '') || 0;
                let height = $img.attr('height') || $img.css('height').replace('px', '') || $img.css('max-height').replace('px', '') || 0;
                $span.text(`${width}x${height}`);
            }
        };
        let mimeType = suffix => {
            let lib = {png: "image/png", jpg: "image/jpeg", gif: "image/gif"};
            return lib[suffix] || `mimeType[${suffix}] not found`;
        };
        let getDownloadName = (name) => {
            name = name.replace('{pid}', illust().illustId);
            name = name.replace('{uid}', illust().userId);
            name = name.replace('{pname}', illust().illustTitle);
            name = name.replace('{uname}', illust().userName);
            return name;
        };
        let isMoreMode = () => illust().pageCount > 1,
            isGifMode = () => illust().illustType === 2,
            isSingleMode = () => (illust().illustType === 0 || illust().illustType === 1) && illust().pageCount === 1;
        let selectorShareBtn = await GM.getValue(GMkeys.selectorShareBtn, '.UXmvz'); // section 下的 div

        // 热修复下载按钮的className
        observerFactory(function (mutations, observer) {
            for (let i = 0, len = mutations.length; i < len; i++) {
                let mutation = mutations[i], $target = $(mutation.target);
                let $section = $target.find('figure').find('section');
                if($section.length <= 0) continue;
                let className = $section.children('div').eq(1).attr('class').split(' ')[1];
                GM.setValue(GMkeys.selectorShareBtn, `.${className}`);
                observer.disconnect();
                return;
            }
        });
        // 显示单图、多图原图
        observerFactory({
            callback: function (mutations, observer) {
                for (let i = 0, len = mutations.length; i < len; i++) {
                    let mutation = mutations[i], $target = $(mutation.target);
                    let replaceImg = function ($target, attr, value) {
                        let oldValue = $target.attr(attr);
                        if (new RegExp(`.*i\.pximg\.net.*\/${illust().id}_.*`).test(oldValue) && !/.+original.+/.test(oldValue)) {
                            $target.attr(attr, value).css('filter', 'none');
                            $target.fitWindow();
                        }
                    };

                    // 1. 单图、多图 DOM 结构都为 <a href=""><img/></a>
                    let $link = $target.find('img[srcset]');
                    $link.each(function () {
                        let $this = $(this);
                        let href = $this.parent('a').attr('href');
                        if(!!href) {
                            replaceImg($this, 'src', href);
                            replaceImg($this, 'srcset', href);
                            addImgSize({$img: $this}); // 显示图片大小
                        }
                    });

                    // 2. 移除马赛克遮罩, https://www.pixiv.net/member_illust.php?mode=medium&illust_id=50358638
                    // $('.e2p8rxc2').hide(); // 懒得适配了, 自行去个人资料设置 https://www.pixiv.net/setting_user.php
                }
            },
            option: {attributes: true, childList: true, subtree: true, attributeFilter: ['src', 'srcset', 'href']}
        });
        // 下载动图帧zip, gif图
        observerFactory(function (mutations, observer) {
            for (let i = 0, len = mutations.length; i < len; i++) {
                let mutation = mutations[i], $target = $(mutation.target);

                // 1. 单图、多图、gif图三种模式
                let $shareBtn = $target.find(selectorShareBtn), $canvas = $target.find('canvas');
                // 2. 显示图片大小
                if($canvas.length > 0) {
                    GM.getValue(GMkeys.switchImgSize, true).then(open => {
                        if(!!open) { addImgSize({$img: $canvas}) }
                    });
                }
                if (!isGifMode() || mutation.type !== 'childList' ||
                    $shareBtn.length <= 0 ||
                    $target.find('#ahao-download-zip').length > 0) {
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
                    text: 'gif',
                    clickFun: function () {
                        // 从 pixiv 官方 api 获取 gif 的数据
                        $.ajax({
                            url: `/ajax/illust/${illust().illustId}/ugoira_meta`, dataType: 'json',
                            success: response => {
                                // 1. 初始化 gif 下载按钮 点击事件
                                // GIF_worker_URL 来自 https://greasyfork.org/scripts/2963-gif-js/code/gifjs.js?version=8596
                                let gifUrl, gifFrames = [],
                                    gifFactory = new GIF({workers: 1, quality: 10, workerScript: GIF_worker_URL});

                                for (let frameIdx = 0, frames = response.body.frames, framesLen = frames.length; frameIdx < framesLen; frameIdx++) {
                                    let frame = frames[i],
                                        url = illust().urls.original.replace('ugoira0.', `ugoira${frameIdx}.`);
                                    GM.xmlHttpRequest({
                                        method: 'GET', url: url,
                                        headers: {referer: 'https://www.pixiv.net/'},
                                        overrideMimeType: 'text/plain; charset=x-user-defined',
                                        onload: function (xhr) {
                                            // 2. 转为blob类型
                                            let r = xhr.responseText, data = new Uint8Array(r.length), i = 0;
                                            while (i < r.length) {
                                                data[i] = r.charCodeAt(i);
                                                i++;
                                            }
                                            let suffix = url.split('.').splice(-1);
                                            let blob = new Blob([data], {type: mimeType(suffix)});

                                            // 3. 压入gifFrames数组中, 手动同步sync
                                            let img = document.createElement('img');
                                            img.src = URL.createObjectURL(blob);
                                            img.width = illust().width;
                                            img.height = illust().height;
                                            img.onload = function () {
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
                                    $gifBtn.find('p').text(`gif ${parseInt(pct * 100)}%`);
                                });
                                gifFactory.on('finished', function (blob) {
                                    gifUrl = URL.createObjectURL(blob);
                                    GM.getValue(GMkeys.downloadName, `{pid}`).then(name => {
                                        let $a = $(`<a href="${gifUrl}" download="${getDownloadName(name)}"></a>`);
                                        $gifBtn.find('button').wrap($a);
                                    });

                                });
                                $gifBtn.find('button').off('click').on('click', () => {
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

                // 4. 控制是否预下载, 避免多个页面导致爆内存, 直接下载 zip
                $.ajax({
                    url: `/ajax/illust/${illust().illustId}/ugoira_meta`, dataType: 'json',
                    success: response => {
                        GM.getValue(GMkeys.downloadName, `{pid}`).then(name => {
                            let $a = $(`<a href="${response.body.originalSrc}" download="${getDownloadName(name)}"></a>`);
                            $zipBtn.find('button').wrap($a);
                        });
                    }
                });
                GM.getValue(GMkeys.switchImgPreload, true).then(open => { if(open) { $gifBtn.find('button').click(); } });

                // 5. 取消监听
                GM.getValue(GMkeys.MO, true).then(function (v) { if(!v) observer.disconnect(); });
            }
        });
        // 下载多图zip
        observerFactory(function (mutations, observer) {
            for (let i = 0, len = mutations.length; i < len; i++) {
                let mutation = mutations[i], $target = $(mutation.target);

                // 1. 单图、多图、gif图三种模式
                let $shareBtn = $target.find(selectorShareBtn);
                if (!isMoreMode() || mutation.type !== 'childList' || !$shareBtn.length || !!$target.find('#ahao-download-zip').length) {
                    continue
                }
                console.log('下载多图');

                // 3. 初始化 图片数量, 图片url
                let zip = new JSZip();
                let downloaded = 0;           // 下载完成数量
                let num = illust().pageCount; // 下载目标数量
                let url = illust().urls.original;
                let imgUrls = Array(parseInt(num)).fill()
                    .map((value, index) => url.replace(/_p\d\./, `_p${index}.`));

                // 4. 初始化 下载按钮, 复制分享按钮并旋转180度
                let $zipBtn = initDownloadBtn({
                    $shareButtonContainer: $shareBtn,
                    id: 'ahao-download-zip',
                    text: `${i18n('download')}`,
                    clickFun: function () {
                        // 3.1. 下载图片, https://wiki.greasespot.net/GM.xmlHttpRequest
                        if($(this).attr('start') !== 'true') {
                            $(this).attr('start', true);
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
                                        GM.getValue(GMkeys.downloadName, `{pid}`).then(name => {
                                            zip.file(`${getDownloadName(name)}_${index}.${suffix}`, blob, {binary: true});
                                        });


                                        // 4.3. 手动sync, 避免下载不完全的情况
                                        downloaded++;
                                        $zipBtn.find('p').html(`${i18n('download')}${downloaded}/${num}`);
                                    }
                                });
                            });
                            return;
                        }

                        // 3.2. 手动sync, 避免下载不完全
                        if (downloaded < num) {
                            alert(i18n('download_wait'));
                            return;
                        }
                        // 3.3. 使用jszip.js和FileSaver.js压缩并下载图片
                        GM.getValue(GMkeys.downloadName, `{pid}`).then(name => {
                            zip.generateAsync({type: 'blob', base64: true})
                                .then(content => saveAs(content, getDownloadName(name)));
                        });
                    }
                });

                // 4. 控制是否预下载, 避免多个页面导致爆内存
                GM.getValue(GMkeys.switchImgPreload, true).then(open => { if(open) { $zipBtn.find('button').click(); } });

                // 5. 取消监听
                GM.getValue(GMkeys.MO, true).then(function (v) { if(!v) observer.disconnect(); });
            }
        });
    })();

    // 5. 在画师页面和作品页面显示画师id、画师背景图, 用户头像允许右键保存
    observerFactory(function (mutations, observer) {
        if (!isMemberIndexPage()) {
            return;
        }
        for (let i = 0, len = mutations.length; i < len; i++) {
            let mutation = mutations[i];
            // 1. 判断是否改变节点, 或者是否有[section]节点
            let $target = $(mutation.target), externalLinksContainer = '_2AOtfl9'; // 多个反混淆externalLinksContainer
            let $row = $(`ul.${externalLinksContainer}`).parent();
            if (mutation.type !== 'childList' || $row.length <= 0 || $('body').find('#uid').length > 0) {
                continue;
            }
            // 1. 添加新的一行的div
            let $ahaoRow = $row.clone(), $ul = $ahaoRow.find('ul');
            $ul.empty();
            $row.before($ahaoRow);

            // 2. 显示画师id, 点击自动复制到剪贴板
            let $uid = $(`<li id="uid"><div style="font-size: 20px;font-weight: 700;color: #333;margin-right: 8px;line-height: 1">UID:${uid}</div></li>`)
                .on('click', function () {
                    let $this = $(this);
                    $this.html(`<span>UID${i18n('copy_to_clipboard')}</span>`);
                    GM.setClipboard(uid);
                    setTimeout(function () {
                        $this.html(`<span>UID${uid}</span>`);
                    }, 2000);
                });
            $ul.append($uid);

            // 3. 显示画师背景图
            let background = globalInitData.preload.user[uid].background;
            let url = (background && background.url) || '';
            let $bgli = $('<li><div style="font-size: 20px;font-weight: 700;color: #333;margin-right: 8px;line-height: 1"></div></li>'),
                $bg = $bgli.find('div');
            if (!!url && url !== 'none') {
                $bg.append(`<img src="${url}" width="30px"><a target="_blank" href="${url}">${i18n('background')}</a>`);
            } else {
                $bg.append(`<span>${i18n('background_not_found')}</span>`);
            }
            $ul.append($bgli);

            // 4. 取消监听
            GM.getValue(GMkeys.MO, true).then(function (v) { if(!v) observer.disconnect(); });
        }
    }); // 画师页面UI
    observerFactory(function (mutations, observer) {
        if (!isArtworkPage()) {
            return;
        }

        for (let i = 0, len = mutations.length; i < len; i++) {
            let mutation = mutations[i];
            // 1. 判断是否改变节点, 或者是否有[section]节点
            let $aside = $(mutation.target).parent().find('main').next('aside');
            if (mutation.type !== 'childList' || $aside.length <= 0) {
                continue;
            }

            let $row = $aside.find('section:first').find('h2');
            if ($row.length <= 0 || $aside.find('#ahao-background').length > 0) {
                continue;
            }

            // 2. 显示画师背景图
            let background = globalInitData.preload.user[uid].background;
            let url = (background && background.url) || '';
            let $bgDiv = $row.clone().attr('id', 'ahao-background');
            $bgDiv.children('a').remove();
            $bgDiv.children('div').children('div').remove();
            $bgDiv.prepend(`<img src="${url}" width="10%"/>`);
            $bgDiv.find('div a').attr('href', !!url ? url : 'javascript:void(0)').attr('target', '_blank')
                .text(!!url ? i18n('background') : i18n('background_not_found'));
            $row.after($bgDiv);

            // 3. 显示画师id, 点击自动复制到剪贴板
            let $uid = $row.clone();
            $uid.children('a').remove();
            $uid.children('div').children('div').remove();
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

            // 4. 取消监听
            GM.getValue(GMkeys.MO, true).then(function (v) { if(!v) observer.disconnect(); });
        }
    }); // 作品页面UI
    // 解除 用户头像 的background 限制, 方便保存用户头像
    observerFactory(function (mutations, observer) {
        for (let i = 0, len = mutations.length; i < len; i++) {
            let mutation = mutations[i];
            // 1. 判断是否改变节点
            if (mutation.type !== 'childList') {
                continue;
            }

            // 2. 将作者头像由 background 转为 <img>
            let $target = $(mutation.target);
            $target.find('div[role="img"]').each(function () {
                let $this = $(this);
                let tagName = $this.prop('tagName');

                let imgUrl = $this.getBackgroundUrl();
                if (!imgUrl) {
                    return;
                }

                let $userImg = $('<img class="ahao-user-img" src=""/>').attr('src', imgUrl);
                $userImg.css('width', $this.css('width'))
                    .css('height', $this.css('height'));

                // if(tagName.toLowerCase() === 'a') {
                //     $this.html($userImg);
                //     $this.css('background-image', '');
                //     return;
                // }

                if (tagName.toLowerCase() === 'div') {
                    $userImg.attr('class', $this.attr('class'));
                    $userImg.html($this.html());
                    $this.replaceWith(() => $userImg);
                    return;
                }
            });

            // 3. 将评论头像由 background 转为 <img>
            $target.find('a[data-user_id][data-src]').each(function () {
                let $this = $(this), $div = $this.find('div'),
                    $img = $('<img/>');
                $img.attr('src', $this.attr('data-src'));
                if (!!$div.length) {
                    $img.attr('class', $div.attr('class'))
                        .css('width', $div.css('width'))
                        .css('height', $div.css('height'));
                    $this.html($img);
                }
            });
        }
    });

    // 6. 自动加载评论
    GM.getValue(GMkeys.switchComment, true).then(open => {
        if(!open || !isArtworkPage()){
            return;
        }
        let moreCommentSelector = '._1Hom0qN';
        observerFactory(function (mutations, observer) {
            for (let i = 0, len = mutations.length; i < len; i++) {
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
    });

    // 7. 对主页动态中的图片标记作品类型
    (function () {
        if (!isMemberDynamicPage()) {
            return;
        }

        let illustTitleSelector = '.stacc_ref_illust_title';
        observerFactory(function (mutations, observer) {
            for (let i = 0, len = mutations.length; i < len; i++) {
                let mutation = mutations[i];
                // 1. 判断是否改变节点
                let $title = $(mutation.target).find(illustTitleSelector);
                if (mutation.type !== 'childList' || !$title.length) {
                    continue;
                }

                $title.each(function () {
                    let $a = $(this).find('a');
                    // 1. 已经添加过标记的就不再添加
                    if (!!$a.attr('ahao-illust-id')) {
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
                                case 1:
                                    $a.after('<p>' + (isMultiPic ? i18n('illust_type_multiple') : i18n('illust_type_single')) + '</p>');
                                    break;
                                case 2:
                                    $a.after('<p>' + i18n('illust_type_gif') + '</p>');
                                    break;
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
            for (let i = 0, len = mutations.length; i < len; i++) {
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
        // 9.1. 生成按收藏数排序的按钮
        observerFactory({
            callback: function (mutations, observer) {
                for (let i = 0, len = mutations.length; i < len; i++) {
                    let mutation = mutations[i];
                    // 1. 判断是否改变节点
                    let $menuItem = $(mutation.target).find('.search-sort-container ul.menu-items');
                    if (mutation.type !== 'childList' || $menuItem.length <= 0) {
                        continue;
                    }

                    // 2. 为其他按钮添加点击事件
                    $menuItem.children().on('click', function () {
                        location.reload();
                    });

                    // 3. 添加按收藏数排序的按钮
                    let $favourite = $(`<li class="_order-item"><span class="search-order-text">${i18n('sort_by_popularity')}</span></li>`);
                    $favourite.on('click', function () {
                        GM.setValue(GMkeys.switchOrderByPopular, !$(this).hasClass('_selected'));
                        location.reload();
                    });
                    $menuItem.prepend($favourite);
                    GM.getValue(GMkeys.switchOrderByPopular, true).then(value => {
                        if(value){
                            $favourite.addClass('_selected');
                        }
                    });

                    observer.disconnect();
                }
            },
            node: document.getElementById('js-react-search-top')
        });

        // 9.2. 按收藏数排序
        GM.getValue(GMkeys.switchOrderByPopular, true).then(value => {
            if(!value) {
                return;
            }
            observerFactory({
                callback: function (mutations, observer) {
                    for (let i = 0, len = mutations.length; i < len; i++) {
                        let mutation = mutations[i];
                        // 1. 判断是否改变节点
                        let $container = $(mutation.target).find('div:first');
                        if (mutation.type !== 'childList' || $container.length <= 0) {
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
        });
    })();

    // 10. 兼容模式检测是否PJAX并刷新页面, https://stackoverflow.com/a/4585031/6335926
    (function(history){
        let pushState = history.pushState;
        history.pushState = function(state) {
            if (typeof history.onpushstate == "function") {
                history.onpushstate({state: state});
            }
            GM.getValue(GMkeys.MO, true).then(function (enableMO) {
                if(enableMO) { return; }
                location.reload();
            });
            return pushState.apply(history, arguments);
        };
    })(window.history);

    // 11. 控制面板
    (function () {
        if(!/.+setting_user\.php.*/.test(location.href)) {
            return;
        }

        let $table = $(`<table style="width: 700px;">
            <tbody>
                <tr><th width="185">Pixiv增强配置</th><td width="500">
                    <label><input type="checkbox" name="${GMkeys.MO}">兼容PJAX(推荐)</label><br/>
                    <label><input type="checkbox" name="${GMkeys.switchComment}">自动加载评论</label><br/>
                    <label><input type="checkbox" name="${GMkeys.switchImgSize}">显示图片尺寸大小</label><br/>
                    <label><input type="checkbox" name="${GMkeys.switchImgPreload}">预下载Gif、Zip(耗流量)</label><br/>

                    <label>下载文件名: <input type="text" name="${GMkeys.downloadName}" placeholder="{pid}-{uid}-{pname}-{uname}"></label>
                    <a>保存</a>
                    <a onclick="alert('{pid}是作品id--------{uid}是画师id\\n{pname}是作品名--------{uname}是画师名\\n注意, 多图情况下, 会自动填充index索引编号\\n目前只支持GIF和多图的重命名');">说明</a>
                </td></tr>
            </tbody>
        </table>`);
        $('.settingContent table:first').after($table);

        $table.find('input[type="checkbox"]').each(function () {
            let $checkbox = $(this), name = $checkbox.attr('name');
            GM.getValue(name, true).then(function (value) { $checkbox.prop('checked', value); });
            $checkbox.on('change', function () {
                let checked = $checkbox.prop('checked');
                $checkbox.prop(checked, checked);
                GM.setValue(name, checked);
            });
        });
        GM.getValue(GMkeys.downloadName).then(function (value) {
            console.log("test"+value)
        });
        $table.find('input[type="text"]').each(function () {
            let $input = $(this), name = $input.attr('name');
            GM.getValue(name).then(function (value) { $input.val(value); });
            $input.on('change', () => {
                GM.setValue(name, $input.val());
            });
        });
    })();

    //TODO 增强新页面fanbox https://www.pixiv.net/fanbox/creator/22926661?utm_campaign=www_profile&utm_medium=site_flow&utm_source=pixiv
    //TODO 日语化
    //TODO 搜索框ui混乱 https://www.pixiv.net/member_illust.php?mode=medium&illust_id=899657
});
