const fs = require('fs');
const buf = fs.readFileSync('028023_mx5mx52016.blap');

console.log('=== FIRST 10 SAMPLES (FULL DETAIL) ===\n');

const samples = [];
const startOffset = 0x658;

for (let i = startOffset; i < buf.length - 28; i++) {
  if (buf[i+1] === 0x00 && buf[i+2] === 0xFF) {
    samples.push({
      offset: i,
      flag1: buf[i],
      flag2: buf[i+1],
      flag3: buf[i+2],
      flag4: buf[i+3],
      lapDist: buf.readFloatLE(i + 4),
      f2: buf.readFloatLE(i + 8),
      heading: buf.readFloatLE(i + 12),
      f4: buf.readFloatLE(i + 16),
      f5: buf.readFloatLE(i + 20),
      f6: buf.readFloatLE(i + 24)
    });
    i += 27;
    if (samples.length >= 10) break;
  }
}

for (let i = 0; i < samples.length; i++) {
  const s = samples[i];
  const distMeters = s.lapDist * 100;
  const headingDeg = s.heading * (180 / Math.PI);
  
  console.log(`Sample ${i}:`);
  console.log(`  Offset: 0x${s.offset.toString(16)}`);
  console.log(`  Flags: [0x${s.flag1.toString(16).padStart(2,'0')} 0x${s.flag2.toString(16).padStart(2,'0')} 0x${s.flag3.toString(16).padStart(2,'0')} 0x${s.flag4.toString(16).padStart(2,'0')}]`);
  console.log(`  lapDist: ${s.lapDist.toFixed(6)} (${distMeters.toFixed(2)}m)`);
  console.log(`  f2 (X?): ${s.f2.toFixed(6)}`);
  console.log(`  heading: ${s.heading.toFixed(6)} rad (${headingDeg.toFixed(2)}°)`);
  console.log(`  f4 (Z?): ${s.f4.toFixed(6)}`);
  console.log(`  f5 (roll/steer?): ${s.f5.toFixed(6)}`);
  console.log(`  f6 (unused): ${s.f6.toFixed(6)}`);
  console.log();
}

// Show hex of first sample
console.log('=== HEX OF FIRST SAMPLE ===\n');
const firstSample = buf.slice(0x658, 0x658 + 28);
console.log(firstSample.toString('hex').match(/.{1,32}/g).join('\n'));
console.log();
console.log('Breakdown:');
console.log(`  00-03: ${firstSample.slice(0, 4).toString('hex')} (flags)`);
console.log(`  04-07: ${firstSample.slice(4, 8).toString('hex')} (lapDist)`);
console.log(`  08-11: ${firstSample.slice(8, 12).toString('hex')} (f2)`);
console.log(`  12-15: ${firstSample.slice(12, 16).toString('hex')} (heading)`);
console.log(`  16-19: ${firstSample.slice(16, 20).toString('hex')} (f4)`);
console.log(`  20-23: ${firstSample.slice(20, 24).toString('hex')} (f5)`);
console.log(`  24-27: ${firstSample.slice(24, 28).toString('hex')} (f6)`);
