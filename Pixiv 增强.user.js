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
        fitWindow() {
            this.css('width', 'auto').css('height', 'auto')
                .css('max-width', '').css('max-height', $(window).height());
        },
        replaceTagName(replaceWith) {
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
        getBackgroundUrl() {
            const imgUrls = [];
            this.each(function (index, {style}) {
                let bgUrl = $(this).css('background-image') || style.backgroundImage || 'url("")';
                const matchArr = bgUrl.match(/url\((['"])(.*?)\1\)/);
                bgUrl = matchArr && matchArr.length >= 2 ? matchArr[2] : '';
                imgUrls.push(bgUrl);
            });
            return imgUrls.length === 1 ? imgUrls[0] : imgUrls;
        },
        // TODO 抽取公共的ahao-done方法
    });

    // UI优化
    const addImgSizeSpan = (option) => {
        // 从 $ 获取图片大小, after 到 $
        const options = Object.assign({$: undefined, position: 'relative',}, option);
        const $img = options.$;
        const position = options.position;

        // 1. 找到 显示图片大小 的 span, 没有则添加
        let $span = $img.next('span');
        if ($span.length <= 0) {
            $span = $(`<span class="ahao-img-size" style="position: ${position}; right: 0; top: 28px;
                    color: #ffffff; font-size: x-large; font-weight: bold; -webkit-text-stroke: 1.0px #000000;"></span>`);
            $img.before($span);
        }
        // 2. 根据标签获取图片大小, 目前只有 canvas 和 img 两种
        const tagName = $img.prop('tagName').toLowerCase();
        if (tagName === 'img') {
            const img = new Image();
            img.src = $img.attr('src');
            img.onload = function () {
                $span.text(`${this.width}x${this.height}`); // 重新加载图片, 以获取图片大小
            };
        } else if (tagName === 'canvas') {
            const width = $img.attr('width') || $img.css('width').replace('px', '') || $img.css('max-width').replace('px', '') || 0;
            const height = $img.attr('height') || $img.css('height').replace('px', '') || $img.css('max-height').replace('px', '') || 0;
            $span.text(`${width}x${height}`);
        } else {
            $span.text(`${tagName}暂不支持获取图片大小`);
        }
    };
    const addImageDownloadBtn = option => {
        // 下载按钮, 复制分享按钮并旋转180度
        const options = Object.assign({
            $shareButtonContainer: undefined, id: '', text: '', clickFun: () => {
            }
        }, option);
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


    // ============================ 全局参数 ====================================
    const debug = true;
    const [log, error] = [debug ? console.log : () => {
    }, console.error];

    const lang = (document.documentElement.getAttribute('lang') || 'en').toLowerCase();
    const userApi = (userId) => {
        const key = 'ahao_user';
        const user = JSON.parse(localStorage.getItem(key) || '{}');
        if (!user || String(user.userId) !== String(userId)) {
            $.ajax({
                url: `/ajax/user/${userId}`,
                dataType: 'json',
                async: false,
                success: ({body}) => {
                    localStorage.setItem(key, JSON.stringify(body));
                },
            });
        }
        return user;
    }
    const illustApi = () => {
        const urlIllustId = location.href.match(/artworks\/(\d*)(#\d*)?$/)?.[1] || '';

        // 1. 判断是否已有作品id(兼容按左右方向键翻页的情况)
        const key = 'ahao_illust';
        const illust = JSON.parse(localStorage.getItem(key) || '{}');
        if (!illust || String(illust?.illustId) !== String(urlIllustId)) {
            $.ajax({
                url: `/ajax/illust/${urlIllustId}`,
                dataType: 'json',
                async: false,
                success: ({body}) => {
                    localStorage.setItem(key, JSON.stringify(body));
                },
            });
        }
        return illust;
    };
    const observerFactory = function (option) {
        // 初始化 MutationObserver 所需参数
        // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
        const defaults = {
            callback: () => {
            },
            node: document.body,
            option: {childList: true, subtree: true}
        };
        let options;
        if (typeof option === 'function') {
            options = {...defaults, callback: option};
        } else {
            options = Object.assign({}, defaults, option);
            // 确保最终 node 值为有效 DOM 节点
            options.node = options.node || document.body; // TODO 性能优化，最少限度监听节点
        }
        const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

        const observer = new MutationObserver((mutations, observer) => {
            options.callback.call(this, mutations, observer);
            // GM.getValue('MO', true).then(function (v) { if(!v) observer.disconnect(); });
        });

        try {
            observer.observe(options.node, options.option);
        } catch (e) {
            console.error('MutationObserver 初始化失败:', e);
            throw new Error('MutationObserver 初始化失败');
        }
        return observer;
    };
    const isLogin = () => {
        let status = 0;
        $.ajax({url: 'https://www.pixiv.net/setting_user.php', async: false})
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
    // ============================ i18n 国际化 ===============================


    // ============================ url 页面判断 ==============================
    const isArtworkPage = () => /.+artworks\/\d+.*/.test(location.href);

    const isMemberIndexPage = () => /.+\/users\/\d+.*/.test(location.href);
    const isMemberIllustPage = () => /.+\/member_illust\.php\?id=\d+/.test(location.href);
    const isMemberBookmarkPage = () => /.+\/bookmark\.php\?id=\d+/.test(location.href);
    const isMemberFriendPage = () => /.+\/mypixiv_all\.php\?id=\d+/.test(location.href);
    const isMemberDynamicPage = () => /.+\/stacc.+/.test(location.href);
    const isMemberPage = () => isMemberIndexPage() || isMemberIllustPage() || isMemberBookmarkPage() || isMemberFriendPage();
    const isSearchPage = () => /.+\/search\.php.*/.test(location.href) || /.+\/tags\/.*\/artworks.*/.test(location.href);
    const isMoreMode = () => illustApi().pageCount > 1;
    const isGifMode = () => illustApi().illustType === 2;
    const isSingleMode = () => (illustApi().illustType === 0 || illustApi().illustType === 1) && illustApi().pageCount === 1;

    // 判断是否登录
    if (!isLogin()) {
        alert(i18n('loginWarning'));
    }

    // 1. 屏蔽广告, 全局进行css处理
    const adDisable = () => {
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
                for (const addedNode of mutation.addedNodes) {
                    if (addedNode.nodeType === Node.ELEMENT_NODE) {
                        for (const selector of adSelectors) {
                            $(addedNode).find(selector).hide();
                        }
                    }
                }
            }
        });
    };

    // 2. 搜索增强
    const searchPlus = () => {
        // 1. 找到基础的form表单
        log("搜索增强 初始化");
        let $form = $('form:not([action]) > div.charcoal-text-field-root').parent('form');
        if (!$form.length) {
            // 新版本的 Pixiv 搜索栏表单不存在，查找旧版本的 Pixiv 搜索栏表单
            $form = $(
                '#js-mount-point-header form:not([action]), #root div[style="position: static; z-index: auto;"] form:not([action])'
            );
        }

        // 2. 修改父级grid布局
        $form.parent().parent().css('grid-template-columns', '1fr minmax(100px, auto) minmax(100px, auto) 2fr 2fr 1fr 2fr');

        // 3. 搜索UID，PID和作者
        const initSearch = option => {
            const options = Object.assign({
                $form: null, field: '搜索字段', placeholder: '请输入', template: '***', validNumber: false,
            }, option);
            if (!options.$form) {
                error(`搜索组件[${options.field}]初始化失败, form元素获取失败`);
            }

            // 1. 初始化表单UI
            const $parent = options.$form.parent().clone();
            const $form = $parent.find('form');
            $form.children('div').eq(1).remove();
            $form.attr('class', `ahao-search-${options.field}`);
            options.$form.parent().before($parent);
            const $input = $form.find('input[type="text"]:first');
            $input.attr('placeholder', options.placeholder);
            $input.attr('value', '');
            $input.val('');

            // 2. 绑定submit事件
            $form.submit(e => {
                // 阻止默认的表单提交
                e.preventDefault();

                // 重写表单提交逻辑
                const val = encodeURIComponent($input.val());
                // 输入校验
                if (options.validNumber && !/^[0-9]+$/.test(val)) {
                    const label = options.placeholder + i18n('illegal');
                    alert(label);
                    return;
                }
                // 新窗口打开url
                const url = options.template.replaceAll('***', val);
                window.open(url);
                // 清空input等待下次输入
                $input.val('');
            });
        };
        initSearch({$form, field: 'UID', placeholder: 'UID', template: 'https://www.pixiv.net/users/***', validNumber: true});
        initSearch({$form, field: 'PID', placeholder: 'PID', template: 'https://www.pixiv.net/artworks/***', validNumber: true});
        // TODO UI错乱: https://www.pixiv.net/stacc/mdnk
        initSearch({$form, field: i18n('author'), placeholder: i18n('author'), template: "https://www.pixiv.net/search_user.php?nick=***&s_mode=s_usr", validNumber: false});
        // 4. 搜索条件
        const label = i18n('favorites'); // users入り
        const $input = $form.find('input[type="text"]:first');
        const $select = $(`
                    <select id="select-ahao-favorites">
                        <option value=""></option>
                        <option value="50000users入り">50000users入り</option>
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
            if (!!$input.val()) {
                $form.submit();
            }
        });
        $form.parent().after($select);
        $form.submit(e => {
            // 阻止默认的表单提交
            e.preventDefault();

            // 重写表单提交逻辑
            if (!!$select.val()) {
                // 去除旧的搜索选项
                $input.val((index, val) => val.split(' ').filter((tag) => !!tag && !/users入り$/.test(tag)).join(' '));
                // 添加新的搜索选项
                $input.val((index, val) => `${val} ${$select.val()}`);
            }
            const value = encodeURIComponent($input.val());
            if (!!value) {
                location.href = location.href.replace(/tags\/(.*?)\/artworks/g, `tags/${value}/artworks`);
            }
        });
    };
    setTimeout(() => searchPlus(), 1000);

    // 4. 单张图片替换为原图格式. 追加下载按钮, 下载gif图、gif的帧压缩包、多图
    const getDownloadName = (name) => {
        name = name.replace('{pid}', illustApi().illustId);
        name = name.replace('{uid}', illustApi().userId);
        name = name.replace('{pname}', illustApi().illustTitle);
        name = name.replace('{uname}', illustApi().userName);
        return name;
    };
    const artworkOriginalImage = () => {
        const observerOptions = {attributes: true, childList: true, subtree: true, attributeFilter: ['src', 'href']};
        observerFactory({
            callback(mutations, observer) {
                for (const mutation of mutations) {
                    for (const addedNode of mutation.addedNodes) {
                        // 单图、多图 DOM 结构都为 <a href=""><img/></a>
                        let $img = $(addedNode).filter('img[src^="https://i.pximg.net/img-master"]'); // 多图的场景
                        if ($img.length === 0) {
                            $img = $(addedNode).find('img[src^="https://i.pximg.net/img-master"]')       // 单图的场景
                        }
                        $img.attr('ahao-done', true); // 标记只执行一次
                        $img.each(function () {
                            const $this = $(this);
                            const href = $this.parent('a').attr('href');
                            const isExpand = $img.parent('a').attr('class') === 'gtm-expand-full-size-illust'; // 多图展开模式有且只有一个class
                            if (href?.endsWith('jpg') || href?.endsWith('png')) {
                                $this.attr('src', href).css('filter', 'none');
                                $this.fitWindow();
                                addImgSizeSpan({$: $this, position: isExpand ? 'relative' : 'absolute'}); // 显示图片大小
                            }
                        });
                    }
                }
            },
            option: observerOptions
        })
    };
    const artworkDownloadMultiImage = () => {
        const observerOptions = {attributes: true, childList: true, subtree: true, attributeFilter: ['src', 'href']};
        observerFactory({
            callback: (mutations, observer) => {
                for (const mutation of mutations) {
                    for(const addedNode of mutation.addedNodes) {
                        // 1. 找到分享按钮, 用于复制UI
                        const $shareBtn = $(addedNode).find('div:has(> button[class^="style_transparentButton"]):eq(1)');

                        // 2. 初始化 图片数量, 图片url
                        const zip = new JSZip();
                        let downloaded = 0;        // 下载完成数量
                        const illust = illustApi();
                        const num = illust.pageCount;       // 下载目标数量
                        const url = illust.urls.original;
                        const imgUrls = Array(parseInt(num)).fill()
                            .map((value, index) => url.replace(/_p\d\./, `_p${index}.`));

                        // 3. 初始化 下载按钮, 复制分享按钮并旋转180度
                        const $zipBtn = addImageDownloadBtn({
                            $shareButtonContainer: $shareBtn,
                            id: 'ahao-download-zip',
                            text: `${i18n('download')}`,
                            clickFun() {
                                // 3.1. 下载图片, https://wiki.greasespot.net/GM.xmlHttpRequest
                                if ($(this).attr('start') !== 'true') {
                                    $(this).attr('start', true);
                                    $.each(imgUrls, (index, url) => {
                                        GM.xmlHttpRequest({
                                            method: 'GET', url: url,
                                            headers: {referer: 'https://www.pixiv.net/'},
                                            overrideMimeType: 'text/plain; charset=x-user-defined',
                                            onload({responseText}) {
                                                // 3.2. 转为blob类型
                                                const r = responseText;

                                                const data = new Uint8Array(r.length);
                                                let i = 0;
                                                while (i < r.length) {
                                                    data[i] = r.charCodeAt(i);
                                                    i++;
                                                }
                                                const suffix = url.split('.').splice(-1);
                                                const mimeType = {png: "image/png", jpg: "image/jpeg", gif: "image/gif"}[suffix];
                                                const blob = new Blob([data], {type: mimeType});

                                                // 3.3. 压缩图片
                                                GM.getValue(GMkeys.downloadName, `{pid}`).then(name => {
                                                    zip.file(`${getDownloadName(name)}_${index}.${suffix}`, blob, {binary: true});
                                                });


                                                // 3.4. 手动sync, 避免下载不完全的情况
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

                        // 4. 控制是否预下载, 避免多个页面导致爆内存 // TODO 统一控制
                        GM.getValue(GMkeys.switchImgPreload, true).then(open => {
                            if (open) {
                                // $zipBtn.find('button').click();
                            }
                        });
                    }
                }
            },
            option: observerOptions
        })
    };
    const artworkDownloadGifImage = () => {
        const observerOptions = {attributes: true, childList: true, subtree: true, attributeFilter: ['src', 'href']};
        observerFactory({
            callback: (mutations, observer) => {
                for (const mutation of mutations) {
                    for(const addedNode of mutation.addedNodes) {
                        // 1. 显示git尺寸大小
                        const $canvas = $(addedNode).find('canvas');
                        if($canvas.length > 0) {
                            addImgSizeSpan({$: $canvas});
                        }

                        // 2. 找到分享按钮, 用于复制UI
                        const $shareBtn = $(addedNode).find('div:has(> button[class^="style_transparentButton"]):eq(1)');

                        // 3. 初始化 下载按钮
                        const $zipBtn = addImageDownloadBtn({
                            $shareButtonContainer: $shareBtn,
                            id: 'ahao-download-zip',
                            text: 'zip',
                        });
                        const $gifBtn = addImageDownloadBtn({
                            $shareButtonContainer: $shareBtn,
                            id: 'ahao-download-gif',
                            text: 'gif',
                            clickFun() {
                                // 从 pixiv 官方 api 获取 gif 的数据
                                $.ajax({
                                    url: `/ajax/illust/${illustApi().illustId}/ugoira_meta`, dataType: 'json',
                                    success: ({body}) => {
                                        // 1. 初始化 gif 下载按钮 点击事件
                                        // GIF_worker_URL 来自 https://greasyfork.org/scripts/2963-gif-js/code/gifjs.js?version=8596
                                        let gifUrl;

                                        const gifFrames = [];
                                        const gifFactory = new GIF({workers: 1, quality: 10, workerScript: GIF_worker_URL});

                                        for (let frameIdx = 0, frames = body.frames, framesLen = frames.length; frameIdx < framesLen; frameIdx++) {
                                            const frame = frames[frameIdx];
                                            const url = illustApi().urls.original.replace('ugoira0.', `ugoira${frameIdx}.`);
                                            GM.xmlHttpRequest({
                                                method: 'GET', url: url,
                                                headers: {referer: 'https://www.pixiv.net/'},
                                                overrideMimeType: 'text/plain; charset=x-user-defined',
                                                onload({responseText}) {
                                                    // 2. 转为blob类型
                                                    const r = responseText;

                                                    const data = new Uint8Array(r.length);
                                                    let i = 0;
                                                    while (i < r.length) {
                                                        data[i] = r.charCodeAt(i);
                                                        i++;
                                                    }
                                                    const suffix = url.split('.').splice(-1);
                                                    const mimeType = {png: "image/png", jpg: "image/jpeg", gif: "image/gif"}[suffix];
                                                    const blob = new Blob([data], {type: mimeType});

                                                    // 3. 压入gifFrames数组中, 手动同步sync
                                                    const img = document.createElement('img');
                                                    img.src = URL.createObjectURL(blob);
                                                    img.width = illustApi().width;
                                                    img.height = illustApi().height;
                                                    img.onload = () => {
                                                        gifFrames[frameIdx] = {frame: img, option: {delay: frame.delay}};
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
                            url: `/ajax/illust/${illustApi().illustId}/ugoira_meta`, dataType: 'json',
                            success: ({body}) => {
                                GM.getValue(GMkeys.downloadName, `{pid}`).then(name => {
                                    const $a = $(`<a href="${body.originalSrc}" download="${getDownloadName(name)}"></a>`);
                                    $zipBtn.find('button').wrap($a);
                                });
                            }
                        });
                        GM.getValue(GMkeys.switchImgPreload, true).then(open => {
                            if (open) {
                                $gifBtn.find('button').click();
                            }
                        });
                    }
                }
            },
            option: observerOptions
        })
    };
    if (isArtworkPage()) {
        // https://www.pixiv.net/artworks/65424837#1
        // https://www.pixiv.net/artworks/71005633
        // https://www.pixiv.net/artworks/72414258
        artworkOriginalImage();
        // https://www.pixiv.net/artworks/65424837
        if(isMoreMode()) {
            artworkDownloadMultiImage();
        }
        // https://www.pixiv.net/artworks/71005633
        if(isGifMode()) {
            artworkDownloadGifImage();
        }
    }

    // 5. 在画师页面和作品页面显示画师id、画师背景图, 用户头像允许右键保存
    const memberIndexPagePlus = () => {
        const observerOption = {childList: true, subtree: true};
        observerFactory({
            callback: (mutations, observer) => {
                for (const mutation of mutations) {
                    // 1. 找到关注数量的div, 用于接下来的clone
                    const uid = location.href.match(/\/users\/(\d+)/)?.[1];
                    const $row = $(mutation.target).find(`div:has(> a[href$="/users/${uid}/following"])`);
                    if ($row.length <= 0 || $row.attr('ahao-done')) {
                        continue;
                    }
                    $row.attr('ahao-done', true); // 标记已处理, 避免重复执行

                    // 2. 显示画师背景图
                    const $bg = $row.clone();
                    $bg.children('a').remove()
                    const bgUrl = userApi(uid)?.background?.url || '';
                    if (bgUrl && bgUrl !== 'none') {
                        $bg.append(`<img src="${bgUrl}" width="30px"><a target="_blank" href="${bgUrl}" style="font-size: 20px;font-weight: 700;color: #333;margin-right: 8px;line-height: 1">${i18n('background')}</a>`);
                    } else {
                        $bg.append(`<span>${i18n('background_not_found')}</span>`);
                    }
                    $row.parent().append($bg);

                    // 3. 显示画师id, 点击自动复制到剪贴板
                    const $uid = $row.clone();
                    $uid.children('a').remove();
                    $uid.append($(`<div style="font-size: 20px;font-weight: 700;color: #333;margin-right: 8px;line-height: 1">UID:${uid}</div>`)
                        .on('click', function () {
                            const $this = $(this);
                            $this.html(`<span>UID${i18n('copy_to_clipboard')}</span>`);
                            GM.setClipboard(uid);
                            setTimeout(() => {
                                $this.html(`<span>UID${uid}</span>`);
                            }, 2000);
                        }));
                    $row.parent().append($uid);
                }
            }, option: observerOption
        });
    }
    if (isMemberIndexPage()) {
        // 测试链接：https://www.pixiv.net/artworks/72414258
        memberIndexPagePlus();
    }
    const artworkPagePlus = () => {
        const observerOption = {childList: true, subtree: true};
        observerFactory({
            callback: (mutations, observer) => {
                for (const mutation of mutations) {
                    // 1. 找到作者名称的h2, 用于接下来的clone
                    const $row = $(mutation.target).filter('aside').find('section:first h2');
                    if ($row.length <= 0 || $row.attr('ahao-done')) {
                        continue;
                    }
                    $row.attr('ahao-done', true); // 标记已处理, 避免重复执行

                    // 2. 显示画师背景图
                    const uid = $row.find('[data-gtm-value]:first').data('gtm-value');
                    const bgUrl = userApi(uid)?.background?.url || '';
                    const $bg = $row.clone();
                    $bg.children('a').remove();
                    $bg.children('div').children('div').remove();
                    $bg.prepend(`<img src="${bgUrl}" width="10%"/>`);
                    $bg.find('div a')
                        .attr('href', !!bgUrl ? bgUrl : 'javascript:void(0)')
                        .attr('target', '_blank')
                        .text(!!bgUrl ? i18n('background') : i18n('background_not_found'));
                    $row.after($bg);

                    // 3. 显示画师id, 点击自动复制到剪贴板
                    const $uid = $row.clone();
                    $uid.children('a').remove();
                    $uid.children('div').children('div').remove();
                    $uid.find('a')
                        .attr('href', 'javascript:void(0)')
                        .attr('id', 'ahao-uid')
                        .text(`UID: ${uid}`);
                    $uid.on('click', function () {
                        const $this = $(this);
                        $this.find('a').text(`UID${i18n('copy_to_clipboard')}`);
                        GM.setClipboard(uid);
                        setTimeout(() => {
                            $this.find('a').text(`UID: ${uid}`);
                        }, 2000);
                    });
                    $bg.after($uid);
                }
            },
            option: observerOption
        });
    };
    if (isArtworkPage()) {
        // 测试链接：https://www.pixiv.net/artworks/72414258
        artworkPagePlus();
    }
    const backgroundUrlPlus = () => {
        // TODO 待修复
        return;
        const observerOption = {childList: true, subtree: true};
        observerFactory({
            callback: (mutations, observer) => {
                for (const mutation of mutations) {
                    // 2. 将作者头像由 background 转为 <img>
                    const $target = $(mutation.target);
                    if ($target.find('div.Bxamj').length > 0) {
                        debugger
                    }
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
            },
            option: observerOption
        });
    };
    backgroundUrlPlus();

    // 6. 自动加载评论
    const commentAutoLoad = () => {
        const observerOption = {childList: true, subtree: true};
        observerFactory({
            callback: (mutations, observer) => {
                for (const mutation of mutations) {
                    for (const addedNode of mutation.addedNodes) {
                        // 第一次加载【浏览更多】按钮的场景
                        $(addedNode).filter('[class^="CommentList_buttonArea"]').find("div[role='button']").click();
                        // 第二次加载【浏览更多】按钮的场景
                        $(mutation.target).filter('[class^="CommentList_buttonArea"]').find("div[role='button']").click();

                        const $moreReplayBtn = $(mutation.target).find('._28zR1MQ');
                        $moreReplayBtn.click();
                    }
                }
            },
            option: observerOption
        });
    };
    GM.getValue(GMkeys.switchComment, true).then(open => {
        if (!open || !isArtworkPage()) {
            return;
        }
        commentAutoLoad();
    });

    // 7. 对主页动态中的图片标记作品类型
    const artworkTag = () => {
        log('标记作品 初始化');
        const observerOption = {childList: true};
        return observerFactory({
            callback: (mutations, observer) => {
                for (const mutation of mutations) {
                    // 1. 判断是否改变节点
                    const $title = $(mutation.target).find('.stacc_ref_illust_title');
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
                            success: ({body}) => {
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
            }
        }, observerOption);
    };
    // 测试链接：https://www.pixiv.net/stacc?mode=unify
    if (/.+\/stacc.+/.test(location.href)) {
        artworkTag();
    }

    // 8. 对jump.php取消重定向
    const redirectPlus = () => {
        const observerOption = {childList: true, subtree: true};
        observerFactory({
            callback: (mutations, observer) => {
                for (const mutation of mutations) {
                    for (const addedNode of mutation.addedNodes) {
                        const jumpSelector = 'a[href*="jump.php"]';
                        const $jump = $(addedNode).find(jumpSelector);
                        $jump.each(function (i, e) {
                            const $this = $(this);
                            const url = $this.attr('href').match(/jump\.php\?(url=)?(.*)$/)[2];
                            $this.attr('href', decodeURIComponent(url));
                        });
                    }
                }
            }
        }, observerOption);
    }
    redirectPlus();

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
                history.onpushstate({state});
            }
            GM.getValue(GMkeys.MO, true).then(enableMO => {
                if (enableMO) {
                    return;
                }
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
            GM.getValue(name, true).then(value => {
                $checkbox.prop('checked', value);
            });
            $checkbox.on('change', () => {
                const checked = $checkbox.prop('checked');
                $checkbox.prop(checked, checked);
                GM.setValue(name, checked);
            });
        });
        $table.find('input[type="text"]').each(function () {
            const $input = $(this);
            const name = $input.attr('name');
            GM.getValue(name).then(value => {
                $input.val(value);
            });
            $input.on('change', () => {
                GM.setValue(name, $input.val());
            });
        });
    })();

    //TODO 增强新页面fanbox https://www.pixiv.net/fanbox/creator/22926661?utm_campaign=www_profile&utm_medium=site_flow&utm_source=pixiv
    //TODO 日语化

    // ============================ 主函数 ==============================
    const features = {
        adDisable: {i18n: i18n('ad_disable'), isEnable: () => GM_getValue('ad_disable', true)},
        search_enhance: {i18n: i18n('search_enhance'), isEnable: () => GM_getValue('search_enhance', true)},
        download_able: {i18n: i18n('download_able'), isEnable: () => GM_getValue('download_able', true)},
        artist_info: {i18n: i18n('artist_info'), isEnable: () => GM_getValue('ad_disable', true)},
        comment_load: {i18n: i18n('comment_load'), isEnable: () => GM_getValue('comment_load', true)},
        artwork_tag: {i18n: i18n('artwork_tag'), isEnable: () => GM_getValue('artwork_tag', true)},
        redirect_cancel: {i18n: i18n('redirect_cancel'), isEnable: () => GM_getValue('redirect_cancel', true)},
        load_origin: {i18n: i18n('load_origin'), isEnable: () => GM_getValue('load_origin', true)},
    };
    const menuId = [];
    const registerMenu = () => {
        // 用于刷新设置
        if (menuId.length > 0) {
            menuId.forEach(id => GM_unregisterMenuCommand(id));
            menuId.length = 0; // 清空数组
        }
        for (const key in features) {
            const feature = features[key];
            const value = GM_getValue(key, true);
            menuId.push(GM_registerMenuCommand(`${value ? '✅' : '❌'} ${feature.i18n}`, () => {
                GM_setValue(key, !value);
                registerMenu();
            }));
        }
    };
    registerMenu();
});

