// Generates resources/icon.png (256px) and resources/tray.png (32px).
// A rounded indigo square with a white "audio meter" glyph — no image deps.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'resources')
mkdirSync(outDir, { recursive: true })

const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw)
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

function makeIcon(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const bg = [79, 70, 229, 255] // #4F46E5 indigo
  const white = [255, 255, 255, 255]
  const r = size * 0.22
  const heights = [0.45, 0.85, 0.6, 0.9]
  const nBars = heights.length
  const barW = size * 0.1
  const gap = size * 0.06
  const totalW = nBars * barW + (nBars - 1) * gap
  const startX = (size - totalW) / 2

  const inRounded = (x, y) => {
    const lo = r
    const hi = size - 1 - r
    const cx = Math.min(Math.max(x, lo), hi)
    const cy = Math.min(Math.max(y, lo), hi)
    if (x >= lo && x <= hi) return y >= 0 && y <= size - 1
    if (y >= lo && y <= hi) return x >= 0 && x <= size - 1
    const dx = x - cx
    const dy = y - cy
    return dx * dx + dy * dy <= r * r
  }

  const inBar = (x, y) => {
    for (let i = 0; i < nBars; i++) {
      const bx = startX + i * (barW + gap)
      const h = heights[i] * size * 0.5
      const by = (size - h) / 2
      if (x >= bx && x < bx + barW && y >= by && y < by + h) return true
    }
    return false
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!inRounded(x, y)) continue
      const col = inBar(x, y) ? white : bg
      const idx = (y * size + x) * 4
      rgba[idx] = col[0]
      rgba[idx + 1] = col[1]
      rgba[idx + 2] = col[2]
      rgba[idx + 3] = col[3]
    }
  }
  return encodePNG(size, rgba)
}

writeFileSync(join(outDir, 'icon.png'), makeIcon(256))
writeFileSync(join(outDir, 'tray.png'), makeIcon(32))
console.log('Generated resources/icon.png (256) and resources/tray.png (32)')
