// plugin/pages/hello-page.js
// 插件内置的全屏演示页（复用 three-viewer 核心与公开组件同一套逻辑）
const { ThreeViewer } = require('../libs/three-viewer.js')

const DEFAULT_MODEL_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/Parrot.glb'

Page({
  data: {},

  onReady() {
    this.createSelectorQuery()
      .select('#webgl')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          console.error('hello-page: 未找到 #webgl canvas 节点')
          return
        }
        const info = res[0]
        this._viewer = new ThreeViewer(info.node, {
          width: info.width,
          height: info.height,
          src: DEFAULT_MODEL_URL
        })
      })
  },

  onHide() {
    if (this._viewer) this._viewer.pause()
  },

  onShow() {
    if (this._viewer) this._viewer.resume()
  },

  onUnload() {
    if (this._viewer) {
      this._viewer.destroy()
      this._viewer = null
    }
  },

  onTouchStart(e) {
    if (this._viewer) this._viewer.handleTouch('start', e)
  },
  onTouchMove(e) {
    if (this._viewer) this._viewer.handleTouch('move', e)
  },
  onTouchEnd(e) {
    if (this._viewer) this._viewer.handleTouch('end', e)
  }
})
