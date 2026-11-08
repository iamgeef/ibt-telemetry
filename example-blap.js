/**
 * Example script to load and view BLAP files
 * Usage: node example-blap.js <path-to-blap-file>
 */

const Blap = require('./lib/blap').default

// Get the file path from command line arguments
const blapFilePath = process.argv[2]

if (!blapFilePath) {
  console.error('Usage: node example-blap.js <path-to-blap-file>')
  console.error('Example: node example-blap.js /path/to/file.blap')
  process.exit(1)
}

console.log(`Loading BLAP file from: ${blapFilePath}\n`)

Blap.fromFile(blapFilePath)
  .then(async blap => {
    console.log('=== BLAP File Info ===')
    const info = blap.getInfo()
    console.log(JSON.stringify(info, null, 2))
    console.log()
    
    console.log(`Unique ID: ${blap.uniqueId()}`)
    console.log()
    
    // Get track name
    console.log('=== Track Information ===')
    const trackName = await blap.getTrackName()
    console.log(`Track: ${trackName}`)
    console.log()
    
    // Search for common strings
    console.log('=== String Search Results ===')
    const searches = ['charlotte', 'mx5', 'roval', 'Pablo']
    for (const search of searches) {
      const matches = await blap.searchString(search)
      if (matches.length > 0) {
        console.log(`"${search}" found at offsets: ${matches.map(o => '0x' + o.toString(16)).join(', ')}`)
      }
    }
    console.log()
    
    // Read metadata section at 0x1F8
    console.log('=== Metadata Section (at offset from header) ===')
    const metadata = await blap.getMetadataSection(256)
    console.log('First 256 bytes at metadata offset:')
    console.log(metadata.toString('hex').match(/.{1,32}/g).slice(0, 8).join('\n'))
    console.log()
    
    // Show ASCII representation
    console.log('ASCII view (printable chars only):')
    let ascii = ''
    for (let i = 0; i < Math.min(256, metadata.length); i++) {
      const byte = metadata[i]
      ascii += (byte >= 0x20 && byte <= 0x7E) ? String.fromCharCode(byte) : '.'
      if ((i + 1) % 64 === 0) ascii += '\n'
    }
    console.log(ascii)
    console.log()
    
    // Clean up
    blap.close()
    console.log('✓ Done!')
  })
  .catch(error => {
    console.error('Error loading BLAP file:', error.message)
    process.exit(1)
  })
