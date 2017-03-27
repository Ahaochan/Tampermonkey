// ==UserScript==
// @name        慕课网 下载视频
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.2.0
// @description 获取视频下载链接，使用方法：进入任意课程点击下载即可。如http://www.imooc.com/learn/814
// @author      Ahaochan
// @match       *://www.imooc.com/learn/*
// @grant       GM_xmlhttpRequest
// @grant       GM_setClipboard
// @require     http://code.jquery.com/jquery-1.11.0.min.js 
// ==/UserScript==
//$(document).ready(function(){
    /** 导出设置 */
	var clarityType = 2;
	var outTextType = "idm";
	$("div.mod-tab-menu").after(
		$("<div id='downloadBox' class='course-brief'>"+
			"<div style='float:left;margin-right:70px;'>"+
				"<h4 style='font-weight:700;font-size: 16px;marginTop:10px'>下载清晰度 : </h4>"+
				"<label for='lowClarity'   >Low   </label><input type='radio' id='lowClarity'    name='clarity' value='0' />"+
				"<label for='middleClarity'>Middle</label><input type='radio' id='middleClarity' name='clarity' value='1' />"+
				"<label for='highClarity'  >High  </label><input type='radio' id='highClarity'   name='clarity' value='2' checked='checked' />"+
			"</div>"+
			"<div>"+
				"<h4 style='font-weight:700;font-size: 16px;marginTop:10px'>导出格式 : </h4>"+
				"<label for='rawOutText' >raw</label><input type='radio' id='rawOutText'  name='outText' value='raw'/>"+
				"<label for='idmOutText' >idm </label><input type='radio' id='idmOutText'  name='outText' value='idm' checked='checked' />"+
				"<label for='xmlOutText' >xml </label><input type='radio' id='xmlOutText'  name='outText' value='xml' />"+
				"<label for='jsomOutText'>json</label><input type='radio' id='jsomOutText' name='outText' value='json'/><br/>"+
			"</div>"+
		"</div>")
	);
	$("input:radio").css("margin","auto 50px auto 3px");//设置单选框
	$("input:radio[name=clarity]").change(function() {  clarityType = this.value; 	textAreaChange();	});
	$("input:radio[name=outText]").change(function() {	outTextType = this.value;	textAreaChange();	});
	function textAreaChange(){
		var downloadTextArea = getTextLinks(clarityType,outTextType);
		GM_setClipboard(downloadTextArea);
		$("#downloadBox textarea").text(downloadTextArea);
	}
	/** 导出设置 */

	//获取下载链接
	var videoes = [];
	var selector = 'a.J-media-item';
	var total = $(selector).length;
	$(selector).each(function(index, element) {
		var $this = $(this);
		var vid = this.href.substring(this.href.lastIndexOf('/') + 1, this.href.length);
		var name = this.innerText;
		var pattern = /\(\d{2}:\d{2}\)/;
		if (!pattern.test(name)) {
			total--;
            if (index == $(selector).length - 1 && !total) { console.log('没有视频可以下载！'); }
			return;
		}
		
		name = name.replace(/\(\d{2}:\d{2}\)/, '').replace(/\s/g, '');
		//v2(vid, name, $(this));
		v3(vid, name, $(this));
	});
	//获取下载链接

	/** 旧版接口，只能解析v1,v2 */
	function v2(vid, name, $this){
		$.getJSON("/course/ajaxmediainfo/?mid=" + vid + "&mode=flash", function(response) {
			var url = response.data.result.mpath[0];
			parseVideo(vid, name, url, $this);
		});
	}
	
	/** 新版接口，解析v1,v2,v3 */
	function v3(vid, name, $this){
		GM_xmlhttpRequest({
			method: "GET",
			url: "http://m.imooc.com/video/"+vid,
			onload: function(response) {
				var pattern = /(http.+mp4)/;
				var url = response.responseText.match(pattern)[0];
				parseVideo(vid, name, url, $this);
			}
		});
	}
	
	/** 处理数据 */
	function parseVideo(vid, name, url, $this){
		var urlL = url.replace("H.mp4","M.mp4").replace("M.mp4","L.mp4");
		var urlM = url.replace("H.mp4","M.mp4").replace("L.mp4","M.mp4");
		var urlH = url.replace("L.mp4","M.mp4").replace("M.mp4","H.mp4");
		var video = {
			vid: vid,
			name: name,
			url: [ urlL, urlM, urlH ]
		};
		videoes.push(video);
		//添加单个下载链接
		var $link = $("<a href='"+video.url[clarityType]+"' class='downLink' style='position:absolute;right:100px;top:0;' target='_blank'>下载</a>");
		$this.after($link);
		$link.bind("DOMNodeInserted", function() {	$(this).find("i").remove();} );//移除子标签
		
		//添加全部下载链接
		if (videoes.length == total) {
			$("#downloadBox").append('共' + total + '个视频。已完成解析' + videoes.length + '个视频。已复制到剪贴板<br/>');
			$("#downloadBox").append($("<textarea style='width:100%;border:2px solid red;padding:5px;height:100px;'></textarea>"));//全部链接
			videoes.sort(function(a,b){
				if(a.name>b.name)	return 1;
				else if(a.name<b.name) return -1;
				else return 0;
			});
			textAreaChange();
		}
	}
	
	/** 更新textarea */
	function getTextLinks(clarityType, outTextType){
		if(outTextType === "json")	return JSON.stringify(videoes);
		else {
			var str = "";
			for(var i in videoes) {
				if(outTextType === "xml"){
					str += '\t<video>\n\t\t<url>' + videoes[i].url[clarityType] + '</url>\n\t\t<name>' + videoes[i].name + '</name>\n\t</video>\n';
				} else if(outTextType === "raw"){
					str += videoes[i].url[clarityType]+"\n";
				} else {//idm
					str += "filename="+videoes[i].name+"&fileurl="+videoes[i].url[clarityType]+"\n";
				}
			}
			if(outTextType === "xml")   str = "<?xml version='1.0' encoding='utf-8' ?>\n<videoes>\n"+str+'</videoes>';
			return str;
		}
	}
	
//});