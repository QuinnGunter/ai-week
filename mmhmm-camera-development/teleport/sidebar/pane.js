//
//  sidebar/pane.js
//  mmhmm
//
//  Created by Steve White on 3/4/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class SidebarPane extends ObservableObject {
    constructor(title, identifier = null) {
        super();
        this.title = title;
        this.identifier = identifier;
    }
    createNewPane() {
        throw "Intentionally blank, subclass responsibility";
    }
    attachTo(parentElement) {
        var pane = this.pane;
        if (pane == null) {
            pane = this.createNewPane();
            if (pane == null) {
                throw "Must return a DOM element in createNewPane"
            }
            this.pane = pane;
        }

        if (pane.parentNode != parentElement) {
            if (pane.parentNode != null) {
                pane.parentNode.removeChild(pane);
            }
            parentElement.appendChild(pane);
        }
    }
    detachFrom(parentElement) {
        var pane = this.pane;
        if (pane != null && pane.parentNode == parentElement) {
            parentElement.removeChild(pane);
        }
        this.pane = null;
    }
}
