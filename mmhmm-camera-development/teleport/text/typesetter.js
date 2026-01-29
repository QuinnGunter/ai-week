//
//  typesetter.js
//  mmhmm
//
//  Created by Steve White on 12/21/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class Typesetter {
    constructor() {
        var canvas = null;
        if (window.OffscreenCanvas != null) {
            canvas = new OffscreenCanvas(1, 1);
        }
        else {
            canvas = document.createElement("canvas");
        }
        this.canvas = canvas;
        this.context = canvas.getContext("2d");
        this.hairSpace = '\u200a';

        // Gecko doesn't provide much information in TextMetrics
        // So we'll see if we should make a DOM element and
        // consult it for more information
        var properties = Object.keys(TextMetrics.prototype);
        this.useElementMeasurements = (properties.indexOf("fontBoundingBoxDescent") == -1);
    }
    charactersFromString(text) {
        const i18n = window.Intl;
        if (i18n != null && i18n.Segmenter != null) {
            const segmenter = new i18n.Segmenter(gCurrentLocale, {granularity: 'grapheme'});
            return Array.from(
                segmenter.segment(text)
            ).map(entry => entry.segment);
        }

        var chars = Array.from(text);

        // Deal with unicode joining sequences
        const unicodeJoiner = "\u200d";
        const variantSelector = "\ufe0f";

        for (var charIdx = 0; charIdx < chars.length; charIdx += 1) {
            var char = chars[charIdx];
            if (char == unicodeJoiner) {
                if (charIdx > 0 && charIdx + 1 < chars.length) {
                    chars[charIdx - 1] += char + chars[charIdx + 1];
                    chars.splice(charIdx, 2);
                    charIdx -= 1;
                }
            }
            else if (char == variantSelector) {
                if (charIdx > 0) {
                    chars[charIdx - 1] += char;
                    chars.splice(charIdx, 1);
                    charIdx -= 1;
                }
            }
        }
        return chars;
    }
    _stringToTitleCase(input) {
        var wsTest = new RegExp(/\s/);

        var output = "";
        var lastWasWhitespace = true;
        var chars = Array.from(input);
        chars.forEach(char => {
            if (wsTest.test(char) == false) {
                if (lastWasWhitespace == true) {
                    output += char.toUpperCase();
                    lastWasWhitespace = false;
                }
                else {
                    output += char;
                }
                return;
            }

            lastWasWhitespace = true;
            output += char;
        });
        return output;
    }
    linesFromTextConstrainedToEllipse(attributedString, size) {
        var radius = SizeMake(size.width / 2, size.height / 2);

        const ellipse = KldIntersections.ShapeInfo.ellipse(
            [radius.width, radius.height],  // Center
            radius.width,
            radius.height
        );

        return this.linesFromTextConstrainedToShapeOfSize(attributedString, ellipse, size);
    }
    linesFromTextConstrainedToRoundRect(attributedString, size, cornerRadius) {
        if (cornerRadius == null || cornerRadius <= 0) {
            return this.linesFromTextConstrainedToSize(attributedString, size);
        }
        var rect = RectMake(0, 0, size.width, size.height);
        var path = NewRoundRectPathForRectWithRadius(rect, cornerRadius);

        const shape = KldIntersections.ShapeInfo.path(path.d);
        return this.linesFromTextConstrainedToShapeOfSize(attributedString, shape, size);
    }
    linesFromTextConstrainedToShapeOfSize(attributedString, shape, size) {
        if (attributedString == null || size.width <= 0 || size.height <= 0) {
            this.exhausted = true;
            return [];
        }
        // This isn't the most generic method, as:
        // 1) It needs to know the line height, which also means it can't
        //    really support changing fonts/sizes at all.
        // 2) It is vertically centering the text within the ellipse.

        var attributes = null;
        attributedString.enumerate((offset, string, attrs) => {
            if (attrs != null && Object.keys(attrs).length > 0) {
                attributes = attrs;
                return false;
            }
            return true;
        });

        if (attributes == null) {
            this.exhausted = true;
            return [];
        }

        var context = this.context;
        TypesetterRun.ApplyAttributesInContext(attributes, context);
        var measure = TextMetricsInContext2D(' ', context, this.useElementMeasurements);
        var fontHeight = measure.domFontHeight;
        if (fontHeight == null) {
            fontHeight = measure.fontBoundingBoxDescent + measure.fontBoundingBoxAscent;
        }

        var maxWidth = size.width;
        var maxHeight = size.height;

        var widthsForLines = function(numLines) {
            var y = Math.max(0, Math.ceil((maxHeight - (numLines * fontHeight)) / 2));
            var widths = [];

            for (var lineNum=0; lineNum<numLines; lineNum+=1) {
                var flip = (y >= size.height / 2);
                var lineY = y;
                if (flip == true) {
                    lineY += fontHeight;
                }
                if (lineY >= maxHeight) {
                    break;
                }

                const line = KldIntersections.ShapeInfo.line(
                    [-10, lineY],
                    [maxWidth+10, lineY]
                );

                const intersections = KldIntersections.Intersection.intersect(shape, line);
                const points = intersections?.points ?? [];
                if (points.length < 2) {
                    if (gLocalDeployment == true) {
                        console.error("No intersections for line", shape, line);
                    }
                    break;
                }

                const xPoints = points.map(a => a.x);
                const left = Math.min(...xPoints);
                const right = Math.max(...xPoints);
                const lineWidth = Math.floor(right - left);
                if (lineWidth <= 0) {
                    break;
                }
                widths.push(lineWidth);

                y += fontHeight;
            }
            return widths;
        }

        var lineCount = 1;
        const zeroSize = SizeZero();
        var last = [];
        // TODO (eslint, no-constant-condition): add a comment explaining why this should be
        /* eslint-disable no-constant-condition */
        while (true) {
            var widths = widthsForLines(lineCount);
            var height = lineCount * fontHeight;
            var lines = this.linesFromTextConstrainedToSize(attributedString, zeroSize, () => {
                var w = 0, h = 0;

                if (widths.length > 0) {
                    w = widths.shift();
                    h = maxHeight;
                }

                var r = { width: w, height: h };
                return r;
            });

            while (lines.length > lineCount) {
                lines.pop();
            }

            var firstGoodLine = lines.find(line => {
                return (line.length > 1 || line.string != '\u200a');
            });

            if (firstGoodLine == null) {
                return last;
            }

            last = lines;

            if (this.exhausted == false) {
                return lines;
            }

            lineCount += 1;
            if (lineCount * fontHeight >= maxHeight) {
                return lines;
            }
        }
        /* eslint-enable no-constant-condition */
    }
    linesFromTextConstrainedToSize(attributedString, maxSize, onLineAdded) {
        if (attributedString == null) {
            this.exhausted = true;
            return [];
        }

        var context = this.context;
        //context.textBaseline = "top";

        var maxHeight = maxSize.height;
        var maxWidth = maxSize.width;

        var lines = [];
        var pushLine = function(lineObj) {
            lines.push(lineObj);
            if (onLineAdded != null) {
                var mods = onLineAdded();
                if (mods.width != null) {
                    maxWidth = mods.width;
                }
                if (mods.height != null) {
                    maxHeight = mods.height;
                }
            }
            lineObj.maxWidth = maxWidth;
        }
        var line = new TypesetterLine();
        pushLine(line);

        var wsTest = new RegExp(/\s/);
        var puncChars = Array.from("!^()-[]{}\\|;:\",./");
        var textHeight = 0;
        let wrappedOnCharacter = false;
        const hairSpace = this.hairSpace;

        var useElementMeasurements = this.useElementMeasurements;
        attributedString.enumerate((offset, text, attributes) => {
            if (text == null || text.length == 0 || textHeight >= maxHeight) {
                return;
            }

            // Create a new run for these attributes
            var run = new TypesetterRun(attributes);
            line.pushRun(run);

            TypesetterRun.ApplyAttributesInContext(attributes, context);

            // Apply text transformation now
            var transform = attributes.transform;
            switch (transform) {
                case "uppercase":
                    text = text.toUpperCase();
                    break;
                case "lowercase":
                    text = text.toLowerCase();
                    break;
                case "capitalize":
                    text = this._stringToTitleCase(text);
                    break;
            }

            // Convert the string to a list of characters
            var chars = this.charactersFromString(text);
            var pushHair = function() {
                var hairMeasure = TextMetricsInContext2D(hairSpace, context, useElementMeasurements);
                var hairGlyph = new TypesetterGlyph(hairSpace, true, false, hairMeasure);
                run.pushGlyph(hairGlyph);
            }

            // Enumerate the characters in the text
            for (var charIdx = 0; charIdx < chars.length; charIdx += 1) {
                var char = chars[charIdx];
                var glyph = run.glyphForCharacter(char);
                if (glyph == null) {
                    var measure = TextMetricsInContext2D(char, context, useElementMeasurements);
                    var isWhitespace = wsTest.test(char);
                    var isPunctuation = (puncChars.indexOf(char) != -1);
                    glyph = new TypesetterGlyph(char, isWhitespace, isPunctuation, measure);
                }

                var needsBreak = false;
                if (char == "\n" ||
                    (glyph.isWhitespace == false && line.width + glyph.width > maxWidth))
                {
                    needsBreak = true;
                }

                if (needsBreak == false) {
                    // Can safely carry on to the next character
                    run.pushGlyph(glyph);
                    continue;
                }

                if (char != "\n") {
                    var lastGlyph = line.lastGlyph;
                    if (lastGlyph != null &&
                        lastGlyph.isCJK == false &&
                        lastGlyph.isWhitespace == false &&
                        lastGlyph.isPunctuation == false)
                    {
                        // We're here because we exceeded the line width...
                        // try to break at the last whitespace
                        var nextLine = line.splitAtLastWhitespace();
                        if (nextLine == null) {
                            wrappedOnCharacter = true;
                        }
                        else {
                            textHeight += line.height;
                            if (textHeight >= maxHeight) {
                                break;
                            }

                            pushLine(nextLine);
                            line = nextLine;
                            run = nextLine.lastRun;
                            run.pushGlyph(glyph);

                            // Pushing the line may have changed the line width
                            // for elliptical text, in which case we need to
                            // split it again.
                            if (line.width < maxWidth) {
                                continue;
                            }

                            var excess = [];
                            while (line.width > maxWidth) {
                                excess.push(run.popGlyph());
                            }

                            line = new TypesetterLine();
                            pushLine(line);
                            if (maxWidth == 0) {
                                // Whoever invoked us isn't interested in any
                                // more lines.
                                break;
                            }

                            run = new TypesetterRun(attributes);
                            line.pushRun(run);
                            while (excess.length > 0) {
                                run.pushGlyph(excess.pop());
                            }
                            continue;
                        }
                    }
                }

                // We've made it here due to a newline or lack
                // of whitespace...
                // Pop off the glyph that pushed us over the edge
                // Unless it was a blank line...
                if (line.length == 0) {
                    // If the line is fully empty, nothing
                    // will render, and the subsequent lines
                    // will be shifted up by one. Instead,
                    // ensure it has the one glyph...
                    pushHair();
                }

                textHeight += line.height;
                if (textHeight >= maxHeight) {
                    break;
                }

                line = new TypesetterLine();
                pushLine(line);

                run = new TypesetterRun(attributes);
                line.pushRun(run);

                if (char == "\n") {
                    continue;
                }

                if (glyph.width > maxWidth) {
                    pushHair();
                    break;
                }

                run.pushGlyph(glyph);
            }
        });

        textHeight += line.height;
        this.exhausted = (textHeight > maxHeight);
        this.wrappedOnCharacter = wrappedOnCharacter;

        const numLines = lines.length;
        if (numLines > 0) {
            var last = lines[numLines-1];
            if (last.length == 0) {
                lines.pop();
            }
        }

        lines.forEach(line => line.compact());

        return lines;
    }
}

// A TypesetterLine contains a number of TypesetterRuns
class TypesetterLine {
    constructor() {
        this.runs = [];
    }
    pushRun(run) {
        this.runs.push(run);
    }
    compact() {
        this.runs = this.runs.filter(run => run.length > 0);
    }
    get lastRun() {
        var runs = this.runs;
        if (runs == null || runs.length == 0) {
            return null;
        }
        return runs[runs.length - 1];
    }
    get lastGlyph() {
        var glyphs = this.glyphs;
        var count = glyphs.length;
        if (count == 0) {
            return null;
        }
        return glyphs[count - 1];
    }
    get length() {
        return this.runs.reduce((length, run) => length += run.length, 0);
    }
    get width() {
        return this.runs.reduce((width, run) => width += run.width, 0);
    }
    get height() {
        var height = 0;
        this.runs.forEach(run => height = Math.max(height, run.height));
        return height;
    }
    get glyphs() {
        return this.runs.flatMap(run => run.glyphs);
    }
    splitAtLastWhitespace() {
        var runs = this.runs;
        var numRuns = runs.length;
        for (var runIdx = numRuns - 1; runIdx >= 0; runIdx -= 1) {
            var split = runs[runIdx].splitAtLastWhitespace();
            if (split == null) {
                continue;
            }

            var result = new TypesetterLine();
            result.pushRun(split);

            runIdx += 1;
            if (runIdx < numRuns) {
                var tail = this.runs.splice(runIdx, numRuns - runIdx);
                tail.forEach(run => result.pushRun(run));
            }
            return result;
        }
        return null;
    }
    get string() {
        return this.runs.map(run => run.string).join("");
    }
    drawInContextAtPoint(context, point) {
        var position = PointCopy(point);
        var top = point.y;
        var bottom = top + this.height;

        this.runs.forEach(run => {
            context.save();

            var drawPoint = PointMake(
                position.x,
                bottom,
            );
            var end = run.drawInContextAtPoint(context, drawPoint);
            position.x = end.x;
            context.restore();
        })
        return PointMake(point.x, point.y + this.height);
    }
}

// A TypesetterRun contains attributes for rendering, and a list of glyphs
class TypesetterRun {
    constructor(attributes) {
        this.attributes = attributes;

        this.glyphs = [];
    }
    get hasRTLGlyph() {
        var rtlGlyph = this.glyphs.find(glyph => glyph.isRTL);
        return (rtlGlyph != null);
    }
    get length() {
        return this.glyphs.length;
    }
    get letterSpacing() {
        return this.attributes.letterSpacing;
    }
    get width() {
        if (this.hasRTLGlyph == true) {
            return this.rtlWidth;
        }
        var letterSpacing = this.letterSpacing;
        if (letterSpacing == null) {
            letterSpacing = 1;
        }
        return this.glyphs.reduce((total, glyph) => {
            var width = glyph.width;
            if (letterSpacing != 1) {
                var height = glyph.height;
                width += height * letterSpacing;
            }
            return total + width;
        }, 0);
    }
    get rtlWidth() {
        var context = this._context;
        if (context == null) {
            var canvas = document.createElement("canvas");
            context = canvas.getContext("2d");
            this._context = context;
        }
        TypesetterRun.ApplyAttributesInContext(this.attributes, context);
        var measure = TextMetricsInContext2D(this.string, context, false);
        return measure.width;
    }
    get height() {
        var height = 0;
        this.glyphs.forEach(glyph => {
            var glyphHeight = glyph.height;
            height = Math.max(height, glyphHeight);
        });
        return height;
    }
    splitAtLastWhitespace() {
        var glyphs = this.glyphs;
        var numGlyphs = glyphs.length;

        var lastIndexOfGlyph = function(test, offset) {
            var start = numGlyphs - 1 - (offset ? offset : 0);
            for (var idx = start; idx >= 0; idx -= 1) {
                var glyph = glyphs[idx];
                var match = test(glyph);
                if (match == true) {
                    return idx;
                }
            }
            return -1;
        }

        var index = lastIndexOfGlyph(glyph => glyph.isWhitespace, 0);
        if (index == -1) {
            var breakChars = Array.from("#$^*?-");
            index = lastIndexOfGlyph(glyph => breakChars.indexOf(glyph.character) != -1, 0);
            if (index == -1) {
                return null;
            }
        }

        var glyph = glyphs[index];
        if (glyph.isCJK == false) {
            index += 1;
        }

        var split = null;
        if (index < glyphs.length) {
            split = this.splitAt(index);
        }
        else {
            split = new TypesetterRun(this.attributes);
        }
        return split;
    }
    splitAt(index) {
        var result = new TypesetterRun(this.attributes);
        var count = this.glyphs.length;
        var spliceCount = count - index;
        result.glyphs = this.glyphs.splice(index, spliceCount);
        return result;
    }
    glyphForCharacter(character) {
        return this.glyphs.find(glyph => glyph.character == character);
    }
    pushGlyph(glyph) {
        this.glyphs.push(glyph);
    }
    popGlyph() {
        return this.glyphs.pop();
    }
    get string() {
        return this.glyphs.join("");
    }
    drawInContextAtPoint(context, point) {
        var attrs = this.attributes;

        TypesetterRun.ApplyAttributesInContext(attrs, context);

        var position = null;
        var letterSpacing = null;
        var hasRTLGlyph = this.hasRTLGlyph;
        if (hasRTLGlyph == false) {
            letterSpacing = this.letterSpacing;
        }
        if (letterSpacing == null) {
            var string = this.string;
            if (hasRTLGlyph == true && this.glyphs[0].isRTL == false) {
                string = "\u200f" + string;
            }
            // Easy, we can draw the entire string at once
            context.fillText(string, point.x, point.y);
            position = PointMake(point.x + this.width, point.y);
        }
        else {
            // Have to draw each character one at a time to
            // manually apply the spacing...
            position = PointCopy(point);

            this.glyphs.forEach(glyph => {
                context.fillText(glyph.character, position.x, position.y);
                position.x += glyph.width;
                if (letterSpacing != 1.0) {
                    var height = glyph.height;
                    position.x += height * letterSpacing;
                }
            })
        }

        var attributes = this.attributes;
        if (attributes.underline != true && attributes.strikethrough != true) {
            return position;
        }

        var font = attrs.font;
        if (font == null) {
            font = {};
        }
        if (font.size == null) {
            font.size = 96;
        }
        var lineWidth = font.size / 8;
        var metrics = TextMetricsInContext2D("x", context, true);

        if (attributes.underline == true) {
            var underlineWidth = font.size / 20;

            context.beginPath();
            context.lineWidth = underlineWidth;
            context.strokeStyle = attributes.color;
            var offset = metrics.fontBoundingBoxDescent;
            if (offset == null) {
                // XXX: This may be a negative number..
                //offset = metrics.actualBoundingBoxDescent;
            }
            if (offset == null) {
                offset = 0;
            }
            var bottom = point.y - (lineWidth / 2) - offset;
            context.moveTo(point.x, bottom);
            context.lineTo(position.x, bottom);
            context.stroke();
            context.closePath();
        }

        if (attributes.strikethrough == true) {
            var strikeWidth = null;
            var strikeY = null;
            var vendor = navigator.vendor;

            var strikeout = font.strikeout;
            if (strikeout != null) {
                var size = strikeout.size;
                var pos = strikeout.pos;

                strikeWidth = font.size * size;
                strikeY = font.size * pos;
            }

            if (strikeWidth == null) {
                strikeWidth = font.size / 20;
            }
            if (vendor.startsWith("Google") == true) {
                strikeWidth *= 2;
            }

            if (strikeY == null) {
                var halfHeight = null;
                if (vendor == null || vendor == "") {
                    halfHeight = (metrics.lineHeight / 2);
                }
                else {
                    halfHeight = (metrics.fontBoundingBoxAscent / 2);
                }

                strikeY = halfHeight;
            }

            context.beginPath();
            context.lineWidth = strikeWidth;
            context.strokeStyle = attributes.color;

            context.moveTo(point.x, position.y - strikeY);
            context.lineTo(position.x, position.y - strikeY);
            context.stroke();
            context.closePath();
        }

        return position;
    }
}

TypesetterRun.ApplyAttributesInContext = function(attrs, context) {
    // Shadows
    var shadow = attrs.shadow;
    if (shadow != null) {
        context.shadowColor = shadow.color;
        context.shadowBlur = shadow.radius;

        var offset = shadow.offset;
        if (offset != null) {
            context.shadowOffsetX = shadow.offset.x;
            context.shadowOffsetY = shadow.offset.y;
        }
    }

    // Foreground color
    context.fillStyle = attrs.color;

    // Apply font
    var font = attrs.font;
    var size = font.size;
    var family = font.family;
    var weight = font.weight;

    var sizeMultiplier = attrs.sizeMultiplier;
    if (sizeMultiplier != null) {
        size *= sizeMultiplier;
    }

    if (attrs.bold == true) {
        var bold = font.bold;
        if (bold != null) {
            weight = bold;
        }
        else {
            weight = "bold";
        }
    }

    font = Font({family, size, weight});
    if (attrs.italic == true) {
        font = "italic " + font;
    }

    context.font = font;
}

class TypesetterGlyph {
    constructor(character, isWhitespace, isPunctuation, measurement) {
        this.character = character;
        this.isWhitespace = isWhitespace;
        this.isPunctuation = isPunctuation;
        this.measurement = measurement;
        this.width = measurement.width;
        this.lineHeight = measurement.lineHeight;

        var charCode = character.charCodeAt(0);
        this.isRTL = (
            (charCode >= 0x0590 && charCode <= 0x05FF) || // Hebrew
            (charCode >= 0x0600 && charCode <= 0x06FF) || // Arabic, some Urdu
            (charCode >= 0x0750 && charCode <= 0x077F) || // Urdu
            (charCode >= 0xFB50 && charCode <= 0xFDFF) || // more Urdu
            (charCode >= 0xFE70 && charCode <= 0xFEFF)    // even more Urdu
        );
        this.isCJK = (this.isRTL == false && charCode >= 0x2000);

        var fontHeight = measurement.domFontHeight;
        if (fontHeight == null) {
            fontHeight = measurement.fontBoundingBoxDescent + measurement.fontBoundingBoxAscent;
        }

        if (isNaN(fontHeight) == true) {
            // Firefox/Gecko doesn't have fontBoundingBoxDescent/fontBoundingBoxAscent
            // so fall back onto actualBoundingBox*
            fontHeight = Math.abs(measurement.actualBoundingBoxDescent) + Math.abs(measurement.actualBoundingBoxAscent);
        }
        this.fontHeight = fontHeight;

        this.height = this.fontHeight;
    }
    toString() {
        return this.character;
    }
}
