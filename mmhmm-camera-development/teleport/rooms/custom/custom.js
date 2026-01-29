//
//  custom.js
//  mmhmm
//
//  Created by Steve White on 3/22/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

// This class is used for both custom rooms (those added by the user)
// and catalog rooms (those retrieved from the mmhmm service).
class CustomRoom extends Room {
    constructor(asset, model, thumbnailAsset) {
        super(model.identifier, model.title, null /*thumbnailSrc*/ );

        this.asset = asset;
        this.thumbnailAsset = thumbnailAsset;
        this.model = model;
        model.addObserverForProperty(this, "title");

        this.identifierForScene = model.identifierForScene;

        if (this.thumbnailAsset == null) {
            this.createThumbnailFromAsset();
        }
    }
    get hash() {
        return this.model?.hash;
    }
    isCatalogRoom() {
        return this.model.catalogueIdentifier != null;
    }
    destroy() {
        var model = this.model;
        if (model != null) {
            model.removeObserverForProperty(this, "title");
        }
    }
    get title() {
        var model = this.model;
        if (model != null) {
            return model.title;
        }
        return null;
    }
    set title(title) {
        var model = this.model;
        if (model != null) {
            model.title = title;
        }
    }
    get assets() {
        return [this.asset];
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        var layer = this.layer;
        this.rootLayer = layer;

        var model = this.model;
        model.addObserverForProperty(this, "fillStyle");
        model.addObserverForProperty(this, "fillPaint");
        model.undoManager = this.undoManager;

        var fillLayer = new RenderLayer();
        fillLayer.size = layer.size;
        fillLayer.position = layer.position;
        fillLayer.opaque = true;
        layer.addSublayer(fillLayer);
        this.fillLayer = fillLayer;
        this.updateFillColor();

        var imageLayer = new RenderLayer();
        imageLayer.hidden = true;
        imageLayer.userInteractionEnabled = false;
        imageLayer.delegate = this;
        layer.addSublayer(imageLayer);
        this.imageLayer = imageLayer;

        const mime = this.asset?.mimeType ?? "";
        if (mime.endsWith("jpeg") == true) {
            layer.opaque = true;
        }

        var asset = this.asset;
        if (asset == null) {
            console.error("Can't really proceed w/o an asset!");
            return;
        }

        var cachedElement = this.getCachedElementForAsset(asset);
        if (cachedElement != null) {
            this._loadImageLayerContents(cachedElement);
            this._cachedElement = null;
        }
        else {
            asset.openAsElement().then(element => {
                this._loadImageLayerContents(element);
            });
        }
    }
    _loadImageLayerContents(element) {
        var imageLayer = this.imageLayer;
        if (imageLayer == null) {
            return;
        }

        imageLayer.contents = element;
        if (element.play != null) {
            element.muted = true;
            element.loop = true;
            element.play();
        }
        imageLayer.hidden = false;
        this.updateLayers();
    }
    willDetachFromStage(stage) {
        super.willDetachFromStage(stage);

        // Stop the video background if it's playing, otherwise the browser
        // might keep it playing until it's complete
        var imageLayer = this.imageLayer;
        if (imageLayer != null) {
            var element = imageLayer.contents;
            if (element != null && element.tagName == "VIDEO") {
                element.pause();
            }
            this.imageLayer = null;
        }

        this.rootLayer = null;
        this.fillLayer = null;

        var model = this.model;
        model.removeObserverForProperty(this, "fillStyle");
        model.removeObserverForProperty(this, "fillPaint");
        model.undoManager = null;
    }
    /*
     * Thumbnails
     */
    async createThumbnailFromAsset() {
        // This function creates a thumbnail of the custom room's underlying asset
        // It doesn't reflect the state of the room; see generateThumbnailForState

        // For custom rooms, thumbnail asset is either a CloudyAsset backed by an S3 object URL
        // or a LocalAsset backed by a URL. Either way it's an asset.
        if (this.thumbnailAsset != null) {
            return this.thumbnailAsset;
        }

        // Legacy custom rooms loaded from the service may not have a thumbnailAsset;
        // create one from the primary asset
        console.log("No thumbnailAsset for room", this);

        // TODO is there already a place where we persist an actual thumbnail asset
        // up to the cloud?

        var asset = this.asset;
        if (asset == null) {
            console.error("Cannot create thumbnail w/o an asset", this);
            return;
        }

        return ThumbnailStorage.shared.get(asset, {decode: false}).then(blob => {
            var thumbnailAsset = new LocalAsset({blob});
            this.thumbnailAsset = thumbnailAsset;
            return thumbnailAsset;
        }).catch(err => {
            console.error("ThumbnailStorage returned error", err, asset);
        });
    }
    async thumbnailForState(state) {
        // TODO rework custom room thumbnailing so that we cache
        // thumbnails locally
        return this.generateThumbnailForState(state).then(asset => {
            return asset.openAsElement();
        });
    }
    async generateThumbnailForState(state) {
        // TODO do we ever use something cached?
        // For custom rooms it seems like we should create a thumbnail when
        // the room settings change, persist it, and use it whenever needed
        var thumbnailAsset = await this.createThumbnailFromAsset();
        if (thumbnailAsset == null) {
            // We have no thumbnail asset to use, so fall back to a placeholder
            return new LocalAsset({contentURL: ThumbnailStorage.AssetMissing});
        }
        var thumbnail = await thumbnailAsset.openAsBlob();

        if (this.isCatalogRoom()) {
            return new LocalAsset({blob: thumbnail});
        }

        // For true custom rooms (not catalog rooms), apply fit/fill/background
        var model = new CustomRoom.Model();
        model.applyEvent(state.model);

        var stageSize = gApp.stage.size;
        const scale = 4;
        var thumbnailSize = SizeMake(stageSize.width / scale, stageSize.height / scale);
        var thumbnailOpts = {
            size: thumbnailSize,
            type: "image/jpeg",
            quality: 0.7
        };

        var blob = await ImageBlobWithOptionsUsingCommands(thumbnailOpts, async (context, loader) => {
            context.scale(1.0 / scale, 1.0 / scale);

            var fillPaint = model.fillPaint;
            if (fillPaint != null) {
                fillPaint.fillInContext(context, stageSize);
            }

            var image = await loader(thumbnail);

            var imageSize = SizeMake(image.naturalWidth, image.naturalHeight);
            var fillStyle = model.fillStyle;
            if (fillStyle != CustomRoom.FillStyle.Tile) {
                var imageScale = 1;
                if (fillStyle == CustomRoom.FillStyle.AspectFit) {
                    imageScale = Math.min(
                        stageSize.width / imageSize.width,
                        stageSize.height / imageSize.height,
                    );
                }
                else {
                    imageScale = Math.max(
                        stageSize.width / imageSize.width,
                        stageSize.height / imageSize.height,
                    );
                }

                var frame = RectZero();
                frame.width = imageSize.width * imageScale;
                frame.height = imageSize.height * imageScale;
                frame.x = (stageSize.width - frame.width) / 2;
                frame.y = (stageSize.height - frame.height) / 2;
                context.drawImage(image, frame.x, frame.y, frame.width, frame.height);
            }
            else {
                var columns = Math.ceil(stageSize.width / imageSize.width);
                var rows = Math.ceil(stageSize.height / imageSize.height);
                var y = (stageSize.height - (rows * imageSize.height)) / 2;
                for (var row = 0; row < rows; row++) {
                    var x = (stageSize.width - (columns * imageSize.width)) / 2;
                    for (var col = 0; col < columns; col++) {
                        context.drawImage(image, x, y, imageSize.width, imageSize.height);
                        x += imageSize.width;
                    }
                    y += imageSize.height;
                }
            }
        });

        return new LocalAsset({blob});
    }
    /*
     *
     */
    updateLayers() {
        var rootLayer = this.rootLayer;
        if (rootLayer == null) {
            // Maybe we're not on stage anymore...
            return;
        }
        var parentSize = rootLayer.size;
        if (SizeEquals(parentSize, SizeZero()) == true) {
            parentSize = this.stage?.size ?? Stage.DefaultSize;
        }

        var fillLayer = this.fillLayer;
        var imageLayer = this.imageLayer;

        // Always centered within the parent
        imageLayer.position = PointMake(parentSize.width / 2, parentSize.height / 2);
        fillLayer.position = PointMake(parentSize.width / 2, parentSize.height / 2);

        // Fill layer always fills the parent
        fillLayer.size = parentSize;

        var fillStyle = this.model.fillStyle;
        if (fillStyle == CustomRoom.FillStyle.Tile) {
            var tileFilter = imageLayer.filters.find(filter => IsKindOf(filter, TileFilter));
            if (tileFilter == null) {
                imageLayer.filter = new TileFilter();
            }
            imageLayer.size = parentSize;
        }
        else {
            imageLayer.filter = null;

            var imageSize = imageLayer.naturalSize;
            var scale = null;

            if (fillStyle == CustomRoom.FillStyle.AspectFit) {
                scale = Math.min(parentSize.width / imageSize.width, parentSize.height / imageSize.height);
            }
            else {
                // default, aspect fill...
                scale = Math.max(parentSize.width / imageSize.width, parentSize.height / imageSize.height);
            }

            imageLayer.size = SizeMake(imageSize.width * scale, imageSize.height * scale);
        }
    }
    updateFillColor() {
        var fillLayer = this.fillLayer;
        var filterOfClass = function(cls) {
            var filter = fillLayer.filters.find(filter => IsKindOf(filter, cls));
            if (filter == null) {
                filter = new cls();
                fillLayer.filter = filter;
            }
            return filter;
        }

        var paint = this.model.fillPaint;
        if (paint == null) {
            fillLayer.hidden = true;
        }

        const filter = filterOfClass(paint.filterClass);
        if (filter == null) {
            fillLayer.hidden = true;
        }
        else {
            const visible = paint.applyToFilter(filter);
            fillLayer.hidden = (visible == false);
        }
    }
    observePropertyChanged(obj, key, val) {
        if (key == "fillStyle") {
            this.updateLayers();
        }
        else if (key == "fillPaint") {
            this.updateFillColor();
        }
        else if (key == "title") {
            this.didChangeValueForProperty(val, key);
        }

        if (obj == this.model) {
            NotificationCenter.default.postNotification(
                Room.Notifications.SettingsChanged,
                this,
                null
            );

            this._postThumbnailChangedNotification();
        }
    }
    /*
     * Cloudy helper
     */
    toCloudy() {
        return this.model.toCloudy();
    }
    /*
     * Teleport helpers
     */
    applyEvent(event, sender) {
        super.applyEvent(event, sender);
        var model = event.model;
        if (model != null) {
            this.model.applyEvent(model, sender);
        }
    }
    toMedia() {
        var r = super.toMedia();
        var state = r.state;
        if (state != null) {
            delete state.asset;
            delete state.thumbnailAsset;
            delete state.contentURL;
        }
        return r;
    }
    toJSON() {
        var r = super.toJSON();
        r.asset = this.asset;
        r.thumbnailAsset = this.thumbnailAsset;
        r.model = this.model;
        return r;
    }
}

CustomRoom.FillStyle = Object.freeze({
    AspectFill: "aspectFill",
    AspectFit: "aspectFit",
    Tile: "tile"
});

CustomRoom.Notifications = Object.freeze({
    Modified: "CustomRoom.Modified"
});

CustomRoom.Model = class extends ObservableObject {
    constructor(identifier, presenterID) {
        super();

        this.identifier = identifier;
        this.presenterID = presenterID;
        this.catalogueIdentifier = null;

        this._title = null;

        this._fillStyle = CustomRoom.FillStyle.AspectFill;
        this._fillPaint = Paint.Black();
    }
    get hash() {
        let str = this.FillStyle;
        str += JSON.stringify(this.fillPaint);
        return cyrb53(str);
    }
    set fillStyle(aFillStyle) {
        var validFillStyle = false;
        for (var key in CustomRoom.FillStyle) {
            if (CustomRoom.FillStyle[key] == aFillStyle) {
                validFillStyle = true;
            }
        }
        if (validFillStyle == false) {
            aFillStyle = CustomRoom.FillStyle.AspectFill;
        }

        var previous = this._fillStyle;
        if (EqualObjects(aFillStyle, previous) == true) {
            return;
        }
        this._fillStyle = aFillStyle;
        this._postModifiedNotification();
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'fillStyle', previous);
    }
    get fillStyle() {
        return this._fillStyle;
    }
    set fillPaint(aFillPaint) {
        if (aFillPaint == null) {
            aFillPaint = Paint.Black();
        }

        var previous = this._fillPaint;
        if (EqualObjects(aFillPaint, previous) == true) {
            return;
        }
        this._fillPaint = aFillPaint;
        this._postModifiedNotification();
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'fillPaint', previous);
    }
    get fillPaint() {
        return this._fillPaint;
    }
    set title(aTitle) {
        if (EqualObjects(aTitle, this._title) == true) {
            return;
        }
        this._title = aTitle;
        this._postModifiedNotification();
    }
    get title() {
        return this._title;
    }
    /*
     * Teleport
     */
    applyEvent(event, sender) {
        if (event == null) {
            return;
        }

        if ("title" in event) {
            const title = event.title;
            if (this.title != title) {
                this.title = title;
            }
        }
        if ("fillStyle" in event) {
            const fillStyle = event.fillStyle;
            if (this.fillStyle != fillStyle) {
                this.fillStyle = fillStyle;
            }
        }
        if ("fillPaint" in event) {
            const data = event.fillPaint;
            if (EqualObjects(data, this.fillPaint.toJSON()) == false) {
                const fillPaint = Paint.FromJSON(data);
                this.fillPaint = fillPaint;
            }
        }
    }
    toJSON() {
        var r = {
            fillStyle: this.fillStyle,
            fillPaint: this.fillPaint,
            title: this.title,
        };
        return r;
    }
    /*
     * Cloudy
     */
    _postModifiedNotification() {
        if (this._decoding == true) {
            return;
        }
        NotificationCenter.default.postNotification(CustomRoom.Notifications.Modified, this, {})
    }
    decodeUsingCloudyRecord(record) {
        this._decoding = true;
        try {
            this.created = new Date(record.createdAt);

            var title = record.decodeProperty("title", String);
            if (title != this.title) {
                this.title = title;
            }

            var alsoKnownAs = record.decodeProperty("roomIdentifier", String);
            if (alsoKnownAs != null) {
                this.identifierForScene = alsoKnownAs;
            }

            var fillStyle = record.decodeProperty("backgroundFillStyle", String);
            if (fillStyle != this.fillStyle) {
                this.fillStyle = fillStyle;
            }

            var encodedPaint = record.decodeProperty("backgroundFillPaint", Object);
            if (encodedPaint != null && Object.keys(encodedPaint).length > 0) {
                var fillPaint = Paint.FromCloudy(encodedPaint);
                if (fillPaint.equals(this.fillPaint) == false) {
                    this.fillPaint = fillPaint;
                }
            }
        }
        finally {
            this._decoding = false;
        }
    }
    toCloudy() {
        var r = {
            backgroundFillStyle: this.fillStyle,
            backgroundFillPaint: this.fillPaint.toCloudy(),
            title: this.title,
        }
        var catalogueIdentifier = this.catalogueIdentifier;
        if (catalogueIdentifier != null) {
            r.catalogueIdentifier = catalogueIdentifier;
        }
        return r;
    }
}

CustomRoom.FromCloudy = function(record, endpoint) {
    var model = new CustomRoom.Model(record.id, endpoint.user.id);
    model.decodeUsingCloudyRecord(record);

    var asset = record.decodeAssetReference(endpoint, {key: "background"}, true);
    if (asset == null) {
        return null;
    }
    if (asset.uploaded == false) {
        console.log("Refusing to create CustomRoom for record, as the asset is not uploaded", record, asset);
        return null;
    }

    var thumbnailAsset = record.decodeAssetReference(endpoint, {key: "thumbnail"}, true);
    if (thumbnailAsset == null) {
        console.error("Missing thumbnailAssetFingerprint for custom room", record);
    }

    return new CustomRoom(asset, model, thumbnailAsset);
}

CustomRoom.FromTeleport = function(event, sender) {
    var assetData = event.asset;
    if (assetData == null) {
        return null;
    }

    var asset = new LocalAsset(event.asset);
    var thumbnailAsset = new LocalAsset(event.thumbnailAsset);
    var model = new CustomRoom.Model(event.id, sender);
    model.applyEvent(event);

    var room = new CustomRoom(asset, model, thumbnailAsset);
    return room;
}
