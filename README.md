# 3d-viewer

基于 three.js（r160）的微信小程序 3D 模型查看器，以 **npm 组件包** 形式分发。

## 能力

- glTF / GLB 模型加载（内嵌贴图、骨骼动画自动播放）
- PBR 环境光照（PMREM + RoomEnvironment）
- 单指旋转、双指缩放手势
- WebGL2 优先（基础库 2.24.0+），低版本自动回退 WebGL1
- 小程序环境适配层（window/document/Blob/URL/Image 事件桥接等）

## 目录结构

| 目录 | 说明 |
| --- | --- |
| `package/` | 可发布的 npm 组件包 `miniprogram-three-viewer`（源码即 `miniprogram_dist`） |
| `miniprogram/` | 宿主示例小程序 |
| `plugin/` | 小程序插件形态（个人主体账号无法发布插件，代码保留备用） |

## 本地运行

1. 微信开发者工具导入项目根目录
2. `cd miniprogram && npm install`
3. 开发者工具菜单「工具 → 构建 npm」
4. 编译

模型默认从 CDN 加载（`cdn.jsdelivr.net`），正式使用请在小程序后台「开发 → 开发设置 → 服务器域名 → request 合法域名」中配置模型资源域名，并在开发者工具「详情 → 本地设置」勾选「校验合法域名」验证。

## 在自己小程序中使用

```bash
npm install miniprogram-three-viewer
```

```json
{
  "usingComponents": {
    "three-viewer": "miniprogram-three-viewer/components/model-viewer"
  }
}
```

```xml
<three-viewer src="https://your-cdn.com/model.glb"
              style="width: 100%; height: 60vh; display: block"
              bindload="onLoad" binderror="onError" />
```

详见 [package/README.md](package/README.md)。
