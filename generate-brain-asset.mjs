import fs from 'node:fs';

const source = new URL('./cerebro-oidos.jpg', import.meta.url);
const target = new URL('./brain-image.js', import.meta.url);
const bytes = fs.readFileSync(source);

function jpegDimensions(data) {
  if (data[0] !== 0xff || data[1] !== 0xd8) throw new Error('El archivo no es un JPEG válido.');
  const sizeMarkers = new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
  let offset = 2;
  while (offset < data.length) {
    if (data[offset] !== 0xff) { offset++; continue; }
    while (data[offset] === 0xff) offset++;
    const marker = data[offset++];
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = data.readUInt16BE(offset);
    if (sizeMarkers.has(marker)) {
      return { height: data.readUInt16BE(offset + 3), width: data.readUInt16BE(offset + 5), components: data[offset + 7] };
    }
    offset += length;
  }
  throw new Error('No se han podido leer las dimensiones del JPEG.');
}

const { width, height, components } = jpegDimensions(bytes);
const chunks = bytes.toString('base64').match(/.{1,120}/g) || [];
const moduleText = `// Generado desde cerebro-oidos.jpg mediante generate-brain-asset.mjs.\n` +
  `export const BRAIN_IMAGE = Object.freeze({\n  width: ${width},\n  height: ${height},\n  components: ${components},\n  base64:\n  '${chunks.join("' +\n  '")}'\n});\n`;

fs.writeFileSync(target, moduleText);
console.log(`${width}x${height} · ${components} componentes · ${bytes.length} bytes · ${target.pathname}`);
