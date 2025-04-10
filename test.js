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
