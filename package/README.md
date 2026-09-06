# miniprogram-three-viewer

微信小程序 3D 模型查看器组件，基于 three.js（r160）适配版。支持 glTF/GLB 加载（内嵌贴图、骨骼动画）、PBR 环境光照、单指旋转 / 双指缩放手势。WebGL2 优先（基础库 2.24.0+），低版本自动回退 WebGL1。

## 安装

```bash
npm install miniprogram-three-viewer
```

然后在微信开发者工具中点击「工具 → 构建 npm」。

## 使用组件

页面 `index.json`：

```json
{
  "usingComponents": {
    "three-viewer": "miniprogram-three-viewer/components/model-viewer"
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

## 编程式使用

```js
const { ThreeViewer } = require('miniprogram-three-viewer')
// 在拿到 type="webgl" 的 canvas 节点后
const viewer = new ThreeViewer(canvas, { width, height, src: 'https://.../model.glb' })
```

## 说明

- 模型建议使用自包含 `.glb`（贴图内嵌），体积控制在几 MB 内
- 请求域名需在宿主小程序后台加入 request 合法域名
- 组件体积约 750KB，建议宿主将模型展示页放在分包中并配合「构建 npm 到分包」使用

## License

MIT（包含 three.js r160，The MIT License Copyright © 2010-2023 three.js authors）
