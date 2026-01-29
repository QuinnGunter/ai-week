//
//  workerHeartbeat.js
//
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

// This for a worker thread that just generates a message on a heartbeat to operate on a different thread
// Using 30ms since there seems to be some basic overhead that makes it run a little slow

//console.log(`Start heartbeat`);

let heartbeatActive = false;
let lastTime = 0;

function scheduleHeartbeat() {
    setTimeout(() => {
        var end = Date.now();
        postMessage(end - lastTime);
        lastTime = end;
        scheduleHeartbeat();
    }, 30);
}

onmessage = (msg) => {
    if (heartbeatActive === false && msg.data === "Start") {
        heartbeatActive = true;
        lastTime = Date.now();
        scheduleHeartbeat();
    }
    else if (msg.data === "Closing") {
        heartbeatActive = false;
    }
    else {
        // Eat any system wide messages
        //console.log(msg);
    }
};
