// ==UserScript==
// @name        慕课网 找回路径课程
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.1.3
// @description 将慕课网消失的路径课程显示出来，数据来源：慕课网App4.2.3。使用方法：点击首页上方职业路径，或者输入http://www.imooc.com/course/program
// @author      Ahaochan
// @match       *://*.imooc.com/course/program*
// @grant        none
// @require    http://code.jquery.com/jquery-1.11.0.min.js
// ==/UserScript==

//$(document).ready(function(){
	var coursesTitle = new Array(
		/*  0: */"",
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
		/* 60: */"SSH框架探幽"
		);
	var course = {
		"route"    : { "name" : "路线", "id" : [45,34,33,32,31] },
		"all"      : { "name" : "全部", "id" : [3,11,17,18,20,21,22,23,24,26,27,28,29,31,32,33,34,35,36,37,38,39,40,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60] },
		"web_font" : { "name" : "前端", "id" : [43,35,28,26,22,20,3] },
		"web_back" : { "name" : "后端", "id" : [60,59,56,55,54,53,52,51,49,48,42,40,37,38,23,18,27,11] },
		"mobile"   : { "name" : "移动", "id" : [58,57,50,47,46,44,39,36,29,24,17] },
		"station"  : { "name" : "整站", "id" : [21] }
    };


	//调整底部栏
	$("#footer").css("position","relative");
		
	//创建外层div
	var $freePlan  = $("<div class='plan'></div>");
	$("#programMain .inner").after($freePlan);
	$("#programMain .plan:eq(1)").css("margin","20px auto auto");
	//创建外层div

	//创建头部div
	$freePlan.append("<div id='header'><div id='nav' class='page-container' style='background-color:black'></div></div>");
	var $ul = $("<ul class='nav-item'><ul>");
	for(var i in course){
		var $a  = $("<a>"+course[i].name+"</a>").click({course:i}, function(event){ createBox(event.data.course); });
		$ul.append($("<li></li>").append($a));
	}
	$freePlan.find(".page-container")
		.append("<div class='logo'><a href='/' target='_self' class='hide-text' title='首页'>慕课网</a></div>")
		.append($ul);
	//创建头部div
		
		
	//创建内容页
	$freePlan.append("<div class='plan-box clearfix' id='plan-box'></div>");
	var $freeBox = $freePlan.find("#plan-box");
	createBox("route");
	
	function createBox(prop){
		$freeBox.empty();
		for(var i in course[prop].id){
			var pid = course[prop].id[i];
			var $item = $("<div class='plan-item-box'>"+
						"<a href='http://www.imooc.com/course/programdetail/pid/"+pid+"' target='_blank'>"+
							"<div class='plan-item js-planItem' style='height: 232px;'>"+
								"<div class='bottom'>"+
									"<div class='bottomh'>"+
										"<h2>"+coursesTitle[pid]+"</h2>"+
									"</div>"+
								"</div>"+
							"</div>"+
						"</a>"+
						"<div class='c-line'></div>"+
						"<div class='d-line'></div>"+
					"</div>");
			$freeBox.append($item);
		}
	}
	//创建内容页
//});