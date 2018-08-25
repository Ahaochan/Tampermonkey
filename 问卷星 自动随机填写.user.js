// ==UserScript==
// @name        问卷星 自动随机填写
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.3
// @description 问卷星 自动随机填写, 目前支持单选题, 多选题, 比重题, 有需要自动填写的题型, 请在反馈或issue提出并附带问卷地址。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @author      Ahaochan
// @include     https://www\.wjx\.cn/[(jq)|(m)|(hj)]/\d+\.aspx
// @match       https://www.wjx.cn/*
// @require     https://code.jquery.com/jquery-2.2.4.min.js
// ==/UserScript==

(function ($) {
    'use strict';
    var shuffle = function (array) {
        for (var j, x, i = array.length; i; j = parseInt(Math.random() * i), x = array[--i], array[i] = array[j], array[j] = x) ;
        return array;
    };
    let url = {
        jq: /https:\/\/www\.wjx\.cn\/jq\/\w+\.aspx/.test(location.href),
        hj: /https:\/\/www\.wjx\.cn\/hj\/\w+\.aspx/.test(location.href),
        m:  /https:\/\/www\.wjx\.cn\/m\/\w+\.aspx/.test(location.href)
    };

    var $fieldset = $('#fieldset1');

    $.extend({
        // 1. 选择题(单选+多选)
        selectQuestion: function (option) {
            var options = $.extend({
                $fieldset: undefined,   // 表单
                questionSelector: '',   // 每个问题的selector
                titleSelector: '',      // 每个问题的标题selector
                answerSelector: '',     // 每个问题的答案selector
                isRadio: function ($answers) {
                    return true;
                },
                isCheckbox: function ($answers) {
                    return true;
                }
            }, option);
            options.$fieldset.find(options.questionSelector).each(function () {
                var $this = $(this);
                var title = $this.find(options.titleSelector).text();
                var $answers = $this.find(options.answerSelector);

                // 匹配标题, 用于固定某些题目的答案
                // if (title.indexOf('匹配标题') > -1) {
                //     $radios.eq(1).click(); // 选中B选项
                //     $radios.eq(Math.round(Math.random() * (3 - 1))).click(); // 随机选中范围
                //     return;
                // }

                // 1. 单选题自动填写, 随机点击一个答案
                (function () {
                    if (options.isRadio($answers)) {
                        var index = Math.round(Math.random() * ($answers.length - 1));
                        $answers.eq(index).click();
                    }
                })();

                // 2. 多选题自动填写, 打乱按钮顺序, 随机点击多个答案
                (function () {
                    if (options.isCheckbox($answers)) {
                        // 2.1. 打乱顺序
                        $answers = shuffle($answers);

                        // 2.2. 多选重复num次填写
                        var num = Math.round(Math.random() * ($answers.length - 1)) || 1;
                        for (var i = 0, len = num; i < len; i++) {
                            $answers.eq(i).click();
                        }
                    }
                })();
            });
        },
        // 2. 比重题
        ratingQuestion: function (option) {
            var options = $.extend({
                $fieldset: undefined,   // 表单
                answerSelector: ''      // 答案的selector
            }, option);
            options.$fieldset.find(options.answerSelector).each(function () {
                var $this = $(this);
                var $td = $this.children('td');
                // 随机点击某一个选项
                $td.eq(Math.round(Math.random() * ($td.length - 1))).click();
            });
        },
        // 3. 自动提交
        autoSubmit: function (option) {
            var options = $.extend({
                enabled: false,     // 默认关闭自动提交
                autoReopen: false,  // 提交后是否重新打开问卷, 用于刷问卷
                $button: undefined  // 提交按钮
            }, option);

            // 1. 点击获取验证码
            $('#yucinput').click().focus();
            // 2. 自动提交, 或者滚动到页面底部
            if (options.enabled) {
                options.$button.click();
            } else {
                $("html, body").animate({scrollTop: $(document).height()}, 1000);
            }
            // 3. 提交时在新标签页打开问卷
            if (options.autoReopen) {
                var reopen = function () {
                    window.open(location.href, '_blank');
                    setTimeout(function () {
                        window.close();
                    }, 1000);
                };
                $('#yucinput').keypress(function (e) {
                    if (e.which == 13) {
                        reopen();
                    }
                });
                options.$button.on('click', reopen);
            }
        }
    });

    (function () {
        let valid = url.jq || url.hj;
        if (!valid) {
            return;
        }
        console.log('匹配jq模式问卷');
        $.selectQuestion({
            $fieldset: $fieldset,
            questionSelector: '.div_question',
            titleSelector: '.div_title_question',
            answerSelector: '.div_table_radio_question .ulradiocheck li',
            isRadio: function ($answers) {
                return $answers.find('a:first').hasClass('jqRadio');
            },
            isCheckbox: function ($answers) {
                return $answers.find('a:first').hasClass('jqCheckbox');
            }
        });
        $.ratingQuestion({
            $fieldset: $fieldset,
            answerSelector: 'div.div_table_radio_question tbody tr'
        });
        $.autoSubmit({
            enabled: false,
            autoReopen: false,
            $button: $('input.submitbutton')
        });
    })();

    (function () {
        let valid = url.m;
        if (!valid) {
            return;
        }
        console.log('匹配m模式问卷');
        $.selectQuestion({
            $fieldset: $fieldset,
            questionSelector: '.field',
            titleSelector: '.field-label',
            answerSelector: '.ui-controlgroup div',
            isRadio: function ($answers) {
                return $answers.hasClass('ui-radio');
            },
            isCheckbox: function ($answers) {
                return $answers.hasClass('ui-checkbox');
            }
        });
        $.ratingQuestion({
            $fieldset: $fieldset,
            answerSelector: '.matrix-rating tbody tr[tp]'
        });
        $.autoSubmit({
            enabled: false,
            autoReopen: false,
            $button: $('#divSubmit').find('a.button')
        });
    })();
})(jQuery);