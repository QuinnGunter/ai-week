This was built outside of the app.  The files used to create the build:

`package.json`:
```
{
    "name": "aws-webpack",
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
        "@aws-crypto/sha256-browser": "^2.0.1",
        "@aws-sdk/protocol-http": "^3.53.0",
        "@aws-sdk/s3-request-presigner": "^3.53.1"
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
    filename: 's3_presigner.js',
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
import { S3RequestPresigner, S3RequestPresignerOptions } from "@aws-sdk/s3-request-presigner";
import { Sha256 } from "@aws-crypto/sha256-browser";
import { HttpRequest } from "@aws-sdk/protocol-http";

export async function MakePresignedRequest(
    service,
    region,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    url,
    method = "PUT",
    expires = 3600,
)
{
    const s3ResolvedConfig = {
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
        sessionToken: sessionToken,
      },
      region: region,
      sha256: Sha256,
      signingName: "s3",
    };
    const presigningOptions = {
      expiresIn: expires,
      signingDate: new Date(),
    };
    const minimalRequest = new HttpRequest({
      method: method,
      protocol: url.protocol,
      path: url.pathname,
      headers: {
        host: url.hostname,
      },
      hostname: url.hostname,
    });

    const signer = new S3RequestPresigner(s3ResolvedConfig);
    return await signer.presign(minimalRequest, presigningOptions);
}
```

And then its a matter of `npm install` and `npm run build`