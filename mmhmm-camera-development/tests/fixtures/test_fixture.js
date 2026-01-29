//
//  test_fixtures.js
//  mmhmm
//
// Created by Amol Ghode on 2/6/2025
// Copyright © 2025 mmhmm, inc. All rights reserved.
//
import { TestLogger } from "../test-utils/logger";
const base = require('@playwright/test');
import path from "path";
import { appendToFile } from "../test-utils/utils";
const url = require('url');
exports.test = base.test.extend ({
    page: async ({ page }, use, testInfo) => {
        let context = page.context();
        await context.addInitScript({
            path: path.join(__dirname, "../../node_modules/sinon/pkg/sinon.js"),
        });
        await page.route('*/**/public/mp/track/*', async (route, request) => {
                await route.fulfill({
                    status: 200,
                });
        });
        let logger = TestLogger.getInstance(page);
        logger.init();
        await page.goto("/teleport/index.html");
        logger.printTestId(testInfo.title);
        await use(page);
      },
});
