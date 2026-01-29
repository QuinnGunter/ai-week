//
//  renderer/utils.js
//  mmhmm
//
// Created by Amol Ghode on 2/12/2025
// Copyright © 2025 mmhmm, inc. All rights reserved.
import { sleep } from "../test-utils/utils";
export const setupTest = async (page, pageUrl) => {
    await page.goto(pageUrl);
    await sleep(3000);
}

export const setupTypesetterMock = async (page) => {
    await sleep(3000);
    return await page.evaluateHandle(() => {
        let setter = new Typesetter();
        return setter;
    });
};