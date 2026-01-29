//
//  network/utils.js
//  mmhmm
//
// Created by Amol Ghode on 2/11/2025
// Copyright © 2025 mmhmm, inc. All rights reserved.
//
import { sleep } from "../test-utils/utils";
export const setupTest = async (page) => {
    await sleep(3000);
    return await page.evaluateHandle(async () => {
        window.App = {
            isHybrid: false,
        };
        window.getReleaseTrack = sinon.fake.returns("development")
        let mmhmmApi = mmhmmAPI.defaultEndpoint();
        return mmhmmApi;
    });
}