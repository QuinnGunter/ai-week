//
//  editor.js
//  mmhmm
//
//  Created by Steve White on 7/28/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class TextSlideEditor extends ObservableObject {
    constructor(size, scale) {
        super();

        this._debugShapes = !!SharedUserDefaults.getValueForKey("debugTextShapes", false);

        this.createElements();
        this.size = size;
        this.scale = scale;
        this.placeholderCharacter = "\ufeff";
        var state = {};
        for (var key in TextSlideEditor.Attribute) {
            var stateKey = TextSlideEditor.Attribute[key];
            state[stateKey] = TextSlideEditor.State.Off;
        }
        this.state = state;
        this._textSize = Media.Text.Size.Medium;

        if (gLocalDeployment == true) {
            window.gEditor = this;
        }

        this.setupKeyboardListener();
        this.setupDevicePixelListener();
    }
    destroy() {
        this.delegate = null;

        this.destroyContentEditableHooks();
        this.destroyKeyboardListener();
        this.destroyDevicePixelListener();
        this.destroyResizeObserver();
        this.media = null;
        this.style = null;
        if (gLocalDeployment == true) {
            window.gEditor = null;
        }
    }
    set size(value) {
        var previous = this._size;
        if (SizeEquals(value, previous) == true) {
            return;
        }
        this._size = value;

        var wrapper = this.container;
        wrapper.style.width = `${value.width}px`;
        wrapper.style.height = `${value.height}px`;

        this._resizeBackground();
        this._updateShapes();
        this._updateEditorInsets();
    }
    get size() {
        return this._size;
    }
    set cornerRadius(val) {
        const cornerRadius = clamp(val, 0, 1);
        const previous = this.cornerRadius;
        if (cornerRadius == previous) {
            return;
        }
        this._cornerRadius = cornerRadius;

        if (previous == 0 || val == 0) {
            this.applyStyleToElements(this.style, false);
        }
        else {
            this._updateShapes();
        }
        this._redrawBackground();
    }
    get cornerRadius() {
        return this._cornerRadius ?? 0;
    }
    set style(aStyleObj) {
        var previous = this._style;
        if (previous == aStyleObj) {
            return;
        }

        if (previous != null) {
            if (previous.angle != null) {
                // XXX crummy should have needsDisplay or something?
                previous.removeObserverForProperty(this, "angle");
            }
        }

        this._style = aStyleObj;

        var current = this.style;

        var textAlignment = null;
        if (previous != null && current != null) {
            if (previous.family == current.family) {
                // Don't change the text alignment
                // incase the person has overridden
                // it, as it doesn't seem polite for
                // just a variant change
                textAlignment = this.textAlignment;
            }
        }

        if (current != null) {
            if (current.angle != null) {
                // XXX crummy should have needsDisplay or something?
                current.addObserverForProperty(this, "angle");
            }
        }


        if (textAlignment == null) {
            if (current != null) {
                var textAttributes = current.textAttributes;
                if (textAttributes != null) {
                    textAlignment = textAttributes.alignment;
                }
            }
        }
        if (textAlignment == null) {
            textAlignment = "left";
        }

        this.applyStyleToElements(current);
        this.textAlignment = textAlignment;
        this._updateMediaHeight();
    }
    get style() {
        var style = this._style;
        if (style == null) {
            style = Media.Text.Style.Default;
        }
        return style;
    }
    set textAlignment(textAlignment) {
        this._textAlignment = textAlignment;
        this.editor.style.textAlign = textAlignment;
    }
    get textAlignment() {
        return this._textAlignment;
    }
    set textSize(textSize) {
        this._textSize = textSize;
        this._updateEditorFontSize();
        this._updateMediaHeight();
    }
    get textSize() {
        return this._textSize;
    }
    set attributedString(anAttributedString) {
        var editor = this.editor;
        RemoveAllChildrenFrom(editor);

        if (anAttributedString == null) {
            return;
        }

        var wrapper = document.createElement("div");
        editor.appendChild(wrapper);

        anAttributedString.enumerate((offset, string, attributes) => {
            if (string?.length == 0) {
                return;
            }

            var run = document.createElement("span");

            var lastIndex = -1;
            // TODO (eslint, debugging, no-constant-condition): add a comment explaining exit condition
            /* eslint-disable no-constant-condition */
            while (true) {
                var curIndex = string.indexOf("\n", lastIndex + 1);
                if (curIndex == -1) {
                    const fragment = string.substring(lastIndex + 1);
                    run.appendChild(document.createTextNode(fragment));
                    break;
                }

                const fragment = string.substring(lastIndex + 1, curIndex);
                run.appendChild(document.createTextNode(fragment));
                run.appendChild(document.createElement("br"));
                lastIndex = curIndex;
            }
            /* eslint-enable no-constant-condition */

            var classList = run.classList;
            if (attributes.italic == true) {
                classList.add(TextSlideEditor.Attribute.Italic);
            }
            if (attributes.bold == true) {
                classList.add(TextSlideEditor.Attribute.Bold);
            }
            if (attributes.underline == true) {
                classList.add(TextSlideEditor.Attribute.Underline);
            }
            if (attributes.strikethrough == true) {
                classList.add(TextSlideEditor.Attribute.Strikethrough);
            }

            wrapper.appendChild(run);
        })

        // If there isn't any text in the DOM, contentEditable
        // isn't going to behave sensibly.
        if (wrapper.childNodes.length == 0) {
            var empty = document.createElement("span");
            empty.innerText = this.placeholderCharacter;
            wrapper.appendChild(empty);
        }
    }
    get attributedString() {
        var result = new AttributedString();

        var attributes = [];
        var push = function(set) {
            attributes.push(set)
        }
        var pop = function() {
            attributes.pop();
        }
        var get = function() {
            var r = {};
            attributes.forEach(set => {
                for (var key in set) {
                    r[key] = set[key];
                }
            })
            return r;
        }

        var placeholderCharacter = this.placeholderCharacter;
        var enumerateDeeply = function(node) {
            var children = Array.from(node.childNodes);

            children.forEach(child => {
                var nodeType = child.nodeType;
                if (nodeType == Node.TEXT_NODE) {
                    var textContent = child.textContent;
                    textContent = textContent.replaceAll(placeholderCharacter, "");
                    if (textContent.length > 0) {
                        TextLinkExtractor(textContent, (text, isLink) => {
                            var attrs = get();
                            if (isLink == true) {
                                attrs.link = text;
                            }
                            result.appendStringWithAttributes(text, attrs);
                        });
                    }
                }
                else if (nodeType == Node.ELEMENT_NODE) {
                    var classList = child.classList;
                    var attrs = {};
                    if (classList.contains(TextSlideEditor.Attribute.Bold) == true) {
                        attrs.bold = true;
                    }
                    if (classList.contains(TextSlideEditor.Attribute.Italic) == true) {
                        attrs.italic = true;
                    }
                    if (classList.contains(TextSlideEditor.Attribute.Underline) == true) {
                        attrs.underline = true;
                    }
                    if (classList.contains(TextSlideEditor.Attribute.Strikethrough) == true) {
                        attrs.strikethrough = true;
                    }

                    push(attrs);

                    if (child.tagName.toLowerCase() == "br") {
                        result.appendStringWithAttributes("\n", get());
                    }
                    else {
                        enumerateDeeply(child);
                        if (child.tagName.toLowerCase() == "div") {
                            // <div> tags sometimes emit newlines, but:
                            // 1) When its the last element
                            // 2) Or ended with a <br/> or other newline
                            // a newline isn't emitted.
                            if (child.nextSibling != null && result.toString().endsWith("\n") == false) {
                                result.appendStringWithAttributes("\n", get());
                            }
                        }
                    }

                    pop();
                }
            });
        };

        var editor = this.editor;
        // Need to disable the textTransform prior to reading
        // otherwise the strings will come back with that transform
        // applied (e.g. all uppercase), and we don't want to store
        // those: Otherwise changing themes would result in the uppercase
        // persisting
        var textTransform = editor.style.textTransform;
        editor.style.textTransform = "none";

        // Make the attributed string
        enumerateDeeply(editor);

        // Safe to restore the text transform now
        editor.style.textTransform = textTransform;

        result.trim();
        return result;
    }
    set media(object) {
        const previous = this._media;
        if (previous != null) {
            previous.removeObserverForProperty(this, "center");
        }
        this._media = object;
        if (object != null) {
            object.addObserverForProperty(this, "center");
        }
    }
    get media() {
        return this._media;
    }
    /*
     * Actions
     */
    toggleBold() {
        this.toggleAttribute(TextSlideEditor.Attribute.Bold);
    }
    toggleItalic() {
        this.toggleAttribute(TextSlideEditor.Attribute.Italic);
    }
    toggleUnderline() {
        this.toggleAttribute(TextSlideEditor.Attribute.Underline);
    }
    toggleStrikethrough() {
        this.toggleAttribute(TextSlideEditor.Attribute.Strikethrough);
    }
    toggleAttribute(attribute) {
        var style = this.style;
        if (style.supportsRTF == false) {
            return;
        }

        this._toggleClassNameOnSelection(attribute);
    }
    focus() {
        this.editor.focus();
    }
    selectAll() {
        var editor = this.editor;
        var range = document.createRange();
        range.selectNodeContents(editor);

        var contents = range.toString();

        // If the contents are solely our placeholder character,
        // it won't show a selection due to being 0-width
        // So instead we'll just show the caret where the text
        // will being
        if (contents.length == 0 || contents == this.placeholderCharacter) {
            var walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
            var node = null;
            while ((node = walker.nextNode()) != null) {
                if (node.nodeType == Node.TEXT_NODE) {
                    range.setStart(node, 0);
                    range.setEnd(node, 0);
                    break;
                }
            }
        }

        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
    /*
     *
     */
    // XXX: should refactor into two methods, one that can
    // just handle the sizing, and the other that deals
    // with the styling.
    applyStyleToElements(style, updateTextAttributes = true) {
        var size = SizeCopy(this.size);
        var scale = this.scale;

        size.width /= scale;
        size.height /= scale;

        var editor = this.editor;
        // An empty ellipse shape may have moved the editor
        // to get the caret vertically centered.  Ensure
        // we undo that.
        editor.style.top = "";
        editor.style.position = "";

        /*
         * Stylize background
         */
        var wrapper = this.container;
        var background = this.background;

        const bgAttrs = style.backgroundAttributes ?? {};
        let bgCanvasFilter = "";
        if (bgAttrs.filter == "blur") {
            bgCanvasFilter = "blur(15px)";
        }
        const bgCanvas = this.backgroundCanvas;
        bgCanvas.style.backdropFilter = bgCanvasFilter;
        bgCanvas.style.setProperty("-webkit-backdrop-filter", bgCanvasFilter);
        // The background insets may have changed with the style change
        // which may necessitate a resizing of the canvas...
        this._resizeBackground();

        var shapeHalfLeft = this.shapeHalfLeft;
        var shapeHalfRight = this.shapeHalfRight;

        if (style.shape == AdvancedTextLayer.Shape.Ellipse || this.cornerRadius > 0) {
            background.insertBefore(shapeHalfLeft, editor);
            background.insertBefore(shapeHalfRight, editor);
            background.classList.add("shaped");
            this._updateShapes();
        }
        else {
            background.classList.remove("shaped");
            if (shapeHalfLeft.parentNode != null) {
                shapeHalfLeft.parentNode.removeChild(shapeHalfLeft);
            }
            if (shapeHalfRight.parentNode != null) {
                shapeHalfRight.parentNode.removeChild(shapeHalfRight);
            }
        }

        wrapper.style.width = `${size.width}px`;
        wrapper.style.height = `${size.height}px`;

        /*
         * Stylize editor/text
         */
        var fgHeight = size.height;
        var fgWidth = size.width;
        var contentInsets = style.contentInsets ?? InsetsZero();
        this._updateEditorInsets(fgWidth, fgHeight, contentInsets, style.insetsAreProportional);

        editor.className = "editor";
        editor.style.background = "";
        style.populateEditorContainer(editor);

        if (style.supportsRTF == false) {
            var spans = Array.from(editor.querySelectorAll("span"));
            spans.forEach(span => span.className = "");
            this.updateAttributeState();
        }

        if (updateTextAttributes == false) {
            return;
        }

        var textAttributes = style.textAttributes;
        var transform = textAttributes.transform;
        if (transform == null) {
            transform = "";
        }
        editor.style.textTransform = transform;

        var alignment = textAttributes.alignment;
        if (alignment == null) {
            alignment = "";
        }
        editor.style.textAlign = alignment;

        var font = textAttributes.font;

        var boldWeight = null;
        if (font == null) {
            editor.style.font = "";
        }
        else {
            editor.style.font = font;
            boldWeight = font.bold;
        }

        if (boldWeight == null) {
            boldWeight = "bolder";
        }
        editor.style.setProperty("--bold-weight", boldWeight);

        this._updateEditorFontSize();

        var color = textAttributes.color;
        if (color == null) {
            color = "";
        }
        editor.style.color = color;

        var shadow = textAttributes.shadow;
        var cssShadow = null;
        if (shadow == null) {
            cssShadow = "";
        }
        else {
            cssShadow = `${shadow.offset.x / scale}px ${shadow.offset.y / scale}px ${shadow.radius / scale}px ${shadow.color}`
        }
        editor.style.textShadow = cssShadow;
    }
    _updateEditorInsets() {
        var style = this.style;
        var insets = style.contentInsets;

        if (style.insetsAreProportional == true) {
            var {width, height} = this.size;

            insets.top = Math.floor(insets.top * height);
            insets.left = Math.floor(insets.left * width);
            insets.bottom = Math.ceil(insets.bottom * height);
            insets.right = Math.ceil(insets.right * width);
        }

        var editor = this.editor;
        editor.style.marginTop = `${insets.top}px`;
        editor.style.marginLeft = `${insets.left}px`;
        editor.style.marginBottom = `${insets.bottom}px`;
        editor.style.marginRight = `${insets.right}px`;
        editor.style.maxHeight = `calc(100% - ${insets.top + insets.bottom}px)`
        editor.style.width = `calc(100% - ${insets.left + insets.right}px)`
    }
    _updateEditorFontSize() {
        var fontSize = this.style?.pointSizeForSize(this.textSize) ?? 96;
        var editor = this.editor;
        editor.style.fontSize = `${fontSize}px`;

        var lineHeight = this.lineHeightForFont(editor.style.font);
        editor.style.lineHeight = lineHeight;

        let scale = this.scale;
        if (scale != 1) {
            const fontSize = editor.style.fontSize;
            if (fontSize != null) {
                let unitGroup = fontSize.match(/[a-z]*$/);
                let unit = null;
                if (unitGroup != null && unitGroup.length == 1) {
                    unit = unitGroup[0];
                }
                else {
                    unit = "px";
                }
                editor.style.fontSize = (parseInt(fontSize) / scale) + unit;
            }

            const lineHeight = editor.style.lineHeight;
            if (lineHeight != null) {
                let unitGroup = lineHeight.match(/[a-z]*$/);
                let unit = null;
                if (unitGroup != null && unitGroup.length == 1) {
                    unit = unitGroup[0];
                }
                else {
                    unit = "px";
                }
                editor.style.lineHeight = (parseInt(lineHeight) / scale) + unit;
            }
        }
        this._updateShapes();
    }
    lineHeightForFont(font) {
        var context = this.measurementContext;
        if (context == null) {
            var canvas = document.createElement("canvas");
            context = canvas.getContext("2d");
            this.measurementContext = context;
        }
        //TypesetterRun.ApplyAttributesInContext(attributes, context);
        context.font = font;
        var metrics = TextMetricsInContext2D("x", context, true);
        var height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
        return `${height}px`;
    }
    setContainerScale(scale) {
        this.container.style.transform = "scale(" + scale + ")";
        this._updateBackgroundClipRect();
    }
    /*
     *
     */
    createElements() {
        var container = document.createElement("div");
        container.classList.add("text_editor");
        this.container = container;
        OnAddedToDocument(container, () => this.containerWasAddedToDocument());

        var background = document.createElement("div");
        background.id = "background";
        container.appendChild(background);
        this.background = background;

        const bgCanvas = document.createElement("canvas");
        background.appendChild(bgCanvas);
        this.backgroundCanvas = bgCanvas;

        var editor = document.createElement("div");
        editor.id = "content";
        editor.className = "editor";
        editor.contentEditable = true;
        editor.spellcheck = true;
        background.appendChild(editor);
        this.editor = editor;

        var shapeHalfLeft = document.createElement("div");
        shapeHalfLeft.classList.add("shape", "left");
        this.shapeHalfLeft = shapeHalfLeft;

        var shapeHalfRight = document.createElement("div");
        shapeHalfRight.classList.add("shape", "right");
        this.shapeHalfRight = shapeHalfRight;

        var debug = this._debugShapes;
        if (debug == true) {
            shapeHalfLeft.style.backgroundColor = Color(1, 0, 0, 0.4);
            shapeHalfRight.style.backgroundColor = Color(0, 0, 1, 0.4);
        }

        var typesetter = new Typesetter();
        this.typesetter = typesetter;

        this.setupContentEditableHooks();
    }
    /*
     * Content Editable things....
     */
    setupContentEditableHooks() {
        var editor = this.editor;

        var pasteListener = (event) => {
            this.handlePasteEvent(event);
        };
        // we only want plain text
        editor.addEventListener("paste", pasteListener);
        this.pasteListener = pasteListener;

        // Listen for selection changes so we can update
        // the state in the format buttons
        var selectionListener = (evt) => {
            this.handleSelectionEvent(evt);
        }
        document.addEventListener("selectionchange", selectionListener);
        this.selectionListener = selectionListener;

        // Listen for mutations on the editor, we need to
        // handle situations where the browser puts in nodes
        // we don't like
        const config = { attributes: false, childList: true, subtree: true, characterData: true };
        const callback = (mutationList, observer) => {
            this.handleMutationEvent(mutationList);
        };
        const observer = new MutationObserver(callback);
        observer.observe(editor, config);
        this.mutationObserver = observer;
    }
    destroyContentEditableHooks() {
        var editor = this.editor;

        var pasteListener = this.pasteListener;
        if (pasteListener != null) {
            editor.removeEventListener("paste", pasteListener);
            this.pasteListener = null;
        }

        var selectionListener = this.selectionListener;
        if (selectionListener != null) {
            document.removeEventListener("selectionchange", selectionListener);
            this.selectionListener = null;
        }

        var mutationObserver = this.mutationObserver;
        if (mutationObserver != null) {
            mutationObserver.disconnect();
            this.mutationObserver = null;
        }
    }
    containerWasAddedToDocument() {
        if (this.isStageInlineEditor() == true) {
            this.createResizeObserver();
        }

        this._redrawBackground();
    }
    createResizeObserver() {
        let stageResizeObserver = this.stageResizeObserver;
        if (stageResizeObserver != null) {
            return;
        }

        stageResizeObserver = new ResizeObserver(() => this._redrawBackground());
        this.stageResizeObserver = stageResizeObserver;
        stageResizeObserver.observe(gApp.stage.overlay);
    }
    destroyResizeObserver() {
        const stageResizeObserver = this.stageResizeObserver;
        if (stageResizeObserver != null) {
            stageResizeObserver.disconnect();
            this.stageResizeObserver = null;
        }
    }
    handlePasteEvent(event) {
        if (document.activeElement != this.editor) {
            return;
        }

        event.preventDefault();

        var data = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, data);
    }
    handleSelectionEvent(event) {
        this.updateAttributeState();
    }
    handleMutationEvent(mutationList) {
        var editor = this.editor;

        mutationList.forEach(record => {
            if (record.type == "characterData") {
                return;
            }

            var added = record.addedNodes;
            if (added.length == 0) {
                return;
            }

            var node = added[0];
            var nodeType = node.nodeType;

            var needsChange = false;
            if (nodeType == Node.TEXT_NODE) {
                if (node.parentNode == editor) {
                    needsChange = true;
                }
            }
            else if (nodeType == Node.ELEMENT_NODE) {
                var supported = ["div", "span", "br"];
                var tagName = node.tagName.toLowerCase();
                if (supported.indexOf(tagName) == -1) {
                    needsChange = true;
                }

                // We only set this via class names on the node
                // but contentEditable will convert that to
                // an inline style if the person deletes all of
                // the content in the node, e.g.
                // type text, select all, apply title/upper case
                // then type to replace the selection.
                var textTransform = node.style.textTransform;
                if (textTransform != null && textTransform != "") {
                    node.style.textTransform = "";

                    for (var key in TextSlideEditor.Attribute) {
                        var val = TextSlideEditor.Attribute[key];
                        if (val == textTransform) {
                            AddClassNameToElement(val, node);
                        }
                    }
                }
            }

            if (needsChange == true) {
                this.rehostEditorElement(node);
            }
        })

        this._updateMediaHeight();
        this._updateShapes();

        NotificationCenter.default.postNotification(TextSlideEditor.Notifications.ContentsChanged, this, {});
    }
    _updateShapes() {
        var style = this.style;

        if (style.shape != AdvancedTextLayer.Shape.Ellipse && this.cornerRadius <= 0) {
            return;
        }

        var size = this.size;
        var insets = style.contentInsets;
        if (style.insetsAreProportional == true) {
            insets.left *= size.width;
            insets.right *= size.width;
            insets.top *= size.height;
            insets.bottom *= size.height;
        }

        var maxSize = SizeMake(
            size.width - (insets.left + insets.right),
            size.height - (insets.top + insets.bottom)
        );
        var halfSize = SizeMake(
            size.width / 2,
            size.height / 2,
        );

        var typesetter = this.typesetter;
        var text = this.attributedString;
        var moveEditor = false;
        if (text.length == 0) {
            // Ensure we have some text to work with, otherwise our
            // polygons will be wrong.
            text = new AttributedString(" ", {});
            // Despite the shape-outside, the caret will appear
            // at the top of the media. So we'll need to temporarily
            // move it...
            moveEditor = true;
        }

        var fontSize = this.style?.pointSizeForSize(this.textSize) ?? 96;
        text.enumerate((offset, string, attrs) => {
            var textAttributes = Object.assign({}, style.textAttributes);
            var font = textAttributes.font;
            if (font != null) {
                font = font.copy();
                font.size = fontSize;
                textAttributes.font = font;
            }
            Object.assign(attrs, textAttributes);
        })

        var lineHeight = null;
        var dppx = window.devicePixelRatio;
        if (Math.round(dppx) != dppx) {
            // When weird scales or page zoom is used, the font's line height
            // may differ by a fraction of a pixel.  We need to know what
            // the actual height is in order to shape the polygon correctly.
            lineHeight = this._getActualLineHeight();
        }

        var lines = null;
        if (style.shape == AdvancedTextLayer.Shape.Ellipse) {
            lines = typesetter.linesFromTextConstrainedToEllipse(text, maxSize);
        }
        else {
            const cornerRadius = this.cornerRadius;
            const radius = (Math.min(maxSize.width, maxSize.height) / 2) * cornerRadius;
            lines = typesetter.linesFromTextConstrainedToRoundRect(text, maxSize, radius);
        }
		var textHeight = lines.reduce((cur, line) => cur += line.height, 0);
        var left = [[0, 0]];
        var right = [[halfSize.width, 0]];
        var lineTo = function(bucket, x, y) {
            if (x == null || y == null) {
                var last = bucket[bucket.length - 1];
                if (x == null) {
                    x = last[0];
                }
                if (y == null) {
                    y = last[1];
                }
            }

            bucket.push([Math.ceil(x), Math.ceil(y)]);
        }

        var y = insets.top + ((maxSize.height - textHeight) / 2);
        var midX = insets.left + (maxSize.width / 2);
        var midY = insets.top + (maxSize.height / 2);
        var rect = null;

        lineTo(left, halfSize.width, 0);
        lineTo(left, halfSize.width, y);
        lineTo(right, 0, 0);
        lineTo(right, 0, y);

        const numLines = lines.length;
        lines.forEach((line, idx) => {
            rect = RectMake(
                midX - (line.maxWidth / 2),
                y,
                line.maxWidth,
                lineHeight ? lineHeight : line.height
            );

            if (idx + 1 == numLines) {
                if (lineHeight != null) {
                    rect.height += 2;
                }
            }

            const empty = (line.length == 1 && line.string.trim().length == 0);

            if (RectGetMinY(rect) < midY) {
                lineTo(left, RectGetMinX(rect), RectGetMinY(rect));
                lineTo(right, RectGetMaxX(rect) - halfSize.width, RectGetMinY(rect));
                if (empty == true) {
                    lineTo(left, null, RectGetMaxY(rect));
                    lineTo(right, null, RectGetMaxY(rect));
                }
            }
            if (RectGetMaxY(rect) >= midY) {
                if (empty == true) {
                    lineTo(left, null, RectGetMinY(rect));
                    lineTo(right, null, RectGetMinY(rect));
                }
                lineTo(left, RectGetMinX(rect), RectGetMaxY(rect));
                lineTo(right, RectGetMaxX(rect) - halfSize.width, RectGetMaxY(rect));
            }

            y = RectGetMaxY(rect);
        });

        if (rect != null) {
            lineTo(left, null, RectGetMaxY(rect));
            lineTo(right, null, RectGetMaxY(rect));
        }

        lineTo(left, size.width, null);
        lineTo(left, size.width, size.height);
        lineTo(left, 0, size.height);

        lineTo(right, 0, null);
        lineTo(right, 0, size.height);
        lineTo(right, size.width, size.height);

        var makePolygon = function(points) {
            var pixels = points.map(coord => {
                return `${coord[0]}px ${coord[1]}px`
            })
            var r = `polygon(${pixels.join(",\n")})`;
            return r;
        }

        var debug = this._debugShapes;

        var shapeHalfLeft = this.shapeHalfLeft;
        var leftPoly = makePolygon(left);
        shapeHalfLeft.style.shapeOutside = leftPoly;
        shapeHalfLeft.style.setProperty("-webkit-shape-outside", leftPoly);
        if (debug == true) {
            shapeHalfLeft.style.clipPath = leftPoly;
        }

        var shapeHalfRight = this.shapeHalfRight;
        var rightPoly = makePolygon(right);
        shapeHalfRight.style.shapeOutside = rightPoly;
        shapeHalfRight.style.setProperty("-webkit-shape-outside", rightPoly);
        if (debug == true) {
            shapeHalfRight.style.clipPath = rightPoly;
        }

        var editor = this.editor;
        var top = "";
        var position = "";
        if (moveEditor == true) {
            top = `${halfSize.height - (lines[0].height / 2)}px`;
            position = "absolute";
        }
        editor.style.top = top;
        editor.style.position = position;
    }
    _updateMediaHeight() {
        var delegate = this.delegate;
        if (delegate == null) {
            return;
        }

        var editor = this.editor;
        var mediaHeight = editor.scrollHeight;

        var style = this.style;
        if (style != null) {
            if (style.shape == AdvancedTextLayer.Shape.Ellipse || this.cornerRadius > 0) {
                // The calculations aren't correct and the resize
                // ends up being incredibly jittery
                return;
            }
            var insets = style.contentInsets;
            if (style.insetsAreProportional == true) {
                var size = this.size;
                insets.top *= size.height;
                insets.bottom *= size.height;
            }
            if (insets != null) {
                mediaHeight += insets.top + insets.bottom;
            }
        }

        var lastEditorMediaHeight = this.lastEditorMediaHeight;
        if (mediaHeight != lastEditorMediaHeight) {
            if (lastEditorMediaHeight != null) {
                delegate.editorChangedHeight(this, lastEditorMediaHeight, mediaHeight);
            }
            this.lastEditorMediaHeight = mediaHeight;
        }
    }
    // When weird scales are used, either display scales on Windows,
    // or page zooms in the browser, the line height of the font changes
    // subtly - by a fraction of a pixel.  This will get the effective/actual
    // line height which the ellipse shapes need.
    _getActualLineHeight() {
        const editor = this.editor;
        const range = document.createRange();
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
        let node = null;
        while ((node = walker.nextNode()) != null) {
            if (node.nodeType != Node.TEXT_NODE || node.length == 0) {
                continue;
            }

            range.setStart(node, 0);
            range.setEnd(node, 1);

            const glyphBox = range.getBoundingClientRect();

            // We're likely being scaled, so infer what our scale is...
            const ourBox = this.container.getBoundingClientRect();
            const ourSize = this.size;
            const scale = Math.min(ourBox.width/ourSize.width, ourBox.height / ourSize.height);

            // Apply that to the glyph height and return
            return glyphBox.height / scale;
        }
        return null;
    }
    _getGlyphInformation() {
        var container = this.container;
        var transform = container.style.transform;
        container.style.transform = "";

        var editor = this.editor;
        var lines = [];
        var line = null;
        var lastY = -1;
        var editorBox = editor.getBoundingClientRect();

        var range = document.createRange();
        var walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
        var node = null;
        while ((node = walker.nextNode()) != null) {
            if (node.nodeType != Node.TEXT_NODE) {
                continue;
            }

            var text = node.textContent;
            var length = node.length;
            for (var idx = 0; idx < length; idx += 1) {
                range.setStart(node, idx);
                range.setEnd(node, idx + 1);

                var rect = range.getBoundingClientRect();
                if (rect.y != lastY) {
                    lastY = rect.y;
                    line = {
                        glyphs: [],
                        x: null, y: null,
                        width: 0, height: 0
                    };
                    lines.push(line);
                }

                var x = rect.x - editorBox.x;
                var y = rect.y - editorBox.y;

                if (line.x == null || x < line.x) {
                    line.x = x;
                }
                if (line.y == null || y < line.y) {
                    line.y = y;
                }
                line.height = Math.max(line.height, rect.height);
                line.width += rect.width;

                line.glyphs.push({
                    char: text[idx],
                    x: x,
                    y: y,
                    width: rect.width,
                    height: rect.height,
                })
            }
        }
        container.style.transform = transform;
        return lines;
    }

    /*
     * DOM manipulators
     */
    rehostEditorElement(oldNode) {
        var editor = this.editor;

        // If the selection was within the thing
        // we're re-hosting, we'll need to update
        // the selection...
        var selection = window.getSelection();

        var range = null;
        if (selection.rangeCount == 0) {
            range = document.createRange();
        }
        else {
            range = selection.getRangeAt(0);
        }

        var startContainer = range.startContainer;
        var startOffset = range.startOffset;

        var endContainer = range.endContainer;
        var endOffset = range.endOffset;

        var updateStartSelection = false;
        if (IsDescendentOf(startContainer, oldNode) ||
            startContainer == oldNode ||
            startContainer == editor)
        {
            updateStartSelection = true;
        }

        var updateEndSelection = false;
        if (IsDescendentOf(endContainer, oldNode) ||
            endContainer == oldNode ||
            endContainer == editor)
        {
            updateEndSelection = true;
        }

        // Create new element to host the bad node
        var oldParent = oldNode.parentNode;
        var wrapperType = null;
        if (oldParent == editor) {
            wrapperType = "div";
        }
        else {
            wrapperType = "span";
        }

        var wrapper = document.createElement(wrapperType);
        oldParent.replaceChild(wrapper, oldNode);

        // Move contents over to new element
        if (oldNode.nodeType == Node.TEXT_NODE ||
           (oldNode.nodeType == Node.ELEMENT_NODE && oldNode.tagName.toLowerCase() == "br"))
        {
            wrapper.appendChild(oldNode);
        }
        else {
            Array.from(oldNode.childNodes).forEach(child => {
                var type = child.nodeType;
                if (type == Node.TEXT_NODE ||
                   (type == Node.ELEMENT_NODE && child.tagName.toLowerCase() == "span"))
                {
                    wrapper.appendChild(child);
                }
            })
        }

        // Deal with selection updating
        if (updateStartSelection == true) {
            range.setStart(startContainer, startOffset);
        }
        if (updateEndSelection == true) {
            range.setEnd(endContainer, endOffset);
        }
        if (updateStartSelection == true || updateEndSelection == true) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
    // Give a selection,
    stylizableNodesFromSelection(selection) {
        var nodes = this.textNodesInSelection(selection);
        var numNodes = nodes.length;
        if (numNodes == 0) {
            return [];
        }

        // As we're splitting nodes, we may need to
        // update the selection
        var {startContainer,startOffset,endContainer,endOffset} = this.editorRangeFromSelection(selection);
        var range = document.createRange();
        range.setStart(startContainer, startOffset);
        range.setEnd(endContainer, endOffset);
        var selectionNeedsUpdate = false;

        // Walk the text nodes, splitting as needed....
        var spans = nodes.map((node, nodeIdx) => {
            var needsNewParent = false;

            if (nodeIdx == 0 && startOffset > 0) {
                node = node.splitText(startOffset);
                if (startContainer == endContainer) {
                    endOffset -= startContainer.length;
                }
                needsNewParent = true;
            }
            if (nodeIdx == numNodes - 1 && endOffset < node.length) {
                node.splitText(endOffset);
                needsNewParent = true;
            }

            // Split text needs to be inside a span tag.
            var parent = node.parentNode;
            if (parent.nodeType != Node.ELEMENT_NODE) {
                needsNewParent = true;
            }
            else {
                if (parent.tagName.toLowerCase() != "span") {
                    needsNewParent = true;
                }
                else {
                    if (node.previousSibling != null || node.nextSibling != null) {
                        needsNewParent = true;
                    }
                }
            }

            if (needsNewParent == false) {
                return parent;
            }

            var span = document.createElement("span");
            parent.replaceChild(span, node);
            span.appendChild(node);

            // Inherit styling from previous sibling,
            // if its a span....
            var previous = parent.previousSibling;
            if (previous != null &&
                previous.nodeType == Node.ELEMENT_NODE &&
                previous.tagName.toLowerCase() == "span")
            {
                var className = previous.className;
                if (className != null && className != "") {
                    span.className = className;
                }
            }

            // Try to avoid deeply nested tags....
            // If we're already inside a span, we'll
            // split the span apart.
            if (parent.tagName.toLowerCase() == "span") {
                var grandparent = parent.parentNode;

                // Move all nodes from our span to the end
                // to be siblings of our parent
                var siblings = Array.from(parent.childNodes);
                siblings = siblings.slice(siblings.indexOf(span));

                var insertBefore = parent.nextSibling;

                siblings.forEach(sibling => {
                    // If the sibling is a text node, we need
                    // to change it to a span so we can copy
                    // styling over
                    if (sibling.nodeType == Node.TEXT_NODE) {
                        var wrapper = document.createElement("span");
                        wrapper.appendChild(sibling);
                        sibling = wrapper;
                    }

                    sibling.className = parent.className;

                    if (insertBefore != null) {
                        grandparent.insertBefore(sibling, insertBefore);
                    }
                    else {
                        grandparent.appendChild(sibling);
                    }
                })
            }

            // Ensure the selection remains up-to-date
            if (nodeIdx == 0) {
                range.setStart(node, 0);
                selectionNeedsUpdate = true;
            }
            if (nodeIdx == numNodes - 1) {
                range.setEnd(node, node.length);
                selectionNeedsUpdate = true;
            }

            return span;
        })

        // In Firefox it isn't sufficient to just
        // modify the range's start/end, we need
        // to update the selection object...
        if (selectionNeedsUpdate == true) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        return spans;
    }
    /*
     * Selection helpers
     */
    // The browser's Range object won't allow empty text nodes
    // to be selected:  It'll either select the previous sibling,
    // or the parent node.  This class would prefer an empty text
    // node to dealing with elements, so this'll return something
    // that sort of looks like a Range, but allows empty text nodes.
    editorRangeFromSelection(selection) {
        if (selection.rangeCount == 0) {
            return null;
        }

        var editor = this.editor;

        // Helper for getting a flattened list of nodes
        // from a given parent
        var nodeListFromElement = function(parent) {
            var result = [];
            var children = parent.childNodes;
            for (var idx = 0; idx < children.length; idx += 1) {
                var child = children[idx];
                result.push(child);

                if (child.nodeType == Node.ELEMENT_NODE) {
                    var grandchildren = nodeListFromElement(child);
                    result = result.concat(grandchildren);
                }
            }

            return result;
        }

        // Helper for finding a text node nearest to a given node
        var textNodeNearestParent = function(parent, direction) {
            const nodes = nodeListFromElement(editor);
            var base = nodes.indexOf(parent);
            if (base == -1) {
                console.error("couldn't find element in nodes", parent, nodes);
                return null;
            }
            for (var offset = base; offset >= 0 && offset <= nodes.length; offset += direction) {
                var child = nodes[offset];
                if (child != null && child.nodeType == Node.TEXT_NODE) {
                    return child;
                }
            }
            //console.error("no text nodes relative to parent in direction", direction, parent, nodes);
            return null;
        }

        // Get the browser's range
        var range = selection.getRangeAt(0);
        var startContainer = range.startContainer;
        var startOffset = range.startOffset;
        // Verify its inside the editor
        if (IsDescendentOf(startContainer, editor) == false) {
            return null;
        }

        // If the start range is the editor, change it to the
        // first text node we can find
        if (startContainer == editor) {
            const nodes = nodeListFromElement(editor);
            startContainer = nodes.find(node => node.nodeType == Node.TEXT_NODE);
            if (startContainer == null) {
                // Expected if the editor has been cleared....
                return null;
            }
        }

        var endContainer = range.endContainer;
        var endOffset = range.endOffset;
        // Verify its inside the editor
        if (IsDescendentOf(endContainer, editor) == false) {
            return null;
        }

        // If the end range is the editor, change it to the
        // last text node we can find
        if (endContainer == editor) {
            const nodes = nodeListFromElement(editor);
            endContainer = nodes.find(node => node.nodeType == Node.TEXT_NODE);
            if (endContainer != null) {
                endOffset = endContainer.length;
            }
            else {
                // Expected if the editor has been cleared....
                return null;
            }
        }

        // This method is only concerned with text nodes
        // so if the start and/or end containers aren't
        // text nodes, try to find the nearest text node
        if (startContainer.nodeType != Node.TEXT_NODE) {
            const children = startContainer.childNodes;
            let child = children[startOffset];
            startOffset = 0;

            if (child == null || child.nodeType != Node.TEXT_NODE) {
                child = textNodeNearestParent(child, -1);
                if (child != null) {
                    startOffset = child.length;
                }
                else {
                    //debugger;
                }
            }
            startContainer = child;
        }

        if (endContainer.nodeType != Node.TEXT_NODE) {
            const children = endContainer.childNodes;
            let child = children[endOffset];
            if (child == null || child.nodeType != Node.TEXT_NODE) {
                child = textNodeNearestParent(child, 1);
                if (child == null) {
                    //debugger;
                }
            }
            endContainer = child;
            endOffset = 0;
        }

        // If one container is null and the other isn't,
        // change the null one to be at the end of the non-null one
        if (endContainer == null && startContainer != null) {
            endContainer = startContainer;
            endOffset = startContainer.length;
        }
        else if (endContainer != null && startContainer == null) {
            startContainer = endContainer;
            startOffset = 0;
        }

        // Finally.
        var result = {
            startContainer, startOffset,
            endContainer, endOffset
        };
        return result;
	}
    // Returns nodes that can be queried for styling
    queryableNodesFromSelection(selection) {
        var textNodes = this.textNodesInSelection(selection);
        return textNodes.map(node => {
            var parent = node.parentNode;
            if (parent.nodeType != Node.ELEMENT_NODE) {
                return node;
            }
            if (parent.tagName.toLowerCase() == "span") {
                return parent;
            }
            return node;
        });
    }
    // Returns raw text nodes covering the selection
    textNodesInSelection(selection) {
        var range = this.editorRangeFromSelection(selection);
        if (range == null) {
            return [];
        }

        var results = [];

        var startContainer = range.startContainer;
        var endContainer = range.endContainer;
        var editor = this.editor;

        var walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
        var insideRange = false;
        var node = null;
        while ((node = walker.nextNode()) != null) {
            if (node == startContainer) {
                insideRange = true;
            }

            if (insideRange == true) {
                results.push(node);
            }
            if (node == endContainer) {
                insideRange = false;
                break;
            }
        }

        return results;
    }
    /*
     * State helper
     */
    updateAttributeState() {
        var counts = {};
        var attributes = TextSlideEditor.Attribute;
        for (var key in attributes) {
            var className = attributes[key];
            counts[className] = 0;
        }

        var selection = window.getSelection();
        var nodes = this.queryableNodesFromSelection(selection);

        nodes.forEach(node => {
            if (node.nodeType != Node.ELEMENT_NODE) {
                return;
            }

            var classList = node.classList;
            for (var key in counts) {
                if (classList.contains(key) == true) {
                    counts[key] += 1;
                }
            }
        })

        var state = {};
        var numNodes = nodes.length;
        for (const key in counts) {
            var value = counts[key];
            if (value == 0) {
                state[key] = TextSlideEditor.State.Off;
            }
            else if (value == numNodes) {
                state[key] = TextSlideEditor.State.On;
            }
            else {
                state[key] = TextSlideEditor.State.Mixed;
            }
        }

        if (EqualObjects(this.state, state) == false) {
            this.state = state;
        }
    }

    /*
     * Action helper
     */
    _toggleClassNameOnSelection(className, classesToRemove = []) {
        var selection = window.getSelection();

        var nodes = this.stylizableNodesFromSelection(selection);
        var addClass = true;
        if (className != null) {
            var nodesWithClass = nodes.filter(node => node.classList.contains(className));

            if (nodesWithClass.length == nodes.length) {
                addClass = false;
            }
        }

        nodes.forEach(node => {
            var classList = node.classList;
            if (className != null) {
                if (addClass == true) {
                    classList.add(className);
                }
                else {
                    classList.remove(className);
                }
            }

            classesToRemove.forEach(removeClass => {
                classList.remove(removeClass);
            })
        })

        this.updateAttributeState();
    }
    /*
     *
     */
    setupDevicePixelListener() {
        var listener = this.devicePixelListener;
        if (listener != null) {
            return;
        }
        var handler = () => this._updateShapes();
        listener = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
        listener.addEventListener("change", handler);
        this.devicePixelListener = listener;
        this.devicePixelHandler = handler;
    }
    destroyDevicePixelListener() {
        var listener = this.devicePixelListener;
        if (listener == null) {
            return;
        }
        var handler = this.devicePixelHandler;
        listener.removeEventListener("change", handler);
        this.devicePixelListener = null;
        this.devicePixelHandler = null;
    }
    /*
     * Hotkeys
     */
    setupKeyboardListener() {
        var listener = (evt) => this.handleKeyboardEvent(evt);
        var editor = this.editor;
        editor.addEventListener("keydown", listener);
        this.keyboardListener = listener;

        var commandKey = null;
        if (navigator.platform.startsWith("Mac") == true) {
            commandKey = "metaKey";
        }
        else {
            commandKey = "ctrlKey";
        }
        this.commandKey = commandKey;

        this.hotKeys = [];
        this.registerHotKey('b', () => this.toggleBold());
        this.registerHotKey('u', () => this.toggleUnderline());
        this.registerHotKey('i', () => this.toggleItalic());
        this.registerHotKey('x', () => this.toggleStrikethrough(), "shiftKey");
    }
    destroyKeyboardListener() {
        var listener = this.keyboardListener;
        if (listener != null) {
            var editor = this.editor;
            if (editor != null) {
                editor.removeEventListener("keydown", listener);
            }
            this.listener = null;
        }
        this.hotKeys = [];
    }
    registerHotKey(key, action, ...flags) {
        this.hotKeys.push({key, action, flags});
    }
    handleKeyboardEvent(event) {
        var commandKey = this.commandKey;
        if (event[commandKey] != true) {
            return;
        }

        var key = event.key;
        var match = this.hotKeys.find(entry => {
            if (key != entry.key) {
                return false;
            }

            var flags = entry.flags;
            for (var idx = 0; idx < flags.length; idx += 1) {
                var flag = flags[idx];
                if (event[flag] != true) {
                    return false;
                }
            }
            return true;
        });

        if (match != null) {
            match.action.call(this);
            event.preventDefault();
        }
    }
    /*
     * Background canvas
     */
    isStageInlineEditor() {
        // Are we being displayed over the stage?
        return IsDescendentOf(this.container, gApp.stage.overlay);
    }
    _resizeBackground() {
        const size = this.size ?? SizeMake(1, 1);
        const bgInset = this.style?.backgroundInset ?? 0;
        const backgroundCanvas = this.backgroundCanvas;

        backgroundCanvas.width = size.width + (bgInset * 2);
        backgroundCanvas.height = size.height + (bgInset * 2);

        this._redrawBackground();
    }
    _getBackgroundCanvasClipRect() {
        const bgCanvas = this.backgroundCanvas;
        let clipRect = RectMake(0, 0, bgCanvas.width, bgCanvas.height);

        if (this.isStageInlineEditor() == false) {
            return clipRect;
        }

        const overlay = gApp.stage.overlay;
        // Yes, figure out our intersection
        const canvasBox = bgCanvas.getBoundingClientRect();
        const overlayBox = overlay.getBoundingClientRect();
        const intersection = RectIntersection(canvasBox, overlayBox);

        // The boxes are all in window units, but the stage+overlay
        // are likely being scaled.
        const scale = bgCanvas.height / canvasBox.height;

        clipRect.x = (intersection.x - canvasBox.x) * scale;
        clipRect.y = (intersection.y - canvasBox.y) * scale;
        clipRect.width = RectGetWidth(intersection) * scale;
        clipRect.height = RectGetHeight(intersection) * scale;

        return clipRect;
    }
    _updateBackgroundClipRectAfterDelay() {
        let bgClipRectDelay = this._bgClipRectDelay;
        if (bgClipRectDelay != null) {
            window.clearTimeout(bgClipRectDelay);
        }
        bgClipRectDelay = window.setTimeout(() => {
            this._updateBackgroundClipRect();
        }, 1);
        this._bgClipRectDelay = bgClipRectDelay;
    }
    _updateBackgroundClipRect() {
        const previous = this._backgroundClipRect;
        const current = this._getBackgroundCanvasClipRect();
        // Most styles will be the same size as the handles on the media
        // and thus never draw outside of the stage and won't need clipping
        // This check is to avoid redrawing those.
        if (RectEquals(current, previous) == false) {
            this._backgroundClipRect = current;
            this._redrawBackground();
        }
    }
    _redrawBackground() {
        const bgCanvas = this.backgroundCanvas;
        if (IsDescendentOf(bgCanvas, document) == false) {
            return;
        }

        const context = bgCanvas.getContext("2d");

        context.reset();
        context.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        const style = this.style;
        if (style == null) {
            this._backgroundClipRect = RectZero();
            return;
        }

        const cornerRadius = this.cornerRadius;
        if (cornerRadius != null) {
            const radius = (Math.min(bgCanvas.width, bgCanvas.height) / 2) * cornerRadius;
            const rect = RectMake(0, 0, bgCanvas.width, bgCanvas.height);
            const path = NewRoundRectPathForRectWithRadius(rect, radius);
            context.clip(path);
        }
        else {
            const clipRect = this._getBackgroundCanvasClipRect();
            context.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height);
            context.clip();
            this._backgroundClipRect = clipRect;
        }

        style.drawInContext(context, bgCanvas.width, bgCanvas.height);
    }
    /*
     * KVO
     */
    observePropertyChanged(obj, key, val) {
        if (obj == this.media) {
            this._updateBackgroundClipRectAfterDelay();
        }
        else if (obj == this.style) {
            this._redrawBackground();
        }
    }
}

TextSlideEditor.State = Object.freeze({
    Off: "off",
    On: "on",
    Mixed: "mixed"
});

TextSlideEditor.Attribute = Object.freeze({
    // Attributes
    Bold: "bold",
    Italic: "italic",
    Underline: "underline",
    Strikethrough: "strikethrough",
});

TextSlideEditor.Notifications = Object.freeze({
    ContentsChanged: "contentsChanged",
});
