This was built outside of the app.  The files used to create the build:

`package.json`:
```
{
    "name": "gifuct-webpack",
    "version": "1.0.0",
    "description": "",
    "main": "index.js",
    "scripts": {
        "test": "echo \"Error: no test specified\" && exit 1",
        "build": "webpack"
    },
    "author": "",
    "license": "ISC",
    "dependencies": {
        "gifuct-js": "^2.1.2"
    },
    "devDependencies": {
        "path-browserify": "^1.0.1",
        "webpack": "^5.72.0",
        "webpack-cli": "^4.9.2"
    }
}
```

`webpack.config.json`:
```
// Import path for resolving file paths
var path = require("path");
module.exports = {
  // Specify the entry point for our app.
  entry: [path.join(__dirname, "browser.js")],
  // Specify the output file containing our bundled code.
  output: {
    path: __dirname,
    filename: 'gifuct.js',
    libraryTarget: 'umd',
  },
   // Enable WebPack to use the 'path' package.
   resolve:{
  fallback: { path: require.resolve("path-browserify")}
  }
  /**
  * In Webpack version v2.0.0 and earlier, you must tell 
  * webpack how to use "json-loader" to load 'json' files.
  * To do this Enter 'npm --save-dev install json-loader' at the 
  * command line to install the "json-loader' package, and include the 
  * following entry in your webpack.config.js.
  * module: {
    rules: [{test: /\.json$/, use: use: "json-loader"}]
  }
  **/
};
```

`browser.js`:
```
import { parseGIF, decompressFrame } from 'gifuct-js'

export function DecodeGIF(arrayBuffer) {
    var gif = parseGIF(arrayBuffer);
    if (gif == null) {
        return null;
    }
    var frames = gif.frames;
    if (frames == null) {
        return null;
    }
    frames.forEach(frame => {
        if (frame.image == null) {
            return;
        }
        frame.decompress = function() {
            const buildImagePatch = false;
            return decompressFrame(this, gif.gct, buildImagePatch);
        }
    });
    return gif;
}
```

And then its a matter of `npm install` and `npm run build`