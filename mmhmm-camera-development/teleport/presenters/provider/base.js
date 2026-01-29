//
//  base.js
//  mmhmm
//
//  Created by Steve White on 11/11/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class PresenterVideoProvider extends ObservableObject {
    constructor() {
        super();

        this.active = false;
        this.renderable = null;
        this.size = SizeZero();
    }

    // abstract class
    destroy() {
        throw AbstractError();
    }
    set videoTrack(value) {
        throw AbstractError();
    }
    get videoTrack() {
        throw AbstractError();
    }
    // XXX ???? needed ????
    set inputStream(value) {
        throw AbstractError();
    }
    get inputStream() {
        throw AbstractError();
    }
    get canProvideBuffer() {
        return false;
    }
    getFrameForSegmentation(planarAcceptable) {
        throw AbstractError();
    }
    render(timestamp) {
        // intentionally blank, subclass hook
        return false;
    }
    protect(renderable) {
        // intentionally blank, subclass hook
    }
    unprotect(renderable) {
        // intentionally blank, subclass hook
    }
    detachFrame(renderable) {
        // intentionally blank, subclass hook
    }
}
