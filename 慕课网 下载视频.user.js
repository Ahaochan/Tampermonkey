// ==UserScript==
// @name        慕课网 下载视频
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.2.5
// @description 获取视频下载链接，使用方法：进入任意课程点击下载即可。如http://www.imooc.com/learn/814
// @author      Ahaochan
// @match       *://www.imooc.com/learn/*
// @grant       GM_xmlhttpRequest
// @grant       GM_setClipboard
// @require     https://code.jquery.com/jquery-2.2.4.min.js
// ==/UserScript==
(function () {
    'use strict';
    var total;
    var videoes = [];
    var clarityType = ['超清', '高清', '普清'], outTextType = ['idm', 'raw', 'xml', 'json'];
    var config = [
        ['清晰度 : ', clarityType, 0],//最后一个代表当前选择的
        ['导出格式 : ', outTextType, 0]
    ];
    //是否在解析中
    var loading = true;
    init();

    function init() {
        var $medias = $('.mod-chapters').find('a.J-media-item');
        total = $medias.length;
        var len = total;
        //添加标签
        $('.course-menu').append(
            $('<li><a href="javascript:void(0)"><span id="downOn">视频解析中...</span></a></li>').on('click', function () {
                if (loading) return;
                $(this).unbind().parent().find('li a').removeClass('active');
                $(this).find('a').addClass('active');
                display();
            }));
        if(!isLogin){
            $('#downOn').text('视频解析异常(请登录)');
            return;
        }
        //遍历获取下载链接
        $($medias).each(function (k, v) {
            var vid = $(this).parent().attr('data-media-id');
            var name = $(this).text();
            var pattern = /\(\d\d:\d\d\)/;
            if (!pattern.test(name)) {
                total--;
                if (k == len - 1 && !total) {
                    $('#downOn').text('视频下载(0)');
                }
                return;
            }
            name = name.replace(/\s\s+|\(\d\d:\d\d\)/g, '');
            v3(vid, name, $(this));
        });
    }
    /**
     * 渲染html
     */
    function display() {
        var modChapters = $('.mod-chapters');
        modChapters.html('');
        //类型选择
        $.each(config, function (k, v) {
            var $chapter = $('<div class="chapter"><h3><span class="icon-drop_down js-close .js-open js-open"></span><strong></strong></h3><ul class="video"></ul></div>');
            var ul = $chapter.children('ul');
            $chapter.find('strong').html('<i class="icon-chapter"></i>' + v[0] + v[1][0]);
            $.each(v[1], function (i, e) {
                ul.append('<li><a href="javascript:void(0)" class="J-media-item"><i class="icon-tick-revert done"></i><i class="icon-video type"></i>' + e + '</a></li>');
            });
            modChapters.append($chapter);
        });
        var area = '<div style="margin-top:24px;">' +
            '<div style="border:1px solid #b7bbbf;box-sizing:border-box;border-radius:2px;">' +
            '<textarea id="down-textarea" style="width:97%;min-height:100px;padding:8px;color:#555;resize:none;line-height:18px;"></textarea>' +
            '</div>' +
            '<div style="float:right;"><button type="button" id="btnCopy" style="background-color:#00b43c;height:40px;padding:0' +
            ' 12px;line-height:40px;text-align:center;color:#fff;cursor:pointer;margin-top:20px;border-radius:2px;">复制code</button></div>' +
            '</div>';
        modChapters.append(area);
        $('.J-media-item').on('click', function () {
            var $ul = $(this).parent();
            var $chapter = $ul.parent().parent();
            var $title = $chapter.find('h3 strong');
            var a = modChapters.find('.chapter').index($chapter);
            var b = modChapters.find('.chapter').eq(a).find('ul li').index($ul);
            if (a >= 0 && b >= 0) {
                config[a][2] = b;
                $title.html('<i class="icon-chapter"></i>' + config[a][0] + config[a][1][b]);
                $('#down-textarea').text(getTextLinks());
            }
        });
        $('#btnCopy').on('click',function () {
            GM_setClipboard($('#down-textarea').text());
            var t = $(this).text('已复制到剪贴板');
            setTimeout(function () {
                t.text('复制code');
            },1500);
        });
        $('#down-textarea').text(getTextLinks());
    }

    /** 旧版接口，只能解析v1,v2 */
    function v2(vid, name, $this) {
        $.getJSON("/course/ajaxmediainfo/?mid=" + vid + "&mode=flash", function (response) {
            var url = response.data.result.mpath[0];
            parseVideo(vid, name, url, $this);
        });
    }

    /** 新版接口，解析v1,v2,v3 */
    function v3(vid, name, item) {
        GM_xmlhttpRequest({
            method: "GET",
            url: "http://m.imooc.com/video/" + vid,
            onload: function (response) {
                var url = response.responseText.match(/(http.+mp4)/)[0];
                parseVideo(vid, name, url, item);
            }
        });
    }

    /** 处理数据 */
    function parseVideo(vid, name, url, item) {
        var video = {
            vid: vid,
            name: name,
            url: url
        };
        videoes.push(video);
        var i = videoes.length - 1;
        //添加单个下载链接
        var $link = $('<span data-index="' + i + '" style="position:absolute;right:100px;top:0;cursor:pointer;">下载</span>');
        $link.on('click', function () {
            var c = ['H', 'M', 'L'];
            window.open(url.replace(/\w\.mp4/, c[config[0][2]]) + '.mp4');
        });
        item.after($link);
        //显示下载总数
        if (videoes.length == total) {
            loading = false;
            $('#downOn').text('视频下载(' + total + ')');
        }
    }

    /** 更新textarea */
    function getTextLinks() {
        var c = ['H', 'M', 'L'];
        var retType = outTextType[config[1][2]];
        if (retType === "json")    return JSON.stringify(videoes);
        else {
            var str = "";
            for (var i in videoes) {
                var url = videoes[i].url.replace(/\w\.mp4/, c[config[0][2]]) + '.mp4';
                if (retType === "xml") {
                    str += '\t<video>\n\t\t<url>' + url + '</url>\n\t\t<name>' + videoes[i].name + '</name>\n\t</video>\n';
                } else if (retType === "raw") {
                    str += url + "\n";
                } else {//idm
                    str += "filename=" + videoes[i].name + "&fileurl=" + url + "\n";
                }
            }
            if (retType === "xml") str = "<?xml version='1.0' encoding='utf-8' ?>\n<videoes>\n" + str + '</videoes>';
            return str;
        }
    }
})();
