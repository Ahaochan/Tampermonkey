// ==UserScript==
// @name        Pixiv Plus
// @name:zh-CN  Pixiv 增强
// @name:zh-TW  Pixiv 增強
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.8.6
// @icon        https://www.pixiv.net/favicon.ico
// @description Focus on immersive experience, 1. Block ads, directly access popular pictures 2. Use user to enter the way to search 3. Search pid and uid 4. Display original image and size, picture rename, download original image | gif map | Zip|multiple map zip 5. display artist id, artist background image 6. auto load comment 7. dynamic markup work type 8. remove redirection 9. single page sort 10. control panel select desired function github: https:/ /github.com/Ahaochan/Tampermonkey, welcome to star and fork.
// @description:ja    没入型体験に焦点を当てる、1.人気の写真に直接アクセスする広告をブロックする2.検索する方法を入力するためにユーザーを使用する3.検索pidとuid 4.元の画像とサイズを表示する Zip | multiple map zip 5.アーティストID、アーティストの背景画像を表示します。6.自動ロードコメントを追加します。7.動的マークアップ作業タイプを指定します。8.リダイレクトを削除します。9.シングルページソート10.コントロールパネルを選択します。github：https：/ /github.com/Ahaochan/Tampermonkey、スターとフォークへようこそ。
// @description:zh-CN 专注沉浸式体验，1.屏蔽广告,直接访问热门图片 2.使用users入り的方式搜索 3.搜索pid和uid 4.显示原图及尺寸，图片重命名，下载原图|gif图|动图帧zip|多图zip 5.显示画师id、画师背景图 6.自动加载评论 7.对动态标记作品类型 8.去除重定向 9.单页排序 10.控制面板选择想要的功能 github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @description:zh-TW 專注沉浸式體驗，1.屏蔽廣告,直接訪問熱門圖片2.使用users入り的方式搜索3.搜索pid和uid 4.顯示原圖及尺寸，圖片重命名，下載原圖|gif圖|動圖幀zip|多圖zip 5.顯示畫師id、畫師背景圖6.自動加載評論7.對動態標記作品類型8.去除重定向9.單頁排序10.控制面板選擇想要的功能github:https:/ /github.com/Ahaochan/Tampermonkey，歡迎star和fork。
// @author      Ahaochan
// @include     http*://www.pixiv.net*
// @match       http://www.pixiv.net/
// @connect     i.pximg.net
// @connect     i-f.pximg.net
// @connect     i-cf.pximg.net
// @license     GPL-3.0
// @supportURL  https://github.com/Ahaochan/Tampermonkey
// @grant       unsafeWindow
// @grant       GM.xmlHttpRequest
// @grant       GM.setClipboard
// @grant       GM.setValue
// @grant       GM.getValue
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// @grant       GM_registerMenuCommand
// @grant       GM_unregisterMenuCommand
// @grant       GM_setClipboard
// @grant       GM_setValue
// @grant       GM_getValue
// @require     https://cdn.bootcdn.net/ajax/libs/jquery/2.2.4/jquery.min.js
// @require     https://cdn.bootcss.com/jszip/3.1.4/jszip.min.js
// @require     https://cdn.bootcss.com/FileSaver.js/1.3.2/FileSaver.min.js
// @require     https://greasyfork.org/scripts/2963-gif-js/code/gifjs.js?version=8596
// @require     https://greasyfork.org/scripts/375359-gm4-polyfill-1-0-1/code/gm4-polyfill-101.js?version=652238
// @run-at      document-end
// @noframes
// ==/UserScript==
jQuery($ => {
    'use strict';
    // 加载依赖
    // ============================ jQuery插件 ====================================
    $.fn.extend({
        fitWindow () {
            this.css('width', 'auto').css('height', 'auto')
                .css('max-width', '').css('max-height', $(window).height());
        },
        replaceTagName (replaceWith) {
            const tags = [];
            let i = this.length;
            while (i--) {
                const newElement = document.createElement(replaceWith);
                const thisi = this[i];
                const thisia = thisi.attributes;
                for (let a = thisia.length - 1; a >= 0; a--) {
                    const attrib = thisia[a];
                    newElement.setAttribute(attrib.name, attrib.value);
                }
                newElement.innerHTML = thisi.innerHTML;
                $(thisi).after(newElement).remove();
                tags[i] = newElement;
            }
            return $(tags);
        },
        getBackgroundUrl () {
            const imgUrls = [];
            this.each(function (index, { style }) {
                let bgUrl = $(this).css('background-image') || style.backgroundImage || 'url("")';
                const matchArr = bgUrl.match(/url\((['"])(.*?)\1\)/);
                bgUrl = matchArr && matchArr.length >= 2 ? matchArr[2] : '';
                imgUrls.push(bgUrl);
            });
            return imgUrls.length === 1 ? imgUrls[0] : imgUrls;
        }
    });


    // ============================ 全局参数 ====================================
    const debug = true;
    const [log, error] = [debug ? console.log : () => { }, console.error];


    let globalData;

    let preloadData;
    const initData = () => {
        $.ajax({
            url: location.href, async: false,
            success: response => {
                const html = document.createElement('html');
                html.innerHTML = response;
                globalData = JSON.parse($(html).find('meta[name="global-data"]').attr('content') || '{}');
                preloadData = JSON.parse($(html).find('meta[name="preload-data"]').attr('content') || '{}');
            }
        });
    };
    const getPreloadData = () => {
        if (!preloadData) { initData(); }
        return preloadData;
    };
    const getGlobalData = () => {
        if (!globalData) { initData(); }
        return globalData;
    };
    const lang = (document.documentElement.getAttribute('lang') || 'en').toLowerCase();
    let illustJson = {};

    const illust = () => {
        // 1. 判断是否已有作品id(兼容按左右方向键翻页的情况)
        const preIllustId = $('body').attr('ahao_illust_id');
        const paramRegex = location.href.match(/artworks\/(\d*)$/);
        const urlIllustId = !!paramRegex && paramRegex.length > 0 ? paramRegex[1] : '';
        // 2. 如果illust_id没变, 则不更新json
        if (parseInt(preIllustId) === parseInt(urlIllustId)) {
            return illustJson;
        }
        // 3. 如果illust_id变化, 则持久化illust_id, 且同步更新json
        if (!!urlIllustId) {
            $('body').attr('ahao_illust_id', urlIllustId);
            $.ajax({
                url: `/ajax/illust/${urlIllustId}`,
                dataType: 'json',
                async: false,
                success: ({ body }) => illustJson = body
            });
        }
        return illustJson;
    };
    const getUid = () => {
        if (!preloadData || !preloadData.user || !Object.keys(preloadData.user)[0]) {
            initData();
        }
        return preloadData && preloadData.user && Object.keys(preloadData.user)[0];
    };
    const observerFactory = function (option) {
        let options;
        if (typeof option === 'function') {
            options = {
                callback: option,
                node: document.getElementsByTagName('body')[0],
                option: { childList: true, subtree: true }
            };
        } else {
            options = $.extend({
                callback: () => {
                },
                node: document.getElementsByTagName('body')[0],
                option: { childList: true, subtree: true }
            }, option);
        }
        const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

        const observer = new MutationObserver((mutations, observer) => {
            options.callback.call(this, mutations, observer);
            // GM.getValue('MO', true).then(function (v) { if(!v) observer.disconnect(); });
        });

        observer.observe(options.node, options.option);
        return observer;
    };
    const isLogin = () => {
        let status = 0;
        $.ajax({ url: 'https://www.pixiv.net/setting_user.php', async: false })
            .done((data, statusText, xhr) => status = xhr.status);
        return status === 200;
    };

    // ============================ 配置信息 ====================================
    const GMkeys = {
        MO: 'MO',                                   // MutationObserver 的开关
        selectorShareBtn: 'selectorShareBtn',       // 下载按钮的selector
        selectorRightColumn: 'selectorRightColumn', // 作品页面的作者信息selector

        switchImgSize: 'switch-img-size',              // 是否显示图片大小的开关
        switchImgPreload: 'switch-img-preload',         // 是否预下载的开关
        switchComment: 'switch-comment',                // 是否自动加载评论的开关
        switchImgMulti: 'switchImgMulti',               // 是否自动加载多图的开关
        switchOrderByPopular: 'switch-order-by-popular',// 是否按收藏数排序的开关(单页排序)

        downloadName: 'download-name',  // 下载名pattern
    };

    // ============================ i18n 国际化 ===============================
    const i18nLib = {
        ja: {
            load_origin: 'load_origin',
            ad_disable: 'ad_disable',
            search_enhance: 'search_enhance',
            download_able: 'download_able',
            artist_info: 'artist_info',
            comment_load: 'comment_load',
            artwork_tag: 'artwork_tag',
            redirect_cancel: 'redirect_cancel',
            watchlist: 'ウォッチリストに追加',
            favorites: 'users入り',
            author: '創作家',
        },
        en: {
            load_origin: 'load_origin',
            ad_disable: 'ad_disable',
            search_enhance: 'search_enhance',
            download_able: 'download_able',
            artist_info: 'artist_info',
            comment_load: 'comment_load',
            artwork_tag: 'artwork_tag',
            redirect_cancel: 'redirect_cancel',
            watchlist: 'Add to Watchlist',
            favorites: 'favorites',
            author: 'Author',
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
            load_origin: '加载原图',
            ad_disable: '屏蔽广告',
            search_enhance: '搜索增强',
            download_able: '开启下载',
            artist_info: '显示作者信息',
            comment_load: '加载评论',
            artwork_tag: '作品标记',
            redirect_cancel: '取消重定向',
            watchlist: '加入追更列表',
            favorites: '收藏人数',
            author: '作者',
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
        'zh-cn': {},
        'zh-tw': {
            load_origin: '加載原圖',
            ad_disable: '屏蔽廣告',
            search_enhance: '搜索增強',
            download_able: '開啟下載',
            artist_info: '顯示作者信息',
            comment_load: '加載評論',
            artwork_tag: '作品標記',
            redirect_cancel: '取消重定向',
            watchlist: '加入追蹤列表',
            favorites: '收藏人數',
            author: '作者',
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
    i18nLib['zh-cn'] = $.extend({}, i18nLib.zh);
    // TODO 待翻译
    i18nLib.ja = $.extend({}, i18nLib.en, i18nLib.ja);
    i18nLib.ko = $.extend({}, i18nLib.en, i18nLib.ko);
    const i18n = key => i18nLib[lang][key] || `i18n[${lang}][${key}] not found`;


    // ============================ 功能配置 ==============================
    let menuId = [];
    const registerMenu = () => {
        // 用于刷新设置
        if (menuId.length) {
            const len = menuId.length;
            for (let i = 0; i < len; i++) {
                GM_unregisterMenuCommand(menuId[i]);
            }
        }
        const menu = [
            ['ad_disable', true],
            ['search_enhance', true],
            ['download_able', true],
            ['artist_info', true],
            ['comment_load', true],
            ['artwork_tag', true],
            ['redirect_cancel', true],
            ['load_origin', true]
        ];
        const len = menu.length;
        for (let i = 0; i < len; i++) {
            const item = menu[i][0];
            menu[i][1] = GM_getValue(item);
            if (menu[i][1] === null || menu[i][1] === undefined) {
                GM_setValue(item, true);
                menu[i][1] = true;
            }
            menuId[i] = GM_registerMenuCommand(`${menu[i][1] ? '✅' : '❌'} ${i18n(item)}`, () => {
                GM_setValue(item, !menu[i][1]);
                registerMenu();
            });
        }
        return Object.freeze({
            ad_disable: menu[0][1],
            search_enhance: menu[1][1],
            download_able: menu[2][1],
            artist_info: menu[3][1],
            comment_load: menu[4][1],
            artwork_tag: menu[5][1],
            redirect_cancel: menu[6][1],
            load_origin: menu[7][1],
        });
    };
    const config = registerMenu();
    // ============================ url 页面判断 ==============================
    const isArtworkPage = () => /.+artworks\/\d+.*/.test(location.href);

    const isMemberIndexPage = () => /.+\/users\/\d+.*/.test(location.href);
    const isMemberIllustPage = () => /.+\/member_illust\.php\?id=\d+/.test(location.href);
    const isMemberBookmarkPage = () => /.+\/bookmark\.php\?id=\d+/.test(location.href);
    const isMemberFriendPage = () => /.+\/mypixiv_all\.php\?id=\d+/.test(location.href);
    const isMemberDynamicPage = () => /.+\/stacc.+/.test(location.href);
    const isMemberPage = () => isMemberIndexPage() || isMemberIllustPage() || isMemberBookmarkPage() || isMemberFriendPage();
    const isSearchPage = () => /.+\/search\.php.*/.test(location.href) || /.+\/tags\/.*\/artworks.*/.test(location.href);

    // 判断是否登录
    if (!isLogin()) {
        alert(i18n('loginWarning'));
    }
    /**
     * [0] => 功能配置
     * [1] => ob / ob组[ob, ob创建函数，判断是否处于对应页面的函数(可选)]
     * [2] => 创建ob / ob组的函数
     * [3] => 判断是否处于对应页面的函数
     */
    const observers = [
        // 1. 屏蔽广告, 全局进行css处理
        ['ad_disable', null, () => {
            // 1. 删除静态添加的广告
            $('.ad').remove();
            $('._premium-lead-tag-search-bar').hide();
            $('.popular-introduction-overlay').hide();// 移除热门图片遮罩层
            $('.ad-footer').remove();//移除页脚广告

            // 2. 删除动态添加的广告
            const adSelectors = ['iframe', '._premium-lead-promotion-banner',
                'a[href="/premium/lead/lp/?g=anchor&i=popular_works_list&p=popular&page=visitor"]', // https://www.pixiv.net/tags/%E6%9D%B1%E6%96%B9/artworks?s_mode=s_tag 热门作品
                'a[href="/premium/lead/lp/?g=anchor&i=work_detail_remove_ads"]'
            ];

            return observerFactory((mutations, observer) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            for (const selector of adSelectors) {
                                $(node).find(selector).hide();
                            }
                        }
                    }
                }
            });
        }, () => true],
        // 2/3. 搜索增强
        ['search_enhance', null, () =>
            observerFactory((mutations, observer) => {
                for (let i = 0, len = mutations.length; i < len; i++) {
                    const mutation = mutations[i];
                    // 1. 判断是否改变节点, 或者是否有[form]节点
                    const $form = $('#js-mount-point-header form:not([action]), #root div[style="position: static; z-index: auto;"] form:not([action])');
                    if (mutation.type !== 'childList' || !$form.length) {
                        continue;
                    }
                    log("搜索增强 初始化");

                    // 2. 修改父级grid布局
                    $form.parent().parent().css('grid-template-columns', '1fr minmax(100px, auto) minmax(100px, auto) 2fr 2fr 1fr 2fr');

                    // 3. 搜索UID，PID和作者
                    ($form => {
                        const idSearch = true;
                        const otherSearch = false;
                        const initSearch = option => {
                            const options = $.extend({ $form: null, placeholder: '', url: '', searchType: idSearch }, option);

                            if (!options.$form) {
                                error('搜索UID和PID 初始化失败, form元素获取失败');
                            }

                            // 1. 初始化表单UI
                            const $parent = options.$form.parent().clone();
                            const $form = $parent.find('form');
                            $form.children('div').eq(1).remove();
                            $form.attr('class', 'ahao-search');
                            options.$form.parent().before($parent);

                            const $input = $form.find('input[type="text"]:first');
                            $input.attr('placeholder', options.placeholder);
                            $input.val('');

                            // 2. 绑定submit事件
                            $form.submit(e => {
                                e.preventDefault();
                                const val = encodeURIComponent($input.val());
                                // 2.1. ID 必须为纯数字
                                if (options.searchType && !/^[0-9]+$/.test(val)) {
                                    const label = options.placeholder + i18n('illegal');
                                    alert(label);
                                    return;
                                }
                                // 2.2. 新窗口打开url
                                const url = option.url + val;
                                window.open(url);
                                // 2.3. 清空input等待下次输入
                                $input.val('');
                            });
                        };
                        initSearch({$form: $form, placeholder: 'UID', url: 'https://www.pixiv.net/users/', searchType: idSearch });
                        initSearch({$form: $form, placeholder: 'PID', url: 'https://www.pixiv.net/artworks/', searchType: idSearch });
                        // TODO UI错乱: https://www.pixiv.net/stacc/mdnk
                        // TODO 无法精确搜索到作者, https://www.pixiv.net/search_user.php?nick=%E3%83%A1%E3%83%87%E3%82%A3%E3%83%B3%E3%82%AD
                        initSearch({$form, placeholder: i18n('author'), url: "https://www.pixiv.net/search_user.php?nick=", searchType: otherSearch });
                    })($form);
                    // 4. 搜索条件
                    ($form => {
                        const label = i18n('favorites'); // users入り
                        const $input = $form.find('input[type="text"]:first');
                        const $select = $(`
                    <select id="select-ahao-favorites">
                        <option value=""></option>
                        <option value="30000users入り">30000users入り</option>
                        <option value="20000users入り">20000users入り</option>
                        <option value="10000users入り">10000users入り</option>
                        <option value="5000users入り" > 5000users入り</option>
                        <option value="1000users入り" > 1000users入り</option>
                        <option value="500users入り"  >  500users入り</option>
                        <option value="300users入り"  >  300users入り</option>
                        <option value="100users入り"  >  100users入り</option>
                        <option value="50users入り"   >   50users入り</option>
                    </select>`);
                        $select.on('change', () => {
                            if (!!$input.val()) { $form.submit(); }
                        });
                        $form.parent().after($select);
                        $form.submit(e => {
                            e.preventDefault();
                            if (!!$select.val()) {
                                // 2.4.1. 去除旧的搜索选项
                                $input.val((index, val) => val.replace(/\d*users入り/g, ''));
                                $input.val((index, val) => val.replace(/\d*$/g, ''));
                                // 2.4.2. 去除多余空格
                                $input.val((index, val) => val.replace(/\s\s*/g, ''));
                                $input.val((index, val) => `${val} `);
                                // 2.4.3. 添加新的搜索选项
                                $input.val((index, val) => `${val}${$select.val()}`);
                            }
                            const value = encodeURIComponent($input.val());
                            if (!!value) {
                                location.href = `https://www.pixiv.net/tags/${value}/artworks?s_mode=s_tag`;
                            }
                        });
                    })($form);

                    observer.disconnect();
                    break;
                }
            })
            , () => true],
        // 4. 单张图片替换为原图格式. 追加下载按钮, 下载gif图、gif的帧压缩包、多图
        ['download_able', null, async () => {
            // 1. 初始化方法
            const initDownloadBtn = option => {
                // 下载按钮, 复制分享按钮并旋转180度
                const options = $.extend({ $shareButtonContainer: undefined, id: '', text: '', clickFun: () => { } }, option);
                const $downloadButtonContainer = options.$shareButtonContainer.clone();
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
            // 单图显示图片尺寸 https://www.pixiv.net/artworks/109953681
            // TODO 多图显示图片尺寸异常 https://www.pixiv.net/artworks/65424837
            const addImgSize = async option => {
                // 从 $img 获取图片大小, after 到 $img
                const options = $.extend({
                    $img: undefined,
                    position: 'absolute',
                }, option);
                const $img = options.$img;
                const position = options.position;
                if ($img.length !== 1) {
                    return;
                }
                GM.getValue(GMkeys.switchImgSize, true).then(open => {
                    if (!!open) {
                        // 1. 找到 显示图片大小 的 span, 没有则添加
                        let $span = $img.next('span');
                        if ($span.length <= 0) {
                            // 添加前 去除失去依赖的 span
                            $('body').find('.ahao-img-size').each(function () {
                                const $this = $(this);
                                const $prev = $this.prev('canvas, img');
                                if ($prev.length <= 0) {
                                    $this.remove();
                                }
                            });
                            $img.after(`<span class="ahao-img-size" style="position: ${position}; right: 0; top: 28px;
                    color: #ffffff; font-size: x-large; font-weight: bold; -webkit-text-stroke: 1.0px #000000;"></span>`);
                            $span = $img.next('span');
                        }
                        // 2. 根据标签获取图片大小, 目前只有 canvas 和 img 两种
                        if ($img.prop('tagName') === 'IMG') {
                            const img = new Image();
                            img.src = $img.attr('src');
                            img.onload = function () {
                                $span.text(`${this.width}x${this.height}`);
                            };
                        } else {
                            const width = $img.attr('width') || $img.css('width').replace('px', '') || $img.css('max-width').replace('px', '') || 0;
                            const height = $img.attr('height') || $img.css('height').replace('px', '') || $img.css('max-height').replace('px', '') || 0;
                            $span.text(`${width}x${height}`);
                        }
                    }
                });
            };
            const mimeType = suffix => {
                const lib = { png: "image/png", jpg: "image/jpeg", gif: "image/gif" };
                return lib[suffix] || `mimeType[${suffix}] not found`;
            };
            const getDownloadName = (name) => {
                name = name.replace('{pid}', illust().illustId);
                name = name.replace('{uid}', illust().userId);
                name = name.replace('{pname}', illust().illustTitle);
                name = name.replace('{uname}', illust().userName);
                return name;
            };
            const isMoreMode = () => illust().pageCount > 1;
            const isGifMode = () => illust().illustType === 2;
            const isSingleMode = () => (illust().illustType === 0 || illust().illustType === 1) && illust().pageCount === 1;
            const selectorShareBtn = await GM.getValue(GMkeys.selectorShareBtn, '.UXmvz'); // section 下的 div

            // 热修复下载按钮的className
            const a = () => observerFactory((mutations, observer) => {
                for (let i = 0, len = mutations.length; i < len; i++) {
                    const mutation = mutations[i];
                    const $target = $(mutation.target);
                    if ($target.prop('tagName').toLowerCase() !== 'section') continue;
                    const $section = $target.find('section');
                    if ($section.length <= 0) continue;
                    const className = $section.eq(0).children('div').eq(1).attr('class').split(' ')[1];
                    GM.setValue(GMkeys.selectorShareBtn, `.${className}`);
                    observer.disconnect();
                    return;
                }
            });
            // 显示单图、多图原图
            const b = () => observerFactory({
                callback (mutations, observer) {
                    for (let i = 0, len = mutations.length; i < len; i++) {
                        const mutation = mutations[i];
                        const $target = $(mutation.target);
                        const replaceImg = ($target, attr, value) => {
                            const oldValue = $target.attr(attr);
                            if (new RegExp(`https?://i(-f|-cf)?\.pximg\.net.*\/${illust().id}_.*`).test(oldValue) &&
                                !new RegExp(`https?://i(-f|-cf)?\.pximg\.net/img-original.*`).test(oldValue)) {
                                $target.attr(attr, value).css('filter', 'none');
                                $target.fitWindow();
                            }
                        };

                        // 1. 单图、多图 DOM 结构都为 <a href=""><img/></a>
                        const $link = $target.find('img[src]');
                        $link.each(function () {
                            const $this = $(this);
                            const href = $this.parent('a').attr('href');
                            if (!!href && (href.endsWith('jpg') || href.endsWith('png'))) {
                                if (config.load_origin) {
                                    replaceImg($this, 'src', href);
                                }
                                addImgSize({ $img: $this }); // 显示图片大小
                            }
                        });

                        // 2. 移除马赛克遮罩, https://www.pixiv.net/member_illust.php?mode=medium&illust_id=50358638
                        // $('.e2p8rxc2').hide(); // 懒得适配了, 自行去个人资料设置 https://www.pixiv.net/setting_user.php
                    }
                },
                option: { attributes: true, childList: true, subtree: true, attributeFilter: ['src', 'href'] }
            });
            // 下载动图帧zip, gif图
            const c = () => observerFactory((mutations, observer) => {
                for (let i = 0, len = mutations.length; i < len; i++) {
                    const mutation = mutations[i];
                    const $target = $(mutation.target);

                    // 1. 单图、多图、gif图三种模式
                    const $shareBtn = $target.find(selectorShareBtn);

                    const $canvas = $target.find('canvas');
                    // 2. 显示图片大小
                    addImgSize({ $img: $canvas })
                    if (!isGifMode() || mutation.type !== 'childList' ||
                        $shareBtn.length <= 0 ||
                        $target.find('#ahao-download-zip').length > 0) {
                        continue
                    }
                    log('下载gif图');

                    // 3. 初始化 下载按钮
                    const $zipBtn = initDownloadBtn({
                        $shareButtonContainer: $shareBtn,
                        id: 'ahao-download-zip',
                        text: 'zip',
                    });
                    const $gifBtn = initDownloadBtn({
                        $shareButtonContainer: $shareBtn,
                        id: 'ahao-download-gif',
                        text: 'gif',
                        clickFun () {
                            // 从 pixiv 官方 api 获取 gif 的数据
                            $.ajax({
                                url: `/ajax/illust/${illust().illustId}/ugoira_meta`, dataType: 'json',
                                success: ({ body }) => {
                                    // 1. 初始化 gif 下载按钮 点击事件
                                    // GIF_worker_URL 来自 https://greasyfork.org/scripts/2963-gif-js/code/gifjs.js?version=8596
                                    let gifUrl;

                                    const gifFrames = [];
                                    const gifFactory = new GIF({ workers: 1, quality: 10, workerScript: GIF_worker_URL });

                                    for (let frameIdx = 0, frames = body.frames, framesLen = frames.length; frameIdx < framesLen; frameIdx++) {
                                        const frame = frames[frameIdx];
                                        const url = illust().urls.original.replace('ugoira0.', `ugoira${frameIdx}.`);
                                        GM.xmlHttpRequest({
                                            method: 'GET', url: url,
                                            headers: { referer: 'https://www.pixiv.net/' },
                                            overrideMimeType: 'text/plain; charset=x-user-defined',
                                            onload ({ responseText }) {
                                                // 2. 转为blob类型
                                                const r = responseText;

                                                const data = new Uint8Array(r.length);
                                                let i = 0;
                                                while (i < r.length) {
                                                    data[i] = r.charCodeAt(i);
                                                    i++;
                                                }
                                                const suffix = url.split('.').splice(-1);
                                                const blob = new Blob([data], { type: mimeType(suffix) });

                                                // 3. 压入gifFrames数组中, 手动同步sync
                                                const img = document.createElement('img');
                                                img.src = URL.createObjectURL(blob);
                                                img.width = illust().width;
                                                img.height = illust().height;
                                                img.onload = () => {
                                                    gifFrames[frameIdx] = { frame: img, option: { delay: frame.delay } };
                                                    if (Object.keys(gifFrames).length >= framesLen) {
                                                        $.each(gifFrames, (i, f) => gifFactory.addFrame(f.frame, f.option));
                                                        gifFactory.render();
                                                    }
                                                };
                                            }
                                        });
                                    }
                                    gifFactory.on('progress', pct => {
                                        $gifBtn.find('p').text(`gif ${parseInt(pct * 100)}%`);
                                    });
                                    gifFactory.on('finished', blob => {
                                        gifUrl = URL.createObjectURL(blob);
                                        GM.getValue(GMkeys.downloadName, `{pid}`).then(name => {
                                            const $a = $(`<a href="${gifUrl}" download="${getDownloadName(name)}"></a>`);
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
                        success: ({ body }) => {
                            GM.getValue(GMkeys.downloadName, `{pid}`).then(name => {
                                const $a = $(`<a href="${body.originalSrc}" download="${getDownloadName(name)}"></a>`);
                                $zipBtn.find('button').wrap($a);
                            });
                        }
                    });
                    GM.getValue(GMkeys.switchImgPreload, true).then(open => { if (open) { $gifBtn.find('button').click(); } });

                    // 5. 取消监听
                    GM.getValue(GMkeys.MO, true).then(v => { if (!v) observer.disconnect(); });
                }
            });
            // 下载多图zip
            const d = () => observerFactory((mutations, observer) => {
                for (let i = 0, len = mutations.length; i < len; i++) {
                    const mutation = mutations[i];
                    const $target = $(mutation.target);

                    // 1. 单图、多图、gif图三种模式
                    const $shareBtn = $target.find(selectorShareBtn);
                    if (!isMoreMode() || mutation.type !== 'childList' || !$shareBtn.length || !!$target.find('#ahao-download-zip').length) {
                        continue
                    }
                    log('下载多图');

                    // 2. 查看全部图片
                    GM.getValue(GMkeys.switchImgMulti, true).then(open => { if (open) { $shareBtn.parent('section').next('button').click(); } });

                    // 3. 初始化 图片数量, 图片url
                    const zip = new JSZip();
                    let downloaded = 0;           // 下载完成数量
                    const num = illust().pageCount; // 下载目标数量
                    const url = illust().urls.original;
                    const imgUrls = Array(parseInt(num)).fill()
                        .map((value, index) => url.replace(/_p\d\./, `_p${index}.`));

                    // 4. 初始化 下载按钮, 复制分享按钮并旋转180度
                    const $zipBtn = initDownloadBtn({
                        $shareButtonContainer: $shareBtn,
                        id: 'ahao-download-zip',
                        text: `${i18n('download')}`,
                        clickFun () {
                            // 3.1. 下载图片, https://wiki.greasespot.net/GM.xmlHttpRequest
                            if ($(this).attr('start') !== 'true') {
                                $(this).attr('start', true);
                                $.each(imgUrls, (index, url) => {
                                    GM.xmlHttpRequest({
                                        method: 'GET', url: url,
                                        headers: { referer: 'https://www.pixiv.net/' },
                                        overrideMimeType: 'text/plain; charset=x-user-defined',
                                        onload ({ responseText }) {
                                            // 4.1. 转为blob类型
                                            const r = responseText;

                                            const data = new Uint8Array(r.length);
                                            let i = 0;
                                            while (i < r.length) {
                                                data[i] = r.charCodeAt(i);
                                                i++;
                                            }
                                            const suffix = url.split('.').splice(-1);
                                            const blob = new Blob([data], { type: mimeType(suffix) });

                                            // 4.2. 压缩图片
                                            GM.getValue(GMkeys.downloadName, `{pid}`).then(name => {
                                                zip.file(`${getDownloadName(name)}_${index}.${suffix}`, blob, { binary: true });
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
                                zip.generateAsync({ type: 'blob', base64: true })
                                    .then(content => saveAs(content, getDownloadName(name)));
                            });
                        }
                    });

                    // 4. 控制是否预下载, 避免多个页面导致爆内存
                    GM.getValue(GMkeys.switchImgPreload, true).then(open => { if (open) { $zipBtn.find('button').click(); } });

                    // 5. 取消监听
                    GM.getValue(GMkeys.MO, true).then(v => { if (!v) observer.disconnect(); });
                }
            });


            // 这里的页面判断可以去除, 判断在第1次就结束了
            return [
                [a(), a],
                [b(), b],
                [c(), c],
                [d(), d]
            ];
        }, () => isArtworkPage()],
        // 5. 在画师页面和作品页面显示画师id、画师背景图, 用户头像允许右键保存
        ['artist_info', null, () => {
            // 画师页面UI
            const a = () => observerFactory((mutations, observer) => {
                for (let i = 0, len = mutations.length; i < len; i++) {
                    const mutation = mutations[i];

                    // 1. 判断是否改变节点, 或者是否有[section]节点
                    const $target = $(mutation.target); // 多个反混淆externalLinksContainer

                    const externalLinksContainer = '_2AOtfl9';
                    const $row = $(`ul.${externalLinksContainer}`).parent();
                    if (mutation.type !== 'childList' || $row.length <= 0 || $('body').find('#uid').length > 0) {
                        continue;
                    }

                    // 1. 添加新的一行的div
                    const $ahaoRow = $row.clone();

                    const $ul = $ahaoRow.children('ul');
                    $ahaoRow.children(':not(ul)').remove();
                    $ul.empty();
                    $row.before($ahaoRow);

                    // 2. 显示画师id, 点击自动复制到剪贴板
                    const uid = getUid();
                    const $uid = $(`<li id="uid"><div style="font-size: 20px;font-weight: 700;color: #333;margin-right: 8px;line-height: 1">UID:${uid}</div></li>`)
                        .on('click', function () {
                            const $this = $(this);
                            $this.html(`<span>UID${i18n('copy_to_clipboard')}</span>`);
                            GM.setClipboard(uid);
                            setTimeout(() => {
                                $this.html(`<span>UID${uid}</span>`);
                            }, 2000);
                        });
                    $ul.append($uid);

                    // 3. 显示画师背景图
                    const background = preloadData.user[uid].background;
                    const url = (background && background.url) || '';
                    const $bgli = $('<li><div style="font-size: 20px;font-weight: 700;color: #333;margin-right: 8px;line-height: 1"></div></li>');
                    const $bg = $bgli.find('div');
                    if (!!url && url !== 'none') {
                        $bg.append(`<img src="${url}" width="30px"><a target="_blank" href="${url}">${i18n('background')}</a>`);
                    } else {
                        $bg.append(`<span>${i18n('background_not_found')}</span>`);
                    }
                    $ul.append($bgli);

                    // 4. 取消监听
                    GM.getValue(GMkeys.MO, true).then(v => { if (!v) observer.disconnect(); });
                }
            });
            // 作品页面UI
            const b = () => observerFactory((mutations, observer) => {
                for (let i = 0, len = mutations.length; i < len; i++) {
                    const mutation = mutations[i];
                    // 1. 判断是否改变节点, 或者是否有[section]节点
                    const $aside = $(mutation.target).parent().find('main').next('aside');
                    if (mutation.type !== 'childList' || $aside.length <= 0) {
                        continue;
                    }

                    const $row = $aside.find('section:first').find('h2');
                    if ($row.length <= 0 || $aside.find('#ahao-background').length > 0) {
                        continue;
                    }

                    // 2. 显示画师背景图
                    const uid = getUid();
                    const background = preloadData.user[uid].background;
                    const url = (background && background.url) || '';
                    const $bgDiv = $row.clone().attr('id', 'ahao-background');
                    $bgDiv.children('a').remove();
                    $bgDiv.children('div').children('div').remove();
                    $bgDiv.prepend(`<img src="${url}" width="10%"/>`);
                    $bgDiv.find('div a').attr('href', !!url ? url : 'javascript:void(0)').attr('target', '_blank')
                        .text(!!url ? i18n('background') : i18n('background_not_found'));
                    $row.after($bgDiv);

                    // 3. 显示画师id, 点击自动复制到剪贴板
                    const $uid = $row.clone();
                    $uid.children('a').remove();
                    $uid.children('div').children('div').remove();
                    $uid.find('a').attr('href', 'javascript:void(0)').attr('id', 'ahao-uid').text(`UID: ${uid}`);
                    $uid.on('click', function () {
                        const $this = $(this);
                        $this.find('a').text(`UID${i18n('copy_to_clipboard')}`);
                        GM.setClipboard(uid);
                        setTimeout(() => {
                            $this.find('a').text(`UID: ${uid}`);
                        }, 2000);
                    });
                    $bgDiv.after($uid);

                    // 4. 取消监听
                    GM.getValue(GMkeys.MO, true).then(v => { if (!v) observer.disconnect(); });
                }
            });
            // 解除 用户头像 的background 限制, 方便保存用户头像
            const c = () => observerFactory((mutations, observer) => {
                for (let i = 0, len = mutations.length; i < len; i++) {
                    const mutation = mutations[i];
                    // 1. 判断是否改变节点
                    if (mutation.type !== 'childList') {
                        continue;
                    }

                    // 2. 将作者头像由 background 转为 <img>
                    const $target = $(mutation.target);
                    $target.find('div[role="img"]').each(function () {
                        const $this = $(this);
                        const tagName = $this.prop('tagName');

                        const imgUrl = $this.getBackgroundUrl();
                        if (!imgUrl) {
                            return;
                        }

                        const $userImg = $('<img class="ahao-user-img" src=""/>').attr('src', imgUrl);
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
                        const $this = $(this);
                        const $div = $this.find('div');
                        const $img = $('<img/>');
                        $img.attr('src', $this.attr('data-src'));
                        if (!!$div.length) {
                            $img.attr('class', $div.attr('class'))
                                .css('width', $div.css('width'))
                                .css('height', $div.css('height'));
                            $this.html($img);
                        }
                    });
                }
            })
            return [
                [a(), a, () => isMemberIndexPage()],
                [b(), b, () => isArtworkPage()],
                [c(), c, () => true]
            ]
        }, () => true],
        // 6. 自动加载评论
        ['comment_load', null, () => {
            let t = null;
            log('加载评论 初始化');
            GM.getValue(GMkeys.switchComment, true).then(open => {
                const skipButton = i18n('watchlist');
                const moreReplaySelector = '._28zR1MQ';
                t = observerFactory((mutations, observer) => {
                    if (!open || !isArtworkPage()) {
                        return;
                    }
                    for (let i = 0, len = mutations.length; i < len; i++) {
                        const mutation = mutations[i];
                        // 1. 判断是否改变节点
                        if (mutation.type !== 'childList') {
                            continue;
                        }

                        // 2. 模拟点击加载按钮
                        const $moreCommentBtns = $("div > div:eq(2) > div div[role='button']");
                        let $moreCommentBtn = $moreCommentBtns[0];

                        if ($moreCommentBtn) {
                            if ($moreCommentBtn.textContent === skipButton) {
                                if ($moreCommentBtns.length > 1) {
                                    $moreCommentBtn = $moreCommentBtns[1];
                                    $moreCommentBtn.click();
                                }
                            } else {
                                $moreCommentBtn.click();
                            }
                        }

                        const $moreReplayBtn = $(mutation.target).find(moreReplaySelector);
                        $moreReplayBtn.click();
                    }
                });
            });
            return t;
        }, () => true],
        // 7. 对主页动态中的图片标记作品类型
        ['artwork_tag', null, () => {
            log('标记作品 初始化');
            const illustTitleSelector = '.stacc_ref_illust_title';
            return observerFactory((mutations, observer) => {
                for (let i = 0, len = mutations.length; i < len; i++) {
                    const mutation = mutations[i];
                    // 1. 判断是否改变节点
                    const $title = $(mutation.target).find(illustTitleSelector);
                    if (mutation.type !== 'childList' || !$title.length) {
                        continue;
                    }

                    $title.each(function () {
                        const $a = $(this).find('a');
                        // 1. 已经添加过标记的就不再添加
                        if (!!$a.attr('ahao-illust-id')) {
                            return;
                        }
                        // 2. 获取pid, 设置标记避免二次生成
                        const illustId = new URL(`${location.origin}/${$a.attr('href')}`).searchParams.get('illust_id');
                        $a.attr('ahao-illust-id', illustId);
                        // 3. 调用官方api, 判断作品类型
                        $.ajax({
                            url: `/ajax/illust/${illustId}`, dataType: 'json',
                            success: ({ body }) => {
                                const illustType = parseInt(body.illustType);
                                const isMultiPic = parseInt(body.pageCount) > 1;
                                switch (illustType) {
                                    case 0:
                                    case 1:
                                        $a.after(`<p>${isMultiPic ? i18n('illust_type_multiple') : i18n('illust_type_single')}</p>`);
                                        break;
                                    case 2:
                                        $a.after(`<p>${i18n('illust_type_gif')}</p>`);
                                        break;
                                }
                            }
                        });
                    })
                }
            });
        }, () => isMemberDynamicPage()],
        // 8. 对jump.php取消重定向
        ['redirect_cancel', null, () => {
            const jumpSelector = 'a[href*="jump.php"]';

            return observerFactory((mutations, observer) => {
                for (let i = 0, len = mutations.length; i < len; i++) {
                    const mutation = mutations[i];
                    // 1. 判断是否改变节点
                    if (mutation.type !== 'childList') {
                        continue;
                    }
                    // 2. 修改href
                    const $jump = $(mutation.target).find(jumpSelector);
                    $jump.each(function () {
                        const $this = $(this);
                        const url = $this.attr('href').match(/jump\.php\?(url=)?(.*)$/)[2];
                        $this.attr('href', decodeURIComponent(url));
                    });
                }
            });
        }, () => true]
    ];
    const len = observers.length;
    // 初始化ob
    for (let i = 0; i < len; i++) {
        if (config[observers[i][0]] && observers[i][1] === null) {
            const _observer = (observers[i][2])();
            // 有一个ob组特殊处理
            if (_observer instanceof Promise) {
                _observer.then(v => observers[i][1] = v);
            } else {
                observers[i][1] = _observer;
            }
        }
    }
    // 页面跳转不触发脚本重载时，用监听器关闭ob避免页面卡死和cpu占用飙升
    window.navigation.addEventListener('navigate', () => {
        for (let i = 0; i < len; i++) {
            // 功能设置没开启，关闭对应ob
            if (!config[observers[i][0]]) {
                // ob已创建
                if (observers[i][1] !== null) {
                    // ob组处理
                    if (observers[i][1] instanceof Array) {
                        const _len = observers[i][1];
                        for (let j = 0; j < _len; j++) {
                            const v = observers[i][1][j];
                            if (v[0] !== null) {
                                v[0].disconnect();
                                v[0] = null;
                            }
                        }
                    } else {
                        observers[i][1].disconnect();
                        observers[i][1] = null
                    }
                }
            } else {
                // 不处于功能对应页面
                if (!(observers[i][3])()) {
                    if (observers[i][1] !== null) {
                        if (observers[i][1] instanceof Array) {
                            const _len = observers[i][1];
                            for (let j = 0; j < _len; j++) {
                                const v = observers[i][1][j];
                                v[0].disconnect();
                                v[0] = null
                            }
                        } else {
                            observers[i][1].disconnect();
                            observers[i][1] = null;
                        }
                    }
                } else {
                    // 如果没有直接重新创建
                    if (observers[i][1] instanceof Array) {
                        // ob组特殊处理
                        const _len = observers[i][1];
                        for (let j = 0; j < _len; j++) {
                            const v = observers[i][1][j];
                            if (!(v[2])()) {
                                if ([0] !== null) {
                                    v[0].disconnect();
                                    v[0] = null;
                                }
                            } else if (v[0] === null) {
                                v[0] = (v[1])();
                            }
                        }
                    } else if (observers[i][1] === null) {
                        observers[i][1] = (observers[i][2])();
                    }
                }
            }
        }
    });
    // 9. 单页排序
    (() => {
        if (!isSearchPage() || true) {
            return;
        }
        // 9.1. 生成按收藏数排序的按钮
        observerFactory((mutations, observer) => {
            for (let i = 0, len = mutations.length; i < len; i++) {
                const mutation = mutations[i];
                // 1. 判断是否改变节点
                const $section = $('section');
                if (mutation.type !== 'childList' || $section.length <= 0) {
                    continue;
                }
                const $div = $section.prev().find('div').eq(0);

                // 2. 添加按收藏数排序的按钮
                const $sort = $(`<span class="sc-LzLvL">${i18n('sort_by_popularity')}</span>`);
                $sort.on('click', function () {
                    const value = !$(this).hasClass('bNPzQX');
                    log(value);
                    GM.setValue(GMkeys.switchOrderByPopular, value);
                    if (value) {
                        $sort.attr('class', 'sc-LzLvL bNPzQX');
                    } else {
                        $sort.attr('class', 'sc-LzLvL lfAMBc');
                    }
                });
                $div.prepend($sort);
                GM.getValue(GMkeys.switchOrderByPopular, true).then(value => {
                    if (value) {
                        $sort.attr('class', 'sc-LzLvL bNPzQX');
                    } else {
                        $sort.attr('class', 'sc-LzLvL lfAMBc');
                    }
                });

                observer.disconnect();
                break;
            }
        });

        // 9.2. 按收藏数排序 // TODO 页面没有展示收藏数, 关闭单页排序
        observerFactory((mutations, observer) => {
            for (let i = 0, len = mutations.length; i < len; i++) {
                const mutation = mutations[i];
                // 1. 判断是否改变节点
                const $div = $(mutation.target);
                if (mutation.type !== 'childList' || $div.find('.count-list').length > 0) {
                    continue;
                }

                // 2. 获取所有的item, 排序并填充
                GM.getValue(GMkeys.switchOrderByPopular, true).then(value => {
                    if (!value) {
                        return;
                    }
                    const $container = $('section#js-react-search-mid').find('div:first');
                    const $list = $container.children();
                    const getCount = $ => parseInt($.find('ul.count-list a').text()) || 0;
                    $list.sort((a, b) => getCount($(b)) - getCount($(a)));
                    $container.html($list);

                });
                return; // 本次变更只排序一次
            }
        });
    })();

    // 10. 兼容模式检测是否PJAX并刷新页面, https://stackoverflow.com/a/4585031/6335926
    (history => {
        // 关闭此功能
        return;

        const pushState = history.pushState;
        history.pushState = function (state) {
            if (typeof history.onpushstate == "function") {
                history.onpushstate({ state });
            }
            GM.getValue(GMkeys.MO, true).then(enableMO => {
                if (enableMO) { return; }
                location.reload();
            });
            return pushState.apply(history, arguments);
        };
    })(window.history);

    // 11. 控制面板
    (() => {
        // 关闭此功能
        return;
        if (!/.+setting_user\.php.*/.test(location.href)) {
            return;
        }

        const $table = $(`<table style="width: 700px;">
            <tbody>
                <tr><th width="185">Pixiv增强配置</th><td width="500">
                    <label><input type="checkbox" name="${GMkeys.MO}">兼容PJAX(推荐)</label><br/>
                    <label><input type="checkbox" name="${GMkeys.switchComment}">自动加载评论</label><br/>
                    <label><input type="checkbox" name="${GMkeys.switchImgMulti}">自动加载多图</label><br/>
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
            const $checkbox = $(this);
            const name = $checkbox.attr('name');
            GM.getValue(name, true).then(value => { $checkbox.prop('checked', value); });
            $checkbox.on('change', () => {
                const checked = $checkbox.prop('checked');
                $checkbox.prop(checked, checked);
                GM.setValue(name, checked);
            });
        });
        $table.find('input[type="text"]').each(function () {
            const $input = $(this);
            const name = $input.attr('name');
            GM.getValue(name).then(value => { $input.val(value); });
            $input.on('change', () => {
                GM.setValue(name, $input.val());
            });
        });
    })();

    //TODO 增强新页面fanbox https://www.pixiv.net/fanbox/creator/22926661?utm_campaign=www_profile&utm_medium=site_flow&utm_source=pixiv
    //TODO 日语化
});