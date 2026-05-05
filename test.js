const test = require('brittle')
const jpeg = require('.')

test('decode .jpg', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  t.comment(jpeg.decode(image))
})

test('encode .jpg', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const decoded = jpeg.decode(image)

  t.comment(jpeg.encode(decoded))
})

test('read header', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const header = jpeg.readHeader(image)

  t.ok(Number.isInteger(header.width))
  t.ok(Number.isInteger(header.height))
  t.ok(Number.isInteger(header.components))
  t.is(header.componentInfo.length, header.components)
  t.ok(Array.isArray(header.componentInfo))
  t.ok(Array.isArray(header.markers))
  t.ok(header.markers.every((m) => Number.isInteger(m.marker)))
  t.ok(header.markers.every((m) => Buffer.isBuffer(m.data)))
})

test('replace markers', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })
  const APP15 = 0xef
  const data = Buffer.from('a marker')

  const output = jpeg.replaceMarkers(image, [{ marker: APP15, data }])

  const { markers } = jpeg.readHeader(output)
  const marker = markers.find((marker) => marker.marker === APP15)

  t.ok(Buffer.isBuffer(output))
  t.ok(marker.data.equals(data))
})
