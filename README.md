# Tampermonkey油猴脚本集合


# 脚本集合
- 慕课网-找回路径课程：https://greasyfork.org/zh-CN/scripts/28115
- 慕课网-下载视频(需先登录账号)：https://greasyfork.org/zh-CN/scripts/28327

# 坑
## 1、函数在页面中点击执行
在脚本中定义函数`function abc(){ alert("helloWorld"); }`,注入onclick事件`<a id="a" onclick="abc();">HelloWorld</a>`。
爆出函数未定义的错误Function is not defined。
在[mozillazine](http://forums.mozillazine.org/viewtopic.php?p=2007224)了解到Tampermonkey的js脚本是在sandbox中的，在html中访问不到。
使用下面的例子可以完成这个功能
```
unsafeWindow.abc = function(msg) {
  alert(msg);
}
document.getElementById("a").onclick = "window.abc('helloWorld')";
```

## 2、跨域访问
在`http://m.imooc.com/video/14388`中底部写死了`mp4`的`url`，判断依据是禁用`js`仍然在`html`源代码中发现了这个`url`。
课程所在位置是`http://www.imooc.com/learn/814`。属于跨域访问的问题，使用[GM_xmlhttpRequest](https://wiki.greasespot.net/GM_xmlhttpRequest)可以解决。

