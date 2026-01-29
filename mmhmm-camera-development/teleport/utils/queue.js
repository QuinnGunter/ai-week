//
//  utilos/queue.js
//  mmhmm
//
//  Created by Steve White on 5/16/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

class SerializedQueue {
    add(job, context=null) {
        if (job == null) {
            console.error("Refusing to enqueue null job");
            return;
        }

        let queue = this._queue;
        if (queue == null) {
            queue = [];
            this._queue = queue;
        }

        queue.push({job, context});
        this._advanceQueue();
    }
    async _advanceQueue() {
        if (this._busy == true) {
            return;
        }

        const queue = this._queue;
        if (queue.length == 0) {
            return;
        }

        this._busy = true;

        const {job, context} = queue.shift();

        try {
            const result = job(context);
            if (IsKindOf(result, Promise) == true) {
                await result;
            }
        }
        catch (err) {
            console.error("Executing job threw: ", job, context, err);
        }
        finally {
            this._busy = false;
            this._advanceQueue();
        }
    }
}
