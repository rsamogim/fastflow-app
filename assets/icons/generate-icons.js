/**
 * Gerador de ícones PNG para o FastFlow PWA utilizando apenas Node.js nativo (zlib).
 * Cria ícones 192x192 e 512x512 em PNG padrão e maskable.
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  const crcTarget = Buffer.concat([Buffer.from(type), data]);
  buf.writeUInt32BE(crc32(crcTarget), 8 + len);
  return buf;
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // Scanlines com byte de filtro 0
  const rowBytes = width * 4;
  const filtered = Buffer.alloc(height * (rowBytes + 1));
  for (let y = 0; y < height; y++) {
    const filterOffset = y * (rowBytes + 1);
    filtered[filterOffset] = 0; // Filter 0 (None)
    const srcOffset = y * rowBytes;
    rgbaBuffer.copy(filtered, filterOffset + 1, srcOffset, srcOffset + rowBytes);
  }

  // IDAT (Deflate)
  const compressed = zlib.deflateSync(filtered, { level: 9 });
  const idat = makeChunk('IDAT', compressed);

  // IEND
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function drawFastFlowIcon(size, isMaskable = false) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const cornerRadius = isMaskable ? 0 : size * 0.22;
  const ringRadius = size * (isMaskable ? 0.28 : 0.32);
  const ringThickness = size * 0.055;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Cantos arredondados (squircle suave) se não for maskable
      let insideShape = true;
      if (!isMaskable && cornerRadius > 0) {
        const dx = Math.max(0, Math.abs(x - cx) - (cx - cornerRadius));
        const dy = Math.max(0, Math.abs(y - cy) - (cy - cornerRadius));
        insideShape = (dx * dx + dy * dy) <= (cornerRadius * cornerRadius);
      }

      if (!insideShape) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Cor de fundo #12151B
      let r = 18, g = 21, b = 27, a = 255;

      const dist = Math.hypot(x - cx, y - cy);

      // Anel circular
      const distFromRing = Math.abs(dist - ringRadius);
      if (distFromRing <= ringThickness) {
        const angle = Math.atan2(y - cy, x - cx); // -PI to PI
        // Progresso do anel (75% preenchido)
        if (angle > -Math.PI * 0.75) {
          // Verde menta #00E0A4 com gradiente
          const t = (angle + Math.PI * 0.75) / (Math.PI * 1.75);
          r = Math.round(0 + t * 5);
          g = Math.round(224 - t * 30);
          b = Math.round(164 - t * 30);
        } else {
          // Trilho #1F242E
          r = 31; g = 36; b = 46;
        }
      }

      // Chama central estilizada
      const flameDx = (x - cx) / (size * 0.18);
      const flameDy = (y - cy) / (size * 0.22);
      if (flameDy >= -1.0 && flameDy <= 1.0) {
        const widthAtY = (1.0 - flameDy) * 0.6 * (1.0 + 0.3 * Math.sin(flameDy * Math.PI));
        if (Math.abs(flameDx) <= widthAtY && flameDy > -0.7) {
          // Verde menta vibrante no topo, transição para âmbar
          if (flameDy > 0.1 && Math.abs(flameDx) < widthAtY * 0.45) {
            // Núcleo âmbar dourado #FFB547
            r = 255; g = 181; b = 71;
          } else {
            r = 0; g = 224; b = 164;
          }
        }
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }

  return encodePNG(size, size, buf);
}

const iconsDir = path.resolve('assets', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Gera os 4 ícones requeridos
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), drawFastFlowIcon(192, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), drawFastFlowIcon(512, false));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), drawFastFlowIcon(192, true));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), drawFastFlowIcon(512, true));

console.log('✅ Ícones PWA gerados com sucesso em assets/icons/');
