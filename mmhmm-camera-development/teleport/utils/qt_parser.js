//
//  qt_parser.js
//  mmhmm
//
//  Created by Steve White on 05/27/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class QuickTimeParser extends ByteReader {
    /*
     * Only method intended to be public
     */
    extractCodecs() {
        var sampleDescriptors = this.extractSampleDescriptors();
        if (sampleDescriptors == null) {
            return null;
        }

        for (var type in sampleDescriptors) {
            var descriptors = sampleDescriptors[type];
            var codecs = descriptors.map(a => a.entries).flat().map(a => a.format).flat();
            sampleDescriptors[type] = codecs;
        }

        return sampleDescriptors;
    }
    /*
     *
     */
    nextAtom() {
        var offset = this.position;
        var length = this.readI32();
        if (length == null) {
            return null;
        }

        if (length < 8 && length != 1) {
            console.error("invalid length at offset", length, offset);
            return null;
        }
        var tag = this.readChars(4);
        if (tag == null) {
            return null;
        }
        if (length == 1) {
            // If the size field of an atom is set to 1, the type field is
            // followed by a 64-bit extended size field, which contains the
            // actual size of the atom as a 64-bit unsigned integer.
            // This is used when the size of a media data atom exceeds 2^32 bytes.
            length = (this.readI32() << 32) | this.readI32();
            length -= 8;
        }
        var data = this.readBytes(length - 8);
        var result = {
            tag,
            length,
            data,
            offset
        }
        return result;
    }
    nextAtomWithTag(tag) {
        // TODO (eslint, no-constant-condition):
        /* eslint-disable no-constant-condition */
        while (true) {
            var atom = this.nextAtom();
            if (atom == null) {
                return null;
            }
            if (atom.tag == tag) {
                return atom;
            }
        }
        /* eslint-enable no-constant-condition */
    }
    nextAtomsWithTag(tag) {
        var results = [];
        var atom = null;
        while ((atom = this.nextAtomWithTag(tag)) != null) {
            results.push(atom);
        }
        return results;
    }
    extractSampleDescriptors() {
        var tracks = null;

        var moov = this.nextAtomWithTag("moov");
        if (moov != null) {
            var moovParser = new QuickTimeParser(moov.data);
            tracks = moovParser.nextAtomsWithTag("trak");
            if (tracks.length == 0) {
                console.error("no `trak` in `moov`?", moov);
            }
        }

        if (tracks == null || tracks.length == 0) {
            this.reset();
            tracks = this.nextAtomsWithTag("trak");
        }

        if (tracks == null || tracks.length == 0) {
            console.error("couldn't find any tracks");
            return null;
        }

        var results = {};
        tracks.forEach(track => {
            var trackParser = new QuickTimeParser(track.data);
            var media = trackParser.nextAtomWithTag("mdia");
            if (media == null) {
                console.error("no `mdia` in `trak`?", track);
                return;
            }

            var mediaParser = new QuickTimeParser(media.data);
            var handler = mediaParser.nextAtomWithTag("hdlr");
            var type = null;
            if (handler != null) {
                type = this.parseMediaHandlerType(handler.data);
            }
            mediaParser.reset();

            var mediaInfo = mediaParser.nextAtomWithTag('minf');
            if (mediaInfo == null) {
                console.error("no `minf` in `mdia`?", media);
                return;
            }

            var infoParser = new QuickTimeParser(mediaInfo.data);
            var sampleTable = infoParser.nextAtomWithTag('stbl');
            if (sampleTable == null) {
                console.error("no `stbl` in `minf`?", mediaInfo);
                return;
            }

            var sampleParser = new QuickTimeParser(sampleTable.data);
            var sampleDescriptor = sampleParser.nextAtomWithTag('stsd');
            if (sampleDescriptor == null) {
                console.error("no `stsd` in `stbl`?", sampleTable);
                return;
            }

            var parsedDescriptor = this.parseSampleDescriptor(sampleDescriptor.data);
            if (parsedDescriptor == null) {
                console.error("couldn't parse sample descriptor", sampleDescriptor);
                return;
            }

            if (type == null) {
                type = "unknown";
            }
            else if (type == "soun") {
                type = "audio";
            }
            else if (type == "vide") {
                type = "video";
            }

            var entries = results[type];
            if (entries == null) {
                entries = [];
                results[type] = entries;
            }
            entries.push(parsedDescriptor)
        });
        return results;
    }
    parseMediaHandlerType(handler) {
        if (handler.length < 12) {
            console.error("not enough data in handler", handler);
            return null;
        }

        var parser = new ByteReader(handler);
        parser.skip(8);
        return parser.readChars(4);
    }
    parseSampleDescriptor(descriptor) {
        if (descriptor == null || descriptor.length < 8) {
            console.error("invalid descriptor", descriptor);
            return null;
        }

        var parser = new ByteReader(descriptor);
        var version = parser.readI8();
        var flags = parser.readI24();
        var numEntries = parser.readI32();

        var result = {
            version,
            flags,
            entries: []
        };

        for (var entryIdx = 0; entryIdx < numEntries; entryIdx += 1) {
            var size = parser.readI32();
            if (size == null) {
                break;
            }
            var format = parser.readChars(4);
            if (format == null) {
                break;
            }
            var data = parser.readBytes(size - 8);
            if (data == null) {
                break;
            }
            result.entries.push({
                format,
                data
            });
            // If the format is avc1, we could look for an avcC
            // and include that...
        }
        return result;
    }
}
