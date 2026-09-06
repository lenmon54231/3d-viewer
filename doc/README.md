# 3d-viewer

基于 three.js（r160）的微信小程序 3D 模型查看器插件。内置 glTF/GLB 加载（含内嵌贴图、骨骼动画）、PBR 环境光照、单指旋转 / 双指缩放手势。

## 快速开始

宿主小程序 `app.json` 声明插件：

```json
{
  "plugins": {
    "three-viewer-plugin": {
      "version": "dev",
      "provider": "wx0b28346dfb8b5ed5"
    }
  }
}
```

页面 `index.json`：

```json
{
  "usingComponents": {
    "three-viewer": "plugin://three-viewer-plugin/three-viewer"
  }
}
```

页面 `index.wxml`：

```xml
<three-viewer
  src="https://your-cdn.com/model.glb"
  background="#1a1c22"
  autoplay
  style="width: 100%; height: 60vh; display: block;"
  bindload="onLoad"
  binderror="onError" />
```

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| src | String | '' | glb 模型地址（https），变更时自动重新加载 |
| background | String | #1a1c22 | 背景色 |
| autoplay | Boolean | true | 自动播放模型的第一个动画 |

## 事件

- `bindload`：模型加载完成，`detail.animations` 为动画数量
- `binderror`：下载或解析失败，`detail.message` 为错误信息

## 交互

单指拖动旋转，双指捏合缩放。

## 说明

- 模型文件建议使用自包含的 `.glb`（贴图内嵌），体积控制在几 MB 内
- 模型资源域名需加入插件后台的 request 合法域名
- 渲染基于 WebGL2（基础库 2.24.0+），低版本自动回退 WebGL1
