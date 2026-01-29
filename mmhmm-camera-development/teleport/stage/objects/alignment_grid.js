//
//  alignment_grid.js
//  mmhmm
//
//  Created by Steve White on 8/8/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class AlignmentGrid {
    constructor(width, height, anchorInset = 60) {
        this._anchorInset = anchorInset ?? 0;
        this._spacing = 30;

        this._width = width;
        this._height = height;

        this._createAlignmentCanvas(width, height, this._spacing);

        var resizeObserver = new ResizeObserver(entries => {
            this.updateCanvasOffset();
        });
        this.resizeObserver = resizeObserver;
    }
    attach(object) {
        this.object = object;

        var stage = object.stage;
        this.stage = stage;

        var parentNode = stage.overlay.parentNode;

        var canvas = this.canvas;
        OnChildAppended(parentNode, canvas, () => {
            this.updateCanvasOffset();
        });

        var resizeObserver = this.resizeObserver;
        resizeObserver.observe(canvas);
        parentNode.appendChild(canvas);
    }
    detach() {
        var canvas = this.canvas;
        var parent = canvas.parentNode;
        if (parent != null) {
            parent.removeChild(canvas);
        }
        var resizeObserver = this.resizeObserver;
        if (resizeObserver != null) {
            resizeObserver.disconnect();
        }
        this.stage = null;
        this.object = null;
        this._ignoredLayers = null;
    }
    //
    // Properties
    //
    /** @type {number} */
    get spacing() {
        return this._spacing;
    }
    /** @type {SVGElement} */
    get canvas() {
        return this._canvas;
    }
    /** @type {[AlignmentGrid.Line]} */
    get snapLines() {
        return this._snapLines;
    }
    /** @type {Stage} */
    set stage(object) {
        const previous = this._stage;
        if (previous != null) {
            previous.foregroundLayer.removeObserverForProperty(this, "sublayers");
        }

        this._stage = object;

        this._rebuildStageLayers();
        if (object != null) {
            // We observe the media and presenter layers, because if
            // one is on a call, these could change – people coming/going,
            // media being added/removed, etc.  We only want to suggest
            // accurate snaps
            object.foregroundLayer.addObserverForProperty(this, "sublayers");
        }
    }
    get stage() {
        return this._stage;
    }
    /** @type {[RenderLayer]} */
    set stageLayers(list) {
        const previous = this.stageLayers;

        const removed = previous.filter(layer => list.indexOf(layer) == -1);
        removed.forEach(layer => {
            layer.removeObserverForProperty(this, "frame");
            layer.removeObserverForProperty(this, "transform");
            layer.removeObserverForProperty(this, "hidden");
            this._removeSnapLinesForLayer(layer);
        })

        const added = list.filter(layer => previous.indexOf(layer) == -1);
        added.forEach(layer => {
            // We observe the frame and transform because if one is on a call,
            // other people on the call could be moving things, and we only
            // want to suggest accurate snaps.
            layer.addObserverForProperty(this, "frame");
            layer.addObserverForProperty(this, "transform");
            layer.addObserverForProperty(this, "hidden");
            if (layer.hidden == false) {
                this._addSnapLinesForLayer(layer);
            }
        });

        this._stageLayers = list;
    }
    get stageLayers() {
        return this._stageLayers ?? [];
    }
    ignoreLayer(layer) {
        let ignored = this._ignoredLayers;
        if (ignored == null) {
            ignored = [];
            this._ignoredLayers = ignored;
        }
        if (ignored.indexOf(layer) == -1) {
            ignored.push(layer);
            this._rebuildStageLayers();
        }
    }
    _rebuildStageLayers() {
        // All of the objects the stage knows of
        const fgObjects = this.stage?.foregroundObjects ?? [];
        const ourObject = this.object;

        // Exclude our object from the list
        const others = fgObjects.filter(other => {
            if (other == ourObject) {
                return false;
            }
            const children = ourObject.childObjects;
            if (children != null && children.includes(other) == true) {
                return false;
            }
            return true;
        });

        // Get their layers
        let layers = others.map(other => other.layer);

        // Ignore the desired layers
        const ignored = this._ignoredLayers;
        if (ignored != null) {
            layers = layers.filter(layer => ignored.indexOf(layer) == -1);
        }

        // And these are the candidates for snapping
        this.stageLayers = layers;
    }
    observePropertyChanged(obj, key, val) {
        if (key == "sublayers") {
            this._rebuildStageLayers();
        }
        else if (key == "hidden") {
            if (val == true) {
                this._removeSnapLinesForLayer(obj);
            }
            else {
                this._addSnapLinesForLayer(obj);
            }
        }
        else {
            this._resizeSnapLinesForLayer(obj);
        }
    }
    //
    // Guide <-> layer helpers
    //

   /*
    * @param {RenderLayer} layer The layer to find snap lines for
    * @returns {[AlignmentGrid.Line]}
    */
    _snapLinesForLayer(layer) {
        return this.snapLines.filter(line => line.layer == layer);
    }
   /*
    * @param {RenderLayer} layer The layer to remove snap lines for
    */
    _removeSnapLinesForLayer(layer) {
        const snapLines = this._snapLinesForLayer(layer);
        const canvas = this.canvas;
        snapLines.forEach(line => {
            canvas.removeChild(line.element);
        })

        this._snapLines = this._snapLines.filter(line => snapLines.indexOf(line) == -1);
    }
   /*
    * @param {RenderLayer} layer The layer to add snap lines for
    */
    _addSnapLinesForLayer(layer) {
        if (this._snapLinesForLayer(layer).length == 0) {
            const snapLines = this.snapLines;
            const canvas = this.canvas;

            for (let i=0; i<6; i++) {
                const snapLine = new AlignmentGrid.Line();
                snapLine.layer = layer;

                const line = this._newCanvasLine(0, 0, 0, 0);
                line.setAttributeNS(null, "opacity", 0);
                canvas.appendChild(line);
                snapLine.element = line;

                snapLines.push(snapLine);
            }
        }
        this._resizeSnapLinesForLayer(layer);
    }
   /*
    * @param {RenderLayer} layer The layer to resize snap lines for
    */
    _resizeSnapLinesForLayer(layer) {
        const bbox = layer.boundingBox;
        const horizontalLeft = RectGetMinX(bbox);
        const horizontalCenter = RectGetMidX(bbox);
        const horizontalRight = RectGetMaxX(bbox);

        const verticalTop = RectGetMinY(bbox);
        const verticalCenter = RectGetMidY(bbox);
        const verticalBottom = RectGetMaxY(bbox);

        const lines = [
            [ horizontalLeft, verticalTop, horizontalRight, verticalTop ],
            [ horizontalLeft, verticalCenter, horizontalRight, verticalCenter ],
            [ horizontalLeft, verticalBottom, horizontalRight, verticalBottom ],

            [ horizontalLeft, verticalTop, horizontalLeft, verticalBottom ],
            [ horizontalCenter, verticalTop, horizontalCenter, verticalBottom ],
            [ horizontalRight, verticalTop, horizontalRight, verticalBottom ],
        ];

        const snapLines = this._snapLinesForLayer(layer);
        snapLines.forEach((snapLine, idx) => {
            const line = lines[idx];
            snapLine.x1 = line[0];
            snapLine.y1 = line[1];
            snapLine.x2 = line[2];
            snapLine.y2 = line[3];
            this._resizeLine(snapLine.element, snapLine.x1, snapLine.y1, snapLine.x2, snapLine.y2);
        });
    }
    //
    //
    //
    _gridSettingsForSize(width, height) {
        const anchorInset = this._anchorInset;
        return {
            minX: anchorInset,
            midX: width / 2,
            maxX: width - anchorInset,

            minY: anchorInset,
            midY: height / 2,
            maxY: height - anchorInset
        }
    }
    _newCanvasLine(x1, y1, x2, y2, isSnapLine) {
        // We use a <rect> instead of a <line> for the drop shadow
        // This makes things more complicated than they need be..
        const line = document.createElementNS(svgNS, "rect");

        if (isSnapLine == true) {
            line.setAttributeNS(null, "fill", "white");

            const filter = this._snapLineFilter;
            if (filter != null) {
                line.setAttributeNS(null, "filter", `url(#${filter.getAttributeNS(null, "id")})`);
            }
        }

        this._resizeLine(line, x1, y1, x2, y2);

        return line;
    }
    _resizeLine(line, x1, y1, x2, y2) {
        let x, y, w, h;
        if (x1 == x2) {   // vertical line
            x = x1 - 1;
            y = y1;
            w = 1;
            h = y2 - y1;
        }
        else {            // horizontal line
            x = x1;
            y = y1 - 1;
            w = x2 - x1;
            h = 1;
        }

        line.setAttributeNS(null, "x", x);
        line.setAttributeNS(null, "y", y);
        line.setAttributeNS(null, "width", w);
        line.setAttributeNS(null, "height", h);
    }
    _createAlignmentCanvas(width, height, spacing) {
        var canvas = document.createElementNS(svgNS, "svg");
        canvas.setAttributeNS(null, "width", width);
        canvas.setAttributeNS(null, "height", height);
        canvas.setAttributeNS(null, "viewBox", "0 0 " + width + " " + height);
        canvas.setAttributeNS(null, "style", "pointer-events: none; position: absolute; top: 0px; left: 0px; max-width: 100%; max-height: 100%");
        canvas.setAttributeNS(null, "fill", "rgba(127, 127, 127, 0.65)");

        // Our default snap lines are white and we'll try to put
        // a tiny drop shadow under them
        let filter = null;
        if (navigator.vendor.startsWith("Apple") == false) {
            var defs = document.createElementNS(svgNS, "defs");
            canvas.appendChild(defs);

            filter = document.createElementNS(svgNS, "filter");
            filter.setAttributeNS(null, "id", "shadow");
            filter.setAttributeNS(null, "x", 0);
            filter.setAttributeNS(null, "y", 0);
            filter.setAttributeNS(null, "width", width);
            filter.setAttributeNS(null, "height", height);
            defs.appendChild(filter);

            var shadow = document.createElementNS(svgNS, "feDropShadow");
            shadow.setAttributeNS(null, "dx", 0);
            shadow.setAttributeNS(null, "dy", 0);
            shadow.setAttributeNS(null, "stdDeviation", 2);
            shadow.setAttributeNS(null, "flood-color", "rgba(0, 0, 0, 0.75)");
            filter.appendChild(shadow);
        }
        this._snapLineFilter = filter;

        // Populate the canvas with the grid and default snap lines
        const {minX, midX, maxX, minY, midY, maxY} = this._gridSettingsForSize(width, height);

        // Our default snap lines
        const horizontalTop = new AlignmentGrid.Line(0, minY, width, minY);
        const horizontalCenter = new AlignmentGrid.Line(0, midY, width, midY);
        const horizontalBottom = new AlignmentGrid.Line(0, maxY, width, maxY);

        const verticalLeft = new AlignmentGrid.Line(minX, 0, minX, height);
        const verticalCenter = new AlignmentGrid.Line(midX, 0, midX, height);
        const verticalBottom = new AlignmentGrid.Line(maxX, 0, maxX, height);

        const snapLines = [
            horizontalTop, horizontalCenter, horizontalBottom,
            verticalLeft, verticalCenter, verticalBottom
        ];

        // The default snap lines map to stage anchors
        const anchors = Stage.Object.Anchor;
        this.anchorMap = {
            [anchors.TopLeft]: [horizontalTop, verticalLeft],
            [anchors.TopCenter]: [horizontalTop, verticalCenter],
            [anchors.TopRight]: [horizontalTop, verticalBottom],

            [anchors.CenterLeft]: [horizontalCenter, verticalLeft],
            [anchors.Center]: [horizontalCenter, verticalCenter],
            [anchors.CenterRight]: [horizontalCenter, verticalBottom],

            [anchors.BottomLeft]: [horizontalBottom, verticalLeft],
            [anchors.BottomCenter]: [horizontalBottom, verticalCenter],
            [anchors.BottomRight]: [horizontalBottom, verticalBottom],
        }

        // Create the SVG elements for the grid and snap lines
        const lines = [];
        const makeLine = (x1, y1, x2, y2) => {

            // For our default snap lines, we want to change the color
            // and draw them last
            const snapLine = snapLines.find(line => {
                return (
                    line.x1 == x1 &&
                    line.x2 == x2 &&
                    line.y1 == y1 &&
                    line.y2 == y2
                );
            })

            const line = this._newCanvasLine(x1, y1, x2, y2, (snapLine != null));

            // Not an anchor snap line? Add it to the head of the list
            if (snapLine == null) {
                lines.unshift(line);
            }
            else {
                // Anchor snap lines go to the tail for z-index reasons
                line.setAttributeNS(null, "stroke", "white");
                lines.push(line);
                snapLine.element = line;
            }
        }

        // If the inset and alignment grid aren't even multiples of the spacing,
        // we may not have added a line for the snap line
        snapLines.forEach(snapLine => {
            if (!snapLine.element) {
                const line = this._newCanvasLine(snapLine.x1, snapLine.y1, snapLine.x2, snapLine.y2, true);
                line.setAttributeNS(null, "stroke", "white");
                lines.push(line);
                snapLine.element = line;
            }
        });

        // Plot the vertical lines
        for (let y = 0; y <= height; y += spacing) {
            makeLine(0, y, width, y);
        }

        // Plot the horizontal lines
        for (let x = 0; x <= width; x += spacing) {
            makeLine(x, 0, x, height);
        }

        // After plotting they're in the correct z-order
        // so now we can append them
        lines.forEach(line => {
            canvas.appendChild(line);
        })

        this._canvas = canvas;
        this._snapLines = snapLines;
    }
    updateCanvasOffset() {
        var canvas = this.canvas;
        var offset = -1;
        var bbox = canvas.getBoundingClientRect();
        offset -= bbox.top - Math.floor(bbox.top);
        canvas.style.top = `${offset}px`;
    }
   /*
    * @param {[AlignmentGrid.Line]} lines Two lines that may intersect at a stage anchor
    * @param {Rect} rect The rectangle of the object being snapped
    * @param {number=} centerX The proposed center X snap position
    * @param {number=} centerY The proposed center Y snap position
    * @returns {Stage.Object.Anchor}
    */
    _anchorForLines(lines, rect, centerX, centerY) {
        if (lines.length >= 2 && centerX != null && centerY != null) {
            const anchorMap = this.anchorMap;
            for (let anchor in anchorMap) {
                const aLines = anchorMap[anchor];

                // Anchors have two intersecting lines. Ensure they're
                // both in the set of lines we're comparing to
                if (lines.indexOf(aLines[0]) == -1 || lines.indexOf(aLines[1]) == -1) {
                    continue;
                }

                // For two intersecting lines, one must be vertical and the
                // other is horizontal.  Find those lines
                const xLine = aLines.find(line => line.x1 == line.x2);
                const yLine = aLines.find(line => line.y1 == line.y2);
                if (xLine == null || yLine == null) {
                    continue;
                }

                const anchorPoint = Stage.Object.PointForAnchor(anchor);
                const x = centerX + ((anchorPoint.x - 0.5) * rect.width);
                if (Math.abs(x - xLine.x1) > 1) {
                    continue;
                }
                const y = centerY + ((anchorPoint.y - 0.5) * rect.height);
                if (Math.abs(y - yLine.y1) > 1) {
                    continue;
                }

                // Yes, we found the matching anchor
                return anchor;
            }
        }
        return Stage.Object.Anchor.None;
    }
    /*
     * @param {Rect} rect The object that changed
     * @returns {AlignmentGrid.Guide=}
     */
    guideForRect(rect) {
        const snapLines = this.snapLines;
        if (snapLines == null || snapLines.length == 0) {
            return [];
        }

        const snapDistance = this.spacing / 8;

        let linesX=[], alignmentX = { distance: 10e10 };
        let linesY=[], alignmentY = { distance: 10e10 };

        // Find the nearest X and Y candidates
        snapLines.forEach(line => {
            // Find the distance between this line and the rect
            const alignment = line.alignmentFor(rect);
            if (alignment.distance > snapDistance) {
                // Discard those that are too far
                return;
            }

            // We're only interested in the nearest on each axis
            if (alignment.x != null && alignment.distance <= alignmentX.distance) {
                if (alignment.distance < alignmentX.distance) {
                    linesX = [];
                    alignmentX = alignment;
                }
                linesX.push(line);
            }
            else if (alignment.y != null && alignment.distance <= alignmentY.distance) {
                if (alignment.distance < alignmentY.distance) {
                    linesY = [];
                    alignmentY = alignment;
                }
                linesY.push(line);
            }
        });

        // Nothing nearby? No results.
        if (linesX.length == 0 && linesY.length == 0) {
            return null;
        }

        let lines = [];
        let centerX, centerY;
        if (linesX.length > 0) {
            lines.push(...linesX);

            const x = linesX[0].x1;
            const edge = alignmentX.x;
            centerX = x - (rect.width * (edge - 0.5));
        }
        if (linesY.length > 0) {
            lines.push(...linesY);

            const y = linesY[0].y1;
            const edge = alignmentY.y;
            centerY = y - (rect.height * (edge - 0.5));
        }

        const anchor = this._anchorForLines(lines, rect, centerX, centerY);
        return new AlignmentGrid.Guide(anchor, lines, centerX, centerY);
    }
   /*
    * @param {AlignmentGrid.Guide?} guide The guide to highlight, or null to remove highlights
    * @param {Rect?} rect Option rect to constrain layer lines to
    */
    highlightGuide(guide, rect) {
        const snapLines = this.snapLines;
        if (snapLines == null || snapLines.length == 0) {
            return;
        }

        const highlights = guide?.lines ?? [];
        snapLines.forEach(snapLine => {
            const isHighlight = (highlights.indexOf(snapLine) != -1);
            const element = snapLine.element;

            let color = "";
            let opacity = 0;
            if (isHighlight == true) {
                color = "#E55242";
                opacity = 1;
            }
            else if (this._isAnchorLine(snapLine) == true) {
                color = "white";
                opacity = 1;
            }

            element.setAttributeNS(null, "stroke", color);
            if (snapLine.layer == null) {
                // Built in lines have nothing more to do
                return;
            }

            // Layer snap lines only appear when snapping
            element.setAttributeNS(null, "opacity", opacity);
            if (isHighlight == false) {
                return;
            }

            this._resizeSnapLineWithCompanion(snapLine, rect);
        });
    }
    _isAnchorLine(line) {
        const anchorLines = Object.values(this.anchorMap).flat();
        return (anchorLines.indexOf(line) != -1);
    }
    _resizeSnapLineWithCompanion(snapLine, companion) {
        let {x1,x2,y1,y2} = snapLine;
        if (companion != null) {
            if (x1 == x2) {
                // Vertical line
                y1 = Math.min(y1, RectGetMinY(companion));
                y2 = Math.max(y2, RectGetMaxY(companion));
            }
            else {
                // Horizontal line
                x1 = Math.min(x1, RectGetMinX(companion));
                x2 = Math.max(x2, RectGetMaxX(companion));
            }
        }
        this._resizeLine(snapLine.element, x1, y1, x2, y2);
    }
}

AlignmentGrid.Guide = class {
   /**
    * @param {Stage.Object.Anchor} anchor
    * @param {[AlignmentGrid.Line]} lines
    * @param {number?} centerX
    * @param {number?} centerY
    */
    constructor(anchor, lines, centerX, centerY) {
        this.anchor = anchor;
        this.lines = lines;
        this.centerX = centerX;
        this.centerY = centerY;
    }
}

AlignmentGrid.Line = class {
   /**
    * @param {number} x1
    * @param {number} y1
    * @param {number} x2
    * @param {number} y2
    */
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;

        this.element = null;
    }
    alignmentFor(box) {
        const x1 = this.x1;
        const x2 = this.x2;
        const y1 = this.y1;
        const y2 = this.y2;

        if (x1 == x2) { // A vertical line
            const x = x1;

            const left = Math.abs(x - RectGetMinX(box));
            const center = Math.abs(x - RectGetMidX(box));
            const right = Math.abs(x - RectGetMaxX(box));

            const nearest = Math.min(left, center, right);
            if (nearest == left) {
                return {x: 0.0, distance: nearest};
            }
            else if (nearest == center) {
                return {x: 0.5, distance: nearest};
            }
            else {
                return {x: 1.0, distance: nearest};
            }
        }
        else if (y1 == y2) { // A horizontal line
            const y = y1;

            const top = Math.abs(y - RectGetMinY(box));
            const center = Math.abs(y - RectGetMidY(box));
            const bottom = Math.abs(y - RectGetMaxY(box));

            const nearest = Math.min(top, center, bottom);
            if (nearest == top) {
                return {y: 0.0, distance: nearest};
            }
            else if (nearest == center) {
                return {y: 0.5, distance: nearest};
            }
            else {
                return {y: 1.0, distance: nearest};
            }
        }
        else {
            console.error("line not supported", this);
            debugger;
            return {distance: 1<<28};
        }
    }
}
