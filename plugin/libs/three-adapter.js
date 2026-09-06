// plugin/libs/three-adapter.js
//
// three.js 微信小程序适配层。
// vendor 的 three.js（r160）来自 npm 包 three@0.160.1 的 build/three.cjs（MIT 协议）。
//
// 约定：业务代码一律 require 本文件，不要直接 require('./three.js')——
// 垫片（window/document/self 等）必须先于 three.js 安装。

let boundCanvas = null
let shimsInstalled = false

// 轻量 Blob 实现：仅供 vendor（GLTFLoader）内嵌贴图路径使用，
// 数据挂在 _parts 上由 urlShim.createObjectURL 消费
function WxBlob(parts, options) {
  this._parts = parts || []
  this.type = (options && options.type) || ''
}

function getWindowInfo() {
  return wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
}

// ArrayBuffer -> base64（btoa 优先，其次 wx.arrayBufferToBase64，最后手写）
function arrayBufferToBase64(u8) {
  if (typeof btoa === 'function') {
    let s = ''
    const CHUNK = 0x8000
    for (let i = 0; i < u8.length; i += CHUNK) {
      s += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK))
    }
    return btoa(s)
  }
  if (typeof wx !== 'undefined' && wx.arrayBufferToBase64) {
    return wx.arrayBufferToBase64(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength))
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let out = ''
  for (let i = 0; i < u8.length; i += 3) {
    const b0 = u8[i]
    const b1 = u8[i + 1]
    const b2 = u8[i + 2]
    out += chars[b0 >> 2] + chars[((b0 & 3) << 4) | ((b1 || 0) >> 4)]
    out += b1 === undefined ? '=' : chars[((b1 & 15) << 2) | ((b2 || 0) >> 6)]
    out += b2 === undefined ? '=' : chars[b2 & 63]
  }
  return out
}

function installShims() {
  if (shimsInstalled) return
  shimsInstalled = true

  const win = getWindowInfo()
  const g = globalThis
  // Blob/URL 垫片：GLTFLoader 加载 glb 内嵌贴图时会 new Blob + URL.createObjectURL。
  // vendor 文件构建时已把 Blob/URL 标识符 define 到 __wxThreeShims 上，
  // 全局是否原生存在都不影响 vendor 行为（统一 data:base64 URI）。
  if (typeof g.Blob === 'undefined') {
    g.Blob = WxBlob
  }
  const urlShim = {
    createObjectURL: function(blob) {
      const data = blob && blob._parts && blob._parts[0]
      const u8 = data instanceof Uint8Array ? data : new Uint8Array(data || new ArrayBuffer(0))
      const uri = 'data:' + ((blob && blob.type) || 'application/octet-stream') + ';base64,' + arrayBufferToBase64(u8)
      return uri
    },
    revokeObjectURL: function() {}
  }
  if (typeof g.URL === 'undefined') {
    g.URL = urlShim
  } else if (!g.URL.createObjectURL) {
    g.URL.createObjectURL = urlShim.createObjectURL
    g.URL.revokeObjectURL = urlShim.revokeObjectURL
  }

  // GLTFLoader 内部是 `const URL = self.URL || self.webkitURL` 取的，
  // 所以 window/self 垫片上也挂 URL（固定用 urlShim，与 __wxThreeShims 一致）。
  // requestAnimationFrame/cancelAnimationFrame：three 的 WebGLRenderer.dispose
  // 会经内部 Animation.stop() 调 window.cancelAnimationFrame（r160），
  // 用 setTimeout 实现兜底即可（真正的渲染循环走 canvas.requestAnimationFrame）
  const windowShim = {
    devicePixelRatio: win.pixelRatio || 1,
    innerWidth: win.windowWidth,
    innerHeight: win.windowHeight,
    URL: urlShim,
    webkitURL: urlShim,
    requestAnimationFrame: function(cb) { return setTimeout(cb, 16) },
    cancelAnimationFrame: function(id) { clearTimeout(id) },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {}
  }

  const documentShim = {
    createElementNS(ns, name) {
      if (name === 'img') {
        // ImageLoader/TextureLoader 走到这里，返回带事件桥接的 wx Image
        return createWxImage()
      }
      if (name === 'canvas') {
        return boundCanvas
      }
      throw new Error('three-adapter: document.createElementNS 暂不支持 ' + name)
    },
    createElement(name) {
      return documentShim.createElementNS('', name)
    },
    addEventListener() {},
    removeEventListener() {}
  }

  if (typeof g.window === 'undefined') g.window = windowShim
  if (typeof g.self === 'undefined') g.self = windowShim
  if (typeof g.document === 'undefined') g.document = documentShim
  if (typeof g.Image === 'undefined') {
    g.Image = function Image() { return createWxImage() }
  }
  // TextDecoder 垫片：iOS/安卓真机的 JS 引擎没有这个全局，而 GLTFLoader.parse
  // 里是无守卫的 new TextDecoder（r160），没有它 glb 解析直接抛 ReferenceError
  if (typeof g.TextDecoder === 'undefined') {
    g.TextDecoder = function TextDecoder() {
      this.decode = function(input) {
        const u8 = input instanceof Uint8Array ? input : new Uint8Array(input || [])
        let out = ''
        let i = 0
        // 跳过 UTF-8 BOM
        if (u8.length >= 3 && u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf) i = 3
        while (i < u8.length) {
          const b0 = u8[i]
          if (b0 < 0x80) {
            out += String.fromCharCode(b0)
            i += 1
          } else if (b0 < 0xc0) {
            i += 1 // 无效的延续字节，跳过
          } else if (b0 < 0xe0) {
            out += String.fromCharCode(((b0 & 0x1f) << 6) | (u8[i + 1] & 0x3f))
            i += 2
          } else if (b0 < 0xf0) {
            out += String.fromCharCode(((b0 & 0x0f) << 12) | ((u8[i + 1] & 0x3f) << 6) | (u8[i + 2] & 0x3f))
            i += 3
          } else {
            const cp = ((b0 & 0x07) << 18) | ((u8[i + 1] & 0x3f) << 12) | ((u8[i + 2] & 0x3f) << 6) | (u8[i + 3] & 0x3f)
            const c = cp - 0x10000
            out += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 0x3ff))
            i += 4
          }
        }
        return out
      }
    }
  }

  // 供 vendor 文件重定向的垫片入口。小程序会把每个 JS 模块包进壳函数，
  // 并用参数把 window/document/self/URL 等遮蔽成 undefined——全局垫片在
  // 模块内部不可见。因此 three.js / gltf-loader.js 构建时用 esbuild
  // --define 把这些标识符改写到 __wxThreeShims 上（它不在遮蔽名单内）。
  // 注意：所有入口一律用本适配层的实现。开发者工具的 appservice 是
  // Chromium 环境，存在原生 self/document/URL/Blob——若透传原生实现，
  // vendor 拿 WxBlob 调原生 createObjectURL 会因类型不符报
  // "Overload resolution failed"，且真机与工具行为不一致。
  g.__wxThreeShims = {
    window: windowShim,
    self: windowShim,
    document: documentShim,
    URL: urlShim,
    Blob: WxBlob
  }
}

// wx Image 事件桥接：three r160 的 ImageLoader 用 addEventListener('load'/'error')，
// wx 的 Image 只有 onload/onerror 回调属性。在原生 Image 对象上补事件接口
// （不包一层壳，保证后续 texImage2D 上传时仍是原生 Image 实例）
function createWxImage() {
  const img = boundCanvas ? boundCanvas.createImage() : wx.createImage()
  if (typeof img.addEventListener === 'function') return img
  const listeners = {}
  img.addEventListener = function(type, fn) {
    (listeners[type] = listeners[type] || []).push(fn)
    if (type === 'load') {
      img.onload = function() {
        const arr = listeners.load || []
        for (let i = 0; i < arr.length; i++) arr[i]({ type: 'load', target: img })
      }
    } else if (type === 'error') {
      img.onerror = function(e) {
        const arr = listeners.error || []
        for (let i = 0; i < arr.length; i++) arr[i]({ type: 'error', target: img })
      }
    }
  }
  img.removeEventListener = function(type, fn) {
    const arr = listeners[type] || []
    const i = arr.indexOf(fn)
    if (i >= 0) arr.splice(i, 1)
  }
  img.dispatchEvent = function() { return true }
  return img
}

// 给 canvas 节点补齐 three.js 会触到的 DOM 接口
function patchCanvas(canvas) {
  boundCanvas = canvas
  if (!canvas.style) canvas.style = {}
  if (!canvas.addEventListener) {
    canvas.addEventListener = function() {}
    canvas.removeEventListener = function() {}
  }
  if (!canvas.dispatchEvent) canvas.dispatchEvent = function() {}
  if (!canvas.getBoundingClientRect) {
    canvas.getBoundingClientRect = function() {
      const win = getWindowInfo()
      return {
        left: 0,
        top: 0,
        right: win.windowWidth,
        bottom: win.windowHeight,
        width: win.windowWidth,
        height: win.windowHeight
      }
    }
  }
  return canvas
}

// 默认优先 WebGL2（基础库 2.24.0+），拿不到再回退 WebGL1（r160 仍支持）
function createContext(canvas, preferWebGL2) {
  let gl = null
  let isWebGL2 = false
  if (preferWebGL2) {
    try {
      gl = canvas.getContext('webgl2')
    } catch (e) {
      gl = null
    }
    isWebGL2 = !!gl
  }
  if (!gl) {
    gl = canvas.getContext('webgl', { antialias: true, alpha: true })
  }
  if (!gl) {
    throw new Error('three-adapter: 无法创建 WebGL 上下文')
  }
  return { gl: gl, isWebGL2: isWebGL2 }
}

function createRenderer(canvas, options) {
  patchCanvas(canvas)
  const opts = options || {}
  const ctxInfo = createContext(canvas, opts.preferWebGL2 !== false)
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    context: ctxInfo.gl,
    antialias: opts.antialias !== false
  })
  console.log('[three-adapter] three r' + THREE.REVISION + ' · WebGL' + (ctxInfo.isWebGL2 ? '2' : '1'))
  return { renderer: renderer, gl: ctxInfo.gl, isWebGL2: ctxInfo.isWebGL2 }
}

installShims()
const THREE = require('./three.js')

module.exports = {
  THREE: THREE,
  getWindowInfo: getWindowInfo,
  patchCanvas: patchCanvas,
  createRenderer: createRenderer
}
