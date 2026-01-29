const fs = require('fs');
const csstree = require('css-tree');

const args = process.argv;
if (args.length < 3) {
    console.error(`usage: [${args[1]}] <css file> ...`);
    process.exit(-1);
}

const files = args.slice(2, args.length);
files.forEach(file => {
    const source = fs.readFileSync(file, {
        encoding: "utf8"
    });

    const ast = csstree.parse(source);
    csstree.walk(ast, (node) => {
        if (node.type != 'Url') {
            return;
        }
        let value = node.value;
        if (value.startsWith("/assets/") == false) {
            return;
        }
        value = value.substring(1);
        node.value = value;
    });
    console.log(csstree.generate(ast));
})
