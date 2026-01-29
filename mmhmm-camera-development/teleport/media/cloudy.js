//
//  slides/cloudy.js
//  mmhmm
//
//  Created by Steve White on 4/18/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

Media._NewWithType = function(type, mediaID, presenterID, asset) {
    var cls = Media.ClassWithIdentifier(type);
    if (cls == null) {
        console.error("Could not find class for identifier", type);
        return null;
    }

    var instance = new cls(mediaID, presenterID, asset);
    return instance;
}

Media.FromModernRecord = function(record, endpoint) {
    if (record.deleted == true) {
        console.info("Ignoring deleted record", record);
        return null;
    }

    var mediaID = record.id;
    var presenterID = record.ownerUserId;

    var asset = record.decodeAssetReference(endpoint, {key: "content"}, true);
    if (asset == null) {
        var contentURL = record.decodeProperty("contentURL", String, null);
        if (contentURL != null) {
            asset = new LocalAsset({contentURL});
        }
    }

    var type = record.decodeProperty("type", String);
    var media = Media._NewWithType(type, mediaID, presenterID, asset);
    if (media == null) {
        console.info("_NewWithType returned null for record", record);
        return null;
    }

    var success = media.decodeFromModernRecord(record, endpoint);
    if (success == false) {
        console.info("decodeFromModernRecord returned false for record", media, record);
        return null;
    }

    return media;
}
