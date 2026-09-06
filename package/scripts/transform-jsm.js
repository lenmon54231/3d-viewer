// 把 three.js r160 examples/jsm 的 ESM 源码转成小程序可用的 CommonJS。
// 用法：node transform-jsm.js <输入文件> <类型：gltf|bgu|room>
// 产物输出到 stdout。
const fs = require('fs')

const HEADER = "// vendored from three.js r160 (MIT License)\nconst THREE = require('./three-adapter.js').THREE;\n"

function transformThreeImport(src) {
  return src.replace(/^import\s*(\{[\s\S]*?\})\s*from\s*'three';/m, (m, names) => {
    return 'const ' + names.replace(/\s+/g, ' ') + ' = THREE;'
  })
}

function transform(src, kind) {
  src = transformThreeImport(src)
  if (kind === 'gltf') {
    src = src.replace(
      /^import \{ toTrianglesDrawMode \} from '\.\.\/utils\/BufferGeometryUtils\.js';/m,
      "const { toTrianglesDrawMode } = require('./buffer-geometry-utils.js');"
    )
    src = src.replace(/^export \{ GLTFLoader \};/m, 'module.exports = { GLTFLoader };')
  } else if (kind === 'bgu') {
    src = src.replace(/^export (function|const|class)/gm, '$1')
    src = src.replace(/^export\s*\{[\s\S]*?\};/m, (m) => {
      const names = m.slice(m.indexOf('{') + 1, m.lastIndexOf('}'))
        .split(',').map((s) => s.trim()).filter(Boolean).join(', ')
      return 'module.exports = { ' + names + ' };'
    })
  } else if (kind === 'room') {
    src = src.replace(/^export \{ RoomEnvironment \};/m, 'module.exports = { RoomEnvironment };')
  }
  return HEADER + src
}

const [file, kind] = process.argv.slice(2)
if (!file || !kind) {
  console.error('用法: node transform-jsm.js <file> <gltf|bgu|room>')
  process.exit(1)
}
process.stdout.write(transform(fs.readFileSync(file, 'utf8'), kind))
