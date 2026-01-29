//
//  fingerprints.js
//  mmhmm
//
//  Created by Steve White.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

async function FingerprintForBlob(blob) {
    var extensionForMimeType = function(type) {
        if (type != null) {
            type = type.toLowerCase();
        }
        switch (type) {
            case "image/jpeg":
            case "image/jpg":
                return "jpg";
            case "image/png":
                return "png";
            case "image/gif":
                return "gif";
            case "image/svg+xml":
                return "svg";
            case "video/mov":
            case "video/quicktime":
                return "mov";
            case "video/mp4":
                return "mp4";
            case "application/pdf":
                return "pdf";
            default:
                return "bin";
        }
    }
    var extensionFromName = function(name) {
        var dotIndex = name.lastIndexOf(".");
        if (dotIndex == -1) {
            return null;
        }
        var extension = name.substring(dotIndex + 1)
        if (extension.length == 0) {
            return null;
        }
        return extension.toLowerCase();
    }

    var size = blob.size;
    var extension = null;
    if (blob.name != null) {
        extension = extensionFromName(blob.name);
    }
    if (extension == null) {
        extension = extensionForMimeType(blob.type);
    }

    var buffer = await blob.arrayBuffer();
    var digest = await crypto.subtle.digest('SHA-1', buffer);
    var hash = DigestToHexString(digest);

    return `${extension}.${size}.sha1.${hash}`;
}
