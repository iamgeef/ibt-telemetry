const fs = require('fs');

const buf = fs.readFileSync('028023_mx5mx52016.blap');
const trackLength = 3.67; // km

console.log('=== FINDING SAMPLE STRUCTURE ===\n');

// Find all FF 00 FF patterns
const positions = [];
for (let i = 0; i < buf.length - 3; i++) {
  if (buf[i] === 0xFF && buf[i+1] === 0x00 && buf[i+2] === 0xFF) {
    positions.push(i);
  }
}

console.log('Total FF 00 FF patterns:', positions.length);

// Analyze strides
const strides = [];
for (let i = 1; i < positions.length; i++) {
  strides.push(positions[i] - positions[i-1]);
}

const uniqueStrides = [...new Set(strides)];
console.log('Unique stride values:', uniqueStrides.sort((a,b) => a-b));
console.log();

// Show first few and last few
console.log('First 5 patterns:');
for (let i = 0; i < Math.min(5, positions.length); i++) {
  const stride = i > 0 ? positions[i] - positions[i-1] : 0;
  console.log(`  ${i}: offset 0x${positions[i].toString(16)} stride=${stride}`);
}

console.log('\nLast 5 patterns:');
for (let i = Math.max(0, positions.length - 5); i < positions.length; i++) {
  const stride = i > 0 ? positions[i] - positions[i-1] : 0;
  console.log(`  ${i}: offset 0x${positions[i].toString(16)} stride=${stride}`);
}

// Now let's test the distance-sampled vs time-sampled hypothesis
console.log('\n=== TESTING DISTANCE vs TIME SAMPLING ===\n');

// Read samples assuming they start at first FF 00 FF pattern
const samples = [];
for (let i = 0; i < positions.length; i++) {
  const offset = positions[i];
  // Make sure we have enough bytes
  if (offset + 28 > buf.length) {
    console.log(`Skipping sample ${i} at offset 0x${offset.toString(16)} (too close to end)`);
    break;
  }
  const sample = {
    flags: [buf[offset], buf[offset+1], buf[offset+2], buf[offset+3]],
    lapProgress: buf.readFloatLE(offset + 4),
    x: buf.readFloatLE(offset + 8),
    y: buf.readFloatLE(offset + 12),
    z: buf.readFloatLE(offset + 16),
    data1: buf.readFloatLE(offset + 20),
    data2: buf.readFloatLE(offset + 24)
  };
  samples.push(sample);
}

console.log('Parsed', samples.length, 'samples');
console.log();

// Test 1: Monotonic lap progress
console.log('TEST 1: Monotonic lap progress field');
console.log(`  First lapProgress: ${samples[0].lapProgress.toFixed(6)}`);
console.log(`  Last lapProgress: ${samples[samples.length-1].lapProgress.toFixed(6)}`);
console.log(`  Range: ${(samples[samples.length-1].lapProgress - samples[0].lapProgress).toFixed(6)}`);
console.log(`  As fraction of track: ${(samples[samples.length-1].lapProgress / trackLength).toFixed(3)}`);
console.log();

// Test 2: XYZ spacing uniformity
console.log('TEST 2: XYZ spacing between consecutive samples');
const spacings = [];
for (let i = 1; i < samples.length; i++) {
  const dx = samples[i].x - samples[i-1].x;
  const dy = samples[i].y - samples[i-1].y;
  const dz = samples[i].z - samples[i-1].z;
  const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
  spacings.push(distance);
}

spacings.sort((a,b) => a-b);
const median = spacings[Math.floor(spacings.length / 2)];
const p10 = spacings[Math.floor(spacings.length * 0.1)];
const p90 = spacings[Math.floor(spacings.length * 0.9)];
const min = spacings[0];
const max = spacings[spacings.length - 1];

console.log(`  Min spacing: ${min.toFixed(6)}`);
console.log(`  P10 spacing: ${p10.toFixed(6)}`);
console.log(`  Median spacing: ${median.toFixed(6)}`);
console.log(`  P90 spacing: ${p90.toFixed(6)}`);
console.log(`  Max spacing: ${max.toFixed(6)}`);
console.log(`  Ratio (P90/P10): ${(p90/p10).toFixed(2)}`);

if (p90 / p10 < 2.0) {
  console.log('  → UNIFORM spacing suggests DISTANCE-SAMPLED');
} else {
  console.log('  → VARIABLE spacing suggests TIME-SAMPLED');
}
console.log();

// Test 3: Total polyline length
console.log('TEST 3: Total polyline length');
let totalLength = 0;
for (let i = 1; i < samples.length; i++) {
  const dx = samples[i].x - samples[i-1].x;
  const dy = samples[i].y - samples[i-1].y;
  const dz = samples[i].z - samples[i-1].z;
  totalLength += Math.sqrt(dx*dx + dy*dy + dz*dz);
}

console.log(`  Total XYZ path length: ${totalLength.toFixed(6)}`);
console.log(`  Track length: ${trackLength} km`);
console.log(`  Ratio: ${(totalLength / trackLength).toFixed(6)}`);

if (totalLength < 100) {
  console.log('  → XYZ values are NOT world coordinates (too small)');
  console.log('  → These might be normalized positions, velocities, or inputs');
} else {
  console.log('  → XYZ values could be world coordinates');
}
