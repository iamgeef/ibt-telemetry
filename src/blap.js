import fs from 'fs'
import { BlapHeader, SIZE_IN_BYTES as HEADER_SIZE } from './blap-header'
import BlapSample, { SAMPLE_SIZE } from './blap-sample'

/**
 * BLAP file parser
 * This is a basic parser for BLAP format files (ghost lap replays)
 */
export default class Blap {
  constructor (header, fd, fileSize) {
    this.header = header
    this.fd = fd
    this.fileSize = fileSize

    // Calculate telemetry data region
    // Telemetry samples start at 0x658 based on FF 00 FF pattern analysis
    this.telemetryStartOffset = 0x658
    this.telemetryEndOffset = fileSize
  }

  /**
   * Load a BLAP file
   * @param {string} filePath - Path to the BLAP file
   * @returns {Promise<Blap>}
   */
  static fromFile (filePath) {
    return new Promise((resolve, reject) => {
      fs.open(filePath, 'r', (err, fd) => {
        if (err) {
          reject(err)
          return
        }

        // Get file size
        fs.fstat(fd, (err, stats) => {
          if (err) {
            fs.closeSync(fd)
            reject(err)
            return
          }

          const fileSize = stats.size
          const buffer = Buffer.alloc(HEADER_SIZE)

          // Read header
          fs.read(fd, buffer, 0, HEADER_SIZE, 0, (err, bytesRead) => {
            if (err) {
              fs.closeSync(fd)
              reject(err)
              return
            }

            try {
              const header = BlapHeader.fromBuffer(buffer)
              resolve(new Blap(header, fd, fileSize))
            } catch (error) {
              fs.closeSync(fd)
              reject(error)
            }
          })
        })
      })
    })
  }

  /**
   * Get basic file information
   */
  getInfo () {
    return {
      ...this.header.toJSON(),
      fileSize: this.fileSize
    }
  }

  /**
   * Read raw data from file
   * @param {number} offset - Offset to read from
   * @param {number} length - Number of bytes to read
   * @returns {Promise<Buffer>}
   */
  readData (offset, length) {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.alloc(length)
      fs.read(this.fd, buffer, 0, length, offset, (err, bytesRead) => {
        if (err) {
          reject(err)
        } else {
          resolve(buffer.slice(0, bytesRead))
        }
      })
    })
  }

  /**
   * Close the file descriptor
   */
  close () {
    if (this.fd !== null) {
      fs.closeSync(this.fd)
      this.fd = null
    }
  }

  /**
   * Get unique identifier for this session
   */
  uniqueId () {
    return `${this.header.shortTag}-${this.header.driverName.replace(/\s+/g, '_')}`
  }

  /**
   * Search for a string pattern in the entire file
   * Returns all offsets where the pattern is found
   * @param {string} searchString - String to search for
   * @returns {Promise<Array<number>>} Array of file offsets
   */
  searchString (searchString) {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.alloc(this.fileSize)
      fs.read(this.fd, buffer, 0, this.fileSize, 0, (err, bytesRead) => {
        if (err) {
          reject(err)
          return
        }

        const matches = []
        const searchBuffer = Buffer.from(searchString, 'utf8')
        let offset = 0

        while (offset < bytesRead) {
          const index = buffer.indexOf(searchBuffer, offset)
          if (index === -1) break
          matches.push(index)
          offset = index + 1
        }

        resolve(matches)
      })
    })
  }

  /**
   * Get the metadata section (starting from metadataOffset)
   * @param {number} length - Number of bytes to read (default 1024)
   * @returns {Promise<Buffer>}
   */
  getMetadataSection (length = 1024) {
    const offset = this.header.metadataOffset
    return this.readData(offset, Math.min(length, this.fileSize - offset))
  }

  /**
   * Parse track name from metadata section
   * Track name typically appears around offset 0x530+
   * @returns {Promise<string>}
   */
  async getTrackName () {
    // Charlotte\2025\roval2025 is at 0x53e based on hex dump
    // Read from 0x530 to be safe
    const buffer = await this.readData(0x530, 128)

    // Look for track pattern like "charlotte\2025\roval2025"
    let trackName = ''
    for (let i = 0; i < buffer.length - 10; i++) {
      // Look for path-like strings (contains backslash)
      if (buffer[i] >= 0x20 && buffer[i] <= 0x7E) {
        let str = ''
        let j = i
        while (j < buffer.length && buffer[j] !== 0 && buffer[j] >= 0x20 && buffer[j] <= 0x7E) {
          str += String.fromCharCode(buffer[j])
          j++
        }
        // If string contains backslash and looks like a track path (charlotte\2025\roval)
        if (str.includes('\\') && str.length > 10 && str.length < 64 && !str.includes(',')) {
          trackName = str
          break
        }
      }
    }

    return trackName || 'unknown'
  }

  /**
   * Get sample count estimate
   */
  getSampleCount () {
    const dataSize = this.telemetryEndOffset - this.telemetryStartOffset
    return Math.floor(dataSize / SAMPLE_SIZE)
  }

  /**
   * Read a specific sample by index
   * @param {number} index - Sample index (0-based)
   * @returns {Promise<BlapSample>}
   */
  async readSample (index) {
    const offset = this.telemetryStartOffset + (index * SAMPLE_SIZE)
    if (offset + SAMPLE_SIZE > this.telemetryEndOffset) {
      throw new Error(`Sample index ${index} out of range`)
    }

    const buffer = await this.readData(offset, SAMPLE_SIZE)
    return new BlapSample(buffer)
  }

  /**
   * Generator to iterate through all telemetry samples
   * Similar to the ibt parser's samples() method
   * @yields {BlapSample}
   */
  * samples () {
    const sampleCount = this.getSampleCount()
    const buffer = Buffer.alloc(SAMPLE_SIZE)

    for (let i = 0; i < sampleCount; i++) {
      const offset = this.telemetryStartOffset + (i * SAMPLE_SIZE)
      const bytesRead = fs.readSync(this.fd, buffer, 0, SAMPLE_SIZE, offset)

      if (bytesRead === SAMPLE_SIZE) {
        const sample = new BlapSample(buffer)
        // Only yield valid samples with actual data
        if (sample.isValid()) {
          yield sample
        }
      } else {
        break
      }
    }
  }

  /**
   * Get all samples as an array (for async processing)
   * Warning: loads all samples into memory
   * @returns {Promise<Array<BlapSample>>}
   */
  async getAllSamples () {
    const samples = []
    for (const sample of this.samples()) {
      samples.push(sample)
    }
    return samples
  }
}
