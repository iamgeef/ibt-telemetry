const fs = require('fs');
const buf = fs.readFileSync('028023_mx5mx52016.blap');

// Find FF 00 FF patterns
const positions = [];
for (let i = 0; i < buf.length - 3; i++) {
  if (buf[i] === 0xFF && buf[i+1] === 0x00 && buf[i+2] === 0xFF) {
    positions.push(i);
  }
}

console.log('Examining samples with large gaps...\n');

// Find samples with stride > 28
let gapCount = 0;
for (let i = 1; i < positions.length && gapCount < 10; i++) {
  const stride = positions[i] - positions[i-1];
  if (stride > 28) {
    gapCount++;
    const gapStart = positions[i-1] + 28;
    const gapEnd = positions[i];
    const gapSize = gapEnd - gapStart;
    
    console.log(`Gap ${gapCount} between sample ${i-1} and ${i}:`);
    console.log(`  Previous sample at: 0x${positions[i-1].toString(16)}`);
    console.log(`  Next sample at: 0x${positions[i].toString(16)}`);
    console.log(`  Gap size: ${gapSize} bytes`);
    
    // Show first 64 bytes of the gap
    const preview = buf.slice(gapStart, Math.min(gapStart + 64, gapEnd));
    console.log(`  Gap content (first 64 bytes):`);
    console.log(`  ${preview.toString('hex').match(/.{1,32}/g).join('\n  ')}`);
    
    // Check if it's all zeros
    let allZeros = true;
    for (let j = gapStart; j < gapEnd; j++) {
      if (buf[j] !== 0) {
        allZeros = false;
        break;
      }
    }
    console.log(`  All zeros: ${allZeros}`);
    console.log();
  }
}
