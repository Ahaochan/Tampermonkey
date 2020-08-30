// ==UserScript==
// @name        慕课网 找回路径课程
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.2.1
// @description 将慕课网消失的路径课程显示出来，数据来源：慕课网App4.2.3。使用方法：点击首页上方职业路径，或者输入https://coding.imooc.com。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @author      Ahaochan
// @include     http*://*.imooc.com*
// @match       https://coding.imooc.com/*
// @require     https://cdn.bootcdn.net/ajax/libs/jquery/2.2.4/jquery.min.js
// ==/UserScript==

(function ($) {
    'use strict';
    // 1. 链接判断是否为职业路径
    if (location.href.indexOf('coding.imooc.com') === -1) {
        return;
    }

    // 2. 静态写死课程信息
    let courseTitles = ["",
        /*  1: */"",
        /*  2: */"",
        /*  3: */"Web前端工程师成长第一阶段(基础篇)",
        /*  4: */"",
        /*  5: */"",
        /*  6: */"",
        /*  7: */"",
        /*  8: */"",
        /*  9: */"",
        /* 10: */"",
        /* 11: */"PHP开发工程师闯关记--初识PHP",
        /* 12: */"",
        /* 13: */"",
        /* 14: */"",
        /* 15: */"",
        /* 16: */"",
        /* 17: */"从0开始学习制作QQ侧滑菜单",
        /* 18: */"模式宗师养成宝典之Java版",
        /* 19: */"",
        /* 20: */"jQuery源码探索之旅",
        /* 21: */"电商网站全站开发攻略",
        /* 22: */"响应式布局那些事",
        /* 23: */"搞定Java加解密",
        /* 24: */"Android加薪利器--自定义View",
        /* 25: */"",
        /* 26: */"前端经典案例集萃之“图片、信息展示”",
        /* 27: */"从零开始学习ThinkPHP框架",
        /* 28: */"高德开发者必由之路——JS API篇",
        /* 29: */"高德开发者必由之路——Android SDK篇",
        /* 30: */"",
        /* 31: */"Java工程师",
        /* 32: */"Web前端工程师",
        /* 33: */"Android工程师",
        /* 34: */"PHP工程师",
        /* 35: */"前端经典案例集萃之 \"网页常用特效\"",
        /* 36: */"Android加薪利器——断点续传",
        /* 37: */"C语言学习攻略",
        /* 38: */"Tony老师聊shell",
        /* 39: */"Swift加薪利器-iOS动画特辑",
        /* 40: */"Oracle数据库开发必备利器",
        /* 41: */"",
        /* 42: */"C++远征攻略",
        /* 43: */"教你HTML5开发爱心鱼游戏",
        /* 44: */"小慕感恩计划-实战Hot!!!",
        /* 45: */"Linux运维工程师",
        /* 46: */"iOS苹果表开发攻略",
        /* 47: */"Cocos2d-x游戏开发快速入门",
        /* 48: */"Hibernate开发宝典",
        /* 49: */"Linux shell运维实战",
        /* 50: */"Android-微信热门功能合集",
        /* 51: */"搞定python基础",
        /* 52: */"玩嗨Python进阶",
        /* 53: */"PHP微信公众平台开发攻略",
        /* 54: */"快速搞定PHP第三方登录",
        /* 55: */"带你玩转Yii框架",
        /* 56: */"探索Python世界",
        /* 57: */"Android必备技能之基础组件",
        /* 58: */"安卓特效合集豪华套餐",
        /* 59: */"搞定Java SSM框架开发",
        /* 60: */"SSH框架探幽"];
    let course = {
        "route": {"name": "路线", "id": [45, 34, 33, 32, 31]},
        "all": {
            "name": "全部",
            "id": [3, 11, 17, 18, 20, 21, 22, 23, 24, 26, 27, 28, 29, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60]
        },
        "web_font": {"name": "前端", "id": [43, 35, 28, 26, 22, 20, 3]},
        "web_back": {"name": "后端", "id": [60, 59, 56, 55, 54, 53, 52, 51, 49, 48, 42, 40, 37, 38, 23, 18, 27, 11]},
        "mobile": {"name": "移动", "id": [58, 57, 50, 47, 46, 44, 39, 36, 29, 24, 17]},
        "station": {"name": "整站", "id": [21]}
    };

    // 3. 获取已有课程的图片, 用于随机赋予消失的课程路径
    let imgs = [];
    $('.img-box').each(function () {
        let $this = $(this), $img = $this.find('img:first'), img = $img.attr('src');
        imgs.push(img);
    });
    // $('.plan-item-banner').each(function () {
    //     var $this = $(this);
    //     var img = {};
    //     // background-image: url(//img1.sycdn.imooc.com/climg/5acd69bb000103d706000338.jpg);
    //     // background: url(//img1.sycdn.imooc.com/climg/59030cc50001144806000338.jpg) no-repeat center center;
    //     img['img-up'] = $this.css('background-image').slice(5, -2);
    //     img['img-mid'] = $this.css('background-image').slice(5, -2);
    //     img['img-down'] = $this.css('background-image').slice(5, -2);
    //     imgs.push(img);
    // });

    // 4. 初始化导航栏
    let $navOld = $('.shizhan-header-nav:first'), $navNew = $navOld.clone();
    $navOld.before($navNew);            // 复制一份导航栏
    $navNew.find('.clearfix').empty();  // 清空 a 标签
    $.each(course, function (key, val) {
        let $nav_a = $('<a href="javascript:void(0);" ahao-type="' + key + '">' + val.name + '</a>');
        $navNew.find('.clearfix').append($nav_a);
    });
    $navNew.find('a:first').addClass('cur'); // 第一个标签高亮

    // $bannerOld.css('height', '50px')                // 设置原来导航栏的高度
    //     .children(':not(.tab-nav-wrap)').remove();  // 删除原来导航栏的其他图片标签

    // 5. 创建存储路径课程的内容div
    let $box = $('<div class="w index-main">' +
        '   <div class="screening-box clearfix"></div>' +
        '   <div class="index-list-wrap">' +
        '       <div class="shizhan-course-list clearfix">' +
        '</div></div>'); // 装载课程的div, 从原有的课程div复制html代码
    let $courseList = $box.find('.shizhan-course-list');
    $navNew.after($box);


    // 6. 设置导航中的点击事件
    $navNew.find('a')
        .off('click')               // 移除jquery绑定的点击事件
        .on('click', function () {
            let $this = $(this);
            // 6.1. 清空div中的内容, 用于重新加入div
            $courseList.empty();

            // 6.2. 设置高亮选中样式
            $this.siblings().removeClass('cur');
            $this.addClass('cur');

            // 6.3. 加入item
            let type = $this.attr('ahao-type');     // 获取之前设置的type
            for (let idx in course[type].id) {        // 遍历course中的id数组
                if (!course[type].id.hasOwnProperty(idx)) {
                    continue;
                }
                let pid = course[type].id[idx];
                // 随机获取一个图片, 如果获取不到图片就使用默认图片
                let img = imgs[parseInt(Math.random() * imgs.length)] || 'http://img1.sycdn.imooc.com/climg/59030cc50001144806000338.jpg';
                let title = courseTitles[pid];

                // 创建item, 复制自原有课程的div的a标签
                let $item = $('<div class="shizhan-course-wrap l" style="height: 200px;">' +
                    '                <a href="http://www.imooc.com/course/programdetail/pid/' + pid + '" target="_blank">' +
                    '                    <div class="shizhan-course-box">' +
                    '                        <div class="box">' +
                    '                            <div class="img-box">' +
                    '                                <div class="shizhan-course-gradient"></div>' +
                    '                                <img class="shizhan-course-img" alt="' + title + '" src="' + img + '">' +
                    '                            </div>' +
                    '                            <div class="shizhan-intro-box" style="min-height: auto">' +
                    '                                <p class="shizan-name" title="' + title + '">' + title + '</p>' +
                    '                            </div>' +
                    '                        </div>' +
                    '                    </div>' +
                    '                </a>' +
                    '            </div>');
                if ((1 + parseInt(idx)) % 4 === 0) {
                    $item.addClass('nomr');
                }
                $courseList.append($item);
            }
        })
        // 初始化, 默认选择第一个
        .first().click();
})(jQuery);