# bare-jpeg

JPEG support for Bare.

```
npm i bare-jpeg
```

## Usage

```js
const jpeg = require('bare-jpeg')

const image = require('./my-image.jpg', { with: { type: 'binary' } })

const decoded = jpeg.decode(image)
// {
//   width: 200,
//   height: 400,
//   data: <Buffer>
// }

const encoded = jpeg.encode(decoded)
// <Buffer>
```

Header:

```js
const header = jpeg.readHeader(image)
// {
//   width: 200,
//   height: 400,
//   colorSpace: 3,
//   ...
//   markers: [{ marker: 224, data: <Buffer> }, ...] // APP0-APP15 and COM
// }
```

Utility to replace markers:

```js
const newImage = jpeg.writeMarkers(image, [
  { marker: 0xfe, data: Buffer.from('This is a comment') }
])
// <Buffer>
```

`writeMarkers()` returns a new image, replacing the existing `APP0`-`APP15` and `COM` markers without re-encoding the pixel data.

## License

Apache-2.0
