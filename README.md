# Tampermonkey油猴脚本集合


# 脚本集合
慕课网-找回路径课程：https://greasyfork.org/zh-CN/scripts/28115

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