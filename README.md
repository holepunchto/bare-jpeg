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

Markers:

```js
const markers = jpeg.readMarkers(image)
// [{ marker: 224, data: <Buffer> }, ...]

const newImage = jpeg.writeMarkers(image, [
  { marker: 0xfe, data: Buffer.from('This is a comment') }
])
// <Buffer>
```

`readMarkers()`: returns `APP0`-`APP15` and `COM` markers.

`writeMarkers()`: returns a new image with replacing `APP0`-`APP15` and `COM` markers in an existing JPEG without re-encoding the pixel data.

## License

Apache-2.0
