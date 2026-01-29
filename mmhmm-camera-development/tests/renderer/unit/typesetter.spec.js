//
//  typesetter.spec.js
//  mmhmm
//
// Created by Amol Ghode on 5/17/2024
// Copyright © 2024 mmhmm, inc. All rights reserved.
//
import { test } from "../../fixtures/test_fixture";
import { setupTypesetterMock } from "../utils";
import { expect } from "@playwright/test";

test.describe("TypeSetter", () => {
    test("UT_TYPESETTER_1: should corretly generate TypesetterLine for given size and font", async ({ page, browserName }) => {
        let typeSetterHandle = await setupTypesetterMock(page);
        // Check strings for font size 96
        let result = await typeSetterHandle.evaluate(async (typeSetter) => {
            let font = new Font({ family: "Times New Roman", size: 96 });
            let text = new AttributedString("The quick brown fox jumped over the lazy dog", { font });
            let lines = typeSetter.linesFromTextConstrainedToSize(text, SizeMake(320, 640))
            let strings = lines.map((line) => { return line.string });
            return strings;
        });

        let expectedResultFor96 = ['The ', 'quick ', 'brown ', 'fox ', 'jumped ', 'over the '];
        expect(result.length).toBe(expectedResultFor96.length);
        for (let i = 0; i < expectedResultFor96.length; i++) {
            expect(result[i]).toBe(expectedResultFor96[i]);
        }

        // Check strings for font size 48
        result = await typeSetterHandle.evaluate(async (typeSetter) => {
            let font = new Font({ family: "Times New Roman", size: 48 });
            let text = new AttributedString("The quick brown fox jumped over the lazy dog", { font });
            let lines = typeSetter.linesFromTextConstrainedToSize(text, SizeMake(320, 640));
            let strings = lines.map((line) => { return line.string });
            return strings;
        });

        let expectedResultFor48 = ['The quick ', 'brown fox ', 'jumped over the ', 'lazy dog'];
        expect(result.length).toBe(expectedResultFor48.length);
        for (let i = 0; i < expectedResultFor48.length; i++) {
            expect(result[i]).toBe(expectedResultFor48[i]);
        }
    })
});
