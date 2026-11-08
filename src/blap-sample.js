/**
 * BLAP Telemetry Sample
 * Represents a single frame of telemetry data from a ghost lap
 */

export default class BlapSample {
  constructor (buffer, offset = 0) {
    // Sample is 28 bytes total
    // Pattern: FF 00 FF 03 (or 04) followed by data

    // Flags/state bytes (4 bytes)
    this.flags1 = buffer.readUInt8(offset + 0)  // Usually 0xFF
    this.flags2 = buffer.readUInt8(offset + 1)  // Usually 0x00
    this.flags3 = buffer.readUInt8(offset + 2)  // Usually 0xFF
    this.flags4 = buffer.readUInt8(offset + 3)  // State: 0x03, 0x04, etc.

    // Lap distance or time (float) - small incremental values
    this.lapDistance = buffer.readFloatLE(offset + 4)

    // Position or movement data (3 floats - likely X, Y, Z)
    this.posX = buffer.readFloatLE(offset + 8)
    this.posY = buffer.readFloatLE(offset + 12)
    this.posZ = buffer.readFloatLE(offset + 16)

    // Additional data (2 floats - possibly velocity or rotation)
    this.data1 = buffer.readFloatLE(offset + 20)
    this.data2 = buffer.readFloatLE(offset + 24)
  }

  /**
   * Get position estimate (assuming posX-Z are coordinates)
   */
  getPosition () {
    return {
      x: this.posX,
      y: this.posY,
      z: this.posZ
    }
  }

  /**
   * Get additional data (velocity or rotation)
   */
  getExtraData () {
    return {
      data1: this.data1,
      data2: this.data2
    }
  }

  /**
   * Check if this looks like a valid sample
   */
  isValid () {
    // Valid if flags match expected pattern
    return this.flags1 === 0xFF && this.flags3 === 0xFF
  }

  toJSON () {
    return {
      lapDistance: this.lapDistance,
      position: this.getPosition(),
      extraData: this.getExtraData(),
      flags: {
        flag1: this.flags1,
        flag2: this.flags2,
        flag3: this.flags3,
        flag4: this.flags4
      }
    }
  }
}

export const SAMPLE_SIZE = 28 // bytes per sample
