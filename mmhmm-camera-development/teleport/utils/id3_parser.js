//
//  id3_parser.js
//  mmhmm
//
//  Created by Steve White on 03/08/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

class ID3Parser extends ByteReader {
    load() {
        var header = this.readChars(3);
        if (header != "ID3") {
            return false;
        }

        var version = this.readI16();
        if (version == null) {
            return false;
        }
        // XXX: should probably check the version...
        var flags = this.readI16();
        if (flags == null) {
            return false;
        }
        flags = flags << 16;

        var size = this.readI24();
        if (size == null) {
            return false;
        }
        if (size < 0 || size > this.bytes.length) {
            return false;
        }
        return true;
    }
    nextTag() {
        var code = this.readChars(4);
        if (code == null) {
            return null;
        }
        var size = this.readI32();
        if (size == 0) {
            return null;
        }
        var flags = this.readI16();
        var bytes = this.readBytes(size);
        return {code, size, flags, bytes}
    }
    extractAlbumArtwork() {
        // TODO (eslint, no-constant-condition):
        /* eslint-disable no-constant-condition */
        while (true) {
            var tag = this.nextTag();
            if (tag == null) {
                return null;
            }

            if (tag.code != "APIC") { // Only interested in Attached picture tags
                continue;
            }

            var reader = new ByteReader(tag.bytes);
            /*
             * https://github.com/id3/ID3v2.4/blob/516075e38ff648a6390e48aff490abed987d3199/id3v2.4.0-frames.txt#L1085
             * Text encoding      $xx
             * MIME type          <text string> $00
             * Picture type       $xx
             * Description        <text string according to encoding> $00 (00)
             * Picture data       <binary data>
             */

            var encoding = reader.readI8();
            if (encoding == null) {
                return null;
            }
            var mime = reader.readString();
            if (mime == null || mime.startsWith("image/") == false) {
                return null;
            }

            var picType = reader.readI8();
            if (picType == null) {
                return null;
            }
            else if (picType != 3) { // 3 == Cover (Front)
                continue;
            }

            // We don't particularly care about this, but given
            // we don't know its length, we need to read it to
            // advance to the image data
            var description = reader.readString(encoding);

            var picData = reader.readBytes(reader.remaining);
            if (picData == null) {
                return null;
            }
            var blob = new Blob([picData], {type: mime});
            return blob;
        }
        /* eslint-enable no-constant-condition */
    }
}
