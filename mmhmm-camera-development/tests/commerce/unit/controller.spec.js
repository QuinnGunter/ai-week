import { test } from "../../fixtures/test_fixture";
import { expect } from "@playwright/test";

test.describe("CommerceUtils", () => {
    const testCases = [
        {
            description: "dollars",
            annualPrice: 12000,
            displayPrice: "$120.00",
            currencySymbol: "$",
            expectedResult: "$10"
        },
        {
            description: "euro",
            annualPrice: 12000,
            displayPrice: "€120.00",
            currencySymbol: "€",
            expectedResult: "€10"
        },
        {
            description: "yen",
            annualPrice: 14000,
            displayPrice: "¥14,000",
            currencySymbol: "¥",
            expectedResult: "¥1,167"
        }
    ];

    testCases.forEach((testCase) => {
        test(`UNIT_COMMERCEUTILS_FORMATPRICE_${testCase.description}`, async ({ page }) => {
            const actual = await page.evaluate((testData) => {
                return CommerceUtils.formatMonthlyPrice(testData.annualPrice, testData.displayPrice, testData.currencySymbol);
            }, testCase);
            expect(actual).toBe(testCase.expectedResult);
        });
    });
});
