const mmhmm = require('./eslint-plugin-mmhmm');

const html = require('node-html-parser');
const fs = require('fs');
const path = require('path');

const baseDir = "teleport"; // XXX: could we access argv safely?

const joinAppSources = () => {
    const indexFile = "index.html";
    const indexPath = path.join(baseDir, indexFile);

    const index = fs.readFileSync(indexPath, {encoding: "utf8"});
    // How to handle no-ship? Does it matter?
    const doc = html.parse(index);
    const scripts = doc.querySelectorAll("script");
    let output = "";

    scripts.forEach(script => {
        const srcAttr = script.getAttribute("src");
        let source = null;
        let file = null;

        if (srcAttr == null) {
            source = script.text;
            file = indexFile;
        }
        else {
            // It would be nice to not ignore these because they may be
            // needed to resolve globals.  Loading from third_party
            // just created more errors than it solved though.
            if (srcAttr.startsWith("http") || srcAttr.startsWith("./") || srcAttr.startsWith("tests/")) {
                return;
            }

            file = path.join(baseDir, srcAttr);
            source = fs.readFileSync(file, {encoding: "utf8"});
        }

        output += `\n//# sourceURL=${file}\n`;
        output += source;
    })
    return output;
}

const source = joinAppSources();
const outputFile = path.join(baseDir, "main.js");
fs.writeFileSync(outputFile, source);

process.on('exit', function () {
    fs.unlink(outputFile, () => {});
});

module.exports = [
    {
        files: [outputFile],
        plugins: {
            mmhmm
        },
        rules: {
            "no-undef": "error",
        },
        processor: "mmhmm/sourcemaps",
    }
];
