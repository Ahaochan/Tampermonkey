# Tampermonkey油猴脚本集合


# 脚本集合
- 慕课网-找回路径课程：https://greasyfork.org/zh-CN/scripts/28115
- 慕课网-下载视频：https://greasyfork.org/zh-CN/scripts/28327
- 获取行政区划代码: https://greasyfork.org/zh-CN/scripts/31888

# 坑
## 1、函数在页面中点击执行
在脚本中定义函数`function abc(){ alert("helloWorld"); }`,注入onclick事件`<a id="a" onclick="abc();">HelloWorld</a>`。
爆出函数未定义的错误Function is not defined。
在[mozillazine](http://forums.mozillazine.org/viewtopic.php?p=2007224)了解到Tampermonkey的js脚本是在sandbox中的，在html中访问不到。
使用下面的例子可以完成这个功能
```js
unsafeWindow.abc = function(msg) {
  alert(msg);
}
document.getElementById("a").onclick = "window.abc('helloWorld')";
```

## 2、跨域访问
在`http://m.imooc.com/video/14388`中底部写死了`mp4`的`url`，判断依据是禁用`js`仍然在`html`源代码中发现了这个`url`。
课程所在位置是`http://www.imooc.com/learn/814`。属于跨域访问的问题，使用[GM_xmlhttpRequest](https://wiki.greasespot.net/GM_xmlhttpRequest)可以解决。

## 3、模拟事件
来自[stackoverflow](http://stackoverflow.com/questions/24025165/simulating-a-mousedown-click-mouseup-sequence-in-tampermonkey)，原生js实现的模拟点击事件.
`trigger`对非`JQuery`绑定的事件无效。
```js
$('#downTip').click(function(){
	//$('#js-signin-btn').trigger('click');
    var clickEvent  = document.createEvent ('MouseEvents');
    clickEvent.initEvent ('click', true, true);
    document.getElementById('js-signin-btn').dispatchEvent (clickEvent);
});
```

## 4、拦截Ajax请求的url路径
```js
(function (open) {
    XMLHttpRequest.prototype.open = function () {
        this.addEventListener("readystatechange", function () {
            if (this.responseURL.indexOf('.hxk') >= 0) {
                console.log(this.responseURL);
            }

        }, false);
        open.apply(this, arguments);
    };
})(XMLHttpRequest.prototype.open);
```