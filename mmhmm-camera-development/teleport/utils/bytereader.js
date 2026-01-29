//
//  bytereader.js
//  mmhmm
//
//  Created by Steve White on 05/27/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class ByteReader {
    constructor(bytes) {
        this.bytes = bytes;
        this.position = 0;
    }
    /*
     *
     */
    get remaining() {
        return (this.bytes.length - this.position);
    }
    reset() {
        this.position = 0;
    }
    skip(count) {
        this.position += count;
    }
    _readIntByteLength(length) {
        var bytes = this.bytes;
        if (this.position < 0 || this.position + length > bytes.length) {
            //console.info(`Given current position '${this.position}', requested length '${length}' would be out of bounds for '${bytes.length}'`)
            return null;
        }
        var val = 0;
        while (length > 0) {
            val = (val << 8) | bytes[this.position++];
            length -= 1;
        }
        return val;
    }
    readI8() {
        return this._readIntByteLength(1);
    }
    readI16() {
        return this._readIntByteLength(2);
    }
    readI24() {
        return this._readIntByteLength(3);
    }
    readI32() {
        return this._readIntByteLength(4);
    }
    readChars(length) {
        var bytes = this.readBytes(length);
        return Array.from(bytes)
            .map(byte => String.fromCharCode(byte))
            .join("");
    }
    readBytes(length) {
        var bytes = this.bytes;
        if (this.position < 0 || this.position + length > bytes.length) {
            //console.info(`Given current position '${this.position}', requested length '${length}' would be out of bounds for '${bytes.length}'`)
            return null;
        }
        var result = bytes.subarray(this.position, this.position + length);
        this.position += length;
        return result;
    }
    readString(encoding) {
        // XXX: use better string encoding
        /*
     $00   ISO-8859-1 [ISO-8859-1]. Terminated with $00.
     $01   UTF-16 [UTF-16] encoded Unicode [UNICODE] with BOM. All
           strings in the same frame SHALL have the same byteorder.
           Terminated with $00 00.
     $02   UTF-16BE [UTF-16] encoded Unicode [UNICODE] without BOM.
           Terminated with $00 00.
     $03   UTF-8 [UTF-8] encoded Unicode [UNICODE]. Terminated with $00.
        */
        if (encoding == null || encoding < 0 || encoding > 3) {
            encoding = 3;
        }

        var start = this.position;
        var end = null;

        // TODO (eslint, no-constant-condition): add comment
        /* eslint-disable no-constant-condition */
        while (true) {
            var char = null;
            if (encoding == 0 || encoding == 3) {
                char = this.readI8();
            }
            else {
                char = this.readI16();
            }

            if (char == null) {
                return null;
            }
            else if (char == 0x00) {
                end = this.position;
                if (encoding == 0 || encoding == 3) {
                    end -= 1;
                }
                else {
                    end -= 2;
                }
                break;
            }
        }
        /* eslint-enable no-constant-condition */

        var labels = ["ISO-8859-1", "UTF-16", "UTF-16BE", "UTF-8"];
        var label = labels[encoding];
        var decoder = new TextDecoder(label);

        return decoder.decode(this.bytes.subarray(start, end));
    }
}
