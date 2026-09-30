// ==UserScript==
// @name        QM Plus
// @name:zh-CN  且慢 增强
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.1
// @icon        https://cdn2.qieman.com/static/favicon.ico
// @description 优化且慢体验
// @author      Ahaochan
// @license     GPL-3.0
// @supportURL  https://github.com/Ahaochan/Tampermonkey
// @match       https://qieman.com/content*
// @grant       GM_setClipboard
// @grant       GM.xmlHttpRequest
// @grant       GM_xmlhttpRequest
// @require     https://cdn.bootcdn.net/ajax/libs/jquery/2.2.1/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/date-fns@3.6.0/cdn.min.js
// @run-at      document-end
// ==/UserScript==

jQuery(($) => {
    const selector = '.sc-1s3ggli-9';

    const run = async () => {
        const $el = $(selector);
        const postId = new URLSearchParams(location.search).get('postId');

        // 1. 守卫语句：如果条件不满足直接退出
        if (!$el.length || $el.data('done') || !postId) return;
        $el.data('done', true);

        // 2. 链式异步请求与处理
        GM.xmlHttpRequest({
            method: 'GET',
            url: `https://qieman.com/pmdj/v2/community/post/info?id=${postId}`,
            onload: ({responseText}) => {
                const {createdAt} = JSON.parse(responseText || '{}');
                if (!createdAt) return;

                const date = new Date(createdAt);

                // 4. 函数式构建并插入元素
                $('<b/>')
                    .text(' [复制时间] ')
                    .css({cursor: 'pointer', color: '#eb7350', marginLeft: '8px'})
                    .on('click', function () {
                        const text = [`【${dateFns.format(date, 'yyyyMMdd-HHmm')}】标题`,
                        '---',
                        'title: 标题',
                        `created: ${dateFns.format(date, 'yyyy-MM-dd')}T${dateFns.format(date, 'HH:mm:ss')}`,
                        'tags:',
                        '  - 投资',
                        `  - ETF拯救世界/${dateFns.format(date, 'yyyy')}`,
                        '  - 且慢',
                        '  - 有图',
                        `source: ${location.href}`,
                        '---'].join('\n');


                        GM_setClipboard(text);
                        $(this).text(' ✔ 已复制！').css('color', '#52c41a');
                        setTimeout(() => $(this).text(' [复制时间] ').css('color', '#eb7350'), 1500);
                    })
                    .insertAfter($el);
            }
        });
    };

    // 使用轮询确保在 SPA 路由切换或延迟加载时依然生效
    setInterval(run, 1000);
});
