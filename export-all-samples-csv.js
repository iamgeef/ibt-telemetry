const fs = require('fs');
const filename = process.argv[2] || '028023_mx5mx52016.blap';
const buf = fs.readFileSync(filename);

// Find first valid sample (look for FF 00 FF pattern)
let startOffset = 0x658;
for (let i = 0x600; i < 0x800; i++) {
  if (buf[i] === 0xFF && buf[i+1] === 0x00 && buf[i+2] === 0xFF) {
    const dist = buf.readFloatLE(i + 4);
    // Check if distance looks reasonable (between 0 and 100)
    if (dist >= 0 && dist < 100) {
      startOffset = i;
      break;
    }
  }
}

console.error(`Starting at offset: 0x${startOffset.toString(16)}`);

// Extract all samples
const samples = [];

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
  }
}

// CSV Header
console.log('index,offset_hex,flag1,flag2,flag3,flag4,lapDist_raw,lapDist_m,lapDist_km,f2_x,heading_rad,heading_deg,f4_z,f5_roll_steer,f6_unused');

// CSV Data
for (let i = 0; i < samples.length; i++) {
  const s = samples[i];
  const distMeters = s.lapDist * 100;
  const distKm = s.lapDist / 10;
  const headingDeg = s.heading * (180 / Math.PI);
  
  console.log(
    `${i},` +
    `0x${s.offset.toString(16)},` +
    `${s.flag1},` +
    `${s.flag2},` +
    `${s.flag3},` +
    `${s.flag4},` +
    `${s.lapDist.toFixed(6)},` +
    `${distMeters.toFixed(2)},` +
    `${distKm.toFixed(6)},` +
    `${s.f2.toFixed(6)},` +
    `${s.heading.toFixed(6)},` +
    `${headingDeg.toFixed(2)},` +
    `${s.f4.toFixed(6)},` +
    `${s.f5.toFixed(6)},` +
    `${s.f6.toFixed(6)}`
  );
}

// Write summary to stderr so it doesn't interfere with CSV
console.error(`\nExported ${samples.length} samples`);
console.error(`Distance range: ${(samples[0].lapDist * 100).toFixed(2)}m to ${(samples[samples.length-1].lapDist * 100).toFixed(2)}m`);
console.error(`Total lap distance: ${((samples[samples.length-1].lapDist - samples[0].lapDist) * 100).toFixed(2)}m (${((samples[samples.length-1].lapDist - samples[0].lapDist) / 10).toFixed(3)}km)`);
