//
//  media/replacer.js
//  mmhmm
//
//  Created by Steve White on 3/6/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

Media.Replacer = class {
    constructor(media) {
        this.media = media;
    }
    async replaceMediaWith(replacement) {
        const previous = this.media;
        const stage = previous.stage;
        if (stage == null) {
            // This was removed from the stage while we were
            // in the media browser, presumably because we're
            // on a call and somebody changed slides
            // XXX: Should we just add this to the current slide?
            gApp.addMediaToCurrentSlide([replacement]);
            return;
        }
        const slide = stage.slide;

        let previousSize;
        if (previous.preserveAspectRatio == false) {
            previousSize = previous.contentSize;
        }
        else {
            const bbox = previous.layer.boundingBox;
            previousSize = SizeMake(bbox.width, bbox.height);
        }

        if (replacement.preserveAspectRatio == false) {
            // Replacement is presumably text, and we can just size it to fit
            replacement.contentSize = previousSize;
        }
        else {
            // Given the aspect ratio needs to be preserved,
            // our options are to scale the media to be the
            // same size in one dimension
            const assetSize = await replacement.getContentSize();
            const stageSize = previous.stage.size;
            let stageScale = Math.min(
                stageSize.width / assetSize.width,
                stageSize.height / assetSize.height
            );
            let replacementSize = SizeMake(
                assetSize.width * stageScale,
                assetSize.height * stageScale
            );

            if (replacement.croppable == true) {
                // And since the replacement is croppable, we can
                // center-crop off any excess in the other dimension
                const scale = Math.max(
                    previousSize.width / replacementSize.width,
                    previousSize.height / replacementSize.height
                );

                const scaledSize = SizeMake(
                    replacementSize.width * scale,
                    replacementSize.height * scale
                );

                //
                let cropInsets = InsetsZero();
                if (scaledSize.width > previousSize.width) {
                    const hInset = (1.0 - (previousSize.width / scaledSize.width)) / 2;
                    cropInsets.left = hInset;
                    cropInsets.right = hInset;
                }
                if (scaledSize.height > previousSize.height) {
                    const vInset = (1.0 - (previousSize.height / scaledSize.height)) / 2;
                    cropInsets.top = vInset;
                    cropInsets.bottom = vInset;
                }

                replacement.cropInsets = cropInsets;

                // We've changed the crop size, which effectively changes the asset
                // size, which affects how this gets scaled to fit the stage (user-scale 100%)
                // So we need to recompute things in order to figure out what the
                // user scale will be after the crop.
                const croppedSize = SizeMake(
                    assetSize.width * (1.0 - (cropInsets.left + cropInsets.right)),
                    assetSize.height * (1.0 - (cropInsets.top + cropInsets.bottom))
                );
                stageScale = Math.min(
                    stageSize.width / croppedSize.width,
                    stageSize.height / croppedSize.height
                );
                replacementSize.width = croppedSize.width * stageScale;
                replacementSize.height = croppedSize.height * stageScale;
            }

            // Either its not croppable so we need to aspect-fit it
            // Or it was cropped, and we just need a new scale value
            // based on the cropped dimensions
            let scale = Math.min(
                previousSize.width / replacementSize.width,
                previousSize.height / replacementSize.height
            );

            replacement.scale = scale;
        }

        replacement.center = previous.center;
        replacement.anchor = previous.anchor;
        replacement.zIndex = previous.zIndex;
        replacement.opacity = previous.opacity;
        replacement.fullscreen = previous.fullscreen;
        replacement.effect = previous.effect;
        replacement.cornerRadius = previous.cornerRadius;

        // We don't want to use copySettings() because that'll
        // change text styles/sizing/etc...
        if (IsKindOf(Media.BaseVideo, previous) == true &&
            IsKindOf(Media.BaseVideo, replacement) == true)
        {
            replacement.muted = previous.muted;
            replacement.autoplay = previous.autoplay;
            replacement.playbackLoops = previous.playbackLoops;
        }

        let sheet = null;
        let cancelController = null;
        // If the replacement needs to be uploaded, show a progress sheet.
        if (slide.doesAddingObjectRequireUpload(replacement) == true) {
            cancelController = new AbortController();
            sheet = gApp.newUploadProgressSheet(1, true, (event) => {
                cancelController.abort();
            });
            sheet.displayAsModal();
        }

        return slide.replaceObject(previous, replacement, false, (progress) => {
            if (sheet != null) {
                sheet.progressIndicator.value = progress * 100;
            }
        }, cancelController?.signal).finally(() => {
            if (sheet != null) {
                sheet.dismiss();
            }
        }).catch(err => {
            if (cancelController?.signal?.aborted != true) {
                console.error("replace object threw error: ", err);
            }
        });
    }
}
