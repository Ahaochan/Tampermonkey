// ==UserScript==
// @name        慕课网 下载视频(失效)
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.2.7
// @description 获取视频下载链接，使用方法：进入任意课程点击下载即可。如http://www.imooc.com/learn/814。慕课网已废弃v1和v2接口, 全面启用HLS, 此脚本失效, 详情看脚本内说明。github:https://github.com/Ahaochan/Tampermonkey，欢迎star和fork。
// @author      Ahaochan
// @match       http://www.imooc.com/learn/*
// @match       https://www.imooc.com/learn/*
// @grant       GM_xmlhttpRequest
// @grant       GM_setClipboard
// @require     http://code.jquery.com/jquery-1.11.0.min.js
// ==/UserScript==
(function () {
    'use strict';
    // 最新视频下载方法
    // 例如下载http://www.imooc.com/video/14351，点击F12，点击Network，筛选XHR，找到medium.hxk。复制神秘代码58c65fc3e520e5677f8b457a。
    // 下载地址就是http://v3.mukewang.com/584e2423b3fee3bb558b7896/H.mp4。
    // 估计是通过http://www.imooc.com/course/14351/medium.m3u8?cdn=aliyun返回的数据，通过某种解密方式获得的神秘代码
    // 思路在这，个人水平不够，修复不了，有能力希望能fork并pull request一下。。。

    // 2017年10月3日
    // 现在慕课网已经把http://v1.mukewang.com和http://v2.mukewang.com的DNS解析停掉了。
    // 看来已经全面启用HLS传输视频流。可以看到http://m.imooc.com/course/3725/high.m3u8?cdn=aliyun应该就是获取m3u8文件的链接。
    // 而且慕课网对m3u8文件进行了加密, 奇怪的是, 每次刷新的加密后m3u8文件字符串都不一样, 但是请求的ts文件是一样的url。不知道慕课网是怎么做到的。
    // 上面的解决方案也只能解决一部分视频的下载。
    // 还是本人技术不够, 所以放弃此脚本的维护。


    /**--------------------------------获取下载链接---------------------------------------------*/
    var videoes = [];
    var $medias = $('.mod-chapters').find('a.J-media-item');
    var total = $medias.length;
    var len = total;
    //添加提示标签
    $('.course-menu').append($('<li><a href="javascript:void(0)"><span id="downTip">慕课网下载脚本已失效</span></a></li>'));

    return; // 中止此脚本运行

    if (!isLogin) {
        $('#downTip').text('视频下载异常，点击进行登录')
            .click(function () {
                var clickEvent = document.createEvent('MouseEvents');
                clickEvent.initEvent('click', true, true);
                document.getElementById('js-signin-btn').dispatchEvent(clickEvent);
            });
        return;
    }
    //遍历获取下载链接
    $medias.each(function (key, value) {
        var vid = $(this).parent().attr('data-media-id');
        var name = $(this).text();
        var pattern = /\(\d\d:\d\d\)/;
        if (!pattern.test(name)) {
            total--;
            if (key === len - 1 && !total) {
                $('#downTip').text('无视频下载');
            }
            return;
        }
        name = name.replace(/\(\d{2}:\d{2}\)/, '').replace(/\s/g, '');
        v1(vid, name, $(this));
        //v2(vid, name, $(this));
        //v3(vid, name, $(this));
    });
    /**--------------------------------获取下载链接---------------------------------------------*/
    /**--------------------------------视频下载解析接口-----------------------------------------*/
    /** v1接口，强制转换为v1接口 */
    function v1(vid, name, item) {
        $.getJSON('/course/ajaxmediainfo/?mid=' + vid + '&mode=flash', function (response) {
            console.log('加载数据:' + vid);
            if (response.data.result.mpath instanceof Array) {
                var url = response.data.result.mpath[0].replace('http://v2', 'http://v1');
                parseVideo(vid, name, url, item);
            } else {
                $('#downTip').text('不支持新版视频, 若要下载请查看源码中的注释');
            }

        });
    }

    /** v2接口，只能解析v1,v2（已废弃） */
    function v2(vid, name, item) {
        $.getJSON('/course/ajaxmediainfo/?mid=' + vid + '&mode=flash', function (response) {
            var url = response.data.result.mpath[0];
            parseVideo(vid, name, url, item);
        });
    }

    /** v3接口，解析v1,v2,v3（已废弃） */
    function v3(vid, name, item) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'http://m.imooc.com/video/' + vid,
            onload: function (response) {
                var pattern = /(http.+mp4)/;
                var url = response.responseText.match(pattern)[0];
                parseVideo(vid, name, url, item);
            }
        });
    }

    /**--------------------------------视频下载解析接口-----------------------------------------*/
    /**--------------------------------处理数据-------------------------------------------------*/
    function parseVideo(vid, name, url, item) {
        var urlL = url.replace('H.mp4', 'M.mp4').replace('M.mp4', 'L.mp4');
        var urlM = url.replace('H.mp4', 'M.mp4').replace('L.mp4', 'M.mp4');
        var urlH = url.replace('L.mp4', 'M.mp4').replace('M.mp4', 'H.mp4');
        var video = {
            vid: vid,
            name: name,
            url: [urlL, urlM, urlH]
        };
        videoes.push(video);
        //添加单个下载链接
        var $link = $('<a href="' + video.url[clarityType] + '" style="position:absolute;right:100px;top:0;" target="_blank">下载</a>');
        $link.bind('DOMNodeInserted', function () {
            $(this).find('i').remove();
        });//移除子标签
        item.after($link);
        //添加全部下载链接
        if (videoes.length === total) {
            $('#downTip').text('视频下载(' + total + ')，已复制到剪贴板');
            videoes.sort(function (a, b) {
                if (a.name > b.name)    return 1;
                else if (a.name < b.name) return -1;
                else return 0;
            });
            //显示
            $('#downloadBox').append($('<div style="margin-top:24px;">' +
                '<div style="border:1px solid #b7bbbf;box-sizing:border-box;border-radius:2px;">' +
                '<textarea id="downLoadArea" style="width:97%;min-height:100px;padding:8px;color:#555;resize:none;line-height:18px;"></textarea>' +
                '</div>')
            );
            textAreaChange();
        }
    }

    /**--------------------------------处理数据-------------------------------------------------*/

    /**--------------------------------导出设置-------------------------------------------------*/
    var clarityType = 2;
    var outTextType = 'idm';
    $('div.mod-tab-menu').after(
        $('<div id="downloadBox" class="course-brief">' +
            '<div style="float:left;margin-right:30px;">' +
            '<h4 style="font-weight:700;font-size: 16px;marginTop:10px">下载清晰度 : </h4>' +
            '<label for="lowClarity"   >普清(L)</label><input type="radio" id="lowClarity"    name="clarity" value="0" />' +
            '<label for="middleClarity">高清(M)</label><input type="radio" id="middleClarity" name="clarity" value="1" />' +
            '<label for="highClarity"  >超清(H)</label><input type="radio" id="highClarity"   name="clarity" value="2" checked="checked" />' +
            '</div>' +
            '<div>' +
            '<h4 style="font-weight:700;font-size: 16px;marginTop:10px">导出格式 : </h4>' +
            '<label for="rawOutText" >raw </label><input type="radio" id="rawOutText"  name="outText" value="raw"/>' +
            '<label for="idmOutText" >idm </label><input type="radio" id="idmOutText"  name="outText" value="idm" checked="checked" />' +
            '<label for="xmlOutText" >xml </label><input type="radio" id="xmlOutText"  name="outText" value="xml" />' +
            '<label for="jsomOutText">json</label><input type="radio" id="jsomOutText" name="outText" value="json"/><br/>' +
            '</div>' +
            '</div>')
    );
    $('input:radio').css('margin', 'auto 50px auto 3px');//设置单选框
    $('input:radio[name=clarity]').change(function () {
        clarityType = this.value;
        textAreaChange();
    });
    $('input:radio[name=outText]').change(function () {
        outTextType = this.value;
        textAreaChange();
    });
    function textAreaChange() {
        var downloadTextArea = getTextLinks(clarityType, outTextType);
        GM_setClipboard(downloadTextArea);
        $('#downloadBox').find('textarea').text(downloadTextArea);
    }

    /**--------------------------------导出设置-------------------------------------------------*/


    /**--------------------------------格式化下载链接用以显示---------------------------------*/
    function getTextLinks(clarityType, outTextType) {
        if (outTextType === 'json')    return JSON.stringify(videoes);
        else {
            var str = '';
            for (var i in videoes) {
                if (outTextType === 'xml') {
                    str += '\t<video>\n\t\t<url>' + videoes[i].url[clarityType] + '</url>\n\t\t<name>' + videoes[i].name + '</name>\n\t</video>\n';
                } else if (outTextType === 'raw') {
                    str += videoes[i].url[clarityType] + '\n';
                } else {//idm
                    str += 'filename=' + videoes[i].name + '&fileurl=' + videoes[i].url[clarityType] + '\n';
                }
            }
            if (outTextType === 'xml') str = '<?xml version="1.0" encoding="utf-8" ?>\n<videoes>\n' + str + '</videoes>';
            return str;
        }
    }

    /**--------------------------------格式化下载链接用以显示---------------------------------*/
})();