const test = require('brittle')
const jpeg = require('.')

test('decode .jpg', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const decoded = jpeg.decode(image)

  t.comment(decoded)
  t.is(decoded.data.length, decoded.width * decoded.height * 4)
})

test('decode should throw on invalid .jpg', (t) => {
  const invalid = Buffer.from('this is not a jpeg')
  t.exception(() => {
    jpeg.decode(invalid)
  }, /Not a JPEG file/i)
})

test('encode .jpg', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const decoded = jpeg.decode(image)

  t.comment(jpeg.encode(decoded))
})

test('encode should throw on invalid rgba', (t) => {
  const invalid = {
    width: 0,
    height: 0,
    data: Buffer.alloc(1)
  }
  t.exception(() => {
    jpeg.encode(invalid)
  }, /Empty JPEG image/i)
})

test('encode should throw on width above JPEG max dimension', (t) => {
  const invalid = {
    width: 65501,
    height: 1,
    data: Buffer.alloc(4)
  }
  t.exception(() => {
    jpeg.encode(invalid)
  }, /Invalid JPEG dimensions/i)
})

test('encode should throw on height above JPEG max dimension', (t) => {
  const invalid = {
    width: 1,
    height: 65501,
    data: Buffer.alloc(4)
  }
  t.exception(() => {
    jpeg.encode(invalid)
  }, /Invalid JPEG dimensions/i)
})

test('encode should throw on width that overflows uint32', (t) => {
  // Without validation this truncates to a small value when assigned to the
  // libjpeg encoder's uint32 image_width, so libjpeg accepts it; the malloc
  // and per-row write loop still see the un-truncated int64 width.
  const invalid = {
    width: 0x100000064,
    height: 1,
    data: Buffer.alloc(4)
  }
  t.exception(() => {
    jpeg.encode(invalid)
  }, /Invalid JPEG dimensions/i)
})

test('encode should throw on negative dimensions', (t) => {
  const invalid = {
    width: -1,
    height: 1,
    data: Buffer.alloc(4)
  }
  t.exception(() => {
    jpeg.encode(invalid)
  }, /Invalid JPEG dimensions/i)
})

test('readHeader of a .jpg', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const header = jpeg.readHeader(image)

  t.is(header.width, 332)
  t.is(header.height, 332)
  t.is(header.components, 3)
  t.is(header.componentInfo.length, header.components)
  t.alike(header.componentInfo, [
    { id: 1, hSampFactor: 2, vSampFactor: 2, quantTblNo: 0 },
    { id: 2, hSampFactor: 1, vSampFactor: 1, quantTblNo: 1 },
    { id: 3, hSampFactor: 1, vSampFactor: 1, quantTblNo: 1 }
  ])
  t.is(header.precision, 8)
  t.is(header.progressive, true)
  t.is(header.restartInterval, 0)
  t.is(header.quantTables, 2)
  t.is(header.dcHuffmanTables, 2)
  t.is(header.acHuffmanTables, 2)
  t.is(header.jfif.majorVersion, 1)
  t.is(header.jfif.minorVersion, 1)
  t.is(header.jfif.densityUnit, 0)
  t.is(header.jfif.xDensity, 72)
  t.is(header.jfif.yDensity, 72)
  t.is(header.adobe, null)
  t.ok(Array.isArray(header.markers))
  t.is(header.markers.length, 3)
  t.is(header.markers[0].marker, 0xe0)
  t.is(header.markers[1].marker, 0xe1)
  t.is(header.markers[2].marker, 0xed)
  t.ok(header.markers.every((m) => Buffer.isBuffer(m.data)))
})

test('readHeader should throw on invalid .jpg', (t) => {
  const invalid = Buffer.from('this is not a jpeg')
  t.exception(() => {
    jpeg.readHeader(invalid)
  }, /Not a JPEG file/i)
})

test('replace markers', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })
  const APP15 = 0xef
  const data = Buffer.from('one marker')

  const outImage = jpeg.replaceMarkers(image, [{ marker: APP15, data }])

  const { markers } = jpeg.readHeader(outImage)
  t.ok(Buffer.isBuffer(outImage))
  t.is(markers.length, 1)
  t.is(markers[0].marker, APP15)
  t.ok(markers[0].data.equals(data))
})

test('replace markers preserves segment order', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const header = jpeg.readHeader(image)
  const outImage = jpeg.replaceMarkers(image, header.markers)
  const headerOut = jpeg.readHeader(outImage)

  t.ok(Buffer.isBuffer(outImage))
  t.is(header.markers.length, headerOut.markers.length)
  t.is(header.markers.length, 3)
  t.alike(header.markers[0].data, headerOut.markers[0].data)
  t.alike(header.markers[1].data, headerOut.markers[1].data)
  t.alike(header.markers[2].data, headerOut.markers[2].data)
  t.alike(image, outImage) // if the roundtrip is identical, segments stayed in the same order
})

test('replace markers appends leftovers when given more than exist', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  // grapefruit has 3 APP markers; pass 5 so the last 2 hit the leftover-append
  // branch at the SOS/EOI boundary.
  const markers = Array.from({ length: 5 }, (_, i) => ({
    marker: 0xef,
    data: Buffer.from(`marker ${i}`)
  }))

  const outImage = jpeg.replaceMarkers(image, markers)
  const { markers: out } = jpeg.readHeader(outImage)

  t.is(out.length, 5)
})

test('replaceMarkers throws on non-JPEG input', (t) => {
  t.exception(() => jpeg.replaceMarkers(Buffer.from([0x00, 0x00])), /Invalid JPEG/)
})

test('replaceMarkers throws on a truncated segment', (t) => {
  // SOI, then an APP0 marker whose declared length runs past the buffer end.
  const truncated = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xff])

  t.exception(() => jpeg.replaceMarkers(truncated), /Invalid JPEG/)
})

test('encode clamps quality above 100 down to 100', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const decoded = jpeg.decode(image)

  t.alike(
    jpeg.encode(decoded, { quality: 200 }),
    jpeg.encode(decoded, { quality: 100 })
  )
})

test('encode clamps quality below 0 up to 0', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const decoded = jpeg.decode(image)

  t.alike(
    jpeg.encode(decoded, { quality: -50 }),
    jpeg.encode(decoded, { quality: 0 })
  )
})
