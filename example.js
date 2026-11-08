/**
 * Example script to load and view ibt telemetry data
 * Usage: node example.js <path-to-ibt-file>
 */

const Telemetry = require('./lib/index').default

// Get the file path from command line arguments
const ibtFilePath = process.argv[2]

if (!ibtFilePath) {
  console.error('Usage: node example.js <path-to-ibt-file>')
  console.error('Example: node example.js /path/to/telemetry.ibt')
  process.exit(1)
}

console.log(`Loading telemetry from: ${ibtFilePath}\n`)

// fromFile returns a Promise, so we need to use .then() or async/await
Telemetry.fromFile(ibtFilePath)
  .then(telemetry => {
    // Display basic telemetry info
    console.log('=== Telemetry Info ===')
    console.log(`Unique ID: ${telemetry.uniqueId()}`)
    console.log()
    
    // Display session info
    console.log('=== Session Info ===')
    console.log(JSON.stringify(telemetry.sessionInfo, null, 2))
    console.log()
    
    // Display first few samples
    console.log('=== First 5 Telemetry Samples ===')
    let count = 0
    for (const sample of telemetry.samples()) {
      if (count >= 5) break
      
      console.log(`\n--- Sample ${count + 1} ---`)
      console.log(JSON.stringify(sample.toJSON(), null, 2))
      
      count++
    }
    
    console.log('\n✓ Done! To see all samples, modify the script or pipe to a file.')
  })
  .catch(error => {
    console.error('Error loading telemetry file:', error.message)
    process.exit(1)
  })
