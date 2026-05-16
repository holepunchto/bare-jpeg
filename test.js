const test = require('brittle')
const jpeg = require('.')

test('decode .jpg', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  t.comment(jpeg.decode(image))
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
