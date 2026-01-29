# Run a local HTTPS server hosting Sparkle updates for Xcode debugging

1. Run `generate_server_certificate.sh` to generate a cryprographic key pair. Confirm and authorize to add the certificate part to the system keychain when prompted. The file containing the keys remains in the server directory. By default, it will be valid for one year.
2. Use `build.sh`, `snp.sh` and `generate_sparkle_appcast.sh` in the build tools folder to create one or more Sparkle updates. The Sparkle appcast's URL prefixes must match the actual `localhost:<port>` published by the server, e. g. `% generate_sparkle_appcast.sh --track test --url-prefix https://localhost:4443 --link www.airtimetools.com --sparkle-xml sparkle-appcast.xml`
3. Put a Sparkle appcast XML file and the update files it advertises into the server folder.
4. Run `server.py` directly or conveniently via the Xcode project's Sparkle debug scheme, which automatically starts, listens to and stops the local Sparkle server.

[!ATTENTION] This server implemtation is only suitable for local debugging as all files, including the private cryptographic key used to secure the server, reside in the same folder that becomes available as `localhost`.
