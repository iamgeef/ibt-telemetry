const fs = require('fs');
const buf = fs.readFileSync('028023_mx5mx52016.blap');

console.log('=== ANALYZING 28-BYTE SAMPLES AS 7 FLOATS ===\n');

// Structure: ?? 00 FF ?? [7 floats = 28 bytes]
// But wait - the pattern IS part of the sample, so it's:
// [4 bytes flags] + [6 floats = 24 bytes] = 28 bytes total

const samples = [];
const startOffset = 0x658;

for (let i = startOffset; i < buf.length - 28; i++) {
  // Pattern: ?? 00 FF ??
  if (buf[i+1] === 0x00 && buf[i+2] === 0xFF) {
    const sample = {
      // Flags (4 bytes)
      flag1: buf[i],
      flag2: buf[i+1],
      flag3: buf[i+2],
      flag4: buf[i+3],
      // 6 floats (24 bytes)
      f1: buf.readFloatLE(i + 4),
      f2: buf.readFloatLE(i + 8),
      f3: buf.readFloatLE(i + 12),
      f4: buf.readFloatLE(i + 16),
      f5: buf.readFloatLE(i + 20),
      f6: buf.readFloatLE(i + 24)
    };
    samples.push(sample);
    i += 27; // Skip to next potential sample
  }
}

console.log(`Found ${samples.length} samples\n`);

// Analyze each float field
const fields = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'];
const stats = {};

for (const field of fields) {
  const values = samples.map(s => s[field]);
  const sorted = [...values].sort((a, b) => a - b);
  
  stats[field] = {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)],
    p01: sorted[Math.floor(sorted.length * 0.01)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}

console.log('FLOAT FIELD RANGES:\n');
console.log('Field | Min          | P01          | Median       | P99          | Max          | Range');
console.log('------|--------------|--------------|--------------|--------------|--------------|-------------');
for (const field of fields) {
  const s = stats[field];
  const range = s.max - s.min;
  console.log(
    `${field.padEnd(5)} | ${s.min.toFixed(6).padStart(12)} | ${s.p01.toFixed(6).padStart(12)} | ` +
    `${s.median.toFixed(6).padStart(12)} | ${s.p99.toFixed(6).padStart(12)} | ` +
    `${s.max.toFixed(6).padStart(12)} | ${range.toFixed(6)}`
  );
}

console.log('\n=== DISTANCE FIELD ANALYSIS (assuming f1 is lapDist) ===\n');

const distances = samples.map(s => s.f1);
const totalDist = distances[distances.length - 1] - distances[0];

console.log(`First distance: ${distances[0].toFixed(6)}`);
console.log(`Last distance: ${distances[distances.length - 1].toFixed(6)}`);
console.log(`Total distance: ${totalDist.toFixed(6)}`);
console.log();

// Test different scaling interpretations
console.log('SCALING INTERPRETATION:');
console.log();
console.log('If stored as km × 10 (divide by 10 to get km):');
console.log(`  Total distance: ${(totalDist / 10).toFixed(6)} km = ${(totalDist / 10 * 1000).toFixed(2)} m`);
console.log(`  Avg spacing: ${((totalDist / 10 * 1000) / (samples.length - 1)).toFixed(2)} m per sample`);
console.log(`  Track length ~3.67 km: ${Math.abs((totalDist / 10) - 3.67) < 0.3 ? 'MATCH ✓' : 'NO MATCH ✗'}`);
console.log();

console.log('If stored as meters × 0.01 (multiply by 100 to get m):');
console.log(`  Total distance: ${(totalDist * 100).toFixed(2)} m = ${(totalDist * 100 / 1000).toFixed(6)} km`);
console.log(`  Avg spacing: ${((totalDist * 100) / (samples.length - 1)).toFixed(2)} m per sample`);
console.log(`  Track length ~3.67 km: ${Math.abs((totalDist * 100 / 1000) - 3.67) < 0.3 ? 'MATCH ✓' : 'NO MATCH ✗'}`);
console.log();

console.log('If stored as hectometers (multiply by 100 to get m, same as above):');
console.log(`  Same as above`);
console.log();

// Show deltas between consecutive samples
console.log('=== SAMPLE SPACING (first 20 deltas) ===\n');
for (let i = 1; i < Math.min(21, samples.length); i++) {
  const delta = samples[i].f1 - samples[i-1].f1;
  console.log(`Sample ${i}: delta = ${delta.toFixed(6)} (= ${(delta * 100).toFixed(2)}m if ×100 scaling)`);
}

console.log('\n=== FIRST 5 COMPLETE SAMPLES ===\n');
for (let i = 0; i < Math.min(5, samples.length); i++) {
  const s = samples[i];
  console.log(`Sample ${i}:`);
  console.log(`  Flags: [0x${s.flag1.toString(16).padStart(2,'0')} 0x${s.flag2.toString(16).padStart(2,'0')} 0x${s.flag3.toString(16).padStart(2,'0')} 0x${s.flag4.toString(16).padStart(2,'0')}]`);
  console.log(`  f1(dist): ${s.f1.toFixed(6)}`);
  console.log(`  f2: ${s.f2.toFixed(6)}`);
  console.log(`  f3: ${s.f3.toFixed(6)}`);
  console.log(`  f4: ${s.f4.toFixed(6)}`);
  console.log(`  f5: ${s.f5.toFixed(6)}`);
  console.log(`  f6: ${s.f6.toFixed(6)}`);
  console.log();
}
