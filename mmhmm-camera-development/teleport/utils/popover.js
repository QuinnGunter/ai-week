//
//  popover.js
//  mmhmm
//
//  Created by Amol Ghode on 3/14/25.
//  Copyright © 2025 mmhmm, inc. All rights reserved.
//
class Popover {
    static setPopover(element, popover, arrowElement, placement) {
        let floatingDom = window.FloatingUIDOM;
        let middleware = [
            floatingDom.offset(6),
            floatingDom.shift({
                padding: 10,
                crossAxis: true
            }),
            floatingDom.flip()
        ];

        if (arrowElement) {
            middleware.push(floatingDom.arrow({ element: arrowElement }));
        }

        let popoverData = {
            middleware
        };
        if (placement) {
            popoverData.placement = placement;
        }

        floatingDom
            .computePosition(element, popover, popoverData)
            .then(({ x, y, placement, middlewareData }) => {
                Object.assign(popover.style, {
                    left: `${x}px`,
                    top: `${y}px`
                });

                // Accessing the data
                const { x: arrowX, y: arrowY } = middlewareData.arrow;

                const staticSide = {
                    top: "bottom",
                    right: "left",
                    bottom: "top",
                    left: "right"
                }[placement.split("-")[0]];

                Object.assign(arrowElement.style, {
                    left: arrowX != null ? `${arrowX}px` : "",
                    top: arrowY != null ? `${arrowY}px` : "",
                    right: "",
                    bottom: "",
                    [staticSide]: "-4px"
                });
            });
    }
}
