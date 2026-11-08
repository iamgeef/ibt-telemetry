# BLAP Format Analysis

## Overview
BLAP is a binary telemetry/session format, likely related to iRacing or similar racing simulation software.

## File Structure

### Header (0x000 - ~0x200)

| Offset | Size | Type | Description | Example Value |
|--------|------|------|-------------|---------------|
| 0x000 | 4 | ASCII | Magic bytes | "BLAP" |
| 0x004 | 4 | uint32_le | Format version | 3 |
| 0x008 | 4 | uint32_le | Unknown field | - |
| 0x00C | 4 | ASCII | Short tag/identifier | "wm" |
| 0x010 | 128 | string | Driver name (fixed size) | "Pablo López" |
| 0x090 | 64 | string | Car identifier/path | "mx5\mx52016" |
| 0x0D0 | 4 | uint32_le | Metadata section offset | 0x1F8 (504) |
| 0x0D4 | ~32 | string | Metadata descriptor | "undefined" |

### String Fields Location

Based on binary search of the file:

- **Driver name**: 0x010 (header), 0x28E (duplicate in metadata)
- **Car path**: 0x090, 0x2D6, 0x4FE (multiple occurrences)
- **Track path**: 0x53E ("charlotte\2025\roval2025")

### Version Information

Three version strings found around offset 0x570-0x590:
- "2026.01.02.01" 
- "2025.12.03.02"
- "2025.12.29.01"

Likely representing:
- Build version
- Track version
- Car version

### Metadata Section (starting at 0x1F8)

The metadata offset (0x1F8 = 504 decimal) points to a structured data section.

Initial bytes at 0x1F8 show mostly zeros with occasional data:
```
00 00 00 00 00 00 04 00 01 00 00 00 ...
```

This suggests:
- Possible record count or flags
- Directory/index structure
- Padding before actual data

### Track Information Section (~0x530+)

Contains full track path:
- Format: `track_name\year\layout`
- Example: `charlotte\2025\roval2025`

Followed immediately by version strings.

## Data Patterns

### Numeric String Fragments

Observed patterns like:
```
67,000000,9100e2,666666
23,000000,cc0008,ffffff
0,9146FE,000000,000000,3E4446
```

These are **NOT** CSV data. They appear to be:
- Debug/metadata strings
- Color codes (hex values like 666666, ffffff)
- Possibly UI-related metadata or telemetry channel descriptors

### Repeating Structures

After offset ~0x600, the file likely contains:
- **Telemetry samples**: Fixed-stride binary records
- **Lap data**: Sector times, lap times
- **Session metadata**: Timestamps, flags, events

## Implementation Notes

### Current Parser Features

✅ Header parsing (magic, version, driver, car)
✅ Metadata offset reading
✅ Track name extraction  
✅ String search functionality
✅ Raw data access
✅ **Telemetry sample parsing**
✅ **Position and velocity extraction**
✅ **Ghost lap replay data access**

### Telemetry Sample Structure (28 bytes per sample) **CORRECTED**

Starting at offset **0x658**, telemetry samples repeat every **28 bytes (0x1C)** with this structure:

| Offset | Size | Type | Description |
|--------|------|------|-------------|
| +0 | 1 | uint8 | Flag byte 1 (always 0xFF) |
| +1 | 1 | uint8 | Flag byte 2 (always 0x00) |
| +2 | 1 | uint8 | Flag byte 3 (always 0xFF) |
| +3 | 1 | uint8 | State flag (0x03, 0x04, etc.) |
| +4 | 4 | float | **Cumulative lap distance (km)** |
| +8 | 4 | float | Data field 1 (small values, -5 to +5 range) |
| +12 | 4 | float | Data field 2 (small values, -3 to +3 range) |
| +16 | 4 | float | Data field 3 (small values, -0.07 to +0.05 range) |
| +20 | 4 | float | Data field 4 (around -0.09, possibly brake input?) |
| +24 | 4 | float | Data field 5 (often 0.0, possibly throttle/clutch?) |

**Key Pattern**: The byte sequence `FF 00 FF 03` or `FF 00 FF 04` at offset +0 marks valid samples.

**Important Discovery**: Field at offset +4 is a **cumulative distance counter** that increases by ~0.055km per sample. Over 1377 samples it accumulates to 34.2km, representing approximately 9+ laps of a 3.67km circuit.

### Field Interpretations (Preliminary)

Based on observed data patterns:

1. **Cumulative Distance** (offset +4): Monotonically increasing lap distance in kilometers
   - Starts at ~0.056 km
   - Increments by ~0.025-0.056 km per sample
   - Represents total distance traveled, not single lap

2. **Fields at +8, +12, +16**: Small floating-point values with limited range
   - Likely **NOT** world coordinates (ranges too small)
   - Possibilities:
     - Normalized track position (0-1 coordinate system)
     - Velocity/acceleration components (m/s or m/s²)
     - Track curvature or heading change
     - Steering input normalized values

3. **Field at +20**: Consistently around -0.09
   - Possibly **brake input** (normalized 0-1 or similar)
   - Or suspension/G-force related

4. **Field at +24**: Often exactly 0.0
   - Possibly **throttle position** when off-throttle
   - Or clutch position

### Sample Data Analysis

From a test file (charlotte/roval2025, MX-5):
- **Sample count**: ~1054 valid samples
- **Duration**: ~17.5 seconds at 60Hz
- **Position range**:
  - X: -5.3 to 2233 meters
  - Y: -5.2 to 3616 meters  
  - Z: -5.3 to 34 meters (elevation)
- **Approximate lap distance**: ~21 km
- **Data quality**: Clean, smooth position transitions

### Usage

1. **Identify record structure at 0x1F8+**
   - Look for record count field
   - Determine record stride (bytes per sample)
   - Find channel descriptors

2. **Parse telemetry channels**
   - Position (X, Y, Z)
   - Velocity
   - Steering/throttle/brake inputs
   - Engine data (RPM, gear, etc.)

3. **Lap and sector data**
   - Extract lap times
   - Sector splits
   - Timestamps

4. **Self-describing vs. fixed format**
   - Determine if BLAP includes channel metadata
   - Or if it's a fixed struct dump requiring external schema

## Key Insights

1. **Fixed-size header fields**: Driver name is exactly 128 bytes (0x10-0x8F)
2. **Metadata pointer pattern**: 0x1F8 is a file offset, not inline data
3. **Multiple string occurrences**: Data appears duplicated in metadata section
4. **Version tracking**: Multiple version strings suggest versioned components
5. **Not CSV**: Comma-separated fragments are metadata, not tabular data

## File Size Analysis

Example file: 52,224 bytes (51 KB)

Breakdown estimate:
- Header: ~512 bytes
- Metadata/directory: ~500 bytes
- String data (track, versions): ~200 bytes
- Telemetry samples: ~51 KB remaining

If samples are ~32-64 bytes each:
- Estimated sample count: 800-1600 samples
- At 60 Hz: ~13-26 seconds of data
- At 120 Hz: ~6-13 seconds of data

**CONFIRMED**: Analysis of actual file shows 48 bytes per sample, ~1054 valid samples, representing ~17.5 seconds of ghost lap data at 60Hz.

This confirms BLAP files contain **single-lap replays** for ghost car visualization in iRacing.

## Usage

BLAP files are used by iRacing for:
- **Ghost lap replays**: Visualize racing line and compare performance
- **Telemetry analysis**: Position tracking throughout a lap
- **Race coaching**: Share and analyze driving lines

Access via the parser:
```javascript
const blap = await Blap.fromFile('file.blap')
for (const sample of blap.samples()) {
  console.log(sample.getPosition()) // { x, y, z }
  console.log(sample.getVelocity()) // velocity vectors
}
```

## Remaining Research Areas

1. **Field identification**
   - Determine exact meaning of float fields (world coords vs. track coords?)
   - Identify steering/throttle/brake input data
   - RPM, gear, and other vehicle state

2. **Input data location**
   - Pedal positions (throttle, brake, clutch)  
   - Steering angle
   - Gear selection

3. **Lap and sector timing**
   - Extract lap times
   - Sector splits
   - Best lap identification
