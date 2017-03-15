// ==UserScript==
// @name        慕课网 找回路径课程
// @namespace   https://github.com/Ahaochan/Tampermonkey
// @version     0.1
// @description 将慕课网消失的路径课程显示出来，数据来源：慕课网App4.2.3。使用方法：点击首页上方职业路径，或者输入http://www.imooc.com/course/program
// @author      Ahaochan
// @match       http://www.imooc.com/course/program
// @grant    	unsafeWindow
// ==/UserScript==


var courses = new Array(
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
var item_height = "232px";
var courses_route    = new Array(45,34,33,32,31);
var courses_all      = new Array(3,11,17,18,20,21,22,23,24,26,27,28,29,31,32,33,34,35,36,37,38,39,40,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60);
var courses_web_font = new Array(43,35,28,26,22,20,3);
var courses_web_back = new Array(60,59,56,55,54,53,52,51,49,48,42,40,37,38,23,18,27,11);
var courses_mobile   = new Array(58,57,50,47,46,44,39,36,29,24,17);
var courses_station  = new Array("21");
var titles    = new Array("路线", "全部", "前端", "后端", "移动", "整站");
var titles_en = new Array("route", "all", "web_font", "web_back", "mobile", "station");


document.getElementById("footer").style.position="relative";//调整底部栏
create();//创建
function create(){
	var programMain = document.getElementById("programMain");
	
	var plan = document.createElement("div");
	plan.className = "plan";
	plan.style.margin = "margin: 0px auto auto;";
	programMain.appendChild(plan);
	
	var plan_box = document.createElement("div");
	plan_box.className = "plan-box clearfix";
	plan_box.id = "plan-box";
	plan.appendChild(plan_box);
	
	createHeader(plan);
	createBox(plan_box, "route");
}

function createHeader(source){
	var header = document.createElement("div");
	header.id = "header";
	source.insertBefore(header, document.getElementById("plan-box"));
	
	var nav = document.createElement("div");
	nav.id = "nav";
	nav.className = "page-container";
	header.appendChild(nav);
	
	var logo = document.createElement("div");
	logo.id = "logo";
	logo.className = "logo";
	logo.innerHTML = "<a href=\"/\" target=\"_self\" class=\"hide-text\" title=\"首页\">慕课网</a>";
	nav.appendChild(logo);
	
	var nav_item = document.createElement("ul");
	
	nav_item.className = "nav-item";
	for(var i = 0; i < titles.length; i++){
		var li = document.createElement("li");
		var a  = document.createElement("a");
		var text = document.createTextNode(titles[i]);
		a.setAttribute("onclick", "window.nav_click("+i+")");
		a.appendChild(text);
		li.appendChild(a);
		nav_item.appendChild(li);
	}
	nav.appendChild(nav_item);
}

unsafeWindow.nav_click = function(id){ 
	var plan_box = document.getElementById("plan-box");
	while(plan_box.hasChildNodes()) {
		plan_box.removeChild(plan_box.firstChild);
	}
	createBox(plan_box, titles_en[id]);	
};
function createBox(source, title){
	var courses = eval('courses_'+title);
	for(var i = 0; i < courses.length; i++){
		var item = createItemBox(courses[i]);
		source.appendChild(item);
	}
	resetMargin();
};

function createItemBox(id){
	var plan_item_box = document.createElement("div");
	plan_item_box.className = "plan-item-box";

	var a = document.createElement("a");
	a.href   = "http://www.imooc.com/course/programdetail/pid/"+id;
	a.target = "_blank";
	plan_item_box.appendChild(a);

	var plan_item = document.createElement("div");
	plan_item.className = "plan-item js-planItem";
	plan_item.style.height = item_height;
	a.appendChild(plan_item);

	var bottom = document.createElement("div");
	bottom.className = "bottom";
	plan_item.appendChild(bottom);

	var bottomh = document.createElement("div");
	bottomh.className = "bottomh";
	bottom.appendChild(bottomh);

	var h2 = document.createElement("h2");
	var course = document.createTextNode(courses[id]);
	h2.appendChild(course);
	bottomh.appendChild(h2);

	var c_line = document.createElement("c-line");
	c_line.className = "c-line";
	plan_item_box.appendChild(c_line);
	
	var d_line = document.createElement("d-line");
	d_line.className = "d-line";
	plan_item_box.appendChild(d_line);

	return plan_item_box;
};

function resetMargin(){
	var plans = document.getElementsByClassName("plan");
	for(var i = 0; i < plans.length; i++){
		plans[i].style.margin = "30px auto auto";
	}
};