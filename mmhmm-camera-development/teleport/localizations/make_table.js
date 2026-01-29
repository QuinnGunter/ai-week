#!/usr/local/node/bin/node

const fs = require('fs');
const dir = process.argv[2] || ".";
const sourceFile = process.argv[3];

let keysToInclude = null;

if (sourceFile != null) {
    keysToInclude = [];

    const { Parser } = require('acorn');
    const walk = require("acorn-walk");

    const sources = fs.readFileSync(sourceFile, {encoding: "utf8"});
    const parsed = Parser.parse(sources, {ecmaVersion: 'latest'});

    try {
        walk.simple(parsed, {
            CallExpression(node) {
                var callee = node.callee;
                if (callee == null) {
                    return;
                }
                var name = callee.name;
                if (name != 'LocalizedString' && name != 'LocalizedStringFormat') {
                    return;
                }

                var nodeArguments = node.arguments;
                if (nodeArguments == null || nodeArguments.length == 0) {
                    return;
                }

                var key = nodeArguments[0];
                if (key.type == 'TemplateLiteral') {
                    if (key.expressions.length != 0) {
                        console.error(`LocalizedString argument cannot be a template literal that contains expressions.`);
                        throw "BadArgument";
                    }
                    var quasis = key.quasis;
                    var elements = quasis.filter(node => node.type == 'TemplateElement');
                    if (elements.length != quasis.length) {
                        console.error(`Unsupposed template literal expression.`);
                        throw "BadArgument";
                    }
                    key.value = elements.map(elem => elem.value.cooked).join("");
                }
                else if (key.type != 'Literal') {
                    console.error(`LocalizedString argument must be a literal. ${key.type} is unsupported`, key);
                    throw "BadArgument";
                }
                keysToInclude.push(key.value);
            }
        });
    } catch (e) {
        process.exit(1);
    }
}
function enumerateDirectory(dir, pattern) {
  const files = fs.readdirSync(dir, {withFileTypes: true});
  var results = [];
  files.forEach(file => {
    var name = file.name;
    var path = dir + "/" + name; // XXX
    if (file.isDirectory() == true) {
      results = results.concat(enumerateDirectory(path, pattern))
    }
    else if (name.match(pattern) != null) {
      results.push(path)
    }
  });
  return results;
}

var jsonFiles = enumerateDirectory(dir, /json$/);
jsonFiles.forEach(file => console.log("/* "+file+" */"));

var sources = {};
var keys = new Set();
jsonFiles.forEach(file => {
  var json = fs.readFileSync(file, {encoding: "utf8"});
  var contents = JSON.parse(json);
  Object.keys(contents).forEach(key => {
      if (keysToInclude == null || keysToInclude.includes(key) == true) {
          keys.add(key);
      }
  });
  sources[file] = contents;
});


var localizations = {
  __keys: Array.from(keys)
};

for (var filename in sources) {
  var values = [];
  localizations.__keys.forEach(key => {
    var value = sources[filename][key];
    values.push(value);
  })
  var pathComponents = filename.split("/");
  var key = pathComponents[pathComponents.length - 2];
  localizations[key] = values;
}

console.log("var localizations = {");
for (const key in localizations) {
  console.log(JSON.stringify(key)+": "+JSON.stringify(localizations[key])+",");
}
console.log("};")
console.log("MakeLocalizedTable(localizations);")
console.log("localizations = null;");
