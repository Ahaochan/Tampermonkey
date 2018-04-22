// ==UserScript==
// @name        获取行政区划代码
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.0.3
// @description 爬取国家统计局最新县及县以上行政区划代码, 解析为json。http://www.mca.gov.cn/article/sj/tjbz/a/
// @author      Ahaochan
// @include     /http://www\.mca\.gov\.cn/article/sj/tjbz/a/[0-9]*/[0-9]*/[0-9]*\.html/
// @match       http://www.mca.gov.cn/article/sj/tjbz/a/*/*/*.html
// @grant       GM.setClipboard
// @require     http://code.jquery.com/jquery-1.11.0.min.js
// ==/UserScript==
$(function () {
    'use strict';

    String.prototype.endWith = function (endStr) {
        if(endStr==='') return true;
        var d = this.length - endStr.length;
        return (d >= 0 && this.lastIndexOf(endStr) === d);
    };

    /**--------------------------------导出设置-------------------------------------------------*/
    var numberType = 4;
    var outTextType = '0000';
    $('table').before(
        $('<div id="jsonBox">' +
            '<div style="float:left;margin-right:30px;">' +
            '<h4 style="font-weight:700;font-size: 16px;marginTop:10px">代码位数 : </h4>' +
            '<label for="twoType" >2位 </label><input type="radio" id="twoType"  name="number" value="2" />' +
            '<label for="fourType">4位 </label><input type="radio" id="fourType" name="number" value="4" checked="checked" />' +
            '<label for="sixType" >6位 </label><input type="radio" id="sixType"  name="number" value="6" />' +
            '</div>' +
            '<div>' +
            '<h4 style="font-weight:700;font-size: 16px;marginTop:10px">行政等级 : </h4>' +
            '<label for="provinceType">省级 </label><input type="radio" id="provinceType" name="outText" value="0000" checked="checked" />' +
            '<label for="cityType"    >市级 </label><input type="radio" id="cityType"     name="outText" value="00"/>' +
            '<label for="countyType"  >县级 </label><input type="radio" id="countyType"   name="outText" value="" /><br/>' +
            '</div>' +
            '<div style="margin-top:24px;">' +
            '<div style="border:1px solid #b7bbbf;box-sizing:border-box;border-radius:2px;">' +
            '<textarea id="jsonArea" style="width:97%;min-height:100px;padding:8px;color:#555;resize:none;line-height:18px;"></textarea>' +
            '</div>' +
            '</div>')
    );
    $('input:radio').css('margin', 'auto 50px auto 3px');//设置单选框
    $('input:radio[name=number]' ).change(function () { numberType  = this.value; textAreaChange(); });
    $('input:radio[name=outText]').change(function () { outTextType = this.value; textAreaChange(); });
    textAreaChange();

    function textAreaChange() {
        var testArea = getJson(numberType, outTextType);
        GM.setClipboard(testArea);
        $('#jsonArea').text(testArea);
    }
    /**--------------------------------导出设置-------------------------------------------------*/


    /**--------------------------------格式化用以显示---------------------------------*/
    function getJson(numberType, outTextType) {
        var result = '{\n';
        $('table tbody tr').each(function () {
            var $this = $(this);
            if(parseInt($this.attr('height')) !== 19){
                return;
            }

            var $td = $this.children();
            var code = $td.eq(1).text();
            var city = $td.eq(2).text();
            if (!!code && code.endWith(outTextType)) {
                result += '\'' + code.substring(0, numberType) + '\' : \'' + city + '\',\n';
            }
        });
        result = result.substring(0, result.length-2);
        result += '\n}';
        return result;
    }

    /**--------------------------------格式化用以显示---------------------------------*/
});
