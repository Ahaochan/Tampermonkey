// ==UserScript==
// @name        Bilibili 抽奖助手
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.1
// @icon        https://www.bilibili.com/favicon.ico
// @description Bilibili 抽奖助手
// @author      Ahaochan
// @include     http*://www.bilibili.com/opus/*
// @license     GPL-3.0
// @supportURL  https://github.com/Ahaochan/Tampermonkey
// @grant       unsafeWindow
// @grant       GM.xmlHttpRequest
// @grant       GM_xmlhttpRequest
// @require     https://cdn.bootcdn.net/ajax/libs/jquery/2.2.4/jquery.min.js
// @require     https://greasyfork.org/scripts/375359-gm4-polyfill-1-0-1/code/gm4-polyfill-101.js?version=652238
// @run-at      document-end
// @noframes
// ==/UserScript==

function reload() {
    setTimeout(function () {
        alert('关注+转发+评论+点赞完成');
        location.reload(true);
    }, 2000);
}

function getCsrf() {
    const cookieName = 'bili_jct';

    const cookieArray = document.cookie.split(';');
    for (const cookie of cookieArray) {
        const [name, value] = cookie.trim().split('=');
        if (name === cookieName) {
            return value;
        }
    }
    return null;
}

function randomComment() {
    const comments = [
        "这个活动好有趣，一定要参加！",
        "真心期待能中奖，哈哈哈。",
        "加油加油，希望好运能降临到我身上。",
        "有缘一定能中奖，大家一起努力！",
        "这次抽奖福利不错，大家一起来试试手气。",
        "看到这个抽奖活动，马上就被吸引了，转发支持！",
        "转发支持一下，希望能中个大奖。",
        "感谢主办方提供这么好的机会，一定要参与一下。",
        "这个活动看起来不错，快来一起参加吧！",
        "希望能中奖，给生活增添一些惊喜。",
        "为了梦想，冲鸭，转发转发！",
        "好运马上到，抽中大奖就在眼前！",
        "这次中奖的概率一定很高，一定要试试！",
        "转发一下，祝愿大家都有好运。",
        "每次抽奖都充满期待，这次也不例外。",
        "中奖了就发财了，加油加油！",
        "谢谢主办方，希望能中到喜欢的奖品。",
        "期待这次能有好运，中个大奖回家。",
        "转发送福利，中奖了请吃糖！",
        "这个活动真是太棒了，一定要参与一下。",
    ];

    const randomIndex = Math.floor(Math.random() * comments.length);
    return comments[randomIndex];
}

function followV1(uid, flag) {
    const act = flag ? 1 : 2;
    const data = `fid=${uid}&act=${act}&re_src=11&gaia_source=web_main&spmid=333.999.0.0&extend_content=%7B%22entity%22%3A%22user%22%2C%22entity_id%22%3A${uid}%2C%22fp%22%3A%220%5Cu00011920%2C%2C1080%5Cu0001Win32%5Cu000112%5Cu00018%5Cu000124%5Cu00011%5Cu0001zh-CN%5Cu00010%5Cu00010%2C%2C0%2C%2C0%5Cu0001Mozilla%2F5.0%2B(Windows%2BNT%2B10.0%3B%2BWin64%3B%2Bx64)%2BAppleWebKit%2F537.36%2B(KHTML%2C%2Blike%2BGecko)%2BChrome%2F119.0.0.0%2BSafari%2F537.36%2BEdg%2F119.0.0.0%22%7D&csrf=${getCsrf()}`;
    GM.xmlHttpRequest({
        method: "POST",
        url: "https://api.bilibili.com/x/relation/modify",
        data: data,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        onload: function ({responseText}) {
            console.log("关注结果:" + responseText);
        },
    });
}

function dynamicLike(dynamic_id, flag) {
    const up = flag ? 1 : 2;
    const data = `dynamic_id=${dynamic_id}&up=${up}&csrf=${getCsrf()}`;
    GM.xmlHttpRequest({
        method: "POST",
        url: "https://api.vc.bilibili.com/dynamic_like/v1/dynamic_like/thumb",
        data: data,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        onload: function ({responseText}) {
            console.log("点赞结果:" + responseText);
        },
    })
}

function comment(oid, type, message) {
    const data = `oid=${oid}&type=11&message=${encodeURIComponent(message)}&plat=1&at_name_to_mid=%7B%7D`
    GM.xmlHttpRequest({
        method: "POST",
        url: `https://api.bilibili.com/x/v2/reply/add?csrf=${getCsrf()}`,
        data: data,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        onload: function ({responseText}) {
            console.log("评论结果:" + responseText);
        },
    })
}

function reply(dynamic_id, message) {
    const data = JSON.stringify({
        "dyn_req": {
            "content": {
                "contents": [
                    {
                        "raw_text": message,
                        "type": 1, //纯文本1
                        "biz_id": ""
                    }
                ]
            },
            "scene": 4, // 纯文本1, 带图2
            "attach_card": null,
            "upload_id": `${unsafeWindow.UserStatus.userInfo.mid}_${Math.floor(Date.now() / 1000)}_${Math.floor(Math.random() * 9000) + 1000}`,
            "meta": {"app_meta": {"from": "create.dynamic.web", "mobi_app": "web"}}
        },
        "web_repost_src": {"dyn_id_str": `${dynamic_id}`}
    });

    // https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/dynamic/publish.md#%E5%8F%91%E8%A1%A8%E5%A4%8D%E6%9D%82%E5%8A%A8%E6%80%81
    GM_xmlhttpRequest({
        method: "POST",
        url: `https://api.bilibili.com/x/dynamic/feed/create/dyn?csrf=${getCsrf()}`,
        headers: {
            "content-type": "application/json",
        },
        data: data,
        onload: function ({responseText}) {
            console.log("转发结果:" + responseText);
        },
    });
}

jQuery($ => {
    'use strict';

    const dynamic_id = location.href.match(/www\.bilibili\.com\/opus\/([^\/?]+)/)[1];
    if (dynamic_id) {
        const $btn = $('<div class="side-toolbar__btn">关转评赞</div>');
        $btn.on('click', function () {
            const basic = unsafeWindow.__INITIAL_STATE__.detail.basic;
            const uid = basic.uid;
            const oid = basic.comment_id_str;
            const type = basic.comment_type;

            let message = $('.reply-box-warp textarea.reply-box-textarea').val();
            if (!message) {
                message = randomComment();
            }

            followV1(uid, true);
            dynamicLike(dynamic_id, true);
            comment(oid, type, message);
            reply(dynamic_id, message)
            reload();
        });
        $(".side-toolbar__btn:eq(0)").after($btn);
    }

    $('.bili-dyn-card-reserve__action button.uncheck').click();
});