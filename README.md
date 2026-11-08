# iRacing Telemetry Parser

This is a Node.js library for processing iRacing telemetry files:
- **ibt files**: iRacing's native telemetry format with full data streaming support
- **blap files**: Basic BLAP format support for file info and metadata

The ibt library has been built with memory consumption in mind, and therefore the data is streamed from the file
instead of being loaded completely in memory. This is advantageous when needing to deal with back pressure from
a slower services consuming the file.

This library is 100% Node.js with no requirements on any DLL or Windows library, making it completely capable 
of being run on macOS and Linux too.

## Installation

Install dependencies:
```bash
npm install
```

The project has been configured with the necessary Babel plugins to handle generator functions. If you encounter `regeneratorRuntime is not defined` errors, ensure `babel-runtime` and `babel-plugin-transform-runtime` are installed.

Compile the source code (transpiles ES6+ to ES5 using Babel):
```bash
npm run compile
```

This will generate the compiled library in the `lib/` directory.

## Quick Start - View an ibt file

To quickly load and view a telemetry file:

```bash
node example.js /path/to/your/file.ibt
```

This will display the telemetry ID, session info, and the first 5 samples from the file.

## Quick Start - View a BLAP file

To view a BLAP format file:

```bash
node example-blap.js /path/to/your/file.blap
```

This will display the driver info, car, track, and file metadata.

## Usage

To use this library in your project, you can either:

1. **Install from npm** (if published):
   ```bash
   npm install ibt-telemetry
   ```

2. **Use locally**: After running `npm run compile`, import from the `lib/` directory:
   ```javascript
   const Telemetry = require('./lib/index').default
   ```

3. **Link locally for development**:
   ```bash
   npm link
   ```
   Then in your project:
   ```bash
   npm link ibt-telemetry
   ```

## Loading up the telemetry

```javascript
const pathToIbt = '/path/to/telemetry.ibt'

// fromFile returns a Promise
Telemetry.fromFile(pathToIbt)
  .then(telemetry => {
    const telemetryId = telemetry.uniqueId()
    // telemetryId = "188953-12312494-123910230"

    const sessionInfo = telemetry.sessionInfo
    // sessionInfo = {}
  })
  .catch(err => console.error('Error loading telemetry:', err))
```

## Reading telemetry update samples

#### Generator
```javascript
Telemetry.fromFile(pathToIbt).then(telemetry => {
  for (const sample of telemetry.samples()) {
    const speed = sample.getParam('speed')
    // speed = {
    //   name: "Speed",
    //   description: "GPS vehicle speed",
    //   value: 200.32943,
    //   unit: "m/s"
    // }
    
    const sampleJson = sample.toJSON()
    // sampleJson = {
    //   "AirTemp": {
    //     "unit": "C",
    //     "value": 25.55555534362793
    //   },
    //   "Alt": {
    //     "unit": "m",
    //     "value": 42.163856506347656
    //   },
    //   "Brake": {
    //     "unit": "%",
    //     "value": 1
    //   },
    //   "BrakeRaw": {
    //     "unit": "%",
    //     "value": 0
    //   },
    //   "CFshockDefl": {
    //     "unit": "m",
    //     "value": 0.04878242313861847
    //   }
    // }
  }
})
```

#### Rx.JS
```javascript
Telemetry.fromFile(pathToIbt).then(telemetry => {
  const samples$ = Rx.Observable.from(telemetry.samples())

  samples$
    .subscribe(s => console.log(s.toJSON()))
})
```

## Loading BLAP files

```javascript
const Blap = require('./lib/blap').default

const pathToBlap = '/path/to/file.blap'

// fromFile returns a Promise
Blap.fromFile(pathToBlap)
  .then(async blap => {
    // Get file information
    const info = blap.getInfo()
    console.log(info)
    // {
    //   magic: "BLAP",
    //   version: 3,
    //   shortTag: "wm",
    //   driverName: "Pablo López",
    //   carName: "mx5\\mx52016",
    //   metadataOffset: "0x1f8",
    //   metadataString: "undefined",
    //   fileSize: 52224
    // }
    
    // Get track name (parsed from file)
    const track = await blap.getTrackName()
    console.log(track) // "charlotte\\2025\\roval2025"
    
    // Get unique ID
    const id = blap.uniqueId()
    console.log(id) // "wm-Pablo_López"
    
    // Search for strings in the file
    const matches = await blap.searchString('charlotte')
    console.log(matches) // [0x53e]
    
    // Read metadata section (from metadataOffset pointer)
    const metadata = await blap.getMetadataSection(1024)
    console.log(metadata)
    
    // Read raw data from any offset
    const data = await blap.readData(0x500, 256)
    console.log(data)
    
    // Remember to close when done
    blap.close()
  })
  .catch(err => console.error('Error loading BLAP:', err))
```

### BLAP Format Structure

Based on binary analysis:

- **Magic bytes**: `BLAP` (0x00-0x03)
- **Version**: 32-bit LE integer (0x04-0x07), typically 3
- **Short tag**: 4-byte string at 0x0C (e.g., "wm")
- **Driver name**: Fixed 128-byte field at 0x10-0x8F
- **Car path**: String at 0x90 (e.g., "mx5\\mx52016")
- **Metadata offset**: 32-bit LE pointer at 0xD0 (typically 0x1F8 = 504)
- **Track path**: Found around offset 0x530+ (e.g., "charlotte\\2025\\roval2025")

The metadata offset points to a structured section containing session data, lap times, and telemetry samples.

## Reading BLAP Telemetry Samples (Ghost Lap Data)

BLAP files contain telemetry samples for ghost lap replay in iRacing:

```javascript
const Blap = require('./lib/blap').default

Blap.fromFile('/path/to/file.blap')
  .then(blap => {
    // Get sample count
    const sampleCount = blap.getSampleCount()
    console.log(`Total samples: ${sampleCount}`)
    
    // Iterate through samples using generator
    for (const sample of blap.samples()) {
      const pos = sample.getPosition() // { x, y, z }
      const vel = sample.getVelocity() // { x, y, z }
      
      console.log(`Position: ${pos.x}, ${pos.y}, ${pos.z}`)
      console.log(`Velocity: ${vel.x}, ${vel.y}`)
      console.log(`Timestamp: ${sample.field2}`)
      console.log(`Flags: ${sample.flags1} ${sample.flags2}`)
    }
    
    // Or get all samples as array
    const allSamples = await blap.getAllSamples()
    console.log(`Loaded ${allSamples.length} samples`)
    
    // Read a specific sample by index
    const firstSample = await blap.readSample(0)
    console.log(firstSample.toJSON())
    
    blap.close()
  })
```

### BLAP Sample Structure

Each telemetry sample is 48 bytes:
- Position data (X, Y, Z coordinates)
- Velocity vectors
- Timestamp/distance markers  
- State flags (FF 00 FF pattern commonly seen)

Ghost lap files typically contain:
- ~1000+ samples for a single lap
- 60Hz sampling rate (approximately)
- Complete position and velocity tracking

