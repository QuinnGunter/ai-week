import path from "path";
const fs = require('fs').promises;
export const sleep = (durationMS) => {
    return new Promise((resolve) => {
       setTimeout(_=>resolve(), durationMS);
    });
}
