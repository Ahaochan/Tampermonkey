// ==UserScript==
// @name        东哥是我好兄弟
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.3
// @icon        https://bean.m.jd.com/favicon.ico
// @description 在任意jd.com页面按下alt+A, 实现页面签到领金币钢镚等功能. 部分功能已实现自动化, 少部分需要手动签到.
// @author      Ahaochan
// @include     http*://*.jd.com*
// @license     GPL-3.0
// @supportURL  https://github.com/Ahaochan/Tampermonkey
// @grant       GM.openInTab
// @require     https://cdn.bootcdn.net/ajax/libs/jquery/2.2.4/jquery.min.js
// @run-at      document-end
// @noframes
// ==/UserScript==
jQuery(function ($) {
    'use strict';

    let dong = [
        // ================================ 作废 ======================================},
        {name: "狂欢九宫格", url: "https://red-e.jd.com/resources/lottery/index.html", multi: 0},
        {name: "每日镚一镚", url: "https://red-e.jd.com/resources/pineapple/index.html", multi: 0},
        {name: "点商品赚京豆", url: "https://jddx.jd.com/m/reward/product-list.html?from=kggicon&cu=true", multi: 0},
        {name: "逛商品赚京豆", url: "https://jddx.jd.com/m/reward/product-list.html?from=zqdhdljd", multi: 0},
        {name: "天天赚零钱", url: "https://m.jr.jd.com/btyingxiao/advertMoney/html/home.html?from=jddzqicon", multi: 0},


        {name: "幸运大抽奖", url: "https://prodev.m.jd.com/mall/active/4U7xcDsnuNEm4D3DygUM5Dafwb2t/index.html", multi: 0},
        {name: "家庭清洁馆", url: "https://pro.m.jd.com/mall/active/2xV4nJszqQKgQSie4PXYyoCWFHmB/index.html", multi: 0},
        {name: "超市签到有礼", url: "https://pro.m.jd.com/mall/active/aNCM6yrzD6qp1Vvh5YTzeJtk7cM/index.html", multi: 0},
        {name: "京东智能生活馆", url: "https://pro.m.jd.com/mall/active/UXg9JimBZwtnR83kjA45iBJjZWD/index.html", multi: 0},
        // ============================= 京价保自动 ======================================},
        {name: "领京豆", url: "https://bean.m.jd.com/"},
        {name: "京豆大转盘", url: "https://turntable.m.jd.com/?actId=jgpqtzjhvaoym&appSource=jdhome"},
        {name: "京东支付单单反", url: "https://jddx.jd.com/m/money/rebate/index.html"},
        {name: "摇一摇领京豆", url: "https://vip.m.jd.com/newPage/reward/123dd"},
        {name: "金币商城", url: "https://member.jr.jd.com/gcmall/"},
        // ============================= 脚本 ======================================},
        {name: "金币天天抽奖", url: "https://m.jr.jd.com/member/coinlottery/index.html"},

        {name: "宠物馆", url: "https://pro.m.jd.com/mall/active/37ta5sh5ocrMZF3Fz5UMJbTsL42/index.html"},
        {name: "女装馆", url: "https://pro.m.jd.com/mall/active/DpSh7ma8JV7QAxSE2gJNro8Q2h9/index.html"},
        {name: "京东个护", url: "https://pro.m.jd.com/mall/active/NJ1kd1PJWhwvhtim73VPsD1HwY3/index.html"},
        {name: "京东图书", url: "https://pro.m.jd.com/mall/active/3SC6rw5iBg66qrXPGmZMqFDwcyXi/index.html"},
        {name: "京东清洁馆", url: "https://pro.m.jd.com/mall/active/2Tjm6ay1ZbZ3v7UbriTj6kHy9dn6/index.html"},
        {name: "京东母婴", url: "https://pro.m.jd.com/mall/active/3BbAVGQPDd6vTyHYjmAutXrKAos6/index.html"},
        {name: "京东电竞", url: "https://pro.m.jd.com/mall/active/CHdHQhA5AYDXXQN9FLt3QUAPRsB/index.html"},

        {name: "拍拍二手签到有礼", url: "https://pro.m.jd.com/mall/active/3S28janPLYmtFxypu37AYAGgivfp/index.html"},
        {name: "珠宝馆", url: "https://pro.m.jd.com/mall/active/zHUHpTHNTaztSRfNBFNVZscyFZU/index.html"},
        {name: "美妆馆", url: "https://pro.m.jd.com/mall/active/2smCxzLNuam5L14zNJHYu43ovbAP/index.html"},
        {name: "美食馆", url: "https://pro.m.jd.com/mall/active/4PzvVmLSBq5K63oq4oxKcDtFtzJo/index.html"},
        // ============================= 手动 ======================================},
        {name: "每日签到", url: "https://uf.jr.jd.com/activities/sign/v5/index.html?channel=", multi: 1},
        {name: "简单赚钱", url: "https://jddx.jd.com/m/jddnew/money/index.html?from=zqjdzfgzhqfl", multi: 0}, // class = indexSign
        {name: "今日刮大奖", url: "https://prodev.m.jd.com/mall/active/4YCspTbG36PSi8BW31mp71NR1GQP/index.html&?from=gwddf"},
        {name: "京豆商城", url: "https://jdmall.m.jd.com/beansForPrizes"},
        {name: "进店签到领京豆", url: "https://bean.jd.com/myJingBean/list"},
        {name: "赚钱", url: "https://jddx.jd.com/m/jddnew/money/index.html?from=zqjdzfgzhqfl", multi: 4}
    ];

    $(document).keydown(function (e) {
        // Alt+A 快捷键
        if (e.keyCode == 65 && e.altKey) {
            for (let idx in dong) {
                if (!dong.hasOwnProperty(idx)) continue;

                let name = dong[idx].name;
                let url = dong[idx].url;
                let multi = (typeof dong[idx].multi === 'undefined') ? 1 : dong[idx].multi;
                for (let i = 0; i < multi; i++) {
                    GM.openInTab(url, true);
                }
            }
        }
    });

    // 加载依赖
    let exec = (reg, selector, fun) => {
        if (!reg.test(location.href)) {
            return;
        }
        const $body = $('html, body');
        $body.animate({scrollTop: document.body.scrollHeight}, 0);
        let success = false;
        let timer = setInterval(() => {
            let $selector = $(selector);
            // console.log($selector);
            if ($selector.length > 0) {
                $('html, body').animate({scrollTop: $selector.offset().top}, 0);
                success = true;
                fun($selector);
                clearInterval(timer);
            }
        }, 300);
        setTimeout(() => {
            if (!success) $body.animate({scrollTop: 0}, 0)
        }, 3000);
    };

    // 金币天天抽奖【https://m.jr.jd.com/activity/brief/jingdougangbeng/index.html 】
    exec(/m\.jr\.jd\.com\/member\/coinlottery\/index\.html/, '#lottery', () => {
        let text = $('.times-txt p span').text();
        if (parseInt(text) === 0) {
            $('.btn').click();
        }
    });

    // 京东图书【https://pro.m.jd.com/mall/active/3SC6rw5iBg66qrXPGmZMqFDwcyXi/index.html 】
    exec(/pro(dev)?\.m\.jd\.com\/mall\/active\/.*\/index\.html/, '.signIn_module, span.chance-cn-num, .sign_btn', () => {
        $('.signIn_btn').click();
        $('.signIn_bg').click();
        $('.sign_btn').click();

        let timer = setInterval(() => {
            let $selector = $('span.chance-cn-num');
            if ($selector.length > 0 && parseInt($selector.text()) === 0) {
                clearInterval(timer);
                return;
            }
            $('div.arrow').click();
        }, 2000);
    });

    // 每日签到【https://uf.jr.jd.com/activities/sign/v5/index.html?channel= 】
    exec(/uf\.jr\.jd\.com\/activities\/sign\/v5\/index\.html.*/, '#adFloorCont', () => {
        $('#adMain').attr('id', '');
        $('#adFloorCont').css('width', 'auto');
    });

    // 摇一摇领京豆【https://vip.m.jd.com/newPage/reward/123dd 】
    exec(/vip\.m\.jd\.com\/newPage\/reward\/123dd.*/, 'p.shakeNum', () => {
        $('div.rewardBoxBot').click();
    });

    // 进店签到领京豆【https://bean.jd.com/myJingBean/list 】
    exec(/bean\.jd\.com\/myJingBean\/list.*/, 'ul.bean-shop-list', ($this) => {
        $this.find('li').show().find('a.s-btn')
            .map((i, ele) => $(ele).attr('href'))
            .each((i, ele) => GM.openInTab(ele, true));
    });
    exec(/\.jd\.com.*/, 'a.unsigned', ($this) => {
        setTimeout(() => {
            const url = $('a.unsigned').attr('url');
            if (!!url) {
                console.log(url);
                location.href = url;
            }
        }, 2000);
    });
});
