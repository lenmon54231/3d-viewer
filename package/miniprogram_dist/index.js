// 编程式入口：宿主小程序可以通过
//   const { ThreeViewer } = require('miniprogram-three-viewer')
// 直接使用查看器核心（不经过自定义组件），自行管理 canvas 生命周期。
const { ThreeViewer } = require('./libs/three-viewer.js')

module.exports = {
  ThreeViewer: ThreeViewer,
  REVISION: 'three-r160'
}
