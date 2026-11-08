/**
 * Export BLAP telemetry to JSON or CSV for analysis
 * Usage: node export-blap.js <path-to-blap-file> [format]
 */

const fs = require('fs')
const Blap = require('./lib/blap').default

const blapFilePath = process.argv[2]
const format = (process.argv[3] || 'json').toLowerCase()

if (!blapFilePath) {
  console.error('Usage: node export-blap.js <path-to-blap-file> [json|csv]')
  console.error('Example: node export-blap.js file.blap csv > output.csv')
  process.exit(1)
}

if (!['json', 'csv'].includes(format)) {
  console.error('Format must be "json" or "csv"')
  process.exit(1)
}

Blap.fromFile(blapFilePath)
  .then(async blap => {
    const track = await blap.getTrackName()
    const info = blap.getInfo()
    
    // Collect all samples
    const samples = []
    let index = 0
    
    for (const sample of blap.samples()) {
      const pos = sample.getPosition()
      const extra = sample.getExtraData()

      samples.push({
        index: index++,
        lapDistance: sample.lapDistance,
        posX: pos.x,
        posY: pos.y,
        posZ: pos.z,
        data1: extra.data1,
        data2: extra.data2,
        flag1: sample.flags1,
        flag2: sample.flags2,
        flag3: sample.flags3,
        flag4: sample.flags4
      })
    }
    
    blap.close()
    
    if (format === 'json') {
      // Export as JSON
      const output = {
        metadata: {
          driver: info.driverName,
          car: info.carName,
          track: track,
          shortTag: info.shortTag,
          sampleCount: samples.length,
          fileSize: info.fileSize
        },
        samples: samples
      }
      
      console.log(JSON.stringify(output, null, 2))
      
    } else if (format === 'csv') {
      // Export as CSV
      console.log('# Driver:', info.driverName)
      console.log('# Car:', info.carName)
      console.log('# Track:', track)
      console.log('# Samples:', samples.length)
      console.log('')
      
      // CSV header
      console.log('index,lapDistance,posX,posY,posZ,data1,data2,flag1,flag2,flag3,flag4')

      // CSV rows
      samples.forEach(s => {
        console.log(`${s.index},${s.lapDistance},${s.posX},${s.posY},${s.posZ},${s.data1},${s.data2},${s.flag1},${s.flag2},${s.flag3},${s.flag4}`)
      })
    }
  })
  .catch(error => {
    console.error('Error:', error.message)
    process.exit(1)
  })
