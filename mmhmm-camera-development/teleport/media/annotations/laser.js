//
//  media/annotations/laser.js
//  mmhmm
//
//  Created by Steve White on 4/4/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

Media.Annotation.Style.Laser = class extends Media.Annotation.Style {
    constructor(identifier, color, description) {
        super(identifier);
        const laser = LocalizedString("Laser");
        this.shortTitle = laser;
        this.longTitle = `${laser} - ${description}`;
        this.color = color;
    }
    copy() {
        const copy = super.copy();
        copy.color = this.color;
        return copy;
    }
    get icon() {
        const color = this.color;
        const hex = (num) => {
            let hex = Math.round(num * 255).toString(16);
            if (hex.length == 1) {
                hex = "0" + hex;
            }
            return hex;
        }

        const webColor = `#${hex(color[0])}${hex(color[1])}${hex(color[2])}`;
        return SVGCanvasOfSize(24, 24, [
            {
                kind: "path",
                attributes: {
                    d: "M9.319 14.1c-1.667.834-2.266.9-6.016 2.4 1.25 3.752 3.237 6.458 4.453 6.98 3.474-2.953 10.838-9.171 12.506-10.422 2.084-1.563 1.563-4.169-.521-4.69-2.085-.52-6.253 0-8.338 0-2.084 0 4.69-4.69 6.253-5.731C19.22 1.594 19.741.552 18.698.03c-1.042-.52-9.9 5.732-14.069 8.858-4.168 3.127-.52 5.211 1.564 4.69 2.084-.521 5.21-.521 3.126.521Z",
                    opacity: 0.2,
                    fill: webColor,
                    stroke: "none",
                }
            },
            {
                kind: "circle",
                attributes: {
                    cx: 5.669,
                    cy: 19.831,
                    r: 4.169,
                    fill: webColor,
                    stroke: "none",
                }
            }
        ]);
    }

    attachToSlide(slide) {
        super.attachToSlide(slide);
        const layer = slide.layer;

        const filter = new Media.Annotation.Style.Laser.Shader();
        filter.color = this.color;
        layer.filter = filter;
        this.filter = filter;
    }
    detachFromSlide(slide) {
        super.detachFromSlide(slide);
        this.filter = null;
        const layer = slide.layer;
        layer.filter = null;
    }
    render(timestamp) {
        super.render(timestamp);

        const filter = this.filter;
        if (filter != null && this.pointerDown != true) {
            filter.tick();
            filter.removeExpiredPoints();
        }
    }

    onPointerEnter() {
        this.smoother = new Scamper();
    }
    onPointerLeave() {
        this.smoother = null;
    }

    onPointerDown(event) {
        this.pointerDown = true;
    }
    onPointerUp(event) {
        this.pointerDown = false;
    }
    onPointerMove(event) {
        const point = event.point;

        var points = this.smoother.extendStroke(point.x, point.y, 0);
        if (points.length > 0) {
            this.filter.addPoints(points);
        }
    }

    toJSON() {
        let r = super.toJSON();
        r.down = (this.pointerDown == true);
        return r;
    }
    applyEvent(event) {
        super.applyEvent(event);

        if (event.enter != null) {
            this.onPointerEnter();
        }

        if (event.down != null) {
            this.onPointerDown();
        }

        const move = event.move;
        if (move != null) {
            this.onPointerMove({point: move});
        }

        if (event.up != null) {
            this.onPointerUp();
        }

        if (event.leave != null) {
            this.onPointerLeave();
        }
    }
}

Media.Annotation.Style.Register(
    new Media.Annotation.Style.Laser("laser-blue",   [0.0902, 0.3059, 0.8980], LocalizedString("Blue")),
    new Media.Annotation.Style.Laser("laser-purple", [0.5804, 0.2157, 1.0000], LocalizedString("Purple")),
    new Media.Annotation.Style.Laser("laser-red",    [1.0000, 0.1490, 0.0000], LocalizedString("Red")),
    new Media.Annotation.Style.Laser("laser-green",  [0.0588, 0.6000, 0.1490], LocalizedString("Green")),
    new Media.Annotation.Style.Laser("laser-yellow", [1.0000, 0.8000, 0.0000], LocalizedString("Yellow")),
);
