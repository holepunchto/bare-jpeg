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

## License

Apache-2.0
