// ==UserScript==
// @name        东哥是我好兄弟
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.1.0
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
        // {name: "狂欢九宫格", url: "https://red-e.jd.com/resources/lottery/index.html"},
        // {name: "每日镚一镚", url: "https://red-e.jd.com/resources/pineapple/index.html"},
        // {name: "天天赚零钱", url: "https://m.jr.jd.com/btyingxiao/advertMoney/html/home.html?from=jddzqicon"},
        // {name: "京豆商城", url: "https://jdmall.m.jd.com/beansForPrizes"},
        // {name: "金币商城", url: "https://member.jr.jd.com/gcmall/"},
        // {name: "每日签到", url: "https://uf.jr.jd.com/activities/sign/v5/index.html?channel="},
        // {name: "天天加速", url: "https://h5.m.jd.com/babelDiy/Zeus/6yCQo2eDJPbyPXrC3eMCtMWZ9ey/index.html"},
        // {name: "赚钱", url: "https://jddx.jd.com/m/jddnew/money/index.html?from=zqjdzfgzhqfl"},

        // {name: "幸运大抽奖", url: "https://prodev.m.jd.com/mall/active/4U7xcDsnuNEm4D3DygUM5Dafwb2t/index.html"},
        // {name: "家庭清洁馆", url: "https://pro.m.jd.com/mall/active/2xV4nJszqQKgQSie4PXYyoCWFHmB/index.html"},
        // {name: "超市签到有礼", url: "https://pro.m.jd.com/mall/active/aNCM6yrzD6qp1Vvh5YTzeJtk7cM/index.html"},
        // {name: "美食馆", url: "https://pro.m.jd.com/mall/active/4PzvVmLSBq5K63oq4oxKcDtFtzJo/index.html"},
        // {name: "宠物馆", url: "https://pro.m.jd.com/mall/active/37ta5sh5ocrMZF3Fz5UMJbTsL42/index.html"},
        // {name: "酒饮馆", url: "https://prodev.m.jd.com/mall/active/zGwAUzL3pVGjptBBGeYfpKjYdtX/index.html"},
        // {name: "京东智能生活馆", url: "https://pro.m.jd.com/mall/active/UXg9JimBZwtnR83kjA45iBJjZWD/index.html"},
        // {name: "京东商城-定制", url: "https://pro.m.jd.com/mall/active/2BJK5RBdvc3hdddZDS1Svd5Esj3R/index.html"},
        // {name: "京东日历-翻牌", url: "https://pro.m.jd.com/mall/active/36V2Qw59VPNsuLxY84vCFtxFzrFs/index.html"},
        // {name: "京东商城-美妆", url: "https://pro.m.jd.com/mall/active/2smCxzLNuam5L14zNJHYu43ovbAP/index.html"},
        // {name: "京东智能-生活", url: "https://pro.m.jd.com/mall/active/KcfFqWvhb5hHtaQkS4SD1UU6RcQ/index.html"},
        // {name: "京东商城-珠宝", url: "https://pro.m.jd.com/mall/active/zHUHpTHNTaztSRfNBFNVZscyFZU/index.html"},
        // {name: "今日刮大奖", url: "https://prodev.m.jd.com/mall/active/4YCspTbG36PSi8BW31mp71NR1GQP/index.html&?from=gwddf"},
        // {name: "幸运大抽奖", url: 'https://jdda.jd.com/app/hd'},

        // ============================= 京价保自动 ======================================},
        {name: "领京豆", url: "https://bean.m.jd.com/"},
        {name: "京豆大转盘", url: "https://turntable.m.jd.com/?actId=jgpqtzjhvaoym&appSource=jdhome"},
        {name: "京东支付单单反", url: "https://jddx.jd.com/m/money/rebate/index.html"},
        {name: "摇一摇领京豆", url: "https://vip.m.jd.com/newPage/reward/123dd"},

        // ============================= 脚本 ======================================},
        {name: "金币天天抽奖", url: "https://m.jr.jd.com/member/coinlottery/index.html"},
        {name: "摇京豆", url: "https://spa.jd.com/home"},

        // https://github.com/NobyDa/Script/commits/master/JD-DailyBonus Commits on Jul 21, 2021
        {name: "京东商城-卡包", url: "https://pro.m.jd.com/mall/active/7e5fRnma6RBATV9wNrGXJwihzcD/index.html"},
        {name: "京东商城-内衣", url: "https://pro.m.jd.com/mall/active/4PgpL1xqPSW1sVXCJ3xopDbB1f69/index.html"},
        {name: "京东商城-电竞", url: "https://pro.m.jd.com/mall/active/CHdHQhA5AYDXXQN9FLt3QUAPRsB/index.html"},
        {name: "京东商城-箱包", url: "https://pro.m.jd.com/mall/active/ZrH7gGAcEkY2gH8wXqyAPoQgk6t/index.html"},
        {name: "京东商城-服饰", url: "https://pro.m.jd.com/mall/active/4RBT3H9jmgYg1k2kBnHF8NAHm7m8/index.html"},
        {name: "京东商城-校园", url: "https://pro.m.jd.com/mall/active/2QUxWHx5BSCNtnBDjtt5gZTq7zdZ/index.html"},
        {name: "京东商城-健康", url: "https://prodev.m.jd.com/mall/active/w2oeK5yLdHqHvwef7SMMy4PL8LF/index.html"},
        {name: "京东商城-鞋靴", url: "https://pro.m.jd.com/mall/active/4RXyb1W4Y986LJW8ToqMK14BdTD/index.html"},
        {name: "京东商城-童装", url: "https://pro.m.jd.com/mall/active/3Af6mZNcf5m795T8dtDVfDwWVNhJ/index.html"},
        {name: "京东商城-母婴", url: "https://pro.m.jd.com/mall/active/3BbAVGQPDd6vTyHYjmAutXrKAos6/index.html"},
        {name: "京东商城-数码", url: "https://pro.m.jd.com/mall/active/4SWjnZSCTHPYjE5T7j35rxxuMTb6/index.html"},
        {name: "京东商城-女装", url: "https://pro.m.jd.com/mall/active/DpSh7ma8JV7QAxSE2gJNro8Q2h9/index.html"},
        {name: "京东商城-图书", url: "https://pro.m.jd.com/mall/active/3SC6rw5iBg66qrXPGmZMqFDwcyXi/index.html"},
        {name: "京东拍拍-二手", url: "https://pro.m.jd.com/mall/active/3S28janPLYmtFxypu37AYAGgivfp/index.html"},
        {name: "京东商城-菜场", url: "https://pro.m.jd.com/mall/active/Wcu2LVCFMkBP3HraRvb7pgSpt64/index.html"},
        {name: "京东商城-陪伴", url: "https://pro.m.jd.com/mall/active/kPM3Xedz1PBiGQjY4ZYGmeVvrts/index.html"},
        {name: "京东商城-清洁", url: "https://pro.m.jd.com/mall/active/2Tjm6ay1ZbZ3v7UbriTj6kHy9dn6/index.html"},
        {name: "京东商城-个护", url: "https://pro.m.jd.com/mall/active/NJ1kd1PJWhwvhtim73VPsD1HwY3/index.html"},
        {name: "京东商城-个护V2", url: "https://prodev.m.jd.com/mall/active/2tZssTgnQsiUqhmg5ooLSHY9XSeN/index.html"},
        {name: "京东商城-小家电馆", url: "https://pro.m.jd.com/mall/active/3uvPyw1pwHARGgndatCXddLNUxHw/index.html"},
        {name: "深夜有故事", url: "https://pro.m.jd.com/mall/active/UcyW9Znv3xeyixW1gofhW2DAoz4/index.html"},
        {name: "每日好券", url: "https://pro.m.jd.com/mall/active/gDiL6r69vyTmgQdKXM6pKR4YCCp/index.html"},

        // ============================= 手动 ======================================},
        {name: "进店签到领京豆", url: "https://bean.jd.com/myJingBean/list"},
        {name: "小鸽有礼", url: "https://jingcai-h5.jd.com"},
    ];
    const log = (msg, native) => {
        if (true) {
            if(native) {
                console.log(msg);
            } else {
                console.log(`东哥是我好兄弟! url:[${location.href}] >>>>>>>>>>>> ${msg}`);
            }
        }
    }

    $(document).keydown(function (e) {
        // Alt+Z 快捷键
        console.log('e.keyCode:' + e.keyCode + ', e.altKey:' + e.altKey);
        if (e.keyCode == 90 && e.altKey) {
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
    (function () {
        return; // TODO 滚动了要获得焦点才能加载数据
        let position = 0, times = 5, onceInit = true;
        const $body = $('html, body');
        let timer = setInterval(function () {
            if(document.hidden) {
                if(times <= 0) {
                    log('窗口失去焦点, 滚动次数达到上限, 停止滚动!');
                    return;
                }
                onceInit = true;
                times--;
                $body.animate({scrollTop: document.body.scrollHeight}, 0);
                log(`窗口失去焦点, 滚动位置为:[${document.body.scrollHeight}]`);
            } else {
                if(onceInit) {
                    log(`窗口获取焦点, 滚动位置为:[${position}]`);
                    $body.animate({scrollTop: position}, 0); // 恢复原来位置
                    onceInit = false;
                }
                position = document.documentElement.scrollTop; // 记录滚动位置
            }
        }, 2000);
    })();

    // 加载依赖
    const match = (option) => {
        const options = $.extend({
            regex: '',
            url: '',
            $selector: null,
            fun: () => { return false },
            keep: false,
        }, option);
        if(!options.url && !options.regex) {
            log(`匹配规则至少要填一个, 普通规则[${options.url}], 正则规则[${options.regex}]!`);
            return;
        }
        if (options.url && location.href.indexOf(options.url) === -1) {
            log(`匹配普通规则[${options.url}]失败!`);
            return;
        }
        if (options.regex && !options.regex.test(location.href)) {
            log(`匹配正则规则[${options.regex}]失败!`);
            return;
        }
        log(`匹配规则成功, 普通规则[${options.url}], 正则规则[${options.regex}]`);

        const timer = setInterval(() => {
            let success = false;
            if(options.$selector) {
                const $selector = $(options.$selector.selector);
                log($selector, true);


                if($selector && $selector.length > 0) {
                    log('点击按钮');
                    $selector.click();
                    success |= true;
                }
            }
            if(options.fun) {
                log('自定义处理');
                var a = options.fun();
                success |= a;
            }

            const keep = options.keep || !success;
            log(`本轮定时处理结果:[${success}], 是否继续执行:[${keep}]`);
            if (!keep) {
                log(`结束执行任务`);
                clearInterval(timer);
            }
        }, 1000);
    }

    match({
        url: 'm.jr.jd.com/member/coinlottery/index.html',
        fun: () => {
            let text = $('.times-txt p span').text();
            if (parseInt(text) === 0) {
                $('.btn').click();
                return false; // 继续点
            }
            return true;
        }
    });

    match({
        regex: /pro(dev)?\.m\.jd\.com\/mall\/active\/.*\/index\.html/,
        $selector: $('.signIn_btn, .signIn_btnTxt, .signIn_module, .signIn_bg, .signIn_btnIng, .sign_btn, .MTDnN'),
        fun: () => {
            // let timer = setInterval(() => {
            //     let $selector = $('span.chance-cn-num');
            //     if ($selector.length > 0 && parseInt($selector.text()) === 0) {
            //         clearInterval(timer);
            //         return;
            //     }
            //     $('div.arrow').click();
            // }, 2000);
        }
    })

    // 摇一摇领京豆【https://vip.m.jd.com/newPage/reward/123dd 】
    match({
        url: 'vip.m.jd.com/newPage/reward/123dd',
        fun: () => {
            if($('div.rewardPageTop p.shakeNum span').text() > 0) {
                $('div.rewardBoxBot').click();
            }
            $('i.common-popup-close').click();
        },
        keep: true
    })

    match({
        url: 'bean.jd.com/myJingBean/list',
        fun: () => {
            $('ul.bean-shop-list').find('li').show().find('a.s-btn')
                .map((i, ele) => $(ele).attr('href'))
                .each((i, ele) => GM.openInTab(ele, true));
            return true;
        }
    })
    match({
        url: 'jd.com',
        fun: () => {
            const url = $('a.unsigned').attr('url');
            if (!!url) {
                location.href = url;
            }
        }
    })

    match({
        url: 'member.jr.jd.com/gcmall',
        $selector: $('div.clickButton')
    });

    match({
        url: 'jingcai-h5.jd.com',
        $selector: $('ul.beans-list li.active')
    });

    match({
        url: 'jddx.jd.com/m/jddnew/money/index.html',
        fun: () => {
            const $tip = $('div.start p.tip');
            if($tip.length > 0 && $tip.text().replace(/[^0-9]/ig,"") <= 0) {
                return true;
            }
            $('div.jr-popup-mask').click();
            $('div.start').click();
            return false;
        }
    });

    match({
        url: 'spa.jd.com/home',
        fun: () => {
            const $times = $('.bottom-btn-times');
            if($times.length > 0 && $times.text().replace(/[^0-9]/ig,"") > 0) {
                $times.click();
                return false;
            }


            const $dialog = $('body').children().last();
            if($dialog && $dialog.attr('id') && $dialog.attr('id').indexOf('common-dialog-container-') >= 0) {
                const $items = $dialog.find('.li_status.list_item_con');
                if($items.length > 0) {
                    $items.each((index, e) => {
                        $(e).click()
                    });
                    return false;
                } else {
                    $('.common-dialog-close').click();
                    return true;
                }
            } else {
                $('.add-lottery-times-box').click();
            }
            return false;
        }
    })

    match({
        url: 'jdda.jd.com/app/hd',
        $selector: $('div.clickBtn'),
        keep: true
    })
});
