// ==UserScript==
// @name        慕课网 下载视频
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.1.0
// @description 获取链接，数据来源：http://www.imooc.com/course/ajaxmediainfo/?mid=285&mode=flash。使用方法：进入任意课程点击下载即可。如http://www.imooc.com/learn/285
// @author      Ahaochan
// @match       *://*.imooc.com/learn/*
// @grant       none
// @require     http://code.jquery.com/jquery-1.11.0.min.js
// ==/UserScript==
//$(document).ready(function(){
    //清晰度设置
	var clarityType = 2;
	$("div.mod-tab-menu").after(
		$("<div id='downloadBox' class='course-brief'>"+
			"<h4 style='font-weight:700;font-size: 16px;marginTop:10px'>下载清晰度 : </h4>"+
			"<label for='lowClarity'   >Low   </label><input type='radio' id='lowClarity'    name='clarity' value='0' />"+
			"<label for='middleClarity'>Middle</label><input type='radio' id='middleClarity' name='clarity' value='1' />"+
			"<label for='heightClarity'>Height</label><input type='radio' id='heightClarity' name='clarity' value='2' checked='checked' /><br/>"+
		"</div>")
	);
	$("input:radio[name=clarity]").css("margin","auto 50px auto 3px");//设置单选框
	$("input:radio[name=clarity]").change(function(){clarityType = this.value;$("#downloadBox textarea").text(getTextLinks());});
	//清晰度设置

	//获取下载链接
	var videoes = [];
	var selector = 'a.J-media-item';
	var total = $(selector).length;
	$(selector).each(function(index, element) {
		var $this = $(this);
		var href = this.href;
		var vid = href.substring(href.lastIndexOf('/') + 1, href.length);
		var name = this.innerText;
		var pattern = /\(\d{2}:\d{2}\)/;
		if (!pattern.test(name)) {
			total--;
            if (index == $(selector).length - 1 && !total) { console.log('没有视频可以下载！'); }
			return;
		}
		name = name.replace(/\(\d{2}:\d{2}\)/, '').replace(/\s/g, '');
		$.getJSON("/course/ajaxmediainfo/?mid=" + vid + "&mode=flash", function(response) {
			videoes.push({
				vid: vid,
				name: name,
				url: [ response.data.result.mpath[0], response.data.result.mpath[1], response.data.result.mpath[2] ]
			});
			//添加单个下载链接
			var $link = $("<a href='"+response.data.result.mpath[clarityType]+"' class='downLink' style='position:absolute;right:100px;top:0;' target='_blank'></a>");
			$link.bind("DOMNodeInserted", function() { $(this).empty().text("下载"); } );//移除子标签
			$this.after($link);
            //添加全部下载链接
			if (videoes.length == total) {
				$("#downloadBox h4:first").after('共' + total + '个视频。已完成解析' + videoes.length + '个视频。<br/>');
				$("#downloadBox").append($("<textarea style='width:100%;border:2px solid red;padding: 5px;height: 100px;'>"+getTextLinks()+"</textarea>"));//全部链接
			}
		});
	});
	//获取下载链接

	function getTextLinks(){
		var links = "";
		for(var i in videoes) { links += "filename="+videoes[i].name+"&fileurl="+videoes[i].url[clarityType]+"\n"; }
		return links;
	}
//});