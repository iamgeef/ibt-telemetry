const fs = require('fs');
const buf = fs.readFileSync('028023_mx5mx52016.blap');

// Get all samples
const samples = [];
const startOffset = 0x658;
for (let i = startOffset; i < buf.length - 28; i++) {
  if (buf[i+1] === 0x00 && buf[i+2] === 0xFF) {
    samples.push(buf.readFloatLE(i+4));
    i += 27;
  }
}

const firstDist = samples[0];
const lastDist = samples[samples.length - 1];
const totalDist = lastDist - firstDist;
const duration = samples.length / 60.0; // seconds
const trackLength = 3.67; // km

console.log('BLAP Distance Field Analysis\n');
console.log(`Samples: ${samples.length}`);
console.log(`Duration at 60Hz: ${duration.toFixed(3)} seconds`);
console.log(`First value: ${firstDist.toFixed(6)}`);
console.log(`Last value: ${lastDist.toFixed(6)}`);
console.log(`Range: ${totalDist.toFixed(6)}\n`);

// Test if it's cumulative distance in km
const avgSpeed = (totalDist / (duration / 3600));
console.log('IF THIS IS DISTANCE (km):');
console.log(`  Average speed: ${avgSpeed.toFixed(1)} km/h`);
console.log(`  Reasonable: ${avgSpeed > 50 && avgSpeed < 350 ? 'YES ✓' : 'NO ✗'}\n`);

// Compare to actual lap
const lapsWorth = totalDist / trackLength;
const expectedLaps = duration / 94.075; // fastest lap time
console.log('COMPARISON TO TRACK:');
console.log(`  Distance = ${lapsWorth.toFixed(2)} laps worth`);
console.log(`  Time = ${expectedLaps.toFixed(2)} laps worth`);
console.log(`  Match: ${Math.abs(lapsWorth - expectedLaps) < 0.5 ? 'YES ✓' : 'NO ✗'}`);
