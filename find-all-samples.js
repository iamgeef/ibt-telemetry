const fs = require('fs');
const buf = fs.readFileSync('028023_mx5mx52016.blap');

console.log('Searching for pattern: ?? 00 FF 0? (variable first byte, always 00 FF, variable 4th byte)\n');

const samples = [];
const startOffset = 0x658;

for (let i = startOffset; i < buf.length - 28; i++) {
  // Look for pattern: ?? 00 FF ??
  if (buf[i+1] === 0x00 && buf[i+2] === 0xFF) {
    samples.push({
      offset: i,
      flag1: buf[i],
      flag2: buf[i+1],
      flag3: buf[i+2],
      flag4: buf[i+3],
      distance: buf.readFloatLE(i+4)
    });
    // Skip ahead by 28 bytes to next potential sample
    i += 27; // Will be incremented to 28 by loop
  }
}

console.log(`Found ${samples.length} samples using pattern ?? 00 FF ??\n`);

// Show first 10
console.log('First 10 samples:');
for (let i = 0; i < Math.min(10, samples.length); i++) {
  const s = samples[i];
  console.log(`  ${i}: offset=0x${s.offset.toString(16)} flags=[${s.flag1.toString(16).padStart(2,'0')} ${s.flag2.toString(16).padStart(2,'0')} ${s.flag3.toString(16).padStart(2,'0')} ${s.flag4.toString(16).padStart(2,'0')}] dist=${s.distance.toFixed(6)}km`);
}

console.log('\nLast 10 samples:');
for (let i = Math.max(0, samples.length - 10); i < samples.length; i++) {
  const s = samples[i];
  console.log(`  ${i}: offset=0x${s.offset.toString(16)} flags=[${s.flag1.toString(16).padStart(2,'0')} ${s.flag2.toString(16).padStart(2,'0')} ${s.flag3.toString(16).padStart(2,'0')} ${s.flag4.toString(16).padStart(2,'0')}] dist=${s.distance.toFixed(6)}km`);
}

// Analyze distance range
console.log('\n=== DISTANCE ANALYSIS ===');
console.log(`First distance: ${samples[0].distance.toFixed(6)} km`);
console.log(`Last distance: ${samples[samples.length-1].distance.toFixed(6)} km`);
console.log(`Total range: ${(samples[samples.length-1].distance - samples[0].distance).toFixed(6)} km`);

const trackLength = 3.67; // km
const fastestLap = 94.075; // seconds
const sampleRate = 60; // Hz
const duration = samples.length / sampleRate;

console.log('\n=== TIME vs DISTANCE ===');
console.log(`Samples: ${samples.length}`);
console.log(`Duration at 60Hz: ${duration.toFixed(3)} seconds`);
console.log(`Fastest lap time: ${fastestLap} seconds`);
console.log(`Coverage: ${(duration / fastestLap * 100).toFixed(1)}% of one lap`);

console.log('\n=== FLAG DISTRIBUTION ===');
const flag1Counts = {};
const flag4Counts = {};
for (const s of samples) {
  flag1Counts[s.flag1] = (flag1Counts[s.flag1] || 0) + 1;
  flag4Counts[s.flag4] = (flag4Counts[s.flag4] || 0) + 1;
}
console.log('Flag1 distribution:', Object.entries(flag1Counts).map(([k,v]) => `0x${parseInt(k).toString(16)}:${v}`).join(', '));
console.log('Flag4 distribution:', Object.entries(flag4Counts).map(([k,v]) => `0x${parseInt(k).toString(16)}:${v}`).join(', '));
