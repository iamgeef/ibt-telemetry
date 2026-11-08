/**
 * Example script to parse and view BLAP telemetry samples (ghost lap data)
 * Usage: node example-blap-telemetry.js <path-to-blap-file>
 */

const Blap = require('./lib/blap').default

// Get the file path from command line arguments
const blapFilePath = process.argv[2]
const sampleLimit = parseInt(process.argv[3]) || 10

if (!blapFilePath) {
  console.error('Usage: node example-blap-telemetry.js <path-to-blap-file> [sample-limit]')
  console.error('Example: node example-blap-telemetry.js /path/to/file.blap 20')
  process.exit(1)
}

console.log(`Loading BLAP telemetry from: ${blapFilePath}\n`)

Blap.fromFile(blapFilePath)
  .then(async blap => {
    console.log('=== Ghost Lap Info ===')
    const info = blap.getInfo()
    console.log(`Driver: ${info.driverName}`)
    console.log(`Car: ${info.carName}`)
    
    const track = await blap.getTrackName()
    console.log(`Track: ${track}`)
    console.log(`File Size: ${(info.fileSize / 1024).toFixed(2)} KB`)
    console.log()
    
    // Get sample count
    const sampleCount = blap.getSampleCount()
    console.log(`=== Telemetry Samples ===`)
    console.log(`Total estimated samples: ${sampleCount}`)
    console.log(`Showing first ${sampleLimit} samples:\n`)
    
    // Iterate through samples
    let count = 0
    let validCount = 0
    
    for (const sample of blap.samples()) {
      if (validCount >= sampleLimit) break
      
      validCount++
      const pos = sample.getPosition()
      const extra = sample.getExtraData()

      console.log(`Sample ${validCount}:`)
      console.log(`  Lap Distance: ${sample.lapDistance.toFixed(6)} km`)
      console.log(`  Position: X=${pos.x.toFixed(6)}, Y=${pos.y.toFixed(6)}, Z=${pos.z.toFixed(6)}`)
      console.log(`  Extra Data: ${extra.data1.toFixed(6)}, ${extra.data2.toFixed(6)}`)
      console.log(`  Flags: 0x${sample.flags1.toString(16)} 0x${sample.flags2.toString(16)} 0x${sample.flags3.toString(16)} 0x${sample.flags4.toString(16)}`)
      console.log()
    }
    
    console.log(`✓ Processed ${validCount} valid samples`)
    
    // Show some statistics
    console.log('\n=== Statistics ===')
    const allSamples = await blap.getAllSamples()
    if (allSamples.length > 0) {
      console.log(`Valid samples with data: ${allSamples.length}`)
      
      // Calculate bounding box
      let minX = Infinity, maxX = -Infinity
      let minY = Infinity, maxY = -Infinity
      let minZ = Infinity, maxZ = -Infinity
      
      allSamples.forEach(s => {
        const pos = s.getPosition()
        minX = Math.min(minX, pos.x)
        maxX = Math.max(maxX, pos.x)
        minY = Math.min(minY, pos.y)
        maxY = Math.max(maxY, pos.y)
        minZ = Math.min(minZ, pos.z)
        maxZ = Math.max(maxZ, pos.z)
      })
      
      console.log(`\nPosition bounds:`)
      console.log(`  X: ${minX.toFixed(6)} to ${maxX.toFixed(6)} (range: ${(maxX - minX).toFixed(6)})`)
      console.log(`  Y: ${minY.toFixed(6)} to ${maxY.toFixed(6)} (range: ${(maxY - minY).toFixed(6)})`)
      console.log(`  Z: ${minZ.toFixed(6)} to ${maxZ.toFixed(6)} (range: ${(maxZ - minZ).toFixed(6)})`)

      // Get lap distance from first and last samples
      const firstDistance = allSamples[0].lapDistance
      const lastDistance = allSamples[allSamples.length - 1].lapDistance
      console.log(`\nLap distance: ${firstDistance.toFixed(6)} to ${lastDistance.toFixed(6)} km`)
      console.log(`Total distance: ${(lastDistance - firstDistance).toFixed(6)} km (${((lastDistance - firstDistance) * 0.621371).toFixed(6)} miles)`)

      // Calculate path distance from position changes
      let pathDistance = 0
      for (let i = 1; i < allSamples.length; i++) {
        const p1 = allSamples[i - 1].getPosition()
        const p2 = allSamples[i].getPosition()
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const dz = p2.z - p1.z
        pathDistance += Math.sqrt(dx * dx + dy * dy + dz * dz)
      }

      console.log(`Position-based distance: ${(pathDistance / 1000).toFixed(6)} km`)
      console.log(`Duration: ${allSamples.length} samples (${(allSamples.length / 60).toFixed(2)}s at 60Hz)`)
    }
    
    // Clean up
    blap.close()
    console.log('\n✓ Done!')
  })
  .catch(error => {
    console.error('Error loading BLAP file:', error.message)
    console.error(error.stack)
    process.exit(1)
  })
