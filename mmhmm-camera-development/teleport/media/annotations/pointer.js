//
//  media/annotations/pointer.js
//  mmhmm
//
//  Created by Steve White on 4/9/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

Media.Annotation.Style.Pointer = class extends Media.Annotation.Style {
    constructor(identifier, image, title) {
        super(identifier);
        this.shortTitle = title;
        this.longTitle = title;
        this.image = image;
    }
    copy() {
        const copy = super.copy();
        copy.image = this.image;
        return copy;
    }

    get icon() {
        return this.image;
    }

    computePulseOffset(scaleFactor=1) {
        this.pulseOffset = null;

        const paths = Array.from(this.image.childNodes).filter((node) => node.nodeName.toLowerCase() == "path");
        if (paths.length == 0) {
            return;
        }

        let best = null;
        paths.forEach(path => {
            const length = path.getTotalLength();
            const step = length / 100;
            for (let distance=0; distance<length; distance+=step) {
                const point = path.getPointAtLength(distance);
                if (best == null || point.y < best.y) {
                    best = point;
                }
            }
        })
        if (best == null) {
            return;
        }
        this.pulseOffset = PointMake(
            Math.round(best.x * scaleFactor),
            Math.round(best.y * scaleFactor)
        );
    }

    attachToSlide(slide) {
        super.attachToSlide(slide);

        const svgImage = this.image.cloneNode(true);

        const targetSize = 120;
        const width = parseInt(svgImage.getAttributeNS(null, "width"));
        const height = parseInt(svgImage.getAttributeNS(null, "height"));

        const scale = Math.min(width / targetSize, height / targetSize);
        const size = SizeMake(width / scale, height / scale);

        svgImage.setAttributeNS(null, "width", size.width);
        svgImage.setAttributeNS(null, "height", size.height);

        const svgSource = new XMLSerializer().serializeToString(svgImage);
        const svgURL = 'data:image/svg+xml;base64,' + btoa(svgSource);

        const container = new RenderLayer();
        container.size = size;
        container.hidden = true;
        slide.layer.addSublayer(container);
        this.layer = container;

        const image = new RenderLayer();
        image.frame = RectMake(0, 0, size.width, size.height);
        image.setContentsSrc(svgURL, "image/svg", false);
        image.zIndex = 1;
        container.addSublayer(image);

        this.computePulseOffset(1/scale);
        this.lastMousePoint = null;
        this.pulseState = 0;
    }
    detachFromSlide(slide) {
        super.detachFromSlide(slide);
        const parent = slide.layer;
        const layer = this.layer;
        if (parent != null && layer != null) {
            parent.removeSublayer(layer);
            this.layer = null;
        }
    }

    render(timestamp) {
        super.render(timestamp);
        const pulse = this.pulseLayer;
        if (pulse != null) {
            pulse.step();

            if (this.pulseState == 2 && pulse.keyframeIndex == 0) {
                pulse.superlayer?.removeSublayer(pulse);
                this.pulseLayer = null;
                this.pulseState = 0;
            }
        }
    }

    onPointerEnter(event) {
        super.onPointerEnter(event);
        const layer = this.layer;
        layer.hidden = false;
        if (event != null) {
            layer.position = event.point;
        }
    }
    onPointerLeave(event) {
        super.onPointerLeave(event);
        const layer = this.layer;
        if (layer != null) {
            layer.hidden = true;
        }
        this.lastMousePoint = null;
    }
    onPointerMove(event) {
        const point = event.point;
        const layer = this.layer;
        layer.hidden = false;
        layer.position = event.point;

        this.lastMousePoint = point;
    }
    onPointerDown(event) {
        this.mouseDown = true;

        this.pulseState = 1;
        let pulse = this.pulseLayer;
        if (pulse == null) {
            pulse = new Media.Annotation.Style.Pointer.PulseLayer();
            const pulseSize = pulse.size;
            const pulseOffset = this.pulseOffset;
            if (pulseOffset == null) {
                pulse.position = PointZero();
            }
            else {
                pulse.position = pulseOffset;
            }

            this.pulseLayer = pulse;
            this.layer.addSublayer(pulse);
        }
    }
    onPointerUp(event) {
        this.mouseDown = false;

        this.pulseState = 2;
    }

    set lastMousePoint(point) {
        if (PointEquals(point, this._lastMousePoint) == true) {
            return;
        }
        this._lastMousePoint = point;
    }
    get lastMousePoint() {
        return this._lastMousePoint;
    }

    set mouseDown(bool) {
        if (bool == this.mouseDown) {
            return;
        }
        this._mouseDown = bool;
    }
    get mouseDown() {
        return !!this._mouseDown;
    }

    applyEvent(event) {
        super.applyEvent(event);

        if ('mousePoint' in event) {
            const mousePoint = event.mousePoint;
            if (mousePoint == null) {
                this.onPointerLeave();
            }
            else {
                this.onPointerMove({ point: mousePoint });
            }
        }
        if ('mouseDown' in event) {
            const down = event.mouseDown;
            if (down == true) {
                this.onPointerDown();
            }
            else {
                this.onPointerUp();
            }
        }
    }
    toJSON() {
        let r = super.toJSON();
        r.mousePoint = this.lastMousePoint;
        r.mouseDown = this.mouseDown;
        return r;
    }
}

Media.Annotation.Style.Pointer.PulseLayer = class extends CanvasLayer {
    constructor() {
        const size = 70;

        super(size, size);

        const keyframes=[];
        const duration = 1.5;
        const halftime = duration/2;
        const easeOut = (x) => 1 - Math.pow(1 - x, 3);

        for (let t=0; t<=duration; t+=1/30) {
            let opacity;
            if (t < halftime) {
                opacity = lerp(0.6, 0.9, easeOut(t / halftime));
            }
            else {
                opacity = lerp(0.9, 0.0, easeOut((t - halftime) / halftime));
            }
            const scale = lerp(0, 1.3, easeOut(t/duration));
            keyframes.push({
                opacity,
                scale: Transform3DMakeScale(scale, scale, 1.0)
            })
        }

        this.keyframes = keyframes;
        this.keyframeIndex = 0;

        this.draw();
    }
    step() {
        let keyframeIndex = this.keyframeIndex;

        const keyframes = this.keyframes;

        const keyframe = keyframes[keyframeIndex];
        this.opacity = keyframe.opacity;
        this.transform = keyframe.scale;

        keyframeIndex += 1;
        if (keyframeIndex >= keyframes.length) {
            keyframeIndex = 0;
        }
        this.keyframeIndex = keyframeIndex;
    }
    drawInContext(context, width, height) {
        const lineWidth = 4;
        const radius = (width - (lineWidth * 2)) / 2;

        context.strokeStyle = "#4D3BD1";
        context.lineWidth = lineWidth;
        context.arc(width/2, height/2, radius, 0, 2 * Math.PI);
        context.stroke();
    }
}

Media.Annotation.Style.Pointer.Assets = Object.freeze({
    Cursor: SVGCanvasOfSize(49, 49, [
        {
            kind: "path",
            attributes: {
                stroke: "none",
                fill: "#ffffff",
                "fill-rule": "evenodd",
                "clip-rule": "evenodd",
                d: "M9.90468 13.7799C9.45226 10.0248 13.4075 7.30983 16.749 9.08182L33.8565 18.1538C37.834 20.2631 36.8352 26.2219 32.3873 26.9189L30.3845 27.2328L34.8102 33.5649C36.4107 35.8549 35.8518 39.0087 33.5619 40.6092C31.2719 42.2097 28.1181 41.6508 26.5176 39.3609L22.0092 32.9104L20.9282 34.7847C18.679 38.6847 12.7594 37.4748 12.2209 33.005L9.90468 13.7799Z",
            }
        },
        {
            kind: "path",
            attributes: {
                stroke: "none",
                fill: "#4D3BD1",
                d: "M15.6087 11.2319C14.0035 10.3807 12.1034 11.6849 12.3208 13.4889L14.637 32.7139C14.8957 34.8612 17.7394 35.4424 18.82 33.5689L20.0451 31.4445C20.868 30.0176 22.8948 29.9295 23.8384 31.2796L28.5122 37.9667C29.3428 39.155 30.9793 39.445 32.1676 38.6145C33.3559 37.784 33.6459 36.1474 32.8154 34.9592L28.2211 28.3858C27.268 27.0222 28.0734 25.1316 29.717 24.874L32.0104 24.5146C34.1472 24.1798 34.627 21.3172 32.7162 20.304L15.6087 11.2319Z",
            }
        },
    ]),
    Arrow: SVGCanvasOfSize(49, 49, [
        {
            kind: "path",
            attributes: {
                stroke: "none",
                fill: "#ffffff",
                "fill-rule": "evenodd",
                "clip-rule": "evenodd",
                d: "M35.2601 28.9121L29.7947 29.7686C27.5941 30.1134 25.6678 31.4356 24.555 33.3652L21.7912 38.1575C19.3773 42.343 13.0245 41.0446 12.4466 36.2475L9.7774 14.0931C9.29186 10.0631 13.5366 7.14946 17.1227 9.05115L36.8369 19.5055C41.1055 21.7691 40.0336 28.1641 35.2601 28.9121Z",
            }
        },
        {
            kind: "path",
            attributes: {
                stroke: "none",
                fill: "#4D3BD1",
                "fill-rule": "evenodd",
                d: "M12.1935 13.8021C11.943 11.7233 14.1326 10.2203 15.9825 11.2013L35.6966 21.6556C37.8985 22.8233 37.3456 26.122 34.8833 26.5078L29.4178 27.3643C26.4901 27.8231 23.9273 29.5822 22.4467 32.1494L19.6829 36.9417C18.4378 39.1007 15.1608 38.4309 14.8627 35.9564L12.1935 13.8021Z",
            }
        },
    ]),
    Hand: SVGCanvasOfSize(49, 49, [
        {
            kind: "path",
            attributes: {
                stroke: "none",
                fill: "#ffffff",
                d: "M14.2132 8.57257C16.8305 8.07077 20.1439 9.38374 20.528 12.6978C20.6744 13.9611 20.9483 14.4841 21.8477 15.9556C23.6639 15.2776 25.7094 15.1579 27.5417 15.8469C30.7621 13.8779 35.1835 14.8307 37.8192 17.3453C39.449 18.9004 40.4821 20.9222 41.1301 22.6793C42.5083 26.4168 42.3462 30.1226 40.6783 33.2884C40.9548 35.846 39.193 38.1645 36.9807 39.1975L31.1762 41.908C29.1907 42.8351 26.7435 42.8334 24.893 41.6663C23.1074 41.7838 21.2116 41.7593 19.217 41.5821C13.7178 41.0934 11.1557 37.0776 10.0472 33.522L9.7057 32.3909C8.11379 31.5263 6.97401 29.8498 7.22386 27.7241C7.56324 24.8384 10.2559 22.9613 12.8598 22.8202C11.2614 20.1661 9.82232 17.9218 9.42122 14.4607C9.064 11.3783 11.6341 9.06704 14.2132 8.57257Z",
            }
        },
        {
            kind: "path",
            attributes: {
                stroke: "none",
                fill: "#4D3BD1",
                d: "M14.6716 10.9626C16.4034 10.6305 17.9432 11.5328 18.1107 12.9779C18.3306 14.8756 18.8824 15.7755 19.9204 17.468L19.9257 17.4767C20.2236 17.9626 20.5616 18.5138 20.943 19.1726C21.0191 19.112 21.0987 19.0535 21.1817 18.9976C21.2373 18.9602 21.2945 18.9238 21.3531 18.8886C22.3038 18.3186 23.4313 17.8797 24.6556 17.8222C25.924 17.7625 26.9777 18.1285 27.7432 18.6996C27.7788 18.7262 27.8138 18.7532 27.8482 18.7805C28.3223 18.1628 29.0558 17.6725 29.9302 17.4603C32.7747 16.7697 34.881 17.9054 36.1393 19.106C37.3976 20.3066 38.2668 21.9482 38.8469 23.5213C40.1259 26.9895 39.7949 30.2438 38.0983 32.8859C38.6553 34.3699 37.751 36.1518 35.9512 36.9923L30.1467 39.7027C28.5091 40.4674 26.6579 40.2062 25.6425 39.1637C23.7371 39.3493 21.662 39.3559 19.4326 39.1578C15.3328 38.7935 13.3346 35.8892 12.3708 32.7976C12.2604 32.4432 12.1696 32.1377 12.0902 31.8702C11.9144 31.2781 11.7939 30.8727 11.6379 30.5383C10.3481 30.2589 9.49591 29.2431 9.64107 28.0081C9.81538 26.526 11.3601 25.2895 13.0913 25.2463C15.7017 25.1811 16.8908 26.7535 17.4084 27.7561C17.8209 28.5553 18.1238 29.6248 18.3582 30.4179C18.4262 30.648 18.6478 30.7958 18.8867 30.7736C19.2032 30.7441 19.4153 30.4335 19.3212 30.1299C18.069 26.0902 16.2061 23.7328 15.2193 22.0287C14.959 21.5793 14.6918 21.1482 14.4266 20.7206L14.4232 20.7152C13.2802 18.8726 12.1764 17.0929 11.8389 14.1803C11.6714 12.7353 12.9396 11.2946 14.6716 10.9626Z",
            }
        }
    ]),
});

Media.Annotation.Style.Register(
    new Media.Annotation.Style.Pointer("cursor-cursor", Media.Annotation.Style.Pointer.Assets.Cursor, LocalizedString("Cursor")),
    new Media.Annotation.Style.Pointer("cursor-arrow",  Media.Annotation.Style.Pointer.Assets.Arrow,  LocalizedString("Arrow")),
    new Media.Annotation.Style.Pointer("cursor-hand",   Media.Annotation.Style.Pointer.Assets.Hand,   LocalizedString("Hand")),
);
