Page({
  data: {
    modelUrl: 'https://limengtupian.oss-cn-beijing.aliyuncs.com/a-model/rolex.glb'
  },

  onViewerLoad(e) {
    console.log('[host] three-viewer load', e.detail)
  },

  onViewerError(e) {
    console.error('[host] three-viewer error', e.detail)
  }
})
