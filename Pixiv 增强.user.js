// ==UserScript==
// @name        Pixiv Plus
// @name:zh-CN  Pixiv 增强
// @name:zh-TW  Pixiv 增強
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.9.3
// @icon        https://www.pixiv.net/favicon.ico
// @description Focus on immersive experience, 1. Block ads, directly access popular pictures 2. Use user to enter the way to search 3. Search pid , uid and author 4. Display original image and size, picture rename, download original image | gif map | Zip|multiple map zip 5. display artist id, artist background image 6. auto load comment 7. dynamic markup work type 8. remove redirection 9. single page sort 10. control panel select desired function github: https://github.com/Ahaochan/Tampermonkey, welcome to star and fork.
// @description:ja    没入型体験に焦点を当てる、1.人気の写真に直接アクセスする広告をブロックする2.検索する方法を入力するためにユーザーを使用する3.検索pid uid と創作家 4.元の画像とサイズを表示する Zip | multiple map zip 5.アーティストID、アーティストの背景画像を表示します。6.自動ロードコメントを追加します。7.動的マークアップ作業タイプを指定します。8.リダイレクトを削除します。9.シングルページソート10.コントロールパネルを選択します。github：https://github.com/Ahaochan/Tampermonkey、スターとフォークへようこそ。
// @description:zh-CN 专注沉浸式体验，1.屏蔽广告,直接访问热门图片 2.使用users入り的方式搜索 3.搜索pid、uid和作者 4.显示原图及尺寸，图片重命名，下载原图|gif图|动图帧zip|多图zip 5.显示画师id、画师背景图 6.自动加载评论 7.对动态标记作品类型 8.去除重定向 9.单页排序 10.控制面板选择想要的功能 github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @description:zh-TW 專注沉浸式體驗，1.屏蔽廣告,直接訪問熱門圖片2.使用users入り的方式搜索3.搜索pid、uid和作者 4.顯示原圖及尺寸，圖片重命名，下載原圖|gif圖|動圖幀zip|多圖zip 5.顯示畫師id、畫師背景圖6.自動加載評論7.對動態標記作品類型8.去除重定向9.單頁排序10.控制面板選擇想要的功能github:https://github.com/Ahaochan/Tampermonkey，歡迎star和fork。
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
// @require     https://update.greasyfork.org/scripts/505351/1435420/jquery%20221.js
// @require     https://update.greasyfork.org/scripts/518632/1489865/jszip-min-js.js
// @require     https://update.greasyfork.org/scripts/498746/1399668/FileSaver.js
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

    // ============================ i18n 国际化 ===============================
    const i18nLib = {
        ja: {
            author: '作者',
            background: '背景画像',
            background_not_found: '背景画像なし',
            copy_to_clipboard: 'クリップボードにコピーしました',
            download: 'ダウンロード',
            download_wait: 'ダウンロード完了をお待ちください',
            illegal: '違法',
            illust_type_single: '[単枚]',
            illust_type_multiple: '[複数枚]',
            illust_type_gif: '[GIF画像]',
            loginWarning: 'Pixiv拡張スクリプト警告！より良い体験のためにPixivにログインしてください！未ログインの場合、予期しないバグが発生する可能性があります！',
            switch_antiAd: '広告無効化',
            switch_antiRedirect: 'リダイレクト解除',
            switch_commentLoad: 'コメント読み込み',
            switch_imageSize: '画像サイズ表示',
            switch_preDownload: '画像を事前ダウンロード',
            switch_searchUid: 'UID検索',
            switch_searchPid: 'PID検索',
            switch_searchAuthor: '作者検索',
            switch_searchFavourite: 'users入り検索'
        },
        en: {
            author: 'Author',
            background: 'Background Image',
            background_not_found: 'No Background Image',
            copy_to_clipboard: 'Copied to clipboard',
            download: 'Download',
            download_wait: 'Please wait for download to complete',
            illegal: 'Illegal',
            illust_type_single: '[Single Image]',
            illust_type_multiple: '[Multiple Images]',
            illust_type_gif: '[GIF Image]',
            loginWarning: 'Pixiv Plus Script Warning! Please login to Pixiv for a better experience! Failure to login may result in unpredictable bugs!',
            switch_antiAd: 'Disable Ads',
            switch_antiRedirect: 'Cancel Redirection',
            switch_commentLoad: 'Load Comments',
            switch_imageSize: 'Show Image Size',
            switch_preDownload: 'Pre-download Images',
            switch_searchUid: 'Search UID',
            switch_searchPid: 'Search PID',
            switch_searchAuthor: 'Search Author',
            switch_searchFavourite: 'Search users入り (user bookmarks)',
        },
        zh: {
            author: '作者',
            background: '背景图',
            background_not_found: '无背景图',
            copy_to_clipboard: '已复制到剪贴板',
            download: '下载',
            download_wait: '请等待下载完成',
            illegal: '不合法',
            illust_type_single: '[单图]',
            illust_type_multiple: '[多图]',
            illust_type_gif: '[gif图]',
            loginWarning: 'Pixiv增强 脚本警告! 请登录Pixiv获得更好的体验! 未登录可能产生不可预料的bug!',
            switch_antiAd: '禁用广告',
            switch_antiRedirect: '取消重定向',
            switch_commentLoad: '加载评论',
            switch_imageSize: '显示图片尺寸',
            switch_preDownload: '预下载图片',
            switch_searchUid: '搜索uid',
            switch_searchPid: '搜索pid',
            switch_searchAuthor: '搜索作者',
            switch_searchFavourite: '搜索users入り',
        },
        'zh-cn': {},
        'zh-tw': {
            author: '作者',
            background: '背景圖',
            background_not_found: '無背景圖',
            copy_to_clipboard: '已複製到剪貼簿',
            download: '下載',
            download_wait: '請等待下載完成',
            illegal: '不合法',
            illust_type_single: '[單圖]',
            illust_type_multiple: '[多圖]',
            illust_type_gif: '[gif圖]',
            loginWarning: 'Pixiv增強 腳本警告! 請登入Pixiv獲得更好的體驗! 未登入可能產生不可預料的bug!',
            switch_antiAd: '禁用廣告',
            switch_antiRedirect: '取消重定向',
            switch_commentLoad: '載入評論',
            switch_imageSize: '顯示圖片尺寸',
            switch_preDownload: '預下載圖片',
            switch_searchUid: '搜尋uid',
            switch_searchPid: '搜尋pid',
            switch_searchAuthor: '搜尋作者',
            switch_searchFavourite: '搜尋users入り'
        }
    };
    i18nLib['zh-cn'] = Object.assign({}, i18nLib.zh);
    const lang = (document.documentElement.getAttribute('lang') || 'en').toLowerCase();
    const i18n = key => i18nLib[lang][key] || `i18n[${lang}][${key}] not found`;
    // ============================ i18n 国际化 ===============================

    // ============================ 全局参数 ====================================
    const debug = true;
    const [log, error] = [debug ? console.log : () => {
    }, console.error];

    const features = {
        antiAd: {type: 'checkbox'},
        antiRedirect: {type: 'checkbox'},
        commentLoad: {type: 'checkbox'},
        imageSize: {type: 'checkbox'},
        preDownload: {type: 'checkbox'},
        searchUid: {type: 'checkbox'},
        searchPid: {type: 'checkbox'},
        searchAuthor: {type: 'checkbox'},
        searchFavourite: {type: 'checkbox'},
    };
    let user = {};
    const userApi = (userId) => {
        if (!user || String(user.userId) !== String(userId)) {
            $.ajax({
                url: `/ajax/user/${userId}`,
                dataType: 'json',
                async: false,
                success: ({body}) => {
                    user = body;
                },
            });
        }
        return user;
    }
    let illust = {};
    const illustApi = () => {
        const urlIllustId = location.href.match(/artworks\/(\d*)(#\d*)?$/)?.[1] || '';
        // 1. 判断是否已有作品id(兼容按左右方向键翻页的情况)
        if (!illust || String(illust?.illustId) !== String(urlIllustId)) {
            $.ajax({
                url: `/ajax/illust/${urlIllustId}`,
                dataType: 'json',
                async: false,
                success: ({body}) => {
                    illust = body;
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

    // ============================ 配置信息 ====================================
    const GMkeys = {
        downloadName: 'download-name',  // 下载名pattern
    };

    // ============================ url 页面判断 ==============================
    const isArtworkPage = () => /.+artworks\/\d+.*/.test(location.href);
    const isMemberIndexPage = () => /.+\/users\/\d+.*/.test(location.href);
    const isMemberIllustPage = () => /.+\/member_illust\.php\?id=\d+/.test(location.href);
    const isMemberBookmarkPage = () => /.+\/bookmark\.php\?id=\d+/.test(location.href);
    const isMemberFriendPage = () => /.+\/mypixiv_all\.php\?id=\d+/.test(location.href);
    const isStaccPage = () => /.+\/stacc.+/.test(location.href);
    const isMemberPage = () => isMemberIndexPage() || isMemberIllustPage() || isMemberBookmarkPage() || isMemberFriendPage();
    const isSearchPage = () => /.+\/search\.php.*/.test(location.href) || /.+\/tags\/.*\/artworks.*/.test(location.href);
    const isMoreMode = () => illustApi().pageCount > 1;
    const isGifMode = () => illustApi().illustType === 2;
    const isSingleMode = () => (illustApi().illustType === 0 || illustApi().illustType === 1) && illustApi().pageCount === 1;

    // 0. 判断是否登录
    const isLogin = () => {
        let status = 0;
        $.ajax({url: 'https://www.pixiv.net/setting_user.php', async: false})
            .done((data, statusText, xhr) => status = xhr.status);
        return status === 200;
    };
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
    const searchEnhance = () => {
        // 1. 找到基础的form表单
        log("搜索增强 初始化");
        let $form = $('form:not([action]) > div.charcoal-text-field-root').parent('form');
        if (!$form.length) {
            // 新版本的 Pixiv 搜索栏表单不存在，查找旧版本的 Pixiv 搜索栏表单
            $form = $('#js-mount-point-header form:not([action]), #root div[style="position: static; z-index: auto;"] form:not([action])');
        }

        // 2. 修改父级grid布局
        // 2.1 查找新版本的表单数量并进行判断当前页面是否为新 UI 搜索栏表单
        const isNewVersion = $form.find('div.charcoal-text-field-root').length > 0;
        // 2.2 根据上面的判断来应用哪套布局：真，走适配新版本样式。假，走适配老版本样式
        if (isNewVersion) {
            $form.parent().parent().css({ 'grid-template-columns': '1fr minmax(0px, 319px) minmax(0px, 319px) minmax(0px, 438px) minmax(0px, 438px) minmax(0px, 219px) 2fr', 'gap': '10px' });
        } else {
            $form.parent().parent().css('grid-template-columns', '1fr minmax(0px, 219px) minmax(0px, 219px) minmax(0px, 538px) minmax(0px, 538px) minmax(0px, 219px) 2fr');
        }

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
        features.searchUid.isEnable() && initSearch({$form, field: 'UID', placeholder: 'UID', template: 'https://www.pixiv.net/users/***', validNumber: true});
        features.searchPid.isEnable() &&  initSearch({$form, field: 'PID', placeholder: 'PID', template: 'https://www.pixiv.net/artworks/***', validNumber: true});
        // TODO UI错乱: https://www.pixiv.net/stacc/mdnk
        features.searchAuthor.isEnable() && initSearch({$form, field: i18n('author'), placeholder: i18n('author'), template: "https://www.pixiv.net/search_user.php?nick=***&s_mode=s_usr", validNumber: false});
        // 4. 搜索条件
        if(features.searchFavourite.isEnable()) {
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
                    const url = new URL(location.href);
                    const searchParams = url.searchParams;
                    searchParams.set('p', '1');
                    searchParams.set('s_mode', 's_tag');
                    location.href = `https://www.pixiv.net/tags/${value}/artworks?${searchParams.toString()}`;
                }
            });
        }
    };

    // 3. 单张图片替换为原图格式. 追加下载按钮, 下载gif图、gif的帧压缩包、多图
    // TODO 解耦ImgSize和原图显示功能 https://www.pixiv.net/artworks/112167219
    const addImgSizeSpan = (option) => {
        if(!features.imageSize.isEnable()) {
            return;
        }
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
    const getDownloadName = (name) => {
        const illust = illustApi();
        name = name.replace('{pid}', illust.illustId);
        name = name.replace('{uid}', illust.userId);
        name = name.replace('{pname}', illust.illustTitle);
        name = name.replace('{uname}', illust.userName);
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
                    for (const addedNode of mutation.addedNodes) {
                        // 1. 找到分享按钮, 用于复制UI
                        const $shareBtn = $(addedNode).find('div:has(> button[class^="style_transparentButton"]):eq(1)');
                        if($shareBtn.length <= 0) {
                            continue;
                        }

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

                        // 4. 控制是否预下载, 避免多个页面导致爆内存
                        if(features.preDownload.isEnable()) {
                            $zipBtn.find('button').click();
                        }
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
                    for (const addedNode of mutation.addedNodes) {
                        // 1. 显示git尺寸大小
                        const $canvas = $(addedNode).find('canvas');
                        if ($canvas.length > 0) {
                            addImgSizeSpan({$: $canvas});
                        }

                        // 2. 找到分享按钮, 用于复制UI
                        const $shareBtn = $(addedNode).find('div:has(> button[class^="style_transparentButton"]):eq(1)');
                        if($shareBtn.length <= 0) {
                            continue;
                        }

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
                        if(features.preDownload.isEnable()) {
                            $gifBtn.find('button').click();
                        }
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
        if (isMoreMode()) {
            artworkDownloadMultiImage();
        }
        // https://www.pixiv.net/artworks/71005633
        if (isGifMode()) {
            artworkDownloadGifImage();
        }
    }

    // 4. 在画师页面和作品页面显示画师id、画师背景图, 用户头像允许右键保存
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

    // 5. 自动加载评论
    // https://www.pixiv.net/artworks/72414258
    const commentAutoLoad = () => {
        if (!isArtworkPage()) {
            return;
        }
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
            option: observerOption,
            node: document.querySelector('main')[0]
        });
    };

    // 6. 对主页动态中的图片标记作品类型
    // https://www.pixiv.net/stacc?mode=unify
    const artworkTag = () => {
        if (!isStaccPage()) {
            return;
        }
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
            },
            option: observerOption,
            node: document.getElementById('stacc_timeline')
        });
    };

    // 7. 对jump.php取消重定向
    // https://www.pixiv.net/artworks/72300449
    // https://www.pixiv.net/users/1039353
    const antiRedirect = () => {
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

    // 8. 动态隐藏（去除）顶栏LOGO右侧占位空白（始终启用）
    const hideTopBarBlank = {
        init() {
            this.checkUrlAndToggleElement();
            this.setupObserver();
        },
        checkUrlAndToggleElement() {
            // keywords：判断需要隐藏的条件的 URL 关键字。$target：要操作的对象选择器
            const keywords = ['/artworks', 'novel/show.php', 'bookmark_new_illust', '/users', '/tag', '/discovery', '/dashboard', '/manage', '/settings'];
            const $target = $('.group\\/logo .flex.gap-8.items-center .ml-8.size-\\[50px\\]');
            // 判断并执行目标对象的显示或隐藏（去除）操作
            const shouldHide = keywords.some(keyword => location.href.includes(keyword));
            $target.toggle(!shouldHide);
        },
        setupObserver() {
            // 复用主脚本的 observerFactory 统一管理监听器
            observerFactory({
                callback: () => this.checkUrlAndToggleElement(),
                node: document.body,
                option: { childList: true, subtree: true }
            });
        }
    };
    hideTopBarBlank.init(); // 功能 8 的核心触发器，没它此功能将无法运作！

    //TODO 增强新页面fanbox https://www.pixiv.net/fanbox/creator/22926661?utm_campaign=www_profile&utm_medium=site_flow&utm_source=pixiv
    //TODO 日语化

    // ============================ 主函数 ==============================
    for (const key in features) {
        const feature = features[key];
        if(feature.type === 'checkbox') {
            feature.isEnable = () => GM_getValue(key, true);
        }
    }
    GM_registerMenuCommand(`控制面板`, () => {
        const controlPanelId = 'myControlPanel';
        // 创建控制面板的容器和按钮
        const $control = $(`<div id="${controlPanelId}" style="position: fixed; top: 20px; left: 20px; background-color: #fff; border: 1px solid #ddd; padding: 15px; z-index: 1000; box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1); border-radius: 5px; font-family: sans-serif; display: flex; flex-direction: column; gap: 10px;"></div>`);
        $('body').append($control);

        // 动态初始化配置项
        for (const key in features) {
            const feature = features[key];
            if(feature.type === 'checkbox') {
                const value = GM_getValue(key, true);
                const $row = $('<div style="display: flex; align-items: center; gap: 10px;"></div>');
                const $label = $('<label style="color: #333;"></label>').text(i18n(`switch_${key}`));
                const $checkbox = $('<input type="checkbox">').prop('checked', value);
                $checkbox.on('change', function() {
                    GM_setValue(key, $(this).prop('checked'));
                });
                $row.append($checkbox, $label);
                $control.append($row);
            }
        }

        // 初始化按钮
        const $reset = $('<button style="padding: 8px 15px; border: none; border-radius: 3px; cursor: pointer; font-size: 1rem; background-color: #007bff; color: white; transition: background-color 0.3s ease; margin-top: 10px;">重置默认值</button>');
        const $close = $('<button style="padding: 8px 15px; border: none; border-radius: 3px; cursor: pointer; font-size: 1rem; background-color: #6c757d; color: white; transition: background-color 0.3s ease;">关闭</button>');
        $control.append($reset, $close);
        $reset.on('click', function() {
            for (const key in features) {
                const feature = features[key];
                if(feature.type === 'checkbox') {
                    GM_setValue(key, feature.default || true);
                } else {
                    GM_setValue(key, feature.default);
                }
            }
            alert('所有配置已重置为默认值。');
            window.location.reload();
        });
        $close.on('click', function() {
            $control.remove();
            window.location.reload();
        });
    })

    features.antiAd.isEnable() && adDisable();
    setTimeout(() => searchEnhance(), 1000);
    features.commentLoad.isEnable() && commentAutoLoad();
    features.antiRedirect.isEnable() && antiRedirect();
    artworkTag();
});

