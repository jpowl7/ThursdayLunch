import { writeFileSync, mkdirSync } from "fs";
import { deflateSync } from "zlib";

function createPNG(size) {
  // Create raw pixel data (RGBA)
  const pixels = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = 249;     // R (orange #f97316)
    pixels[i * 4 + 1] = 115; // G
    pixels[i * 4 + 2] = 22;  // B
    pixels[i * 4 + 3] = 255; // A
  }

  // Add filter byte (0) to each row
  const filtered = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    filtered[y * (size * 4 + 1)] = 0; // filter type: None
    pixels.copy(filtered, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const compressed = deflateSync(filtered);

  // Build PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk("IHDR", ihdr);

  // IDAT
  const idatChunk = makeChunk("IDAT", compressed);

  // IEND
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", createPNG(192));
writeFileSync("public/icons/icon-512.png", createPNG(512));
console.log("Icons generated!");
