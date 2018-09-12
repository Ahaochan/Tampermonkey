# <div align="center"><a title="Go to homepage" href="https://greasyfork.org/zh-CN/users/30831"><img align="center" width="56" height="56" src="https://greasyfork.org/assets/blacklogo96-e0c2c76180916332b7516ad47e1e206b42d131d36ff4afe98da3b1ba61fd5d6c.png"></a>Greasy Fork</div>

<p align="center">
  <a href="http://hits.dwyl.io/Ahaochan/Ahaochan/Tampermonkey"><img src="http://hits.dwyl.io/Ahaochan/Ahaochan/Tampermonkey.svg"></a>
  <a href="https://github.com/Ahaochan/Tampermonkey"><img src="https://img.shields.io/github/stars/Ahaochan/Tampermonkey.svg"></a>
  <a href="https://github.com/Ahaochan/Tampermonkey/blob/master/LICENSE.md"><img src="https://img.shields.io/github/license/Ahaochan/Tampermonkey.svg"></a>
  <!--<a href=""><img src=""></a>-->
</p>


# Greasy Fork脚本集合
- 慕课网-找回路径课程：https://greasyfork.org/zh-CN/scripts/28115
- 慕课网-下载视频（失效）：https://greasyfork.org/zh-CN/scripts/28327
- 获取行政区划代码: https://greasyfork.org/zh-CN/scripts/31888
- Pixiv-增强: https://greasyfork.org/zh-CN/scripts/34153
- Greasy Fork 替换原图: https://greasyfork.org/zh-CN/scripts/35062
- Google翻译 替换: https://greasyfork.org/zh-CN/scripts/35072
- Fuck天猫: https://greasyfork.org/zh-CN/scripts/369391
- 问卷星 自动随机填写: https://greasyfork.org/zh-CN/scripts/369392

# 坑
## 1、函数在页面中点击执行
在脚本中定义函数`function abc(){ alert("helloWorld"); }`,注入onclick事件`<a id="a" onclick="abc();">HelloWorld</a>`。
爆出函数未定义的错误Function is not defined。
在[mozillazine](http://forums.mozillazine.org/viewtopic.php?p=2007224)了解到Tampermonkey的js脚本是在sandbox中的，在html中访问不到。
使用下面的例子可以完成这个功能
```js
unsafeWindow.abc = function(msg) {
  alert(msg);
};
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

## 5、Ajax跨域请求多图并压缩为Zip
依赖[JSZip](https://github.com/Stuk/jszip)、[FileSaver](https://github.com/eligrey/FileSaver.js), 具体实现参考[Pixiv-增强]( https://greasyfork.org/zh-CN/scripts/34153)
```js
var zip = new JSZip();
for (var i = 0; i < 16; i++) {
    (function (index) {
        var url = 'https://i.pximg.net/img-master/img' + param + '_p' + index + '_master1200.jpg';
        GM_xmlhttpRequest({
            method: 'GET',
            headers: {referer: 'https://www.pixiv.net/'}, // pixiv加了防盗链referer
            overrideMimeType: 'text/plain; charset=x-user-defined',
            url: url,
            onload: function (xhr) {
                var r = xhr.responseText, data = new Uint8Array(r.length), i = 0;
                while (i < r.length) {
                    data[i] = r.charCodeAt(i);
                    i++;
                }
                var blob = new Blob([data], {type: 'image/jpeg'}); // 转为Blob类型

                zip.file('pic_' + index + '.jpg', blob, {binary: true}); // 压入zip中
            }
        });
    })(i);
}

// 注意GM_xmlhttpRequest的ajax请求不是同步的
$('按钮').click(function(){
    zip.generateAsync({type: "blob", base64: true}).then(function (content) {
        // see FileSaver.js'
        saveAs(content, "pic.zip");
    });
});
```
