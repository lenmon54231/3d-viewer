// plugin/libs/three-viewer.js
// 可复用的 3D 查看器核心：插件页面（全屏演示）和公开组件（three-viewer）共用。
// 职责：初始化渲染管线、加载 glb 模型（wx.request + parse）、动画播放、触摸轨道手势。
const adapter = require('./three-adapter.js')
const THREE = adapter.THREE
const { GLTFLoader } = require('./gltf-loader.js')
const { RoomEnvironment } = require('./room-environment.js')

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

class ThreeViewer {
  /**
   * @param {Object} canvas  type="webgl" 的 canvas 节点
   * @param {Object} options { width, height, src, background, autoplay, onLoad, onError }
   */
  constructor(canvas, options) {
    const opts = options || {}
    this._canvas = canvas
    this._onLoad = opts.onLoad || null
    this._onError = opts.onError || null
    this._autoplay = opts.autoplay !== false
    this._running = false
    this._mixer = null
    this._gesture = null

    const win = adapter.getWindowInfo()
    const renderer = adapter.createRenderer(canvas).renderer
    this._renderer = renderer
    const width = opts.width || win.windowWidth
    const height = opts.height || win.windowHeight
    renderer.setPixelRatio(win.pixelRatio || 1)
    renderer.setSize(width, height, false)
    renderer.toneMapping = THREE.ACESFilmicToneMapping

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(opts.background || 0x1a1c22)
    this._scene = scene

    // PBR 环境光照：金属/粗糙材质没有环境贴图会发黑
    try {
      const pmrem = new THREE.PMREMGenerator(renderer)
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      pmrem.dispose()
    } catch (e) {
      console.warn('three-viewer: 环境贴图生成失败，回退基础光照', e && e.message)
      scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    }
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
    dirLight.position.set(3, 4, 2)
    scene.add(dirLight)

    this._camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    this._target = new THREE.Vector3(0, 0, 0)
    this._orbit = { radius: 3, theta: Math.PI / 4, phi: Math.PI / 2.4 }
    this.updateCamera()

    this._clock = new THREE.Clock()
    this.resume()

    if (opts.src) this.load(opts.src)
  }

  load(url) {
    wx.showLoading({ title: '加载模型' })
    wx.request({
      url: url,
      responseType: 'arraybuffer',
      success: (res) => {
        new GLTFLoader().parse(
          res.data,
          '',
          (gltf) => {
            wx.hideLoading()
            this._onModelLoaded(gltf)
          },
          (err) => {
            wx.hideLoading()
            this._fail('gltf 解析失败: ' + ((err && err.message) || err))
          }
        )
      },
      fail: (err) => {
        wx.hideLoading()
        this._fail('模型下载失败: ' + ((err && err.errMsg) || err))
      }
    })
  }

  setBackground(color) {
    if (this._scene) this._scene.background = new THREE.Color(color)
  }

  pause() {
    this._running = false
  }

  resume() {
    if (this._running) return
    this._running = true
    this._clock.getDelta()
    const loop = () => {
      if (!this._running) return
      const dt = this._clock.getDelta()
      if (this._mixer) this._mixer.update(dt)
      this._renderer.render(this._scene, this._camera)
      this._canvas.requestAnimationFrame(loop)
    }
    loop()
  }

  destroy() {
    this._running = false
    this._mixer = null
    this._renderer.dispose()
  }

  _fail(msg) {
    console.error('three-viewer:', msg)
    if (this._onError) this._onError({ message: msg })
  }

  _onModelLoaded(gltf) {
    const model = gltf.scene
    // 包围盒归一化：居中 + 缩放到约 2 个单位，相机轨道参数按此设定
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    const scale = 2 / maxDim
    model.scale.setScalar(scale)
    model.position.copy(center).multiplyScalar(-scale)

    this._scene.add(model)

    this._mixer = null
    if (this._autoplay && gltf.animations && gltf.animations.length) {
      this._mixer = new THREE.AnimationMixer(model)
      this._mixer.clipAction(gltf.animations[0]).play()
    }
    if (this._onLoad) {
      this._onLoad({ animations: (gltf.animations || []).length })
    }
  }

  // ---- 触摸轨道手势：单指旋转、双指缩放 ----
  handleTouch(phase, e) {
    if (phase === 'start') {
      if (e.touches.length === 1) {
        this._gesture = 'rotate'
        this._last = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      } else if (e.touches.length >= 2) {
        this._gesture = 'pinch'
        this._lastPinch = this._touchDist(e.touches)
      }
    } else if (phase === 'move') {
      if (this._gesture === 'rotate' && e.touches.length === 1 && this._last) {
        const dx = e.touches[0].clientX - this._last.x
        const dy = e.touches[0].clientY - this._last.y
        this._last = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        this._orbit.theta -= dx * 0.008
        this._orbit.phi = clamp(this._orbit.phi - dy * 0.008, 0.15, Math.PI - 0.15)
        this.updateCamera()
      } else if (this._gesture === 'pinch' && e.touches.length >= 2) {
        const d = this._touchDist(e.touches)
        if (this._lastPinch > 0 && d > 0) {
          this._orbit.radius = clamp(this._orbit.radius * (this._lastPinch / d), 1.2, 10)
          this.updateCamera()
        }
        this._lastPinch = d
      }
    } else if (phase === 'end') {
      if (e.touches.length === 0) {
        this._gesture = null
      } else if (e.touches.length === 1) {
        this._gesture = 'rotate'
        this._last = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      } else {
        this._lastPinch = this._touchDist(e.touches)
      }
    }
  }

  _touchDist(ts) {
    const dx = ts[0].clientX - ts[1].clientX
    const dy = ts[0].clientY - ts[1].clientY
    return Math.sqrt(dx * dx + dy * dy) || 1
  }

  updateCamera() {
    const o = this._orbit
    const sinPhi = Math.sin(o.phi)
    this._camera.position.set(
      o.radius * sinPhi * Math.sin(o.theta),
      o.radius * Math.cos(o.phi),
      o.radius * sinPhi * Math.cos(o.theta)
    )
    this._camera.lookAt(this._target)
  }
}

module.exports = { ThreeViewer }
