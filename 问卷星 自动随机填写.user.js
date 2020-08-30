// ==UserScript==
// @name        问卷星 自动随机填写
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.4
// @description 问卷星 自动随机填写, 目前支持单选题, 多选题, 比重题, 有需要自动填写的题型, 请在反馈或issue提出并附带问卷地址。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @author      Ahaochan
// @include     https://www\.wjx\.cn/[(jq)|(m)|(hj)]/\d+\.aspx
// @match       https://www.wjx.cn/*
// @grant       GM.setValue
// @grant       GM.getValue
// @require     https://cdn.bootcdn.net/ajax/libs/jquery/2.2.4/jquery.min.js
// ==/UserScript==

(function ($) {
    'use strict';
    let A = 0, B = 1, C = 2, D = 3, E = 4, F = 5, G = 6;
    let shuffle = function (array) {
        for (var j, x, i = array.length; i; j = parseInt(Math.random() * i), x = array[--i], array[i] = array[j], array[j] = x) ;
        return array;
    };
    let url = {
        jq: /https:\/\/www\.wjx\.cn\/jq\/\w+\.aspx/.test(location.href),
        hj: /https:\/\/www\.wjx\.cn\/hj\/\w+\.aspx/.test(location.href),
        m: /https:\/\/www\.wjx\.cn\/m\/\w+\.aspx/.test(location.href)
    };

    (function (setValue) {

    })(GM.setValue);

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
                var $answers = $this.find(options.answerSelector);

                let fillInput = function (value) {
                    // 1. 单选题自动填写
                    if (options.isRadio($answers)) {
                        // 默认随机填写
                        if(!value) { value = Math.round(Math.random() * ($answers.length - 1)); }
                        $answers.eq(value).click();
                    }

                    // 2. 多选题自动填写, 打乱按钮顺序, 默认随机点击多个答案
                    if (options.isCheckbox($answers)) {
                        // 默认随机点击多个答案
                        if(!value || !value.length) {
                            value = [];
                            $answers = shuffle($answers); // 打乱顺序
                            let num = Math.round(Math.random() * ($answers.length - 1)) || 1;
                            for (let i = 0, len = num; i < len; i++) {
                                value.push(i);
                            }
                        }
                        $.each(value, (index, item) => $answers.eq(item).click());
                    }
                };

                // 1. 初始化 是否记住选项的checkbox
                let $title = $this.find(options.titleSelector), title = $title.text();

                let $remember = $('<input type="checkbox" name="' + title + 'Remember">');
                $remember.on('change', function () {
                    let checked = $(this).is(':checked');
                    GM.setValue(title+'Remember', pattern);
                });


                $title.append($remember).append('(记住选项)');

                // 2. 恢复上次选中的选项
                GM.getValue(title+'Remember').then(function (value) {
                    $remember.prop('checked', !!value);
                    fillInput(value);
                });
            });
        },
        // 2. 比重题
        ratingQuestion: function (option) {
            return;
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