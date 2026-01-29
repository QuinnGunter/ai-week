//
//  models/pages/modern/thumbnails.js
//  mmhmm
//
//  Created by Steve White on 2/24/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Slide.Modern.NewThumbnailForSlide = async function(slide, includeRoom=true) {
    var stage = slide.stage ?? gApp.stage;

    // Figure out the thumbnail size
    const thumbnailScale = 4;
    const stageSize = stage.size;

    const thumbnailSize = SizeMake(
        stageSize.width / thumbnailScale,
        stageSize.height / thumbnailScale
    );

    var thumbnailOptions = {
        size: thumbnailSize,
    };

    if (includeRoom == true) {
        thumbnailOptions.type = "image/jpeg";
        thumbnailOptions.quality = 0.7;
    }
    else {
        thumbnailOptions.type = "image/png";
    }

    // The local presenter record
    var presenter = slide.presenter;
    // Fake an entry for the presenter's foreground
    var presenterFG = null;

    if (presenter != null) {
        var presenterContent = presenter.decodeProperty("content", {});
        var presenterFGZIndex = presenterContent.foregroundZIndex;
        if (presenterFGZIndex == null) {
            presenterFGZIndex = presenter.decodeProperty("zIndex", Number, 0) + 1;
        }
        presenterFG = {
            zIndex: presenterFGZIndex
        };
    }

    var medias = slide.objects;
    var objects = [...medias, presenter, presenterFG].filter(obj => obj != null);
    objects.sort((a, b) => {
        const zIndexFor = function(item) {
            const defaultZ = objects.indexOf(item);
            if (IsKindOf(item, CloudyRecord) == true) {
                return item.decodeProperty("zIndex", Number, defaultZ);
            }
            else {
                return item.zIndex ?? defaultZ;
            }
        }
        var zA = zIndexFor(a);
        var zB = zIndexFor(b);
        if (zA < zB) return -1;
        if (zB > zA) return 1;
        return 0;
    })

    //
    // Find the room image to draw
    //
    var roomThumbnail = null;

    if (includeRoom == true) {
        var roomState = slide.roomState;
        var room = null;

        if (roomState != null) {
            room = RoomsController.shared.roomWithIdentifier(roomState.id);
        }

        room ||= stage.room || RoomsController.shared.defaultRoom;

        if (roomState == null) {
            // Ensure there aren't any surprises
            // when the person next views this slide...
            slide._updatePersistedRoom(room);
            roomState = slide.roomState;
        }

        roomThumbnail = await room.thumbnailForState(roomState?.state ?? {});
    }

    //
    // Do the drawing...
    //
    var blob = await ImageBlobWithOptionsUsingCommands(thumbnailOptions, async (context, loader) => {
        var drawImage = function(image, srcFrame, dstFrame, opacity, scale, rotation=0, cornerRadius=0) {
            context.save();
            context.globalAlpha = opacity;
            context.translate(dstFrame.x, dstFrame.y);

            if (rotation != 0) {
                const degrees = 360 - rotation;
                const radians = degreesToRadians(degrees);
                context.translate(dstFrame.width / 2, dstFrame.height / 2);
                context.rotate(radians);
                context.translate(-dstFrame.width / 2, -dstFrame.height / 2);
            }

            if (cornerRadius > 0) {
                const frame = RectMake(0, 0, dstFrame.width, dstFrame.height);
                const radius = Math.min(dstFrame.width, dstFrame.height) * 0.5 * cornerRadius;
                const path = NewRoundRectPathForRectWithRadius(frame, radius);
                context.clip(path);
            }

            try {
                context.drawImage(image,
                    srcFrame.x, srcFrame.y, srcFrame.width, srcFrame.height,
                    0, 0, dstFrame.width, dstFrame.height
                );
            }
            catch (err) {
                console.error("error drawing image: ", image);
            }
            finally {
                context.restore();
            }
        }

        var drawMedia = async function(media, drawable) {
            var cleanupFn = null;

            if (drawable == null) {
                var thumbnail = null;
                var thumbnailAsset = media.thumbnailAsset;
                if (thumbnailAsset != null) {
                    try {
                        thumbnail = await thumbnailAsset.open();
                        cleanupFn = () => thumbnailAsset.close();
                    }
                    catch (err) {
                        console.error("Error opening thumbnail asset", thumbnailAsset, err);
                    }
                }

                if (thumbnail == null) {
                    var ready = await media.isReadyToThumbnail();
                    if (ready == true) {
                        try {
                            thumbnail = await media.thumbnail();
                        }
                        catch (err) {
                            console.error("Failed to thumbnail media", err);
                        }
                    }
                    else {
                        thumbnail = ThumbnailStorage.AssetMissing;
                    }
                }

                if (thumbnail == null) {
                    console.error("media returned null thumbnail", media);
                }
                else {
                    drawable = null;
                    try {
                        drawable = await loader(thumbnail);
                    }
                    catch (err) {
                        console.error("error loading thumbnail: ", thumbnail, err);
                    }
                }

                if (drawable == null) {
                    console.error("failed to load drawable from thumbnail", thumbnail);
                }
            }

            if (drawable != null) {
                const opacity = media.opacity ?? 1;
                const scale = media.scale ?? 1;
                const rotation = media.rotation ?? 0;
                const cropInsets = media.croppable ? media.cropInsets : InsetsZero();
                const cornerRadius = media.cornerRadius ?? 0;

                const rawSize = SizeMake(drawable.naturalWidth, drawable.naturalHeight);

                const srcFrame = RectMake(
                    rawSize.width * cropInsets.left,
                    rawSize.height * cropInsets.top,
                    rawSize.width - (rawSize.width * (cropInsets.left + cropInsets.right)),
                    rawSize.height - (rawSize.height * (cropInsets.top + cropInsets.bottom))
                );

                let naturalSize;
                if (IsKindOf(media, Presenter) == true) {
                    naturalSize = SizeMake(srcFrame.width, srcFrame.height);
                }
                else {
                    naturalSize = rawSize;
                }
                let dstFrame = media.frameForLayer({ naturalSize, size: naturalSize });
                dstFrame.x /= thumbnailScale;
                dstFrame.y /= thumbnailScale;
                dstFrame.width /= thumbnailScale;
                dstFrame.height /= thumbnailScale;

                drawImage(drawable, srcFrame, dstFrame, opacity, scale, rotation, cornerRadius);
            }

            if (cleanupFn != null) {
                cleanupFn();
            }
        }

        var presenterThumbnails = [];
        var drawPresenter = async function(forForeground=false) {
            // Sanity checks
            if (presenter == null) {
                return;
            }

            const media = new PresenterThumbnail();
            presenterThumbnails.push(media);
            media.decodeFromModernRecord(presenter);

            const shape = media.shape;
            const style = media.backgroundStyle;
            const color = media.backgroundPaint;

            if (forForeground == false &&
                style == Presenter.BackgroundStyle.Hide &&
                color == null)
            {
                // We have nothing to draw here...
                return;
            }

            let bgIcon = null;
            let fgIcon = null;
            if (shape == Presenter.Shape.Circle) {
                bgIcon = AppIcons.SlideThumbnailCircleBackground(color);
                fgIcon = AppIcons.SlideThumbnailCircleForeground();
            }
            else if (shape == Presenter.Shape.Polygon) {
                // This is hardcoded to hexagon since we only expose that shape
                bgIcon = AppIcons.SlideThumbnailHexagonBackground(color);
                fgIcon = AppIcons.SlideThumbnailHexagonForeground();
            } else {
                bgIcon = AppIcons.SlideThumbnailRectangleBackgroundNoBorder(color);
                fgIcon = AppIcons.SlideThumbnailRectangleForeground();
            }

            let icon = null;
            if (forForeground == true) {
                icon = fgIcon;
            }
            else {
                icon = bgIcon;
            }

            let image = null;
            try {
                image = await loader(icon);
            }
            catch (err) {
                console.error("Failed to load icon", icon);
                return;
            }

            drawMedia(media, image);
        }

        if (roomThumbnail != null) {
            if (roomThumbnail.constructor == ImageData) {
                context.putImageData(roomThumbnail, 0, 0);
            }
            else {
                var roomImage = await loader(roomThumbnail);
                context.drawImage(roomImage, 0, 0, thumbnailSize.width, thumbnailSize.height);
            }
        }

        // Draw all the things
        for (var objectIdx = 0; objectIdx < objects.length; objectIdx += 1) {
            var object = objects[objectIdx];
            if (object == presenter || object == presenterFG) {
                const forForeground = (object == presenterFG);
                await drawPresenter(forForeground);
            }
            else {
                await drawMedia(object);
            }
        }
        presenterThumbnails.forEach(presenterThumbnail => {
            presenterThumbnail.destroy();
        });
    });

    return blob;
}

class PresenterThumbnail extends Presenter {
    constructor() {
        super();
        // Some layout code expects there to be a stage,
        // so lets give it one.
        this.stage = { size: Stage.DefaultSize }
    }
    // This would normally talk to layers, which we don't have
    // but it doesn't matter because the effect doesn't affect
    // the thumbnail
    set effect(value) {}
    get effect() { return null; }
    // Normally Presenters consult the stage,
    // but we need to use specific values rather than current
    get undoManager() {
        return null;
    }
    get physicalGreenScreen() {
        return false;
    }
}
