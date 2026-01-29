//
//  media/drawing/media.js
//  mmhmm
//
//  Created by Steve White on 8/17/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

Media.Drawing = class extends Media {
    /*
     * Overrides
     */
    constructor(identifier, presenterID, anOptionalAsset) {
        super(identifier, presenterID);

        this.moveTool = {
            id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
            name: LocalizedString("Move"),
            icon: AppIcons.Move(),
        };

        this.pens = [
            this.moveTool,
            {
                id: "01925817-36d8-4bf1-bede-25e6faf10fc8",
                name: LocalizedString("Marker"),
                icon: AppIcons.PaintBrush(),
            },
            {
                id: "c5939117-c039-4b96-a6fa-d574bc5240b4",
                name: LocalizedString("Ballpoint"),
                icon: AppIcons.Pen(),
                textureName: "ballpoint.jpg",
            }
        ];
        this.defaultPenStyle = this.pens.find(pen => pen != this.moveTool);

        this.colors = ["#000000", "#bf4027", "#df8731", "#f6d058", "#84b842", "#6ea5f4", "#8e75e6", "#ffffff"];
        this.defaultColor = this.colors[1];

        this.scale = 0.8;
        this.anchor = Stage.Object.Anchor.Center;
        this.title = LocalizedString("Whiteboard");

        if (anOptionalAsset != null) {
            this.asset = anOptionalAsset;
        }
        else {
            // We need an asset to send the service
            // so we'll use a 1x1 png, rgba(255,255,255,1.0)
            this.asset = new PlaceholderAsset(false);
        }
    }
    get croppable() {
        return false;
    }
    newLayer(stageSize) {
        const layer = new CanvasLayer(stageSize.width, stageSize.height);
        layer.opaque = true;
        return layer;
    }
    _cropInsetsChanged() {
        // Intentionally blank, We do not want the default behavior.
    }
    newSizeButton() {
        var sizeButton = Stage.Object.Overlay.NewButton(
            LocalizedString("Fullscreen"),
            (this.fullscreen ? AppIcons.Collapse() : AppIcons.Expand()),
            evt => {
                this.toggleFullscreen();
            },
        );
        return sizeButton;
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        var overlayHelper = this.overlayHelper;
        if (overlayHelper != null) {
            var controlsHelper = this.controlsHelper;
            if (controlsHelper == null) {
                controlsHelper = new DrawingSlideControls(this);
                this.controlsHelper = controlsHelper;
            }

            overlayHelper.setButtonBarAtPosition(controlsHelper.element, Stage.Object.Overlay.Position.BottomCenter);
        }

        this.cursor = null;

        this.updateLayerTransform();

        var canvas = this.layer.contents;
        this.canvas = canvas;
        this.context = canvas.getContext("2d");

        var asset = this.asset;
        if (asset == null) {
            this.clearCanvas();
            this.handlePendingThumbnailRequest();
        }
        else {
            this.loadAssetIntoCanvas(asset, canvas, this.context);
        }
        this.asset = new CanvasBackedAsset(canvas);

        //
        // State & UI
        //
        var color = this.defaultColor;
        var penStyle = this.defaultPenStyle;

        this.state = this.newState(color, penStyle);
        // Ensure the controls accurately reflect life...
        this.color = color;
        this.penStyle = penStyle;

        this.pens.forEach(aPen => {
            var textureName = aPen.textureName;
            if (textureName == null || aPen.texture != null) {
                return;
            }
            this.loadTexture(textureName);
        });
    }
    willDetachFromStage(stage) {
        super.willDetachFromStage(stage);

        this.remoteScampers = null;
        this.scamper = null;
        this.canvas = null;
        this.context = null;

        var controlsHelper = this.controlsHelper;
        if (controlsHelper != null) {
            controlsHelper.destroy();
            this.controlsHelper = null;
        }
        this.controls = null;
    }
    loadAssetIntoCanvas(asset, canvas, context) {
        asset.openAsElement().then(image => {
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            this.layer.contentsNeedUpdate = true;
            this.handlePendingThumbnailRequest();
        }).catch(err => {
            this.clearCanvas();
        })
    }
    /*
     *
     */
    newState(color, penStyle) {
        if (color == null) {
            color = this.defaultColor;
        }
        if (penStyle == null) {
            penStyle = this.defaultPenStyle;
        }
        return {
            scamper: new Scamper(),
            color: color,
            size: 10,
            penStyle: penStyle,
        };
    }
    /*
     * UI Actions
     */
    clearCanvas() {
        var context = this.context;
        context.fillStyle = "white";
        context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.layer.contentsNeedUpdate = true;
        this.canvasClear = true;
        this.setNeedsPersistence();
    }
    set color(aColor) {
        this.state.color = aColor;
    }
    get color() {
        var state = this.state;
        if (state != null) {
            return state.color;
        }
        return this.defaultColor;
    }
    setTexture(texture) {
    }
    set penStyle(aPenStyle) {
        this.state.penStyle = aPenStyle;
        if (aPenStyle == this.moveTool) {
            this.cursor = "grab";
        }
        else {
            this.cursor = null;
        }
    }
    get penStyle() {
        var state = this.state;
        if (state != null) {
            return state.penStyle;
        }
        return this.defaultPenStyle;
    }
    penStyleWithID(penStyleID) {
        return this.pens.find(aPenStyle => aPenStyle.id == penStyleID);
    }
    updateMouseCursor() {
        var penStyle = this.penStyle;
        if (penStyle == this.moveTool) {
            super.updateMouseCursor();
            return;
        }
        this.cursor = null;
    }
    /*
     * Stroke textures
     */
    loadTexture(named) {
        var img = new Image();
        img.addEventListener("load", evt => {
            var penStyle = this.pens.find(aPen => aPen.textureName == named);
            if (penStyle != null) {
                penStyle.texture = new PlomaTexture(img);
            }
        });
        img.src = "assets/textures/" + named;
    }
    /*
     * Drawing
     */
    drawPointsWithState(points, state) {
        var context = this.context;
        this.canvasClear = false;

        var penStyle = state.penStyle;
        var texture = penStyle.texture;
        if (texture != null) {
            var imageData = context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            var color = {
                r: parseInt(state.color.substring(1, 3), 16),
                g: parseInt(state.color.substring(3, 5), 16),
                b: parseInt(state.color.substring(5, 7), 16),
            };
            const size = Math.min(10, Math.max(5, state.size));
            points.forEach(point => {
                texture.drawStep(imageData, point, color, size);
            });
            context.putImageData(imageData, 0, 0);

            if (navigator.vendor.startsWith("Apple") == true) {
                // Safari won't update the texture when we modify the
                // image data, so we'll paint over the top-left pixel
                // using the current color of the top-left pixel.
                context.fillStyle = "rgb(" + imageData[0] + ", " + imageData[1] + ", " + imageData[2] + ")"
                context.fillRect(0, 0, 1, 1);
            }
            this.layer.contentsNeedUpdate = true;
            return;
        }

        context.fillStyle = state.color;
        context.beginPath();

        const size = state.size;
        points.forEach(point => {
            context.arc(point.x, point.y, size, 0, 2 * Math.PI);
        })
        context.fill();
        this.layer.contentsNeedUpdate = true;
    }
    /*
     * Pointer events
     */
    pointFromEvent(evt) {
        var frame = this.layer.boundingBox;
        var point = evt.point;
        point.x -= RectGetMinX(frame);
        point.y -= RectGetMinY(frame);

        point.x = Math.max(0, Math.min(RectGetWidth(frame), point.x));
        point.y = Math.max(0, Math.min(RectGetHeight(frame), point.y));

        var scale = this.scale;
        if (this.fullscreen == true) {
            scale = 1.0;
        }
        if (scale < 1) {
            point.x /= scale;
            point.y /= scale;
        }

        var r = {
            x: point.x,
            y: point.y,
            p: evt.pressure,
        };
        return r;
    }
    onPointerDown(evt) {
        if (this.penStyle == this.moveTool) {
            return super.onPointerDown(evt);
        }

        var p = this.pointFromEvent(evt);
        this.state.scamper.beginStroke(p.x, p.y, p.p);
        this.setNeedsPersistence();

        var controlsHelper = this.controlsHelper;
        if (controlsHelper != null) {
            controlsHelper.element.style.display = "none";
        }
    }
    onPointerMove(evt) {
        if (this.penStyle == this.moveTool) {
            return super.onPointerMove(evt);
        }

        var p = this.pointFromEvent(evt);

        var state = this.state;
        var points = state.scamper.extendStroke(p.x, p.y, p.p);
        this.drawPointsWithState(points, state);
        this.setNeedsPersistence();
    }
    onPointerUp(evt) {
        if (this.penStyle == this.moveTool) {
            super.onPointerUp(evt);
            return;
        }

        var p = this.pointFromEvent(evt);

        var state = this.state;
        var points = state.scamper.endStroke(p.x, p.y, p.p);
        this.drawPointsWithState(points, state);
        this.setNeedsPersistence();

        var controlsHelper = this.controlsHelper;
        if (controlsHelper != null) {
            controlsHelper.element.style.display = "";
        }
    }
    /*
     * Cloudy persistence
     */
    prepareForPersistence() {
        super.prepareForPersistence();
        this.invalidateThumbnail();
    }

    /*
     * Thumbnails
     */
    async generateThumbnail() {
        const scale = 4;
        var stageSize = gApp.stage.size;
        var thumbnailSize = SizeMake(
            stageSize.width / scale,
            stageSize.height / scale
        );

        var options = {
            type: "image/png",
            size: thumbnailSize
        };

        return ImageBlobWithOptionsUsingCommands(options, async (context, loader) => {
            context.scale(1.0 / scale, 1.0 / scale);

            var canvas = this.canvas;
            if (canvas != null) {
                context.drawImage(canvas, 0, 0, stageSize.width, stageSize.height);
            }
            else {
                var asset = this.asset;
                if (asset != null) {
                    var contentURL = await asset.open();
                    var img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = contentURL;
                    await img.decode();
                    context.drawImage(img, 0, 0, stageSize.width, stageSize.height);
                    asset.close();
                }
                else {
                    context.fillStyle = "white";
                    context.fillRect(0, 0, stageSize.width, stageSize.height);
                }
            }
        });
    }
    async getContentSize() {
        return Stage.DefaultSize;
    }
}

Object.defineProperty(Media.Drawing, "ClassIdentifier", {
    value: "drawing",
    writable: false
});

Object.defineProperty(Media.Drawing, "Title", {
    value: LocalizedString("Whiteboard"),
    writable: false
});
