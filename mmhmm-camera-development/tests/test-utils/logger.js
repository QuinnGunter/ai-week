//
//  logger.js
//  mmhmm
//
// Created by Amol Ghode on 2/6/2025
// Copyright © 2025 mmhmm, inc. All rights reserved.
//
export class TestLogger {
    constructor(page, testInfo, shouldLog = false) {
        this.page = page;
        this.shouldLog = shouldLog;
    }
    static getInstance(page) {
        if (!this.instance) {
            this.instance = new TestLogger(page);
        }
        return this.instance;
    }
    init() {
        let thisRef = this;
        this.page.on('console', async msg => {
            const values = [];
            for (const arg of msg.args())
                try {
                    values.push(await arg.jsonValue());
                    thisRef.shouldLog && console.log(...values);
                } catch (e) {
                    console.log("Exception in jsonValue()");
                }
        });
    }
    cleanup() {}
    printTestId(title) {
        let testId = title.substring(0, title.indexOf(":"));
        if (!testId) {
            testId = title;
        }
        console.log (testId);
    }
    enableLogging() {
        this.shouldLog = true;
    }

    disableLogging() {
        this.shouldLog = false;
    }
}