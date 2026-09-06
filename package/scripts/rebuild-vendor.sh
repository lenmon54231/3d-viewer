#!/usr/bin/env bash
# 重建 miniprogram_dist/libs 下的 vendor 文件（three.js r160 + GLTFLoader 全家桶）。
#
# 背景说明（为什么有这些构建参数）：
# 小程序会把每个 JS 模块包进壳函数，window/document/self/URL/fetch 等浏览器
# 全局名是壳函数的参数，模块内部一律为 undefined（全局垫片不可见）。
# 因此构建时用 esbuild --define 把这些标识符改写到 three-adapter 暴露的
# __wxThreeShims 入口上。此外开发者工具 appservice 是 Chromium 环境，
# 存在原生 createImageBitmap 会让 GLTFLoader 选用 ImageBitmapLoader（依赖
# fetch），故强制定义为 undefined，统一走 TextureLoader + wx Image。
set -e

R160=https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160
DIST="$(cd "$(dirname "$0")/.." && pwd)/miniprogram_dist/libs"
TMP=$(mktemp -d)

echo "==> 下载源码到 $TMP"
curl -fsSL "https://unpkg.com/three@0.160.1/build/three.cjs" -o "$TMP/three.cjs"
curl -fsSL "$R160/examples/jsm/loaders/GLTFLoader.js" -o "$TMP/GLTFLoader.js"
curl -fsSL "$R160/examples/jsm/utils/BufferGeometryUtils.js" -o "$TMP/BufferGeometryUtils.js"
curl -fsSL "$R160/examples/jsm/environments/RoomEnvironment.js" -o "$TMP/RoomEnvironment.js"

echo "==> ESM -> CJS 转换"
HERE="$(cd "$(dirname "$0")" && pwd)"
node "$HERE/transform-jsm.js" "$TMP/GLTFLoader.js" gltf > "$TMP/cjs-GLTFLoader.js"
node "$HERE/transform-jsm.js" "$TMP/BufferGeometryUtils.js" bgu > "$TMP/cjs-BufferGeometryUtils.js"
node "$HERE/transform-jsm.js" "$TMP/RoomEnvironment.js" room > "$TMP/cjs-RoomEnvironment.js"

echo "==> esbuild 压缩 + 标识符重定向"
DEFS="--define:window=__wxThreeShims.window --define:self=__wxThreeShims.self --define:document=__wxThreeShims.document --define:URL=__wxThreeShims.URL --define:Blob=__wxThreeShims.Blob"
npx -y esbuild@0.24.0 "$TMP/three.cjs" --minify --target=es2015 --format=cjs $DEFS --outfile="$DIST/three.js"
npx -y esbuild@0.24.0 "$TMP/cjs-GLTFLoader.js" --minify --target=es2015 --format=cjs $DEFS --define:createImageBitmap=undefined --outfile="$DIST/gltf-loader.js"
npx -y esbuild@0.24.0 "$TMP/cjs-BufferGeometryUtils.js" --minify --target=es2015 --format=cjs --define:window=__wxThreeShims.window --define:self=__wxThreeShims.self --define:document=__wxThreeShims.document --outfile="$DIST/buffer-geometry-utils.js"
npx -y esbuild@0.24.0 "$TMP/cjs-RoomEnvironment.js" --minify --target=es2015 --format=cjs --define:window=__wxThreeShims.window --define:self=__wxThreeShims.self --define:document=__wxThreeShims.document --outfile="$DIST/room-environment.js"

echo "==> 完成："
ls -la "$DIST"
rm -rf "$TMP"
