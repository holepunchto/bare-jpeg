const binding = require('./binding')

const MARKER_PREFIX = 0xff
const SOI = 0xd8
const EOI = 0xd9
const SOS = 0xda
const APP0 = 0xe0
const APP15 = 0xef
const COM = 0xfe

exports.decode = function decode(image) {
  const { width, height, data } = binding.decode(image)

  return {
    width,
    height,
    data: Buffer.from(data)
  }
}

exports.encode = function encode(image, opts = {}) {
  const { quality = 90 } = opts

  const buffer = binding.encode(image.data, image.width, image.height, clamp(quality, 0, 100))

  return Buffer.from(buffer)
}

exports.readMarkers = function readMarkers(image) {
  return binding.readMarkers(image).map(({ marker, data }) => {
    return {
      marker,
      data: Buffer.from(data)
    }
  })
}

exports.writeMarkers = function writeMarkers(image, markers = []) {
  if (image.length < 2 || image[0] !== MARKER_PREFIX || image[1] !== SOI) {
    throw new Error('Invalid JPEG')
  }

  const output = [image.subarray(0, 2)]
  let offset = 2

  while (offset < image.length) {
    const start = offset

    while (offset < image.length && image[offset] === MARKER_PREFIX) {
      offset++
    }

    if (offset >= image.length) {
      throw new Error('Invalid JPEG')
    }

    const marker = image[offset]

    if (marker === SOS || marker === EOI) {
      for (const marker of markers) {
        const payload = Buffer.from(marker.data)
        const segment = Buffer.allocUnsafe(payload.length + 4)

        segment[0] = MARKER_PREFIX
        segment[1] = marker.marker
        segment.writeUInt16BE(payload.length + 2, 2)
        payload.copy(segment, 4)

        output.push(segment)
      }

      output.push(image.subarray(start))
      return Buffer.concat(output)
    }

    if (offset + 2 >= image.length) {
      throw new Error('Invalid JPEG')
    }

    const length = image.readUInt16BE(offset + 1)
    const end = offset + 1 + length

    if (length < 2 || end > image.length) {
      throw new Error('Invalid JPEG')
    }

    if ((marker < APP0 || marker > APP15) && marker !== COM) {
      output.push(image.subarray(start, end))
    }

    offset = end
  }

  throw new Error('Invalid JPEG')
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
