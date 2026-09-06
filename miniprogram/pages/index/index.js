Page({
  data: {
    modelUrl: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/Parrot.glb'
  },

  onViewerLoad(e) {
    console.log('[host] three-viewer load', e.detail)
  },

  onViewerError(e) {
    console.error('[host] three-viewer error', e.detail)
  }
})
