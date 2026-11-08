/**
 * BLAP file header parser
 */

const MAGIC_BYTES = 'BLAP'
const HEADER_SIZE = 0x200 // Header appears to be around 512 bytes

export class BlapHeader {
  constructor (buffer) {
    // Verify magic bytes
    const magic = buffer.toString('ascii', 0, 4)
    if (magic !== MAGIC_BYTES) {
      throw new Error(`Invalid BLAP file: expected "${MAGIC_BYTES}", got "${magic}"`)
    }

    // Parse header fields
    this.magic = magic
    this.version = buffer.readUInt32LE(4)
    this.unknown1 = buffer.readUInt32LE(8)

    // Short tag at 0x0C (e.g., "wm")
    this.shortTag = this.readNullTerminatedString(buffer, 0x0C, 4)

    // Driver name at offset 0x10, fixed 128-byte field
    this.driverName = this.readNullTerminatedString(buffer, 0x10, 128)

    // Car name at offset 0x90 (144)
    this.carName = this.readNullTerminatedString(buffer, 0x90, 64)

    // Metadata offset pointer at 0xD0 (likely 0x1F8 = 504)
    this.metadataOffset = buffer.readUInt32LE(0xD0)

    // String after metadata offset (often "undefined")
    this.metadataString = this.readNullTerminatedString(buffer, 0xD4, 32)
  }

  readNullTerminatedString (buffer, offset, maxLength) {
    let length = 0
    while (length < maxLength && buffer[offset + length] !== 0) {
      length++
    }
    return buffer.toString('utf8', offset, offset + length)
  }

  static fromBuffer (buffer) {
    return new BlapHeader(buffer)
  }

  toJSON () {
    return {
      magic: this.magic,
      version: this.version,
      shortTag: this.shortTag,
      driverName: this.driverName,
      carName: this.carName,
      metadataOffset: `0x${this.metadataOffset.toString(16)}`,
      metadataString: this.metadataString,
      trackName: this.trackName
    }
  }
}

export const SIZE_IN_BYTES = HEADER_SIZE
