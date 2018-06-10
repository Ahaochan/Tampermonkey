// ==UserScript==
// @name        问卷星 自动随机填写
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.1
// @description 问卷星 自动随机填写, 目前支持单选题, 多选题, 比重题, 有需要自动填写的题型, 请在反馈或issue提出并附带问卷地址。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @author      Ahaochan
// @include     https://www.wjx.cn/jq/*
// @match       https://www.wjx.cn/jq/*
// @require     https://code.jquery.com/jquery-2.2.4.min.js
// ==/UserScript==

(function ($) {
    'use strict';
    var shuffle = function(array) {
        for(var j, x, i = array.length; i; j = parseInt(Math.random() * i), x = array[--i], array[i] = array[j], array[j] = x);
        return array;
    };

    var $fieldset = $('#fieldset1');

    // 1. 选择题自动填写
    $fieldset.find('.div_table_radio_question').each(function () {
       var $this = $(this);
       // 1.1. 单选题自动填写
        (function () {
            var $li = $this.find('.ulradiocheck li');
            if($li.find('a:first').hasClass('jqRadio')){
                var index = parseInt(Math.random() * $li.length);
                $li.eq(index).click();
                // var title = $this.prev('.div_title_question_all').find('.div_title_question').text();
                // console.log(title+":"+String.fromCharCode(97 + index));
            }
        })();

        // 1.2. 多选题自动填写
        (function () {
            var $li = $this.find('.ulradiocheck li');
            if($li.find('a:first').hasClass('jqCheckbox')){
                // 打乱顺序
                $li = shuffle($li);

                // 多选重复num次填写
                var num = parseInt(Math.random() * $li.length) || 1;
                for(var i = 0, len = num; i < len; i++){
                    $li.eq(i).click();
                    // var title = $this.prev('.div_title_question_all').find('.div_title_question').text();
                    // console.log(title+":"+$li.eq(i).find('label').text());
                }
            }
        })();
    });


    // 2. 比重题自动填写
    $fieldset.find('div.div_table_radio_question tbody tr').each(function () {
        var $this = $(this);
        var $td = $this.children('td');
        $td.eq(parseInt(Math.random() * $td.length)).click();
    });

    // 3. 自动提交 或 滚动到底部
    $('#yucinput').click(); // 获取验证码
    if(false){
        $('input.submitbutton').click();
    } else {
        $("html, body").animate({ scrollTop: $(document).height() }, 1000);
    }

})(jQuery);