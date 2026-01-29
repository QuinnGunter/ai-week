//
//  slide_files.js
//  mmhmm
//
//  Created by Steve White on 12/20/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

Media.Files = {
    maxFileSizeMB: 256,

    mimeExtensionMap() {
        return {
            "video/mp4": ["mp4", "m4v"],
            "video/mov": ["mov", "mp4"],
            "video/quicktime": ["mov", "mp4"],
            "video/webm": ["webm"],

            "audio/mpeg": ["mp3"],
            "audio/wav": ["wav"],

            "image/png": ["png"],
            "image/gif": ["gif"],
            "image/webp": ["webp"],
            "image/bmp": ["bmp"],
            "image/jpeg": ["jpg", "jpeg"],
            "image/tiff": ["tif", "tiff"],
            "image/heic": ["heic"],
            "image/heif": ["heif"],
            "image/svg+xml": ["svg"],

            "text/plain": ["txt"],
            "text/uri-list": ["txt"],

            "font/woff2": ["woff2"],

            "application/pdf": ["pdf"],
            "application/vnd.ms-powerpoint": ["ppt", "pptx"],
            "application/vnd.apple.keynote": ["key"],
        };
    },
    fontMimeTypes: function() {
        return Object.keys(this.mimeExtensionMap()).filter(type => type.startsWith("font/"));
    },
    isFontFile: function(file) {
        return this._doesFileExistInTypesOrExtensions(
            file,
            this.fontMimeTypes(),
            this.extensionsForMimeTypes(this.fontMimeTypes())
        );
    },
    imageMimeTypes: function() {
        return Object.keys(this.mimeExtensionMap()).filter(type => type.startsWith("image/"));
    },
    imageExtensions: function() {
        return this.extensionsForMimeTypes(this.imageMimeTypes());
    },
    isImageFile: function(file) {
        return this._doesFileExistInTypesOrExtensions(
            file,
            this.imageMimeTypes(),
            this.imageExtensions()
        );
    },
    videoMimeTypes: function() {
        return Object.keys(this.mimeExtensionMap()).filter(type =>
            type.startsWith("video/") || type.startsWith("audio/")
        );
    },
    videoExtensions: function() {
        return this.extensionsForMimeTypes(this.videoMimeTypes());
    },
    isVideoFile: function(file) {
        return this._doesFileExistInTypesOrExtensions(
            file,
            this.videoMimeTypes(),
            this.videoExtensions()
        );
    },
    imageAndVideoMimeTypes: function() {
        let mimeTypes = [];
        mimeTypes.push(...this.imageMimeTypes());
        mimeTypes.push(...this.videoMimeTypes());
        return mimeTypes;
    },
    isImageOrVideoFile: function(file) {
        return this.isImageFile(file) || this.isVideoFile(file);
    },
    basicMimeTypes: function() {
        return Object.keys(this.mimeExtensionMap()).filter(type => type.startsWith("application/") == false);
    },
    basicFileExtensions: function() {
        return this.extensionsForMimeTypes(this.basicMimeTypes());
    },
    isBasicFile: function(file) {
        return this._doesFileExistInTypesOrExtensions(
            file,
            this.basicMimeTypes(),
            this.basicFileExtensions()
        );
    },
    advancedMimeTypes: function() {
        return Object.keys(this.mimeExtensionMap()).filter(type => type.startsWith("application/"));
    },
    advancedFileExtensions: function() {
        return this.extensionsForMimeTypes(this.advancedMimeTypes());
    },
    isAdvancedFile: function(file) {
        if (file.size < 1024) {
            return false;
        }
        return this._doesFileExistInTypesOrExtensions(
            file,
            this.advancedMimeTypes(),
            this.advancedFileExtensions()
        );
    },
    supportedMimeTypes: function() {
        var mimeTypes = this.basicMimeTypes();
        if (this.canConvertFiles() == true) {
            mimeTypes = mimeTypes.concat(this.advancedMimeTypes());
        }
        return mimeTypes;
    },
    supportedFileExtensions: function() {
        var extensions = this.basicFileExtensions();
        if (this.canConvertFiles() == true) {
            extensions = extensions.concat(this.advancedFileExtensions());
        }
        return extensions;
    },
    isVideoExtension: function(extension) {
        const ext = extension ?? "";
        return this.videoExtensions().includes(ext.trim().toLowerCase());
    },
    isImageExtension: function(extension) {
        const ext = extension ?? "";
        return this.imageExtensions().includes(ext.trim().toLowerCase());
    },
    isSupportedTypeOrExtension: function(type, extension) {
        return this.isSupportedFile({ type: type, name: extension });
    },
    isSupportedFile: function(file) {
        if (this.isBasicFile(file) == true) {
            return true;
        }
        return this.isAdvancedFile(file);
    },
    extensionsForMimeTypes: function(mimeTypes) {
        const results = [];
        mimeTypes.forEach(mime => {
            mime = mime.toLowerCase().trim();
            const extensions = this.mimeExtensionMap()[mime];
            extensions.forEach(ext => {
                if (results.includes(ext) == false) {
                    results.push(ext);
                }
            })
        })
        return results;
    },
    extensionsForMimeType: function(mimeType) {
        return this.extensionsForMimeTypes([mimeType]);
    },
    mimeTypeForExtension: function(extension) {
        extension = extension.toLowerCase().trim();
        var map = this.mimeExtensionMap();
        for (var mime in map) {
            var exts = map[mime];
            if (exts.indexOf(extension) != -1) {
                return mime;
            }
        }
        return null;
    },
    mimeTypeForFilename: function(filename) {
        const lastDotLoc = filename.lastIndexOf(".");
        if (lastDotLoc == -1) {
            return null;
        }
        const extension = filename.substring(lastDotLoc + 1);
        return this.mimeTypeForExtension(extension);
    },
    _doesFileExistInTypesOrExtensions(file, mimeTypes, fileExtensions) {
        var type = file.type.toLowerCase();
        if (type.startsWith("web ") == true) {
            type = type.substring(4);
        }
        if (mimeTypes.indexOf(type) != -1) {
            return true;
        }

        var filename = file.name;
        if (filename == null) {
            return false;
        }

        filename = filename.toLowerCase();
        var separator = filename.lastIndexOf(".");
        if (separator == -1) {
            return false;
        }
        var extension = filename.substring(separator + 1);
        return (fileExtensions.indexOf(extension) != -1);
    },
    canConvertFiles: function() {
        var ep = mmhmmAPI.defaultEndpoint();
        if (ep.isAuthenticated == false) {
            return false;
        }

        return true;
    },
    convertFiles: async function(files, presentation, analyticsSource, sheet, promise) {
        if (files.length == 0) {
            if (sheet != null) {
                sheet.dismiss();
            }
            return;
        }

        if (promise == null) {
            promise = promiseWrapper();
        }

        var endpoint = mmhmmAPI.defaultEndpoint();
        var converter = new CloudConverter(endpoint);

        if (sheet == null) {
            sheet = new ProgressSheet(LocalizedString("Converting file"), false);
            sheet.addButton(LocalizedString("Cancel"), "secondary", evt => {
                sheet.dismiss();
                converter.cancel();
            })
            sheet.displayAsModal();
        }

        var file = files.shift();
        var fileName = file.name;

        var lastType = null;
        var presentationID = null;
        var insertAfterID = null;
        var undoManager = null;
        if (presentation != null) {
            presentationID = presentation.identifier;
            undoManager = presentation.undoManager;

            var selectedSlide = gApp.stage?.slide;
            if (presentation.containsSlide(selectedSlide) == true) {
                insertAfterID = selectedSlide.identifier;
            }
        }

        if (undoManager != null) {
            undoManager.beginUndoGrouping();
            promise.finally(() => {
                undoManager.endUndoGrouping();
            })
        }

        converter.convertFile(file, presentationID, insertAfterID, (type, progress) => {
            var progressIndicator = sheet.progressIndicator;
            if (isFinite(progress) == true) {
                progressIndicator.value = progress * 100;
            }

            if (type == CloudConverter.ProgressType.Create || type != lastType) {
                lastType = type;

                if (isFinite(progress) == false) {
                    progressIndicator.removeAttribute("value");
                }

                var message = null;
                switch (type) {
                    case CloudConverter.ProgressType.Upload:
                        message = LocalizedStringFormat("Uploading ${fileName}…", {
                            fileName
                        });
                        break;
                    case CloudConverter.ProgressType.Waiting:
                        message = LocalizedStringFormat("Converting ${fileName}…", {
                            fileName
                        });
                        break;
                    case CloudConverter.ProgressType.Download:
                        message = LocalizedStringFormat("Downloading ${fileName}…", {
                            fileName
                        });
                        break;
                    case CloudConverter.ProgressType.Create:
                        message = LocalizedStringFormat("Creating slides for ${fileName}…", {
                            fileName
                        });
                        break;
                }
                sheet.messageLabel.innerText = message;
            }
        }).then(async (results) => {
            const documentID = results?.documentID;
            if (documentID == null) {
                // The user cancelled the import
                promise.resolve();
                return;
            }

            let slideIDs = null;
            if (documentID == presentation?.identifier) {
                slideIDs = results?.slideIDs;
                if (slideIDs != null && slideIDs.length > 0 && undoManager != null) {
                    undoManager.registerUndoWithTargetBlock(presentation, () => {
                        var slides = presentation.slides.filter(slide => slideIDs.indexOf(slide.identifier) != -1);
                        presentation.deleteSlides(slides);
                    });
                }
                // Ensure we await this, so that the importing dialog remains
                // visible.  Otherwise the dialog could go away and the undo
                // action would appear, but it may have no affect because
                // the presentation hadn't reloaded yet.
                // Also we'd like to select and scroll to them, so we need
                // them to exist.
                await presentation.reload();
            }
            else {
                var dataStore = gApp.dataStore;
                await dataStore.refreshPresentationsList();
                presentation = dataStore.presentationWithID(documentID);
                if (presentation == null) {
                    if (sheet != null) {
                        sheet.dismiss();
                    }
                    promise.resolve();

                    ShowAlertView(
                        LocalizedString("Could not retrieve converted presentation"),
                        LocalizedStringFormat("Error retrieving converted presentation with ID: ${documentID}", {documentID}),
                    );
                    return;
                }

                dataStore.activePresentation = presentation;
                dataStore.updatePresentationLastViewed(presentation, new Date());
            }

            Analytics.Log("presentation.imported", {
                presentation_id: presentation.identifier,
                source: analyticsSource,
                file_type: file.type,
                file_size: file.size,
            });

            // If this is the last file, return it in the promise
            if (files.length == 0) {
                if (slideIDs != null && slideIDs.length > 0) {
                    const first = presentation.slideWithIdentifier(slideIDs[0]);
                    if (first != null) {
                        gApp.stage.slide = first;
                    }
                }

                promise.resolve(presentation);
            }

            // If somebody dragged multiple files that need conversion
            // this will start the conversion of the next file in the list
            // We need to always call it though to ensure the sheet is dismissed!
            Media.Files.convertFiles(files, presentation, analyticsSource, sheet, promise);
        }).catch(err => {
            if (sheet != null) {
                sheet.dismiss();
            }
            promise.resolve();

            var errorMsg = err.toString();
            ShowAlertView(
                LocalizedString("File conversion error"),
                LocalizedStringFormat("An error occurred converting files: ${errorMsg}", {errorMsg}),
            );
        });

        return promise;
    },
    filesFromDataTransfer: async function(dataTransfer) {
        const items = dataTransfer.items;
        if (items == null) {
            return Array.from(dataTransfer.files);
        }

        const noNull = (obj) => obj != null;

        const files = Array.from(items).map((item) => {
            if (item.kind == "file") {
                return item.getAsFile();
            }
            return null;
        }).filter(noNull);

        if (files.length > 0) {
            return files;
        }

        const stringDedpue = [];
        const strings = Array.from(items).map((item) => {
            if (item.kind == "string") {
                const promise = promiseWrapper();
                const type = item.type;
                item.getAsString((str) => {
                    if (str.trim().length == 0) {
                        promise.resolve(null);
                        return;
                    }

                    if (stringDedpue.includes(str) == true) {
                        promise.resolve(null);
                        return;
                    }

                    const blob = new Blob([str], {type});
                    promise.resolve(blob);
                    stringDedpue.push(str);
                });
                return promise;
            }
            return null;
        }).filter(noNull);

        const blobs = await Promise.all(strings);
        return blobs.filter(noNull);
    },
    createMediaWithDataTransfer: async function(dataTransfer, maxFileSize = null) {
        var files = await this.filesFromDataTransfer(dataTransfer);
        if (files?.length > 0) {
            return Media.Files.createWithFiles(files, maxFileSize);
        }
        return [];
    },
    imageFromHTML: async function(file) {
        if (file.type != "text/html") {
            return null;
        }
        const text = await file.text();
        // Is this a safe way to parse HTML??
        const template = document.createElement("template");
        template.innerHTML = text;

        const images = template.content.querySelectorAll("img");
        if (images.length == 0) {
            return null;
        }

        const urls = Array.from(images).map(img => new URL(img.src));
        const trustable = urls.filter(url => {
            return url.host.endsWith("officeapps.live.com");
        });

        if (trustable.length == 0) {
            return null;
        }

        const response = await fetch(trustable[0]);
        if (response.ok != true) {
            return null;
        }

        const blob = await response.blob();
        return blob;
    },
    createWithFiles: async function(files, maxFileSize = null) {
        var advancedFiles = [];
        var basicFiles = [];
        var unsupportedFiles = [];
        var questionableFiles = [];

        files.forEach(file => {
            if (this.isBasicFile(file) == true) {
                basicFiles.push(file);
            }
            else if (this.isAdvancedFile(file) == true) {
                advancedFiles.push(file);
            }
            else if (file.type == "text/html") {
                questionableFiles.push(file);
            }
            else {
                unsupportedFiles.push(file);
            }
        })

        if (questionableFiles.length > 0) {
            const images = questionableFiles.map(file => this.imageFromHTML(file));
            const results = await Promise.all(images);
            results.forEach((img, idx) => {
                if (img != null) {
                    basicFiles.push(img);
                }
                else {
                    unsupportedFiles.push(questionableFiles[idx]);
                }
            })
        }

        if (unsupportedFiles.length > 0) {
            if (files.length == 1) {
                ShowAlertView(
                    LocalizedString("Unsupported file type"),
                    LocalizedStringFormat("The file ${name} could not be added because the file type is not supported.",
                        {name: unsupportedFiles[0].name}),
                );
            } else if (unsupportedFiles.length == 1) {
                ShowAlertView(
                    LocalizedString("Unsupported file type"),
                    LocalizedStringFormat("The files could not be added because the file ${name} is not supported.",
                        {name: unsupportedFiles[0].name}),
                );
            } else {
                const names = unsupportedFiles.map(file => file.name).join(", ");
                ShowAlertView(
                    LocalizedString("Unsupported file type"),
                    LocalizedStringFormat("The files could not be added because the following files are not supported: ${names}", {names}),
                );
            }

            // We could allow partial creation from the files that are supported,
            // but that makes a more confusing user experience with the potential
            // for stacking dialogs. Keep it simple and abort.
            return [];
        }

        if (advancedFiles.length > 0) {
            if (this.canConvertFiles() == true) {
                var presentation = gApp.dataStore.activePresentation;
                this.convertFiles(advancedFiles, presentation, "drag");
            }
            else {
                ShowAlertView(
                    LocalizedString("Account required"),
                    LocalizedString("An account is required to use PDF, PowerPoint, or Keynote documents"),
                );
            }
        }

        if (basicFiles.length > 0) {
            var promises = basicFiles.map(file =>
                this.createWithFile(file, maxFileSize)
            ).filter(a => a != null);
            if (promises.length > 0) {
                return Promise.all(promises);
            }
        }

        return [];
    },
    createSlideFromAudioVideoFile: async function(file, maxFileSize) {
        var fileName = file.name;

        if (file.size > maxFileSize) {
            var maxFileSizeMB = maxFileSize / 1024 / 1024;
            var taggedMessage = LocalizedStringFormat("The file <0>${fileName}</0> is too large. The maximum file size is <1>${maxFileSizeMB}</1>MB. Please try again with a smaller file.", {fileName, maxFileSizeMB});
            var message = "";
            EnumerateLinkifiedString(taggedMessage, (tagNum, text) => {
                if (tagNum == -1) {
                    message += text;
                }
                else if (tagNum == 0) {
                    message += `<i>${text}</i>`;
                }
                else {
                    message += `${text}`;
                }
            });

            ShowAlertView(
                LocalizedString("File too large"),
                message,
            );
            throw new Error("File too large");
        }

        var extensionLoc = fileName.lastIndexOf(".");
        var title = fileName;
        var extension = "";
        if (extensionLoc != -1) {
            extension = fileName.substring(extensionLoc + 1).toLowerCase();
            title = title.substring(0, extensionLoc);
        }

        var asset = new LocalAsset({file});
        asset.fingerprint = await FingerprintForBlob(file);

        var slide = null;
        if (file.type.startsWith("audio/") == true) {
            slide = new Media.Audio(createUUID(), null, asset);
        }
        else {
            slide = new Media.BasicVideo(createUUID(), null, asset);
        }
        slide.title = title;

        if (extension.endsWith("mp3") == true) {
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            const parser = new ID3Parser(bytes);
            if (parser.load() == true) {
                var artwork = parser.extractAlbumArtwork();
                if (artwork != null) {
                    var thumbnailAsset = new LocalAsset({blob: artwork});
                    thumbnailAsset.fingerprint = await FingerprintForBlob(artwork);
                    slide.thumbnailAsset = thumbnailAsset;
                }
            }
        }
        else if (file.type.startsWith("video/") == true) {
            if (extension.endsWith("mov") || extension.endsWith("mp4")) {
                // We primarily care about knowing the codecs in a mov/mp4 file to
                // to see if the movie has an audio track or not – when it doesn't
                // have an audio track, volume/mute controls are hidden for it.
                const buffer = await file.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                const parser = new QuickTimeParser(bytes);
                const codecs = parser.extractCodecs();

                if (codecs != null) {
                    slide.codecs = codecs;
                }
            }

            // Lets ensure the browser can play the video by loading it into
            // a <video> element.  If it cannot play it, we'll display an
            // error message

            const player = document.createElement("video");
            const promise = promiseWrapper();
            const url = URL.createObjectURL(file);

            player.addEventListener("error", evt => {
                promise.reject(player.error);
            });
            player.addEventListener("loadeddata", evt => {
                // See e.g. https://github.com/All-Turtles/mmhmm-web/issues/5170
                // Checking for a width and height seems like the only way to
                // know if the player actually found some video to play - we can't
                // list the video tracks.
                if (player.videoWidth == 0 || player.videoHeight == 0) {
                    promise.reject("Unable to determine video dimensions");
                } else {
                    promise.resolve();
                }
            });
            player.src = url;

            try {
                await promise;
            }
            catch (err) {
                // The browser couldn't make sense of it, so show an error
                const headline = LocalizedStringFormat("\"${fileName}\" could not be played", {fileName});

                let subheading = "";
                if (slide.codecs?.video != null) {
                    const codecString = slide.codecs.video.join(", ");
                    subheading = LocalizedStringFormat("The video codec \"${codec}\" may not supported.", {codec: codecString});
                }

                ShowAlertView(headline, subheading);
                throw new Error("invalid video file");
            }
            finally {
                URL.revokeObjectURL(url);
            }
        }

        return slide;
    },
    thumbnailFromAsset: async function(asset) {
        var element = await asset.openAsElement();

        var options = {
            type: "image/jpeg",
            quality: 0.8,
        };
        var size = SizeZero();
        if (element.tagName == "IMG") {
            size.width = element.naturalWidth;
            size.height = element.naturalHeight;
            if (asset.mimeType != "image/jpeg") {
                // XXX: How can we tell if the source contains alpha or not?
                options.type = "image/png";
                delete options.quality;
            }
        }
        else if (element.tagName == "VIDEO") {
            size.width = element.videoWidth;
            size.height = element.videoHeight;
        }
        if (size.width <= 0 || size.height <= 0) {
            return null;
        }

        const thumbnailScale = 4;
        const stageSize = gApp.stage.size;

        const maxThumbnailSize = SizeMake(
            stageSize.width / thumbnailScale,
            stageSize.height / thumbnailScale
        );

        const elementScale = Math.min(
            maxThumbnailSize.width / size.width,
            maxThumbnailSize.height / size.height,
        );

        const thumbnailSize = SizeMake(
            size.width * elementScale,
            size.height * elementScale
        );

        options.size = thumbnailSize;
        return ImageBlobWithOptionsUsingCommands(options, async (context, loader) => {
            context.drawImage(element, 0, 0, thumbnailSize.width, thumbnailSize.height);
        })
    },
    createWithFile: async function(file, maxFileSize = null) {
        if (this.isBasicFile(file) == false) {
            console.error("unsupported file", file);
            return null;
        }

        var title = file.name;
        var fileType = file.type;
        if (fileType == null || fileType == "") {
            var dotLoc = title.lastIndexOf(".");
            if (dotLoc != -1) {
                var ext = title.substring(dotLoc + 1);
                fileType = this.mimeTypeForExtension(ext);
            }
        }

        if (fileType.startsWith("text/") == true) {
            const text = await file.text();
            const media = Media.Text.Create(null, false);
            media.attributedString = new AttributedString(text, {});
            return media;
        }

        if (maxFileSize == null) {
            maxFileSize = Media.Files.maxFileSizeMB * 1024 * 1024;
        }

        var mainTask = new Promise((resolve, reject) => {
            const stage = gApp.stage;

            const analyticsEvent = "presentation.slides.added.files";
            if (fileType.startsWith("video") == true || fileType.startsWith("audio") == true) {
                this.createSlideFromAudioVideoFile(file, maxFileSize).then(slide => resolve(slide)).catch(err => {
                    if (err == "File too large") {
                        Analytics.Log("presentation.slides.added.files.fail", {
                            cause: "too_large",
                            file_type: fileType,
                            file_size: file.size,
                            size_limit: maxFileSize,
                        });
                    }
                    reject(err)
                });
                return;
            }

            if (fileType == "image/gif" && Media.GIF.supported == true) {
                var asset = new LocalAsset({file});
                FingerprintForBlob(file).then(fingerprint => {
                    asset.fingerprint = fingerprint;

                    var slide = new Media.GIF(createUUID(), stage.localPresenter.identifier, asset);
                    slide.title = title;
                    resolve(slide);
                    Analytics.Log(analyticsEvent);
                });
                return;
            }

            // Read the image in to do any one of:
            // 1) Scale it if it exceeds the stage resolution
            // 2) It has more bytes than we can confidently transfer
            // 3) It is a type that isn't widely supported (e.g.
            //    webp isn't supported on older Safaris, heif
            //    may not be supported outside of Apple)
            var image = new Image();
            image.onload = (evt) => {
                URL.revokeObjectURL(file);

                const standardTypes = [
                    "image/jpg",
                    "image/jpeg",
                    "image/png",
                ];

                var contents = evt.result;
                if (contents == null) {
                    contents = image;
                }
                var stageSize = stage.size;
                var imageSize = SizeMake(contents.naturalWidth, contents.naturalHeight);
                var needsCanvas = false;
                if (imageSize.width > stageSize.width || imageSize.height > stageSize.height || // needs to be scaled down
                    file.size > maxFileSize || // we'll recompress to hopefully make it smaller
                    standardTypes.indexOf(fileType) == -1) // it isn't a widely supported format
                {
                    needsCanvas = true;
                }

                if (needsCanvas == false) {
                    var asset = new LocalAsset({file});
                    FingerprintForBlob(file).then(fingerprint => {
                        asset.fingerprint = fingerprint;

                        var slide = new Media.Image(createUUID(), stage.localPresenter.identifier, asset);
                        slide.title = title;
                        resolve(slide);

                        Analytics.Log(analyticsEvent);
                    });
                    return;
                }

                var scale = Math.min(stageSize.width / imageSize.width, stageSize.height / imageSize.height);
                if (fileType != "image/svg+xml") {
                    scale = Math.min(1.0, scale);
                }

                var canvasSize = SizeMake(
                    Math.floor(imageSize.width * scale),
                    Math.floor(imageSize.height * scale),
                )

                var options = {
                    size: canvasSize,
                }

                if ((fileType == "image/png" || fileType == "image/webp" || fileType == "image/svg+xml") && (maxFileSize == null || file.size < maxFileSize)) {
                    options.type = "image/png";
                }
                else {
                    options.type = "image/jpeg";
                    options.quality = 0.9;
                }

                ImageBlobWithOptionsUsingCommands(options, (context) => {
                    context.drawImage(contents,
                        0, 0, canvasSize.width, canvasSize.height, // dx, dy, dwidth, dheight
                    );
                }).then(blob => {
                    var asset = new LocalAsset({blob});
                    FingerprintForBlob(blob).then(fingerprint => {
                        asset.fingerprint = fingerprint;

                        var slide = new Media.Image(createUUID(), stage.localPresenter.identifier, asset);
                        slide.title = title;
                        resolve(slide);

                        Analytics.Log(analyticsEvent);
                    });
                }).catch(err => {
                    console.log("Error scaling/converting image", image, contents, err);
                });
            };
            image.addEventListener("error", evt => {
                if (fileType != "image/heic" && fileType != "image/heif") {
                    console.error("Failed to load image file", file, evt);
                    URL.revokeObjectURL(file);
                    reject(evt);
                    return;
                }

                console.info("Will attempt HEIC conversion for file", file);
                var heic = new HEICImage(file);
                heic.addEventListener("load", image.onload);
                heic.addEventListener("error", evt => {
                    URL.revokeObjectURL(file);
                    reject(evt);
                });
                heic.load();
            });
            image.src = URL.createObjectURL(file);
        });

        return new Promise(async (resolve, reject) => {
            var slide = null;
            try {
                slide = await mainTask;
            }
            catch (err) {
                reject(err);
                return;
            }
            if (slide.thumbnailAsset != null) {
                resolve(slide);
                return;
            }

            try {
                var blob = await this.thumbnailFromAsset(slide.asset);
                if (blob == null) {
                    console.error("Failed to create thumbnail from asset", slide.asset);
                }
                else {
                    var thumbnailAsset = new LocalAsset({blob});
                    thumbnailAsset.fingerprint = await FingerprintForBlob(blob);
                    slide.thumbnailAsset = thumbnailAsset;
                }
            }
            catch (err) {
                // No reason to reject this...
                console.error("Error thumbnailing file", file, err);
            }

            resolve(slide);
        })
    },
    // XXX: PAGES REQUEST THUMBNAILS
    showFilePicker(maxFileCount = 1, mimeTypes = null) {
        const task = promiseWrapper();
        const {resolve} = task;

        const filePicker = document.createElement("input");
        filePicker.type = "file";

        if (mimeTypes == null) {
            mimeTypes = this.supportedMimeTypes();
        }

        const extensions = this.extensionsForMimeTypes(mimeTypes);

        const fileTypes = mimeTypes.concat(extensions.map(a => `.${a}`));
        filePicker.accept = fileTypes;

        filePicker.style.display = "none";
        if (maxFileCount > 1) {
            filePicker.multiple = true;
        }

        let pickedFile = false;
        filePicker.addEventListener("cancel", (evt) => resolve(null));
        filePicker.addEventListener("change", (evt) => {
            pickedFile = true;
            this.filePicker = null;

            // The person may have changed the file open dialog to show all files
            // so we'll scrub the list to ensure we only handle the types we asked for
            // issue #3437
            const files = Array.from(filePicker.files).filter(file => {
                return this._doesFileExistInTypesOrExtensions(file, mimeTypes, extensions);
            });

            if (files.length == 0) {
                resolve(null);
                return;
            } else {
                resolve(files);
                return;
            }
        });

        document.body.addEventListener("focus", evt => {
            if (pickedFile == false) {
                resolve(null);
            }
        }, {once: true})

        filePicker.click();

        // Safari won't seem to return results, presumably because
        // the picker has been GC'ed. So hold a reference to it...
        this.filePicker = filePicker;
        return task;
    },
    requestFile: function(evt, maxFileSize, mimeTypes) {
        return this.requestFiles(evt, maxFileSize, 1, mimeTypes);
    },
    requestFiles: function(evt, maxFileSize = null, maxFileCount = 1, mimeTypes = null) {
        const task = promiseWrapper();
        const {resolve, reject} = task;

        this.showFilePicker(maxFileCount, mimeTypes).then(files => {
            if (files == null || files.length == 0) {
                return;
            }
            this.createWithFiles(files, maxFileSize).then(slides => {
                if (maxFileCount == 1) {
                    resolve(slides[0])
                }
                else {
                    resolve(slides);
                }
            }).catch(err => {
                reject(err);
            });
        });

        return task;
    }
}

class HEICImage extends EventTarget {
    constructor(file) {
        super();
        this.file = file;
    }
    load() {
        var file = this.file;
        file.arrayBuffer().then(buffer => {
            this.processBuffer(buffer);
        });
    }
    processBuffer(buffer) {
        const decoder = new (libheif()).HeifDecoder();
        let images = decoder.decode(buffer);

        if (images.length == 0) {
            this.dispatchEvent(new Event("error"));
            return;
        }
        var valid = images.find(img => img.get_height() > 0);
        if (valid == null) {
            this.dispatchEvent(new Event("error"));
            return;
        }

        const w = valid.get_width();
        const h = valid.get_height();
        const image = new ImageData(w, h);
        image.data.fill(0xff);

        valid.display(image, (imageData) => {
            var canvas = null;
            if (window.OffscreenCanvas != null) {
                canvas = new OffscreenCanvas(w, h);
            }
            else {
                canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
            }
            var context = canvas.getContext("2d");
            context.putImageData(image, 0, 0);
            canvas.naturalWidth = w;
            canvas.naturalHeight = h;

            var event = new Event("load");
            event.result = canvas;
            this.dispatchEvent(event);
        });
    }
}
