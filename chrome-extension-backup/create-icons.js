// Node.js 스크립트로 아이콘 생성
const fs = require('fs');
const { createCanvas } = require('canvas');

// canvas 패키지가 없다면 간단한 PNG 생성
function createSimplePNG(size) {
  // PNG 헤더
  const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR 청크 (이미지 헤더)
  const width = Buffer.alloc(4);
  width.writeUInt32BE(size);
  const height = Buffer.alloc(4);
  height.writeUInt32BE(size);
  const bitDepth = Buffer.from([8]); // 8비트
  const colorType = Buffer.from([2]); // RGB
  const compression = Buffer.from([0]);
  const filter = Buffer.from([0]);
  const interlace = Buffer.from([0]);
  
  const ihdrData = Buffer.concat([width, height, bitDepth, colorType, compression, filter, interlace]);
  const ihdrLength = Buffer.alloc(4);
  ihdrLength.writeUInt32BE(ihdrData.length);
  const ihdrType = Buffer.from('IHDR');
  
  // 간단한 파란색 이미지 데이터
  const pixelData = [];
  for (let y = 0; y < size; y++) {
    pixelData.push(0); // 필터 타입
    for (let x = 0; x < size; x++) {
      pixelData.push(25, 118, 210); // RGB: #1976d2
    }
  }
  
  const imageData = Buffer.from(pixelData);
  
  // zlib 압축 (간단한 무압축)
  const compressedData = Buffer.concat([
    Buffer.from([0x78, 0x01]), // zlib 헤더
    imageData,
    Buffer.from([0x00, 0x00, 0x00, 0x00]) // Adler32 (임시)
  ]);
  
  // IDAT 청크
  const idatLength = Buffer.alloc(4);
  idatLength.writeUInt32BE(compressedData.length);
  const idatType = Buffer.from('IDAT');
  
  // IEND 청크
  const iendLength = Buffer.alloc(4);
  iendLength.writeUInt32BE(0);
  const iendType = Buffer.from('IEND');
  
  // 전체 PNG 조합
  return Buffer.concat([
    PNG_SIGNATURE,
    ihdrLength, ihdrType, ihdrData, Buffer.alloc(4), // CRC 임시
    idatLength, idatType, compressedData, Buffer.alloc(4), // CRC 임시
    iendLength, iendType, Buffer.alloc(4) // CRC 임시
  ]);
}

// 더 간단한 방법: base64 인코딩된 1x1 파란색 PNG
const blue1x1PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// 각 크기별로 아이콘 생성
[16, 48, 128].forEach(size => {
  const filename = `images/icon${size}.png`;
  // 1x1 PNG를 저장 (브라우저가 자동으로 크기 조정)
  fs.writeFileSync(filename, Buffer.from(blue1x1PNG, 'base64'));
  console.log(`Created ${filename}`);
});