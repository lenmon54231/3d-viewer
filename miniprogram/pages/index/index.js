const OSS = 'https://limengtupian.oss-cn-beijing.aliyuncs.com/a-model'

// 模型展示台：每个模型一套渲染预设
//  lightRig: product=产品三点布光 / soft=半球柔光（建筑/大场景）
//  envIntensity: 环境反射强度（金属/光滑材质的关键）
//  doubleSide: 双面渲染（建筑薄壁模型内壁不穿帮）
//  solid: 归零透射（把玻璃质感转为实体展示）
const MODELS = [
  {
    key: 'rolex',
    name: '腕表',
    url: OSS + '/rolex.glb',
    lightRig: 'product',
    exposure: 1.2,
    envIntensity: 1.4,
    background: '#1a1c22'
  },
  {
    key: 'bronze',
    name: '青铜器',
    url: OSS + '/bronze.glb',
    lightRig: 'product',
    exposure: 1.2,
    envIntensity: 1.6,
    solid: true,
    background: '#1a1c22'
  },
  {
    key: 'house',
    name: '建筑白模',
    url: OSS + '/house.glb',
    lightRig: 'soft',
    exposure: 1.25,
    envIntensity: 1.0,
    doubleSide: true,
    background: '#22262c'
  }
]

Page({
  data: {
    models: MODELS,
    current: 0,
    active: MODELS[0]
  },

  switchModel(e) {
    const idx = e.currentTarget.dataset.index
    if (idx === this.data.current) return
    this.setData({ current: idx, active: MODELS[idx] })
  },

  onViewerLoad(e) {
    console.log('[host] three-viewer load', e.detail)
  },

  onViewerError(e) {
    console.error('[host] three-viewer error', e.detail)
  }
})
