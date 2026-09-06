// plugin/components/model-viewer.js
// 插件公开组件 three-viewer：宿主小程序通过
//   <three-viewer src="https://.../model.glb" />
// 在任意页面嵌入 3D 模型查看器（单指旋转、双指缩放、动画自动播放）。
const { ThreeViewer } = require('../libs/three-viewer.js')

Component({
  properties: {
    // glb 模型地址（https），变更时自动重新加载
    src: {
      type: String,
      value: '',
      observer(v) {
        if (this._viewer && v) this._viewer.load(v)
      }
    },
    // 背景色，支持 #rrggbb
    background: {
      type: String,
      value: '#1a1c22',
      observer(v) {
        if (this._viewer) this._viewer.setBackground(v)
      }
    },
    // 是否自动播放模型自带的第一个动画
    autoplay: {
      type: Boolean,
      value: true
    },
    // 光照布局：product（产品三点布光，默认）/ soft（半球柔光，适合建筑/大场景）
    lightRig: {
      type: String,
      value: 'product',
      observer() { this._applyPreset() }
    },
    // 曝光（默认 1.2），数值越大整体越亮
    exposure: {
      type: Number,
      value: 1.2,
      observer() { this._applyPreset() }
    },
    // 环境反射强度（默认 1.4），金属/光滑材质的关键
    envIntensity: {
      type: Number,
      value: 1.4,
      observer() { this._applyPreset() }
    },
    // 双面渲染：建筑/薄壁模型设为 true，内壁不穿帮
    doubleSide: {
      type: Boolean,
      value: false,
      observer() { this._applyPreset() }
    },
    // 实体质感：true 时把模型自带的透射（玻璃效果）归零
    solid: {
      type: Boolean,
      value: false,
      observer() { this._applyPreset() }
    }
  },

  lifetimes: {
    ready() {
      this.createSelectorQuery()
        .select('#webgl')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            console.error('three-viewer: 未找到 canvas 节点')
            return
          }
          const info = res[0]
          this._viewer = new ThreeViewer(info.node, {
            width: info.width,
            height: info.height,
            src: this.data.src,
            background: this.data.background,
            autoplay: this.data.autoplay,
            lightRig: this.data.lightRig,
            exposure: this.data.exposure,
            envIntensity: this.data.envIntensity,
            doubleSide: this.data.doubleSide,
            solid: this.data.solid,
            onLoad: (detail) => this.triggerEvent('load', detail),
            onError: (detail) => this.triggerEvent('error', detail)
          })
        })
    },
    detached() {
      if (this._viewer) {
        this._viewer.destroy()
        this._viewer = null
      }
    }
  },

  pageLifetimes: {
    hide() {
      if (this._viewer) this._viewer.pause()
    },
    show() {
      if (this._viewer) this._viewer.resume()
    }
  },

  methods: {
    // 预设属性变化时实时推给查看器核心（不重建渲染器）
    _applyPreset() {
      if (!this._viewer) return
      this._viewer.setPreset({
        lightRig: this.data.lightRig,
        exposure: this.data.exposure,
        envIntensity: this.data.envIntensity,
        doubleSide: this.data.doubleSide,
        solid: this.data.solid
      })
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
  }
})
