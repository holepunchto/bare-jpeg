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

test('read markers', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const markers = jpeg.readMarkers(image)

  t.ok(markers.length > 0)
  t.ok(markers.every((marker) => Number.isInteger(marker.marker)))
  t.ok(markers.every((marker) => Buffer.isBuffer(marker.data)))
})
