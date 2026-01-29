const fs = require('fs');
const path = require('path');

const { Parser } = require('acorn');
const walk = require("acorn-walk");

const ignorables = [
    "node_modules", "third_party", "deploy", "localizations"
]

console.log("genstrings starting");

function enumerateDirectory(dir, deep, pattern) {
  const files = fs.readdirSync(dir, {withFileTypes: true});
  var results = [];
  files.forEach(file => {
    var name = file.name;
    var fullpath = path.join(dir, name);
    if (file.isDirectory() == true && deep == true) {
        if (ignorables.indexOf(name) == -1) {
            results = results.concat(enumerateDirectory(fullpath, deep, pattern))
        }
    }
    else if (name.match(pattern) != null) {
      results.push(fullpath)
    }
  });
  return results;
}

var strings = {};
function parseSourceCode(source) {
    const parsed = Parser.parse(source, {ecmaVersion: 'latest'});
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
            key = key.value;

            var value = null;
            if (name == 'LocalizedString') {
                if (nodeArguments.length > 1 && nodeArguments[1].type == 'Literal') {
                    value = nodeArguments[1].value;
                }
            }
            else {
                if (nodeArguments.length > 2 && nodeArguments[1].type == 'Literal') {
                    value = nodeArguments[1].value;
                }
            }

            if (value == null) {
                value = key;
            }

            if (value.length > 0) {
                strings[key] = value;
            }
        }
    });
}


var files = enumerateDirectory(__dirname, true, ".js$");
files.forEach(file => {
    if (file.endsWith("/core/localization.js") == true) {
        return;
    }
    const source = fs.readFileSync(file, {encoding: "utf8"});
    try {
        parseSourceCode(source);
    }
    catch (err) {
        console.error("Error parsing file: ", file);
        if (err == "BadArgument") {
            process.exit(1);
        }
        console.error(err);
    }
});

var indexContents = fs.readFileSync(path.join(__dirname, "index.html"), {encoding: "utf8"});
var openTag = indexContents.indexOf("<script>");
if (openTag != -1) {
    openTag += "<script>".length;
    var closeTag = indexContents.indexOf("</script>", openTag);
    var script = indexContents.substring(openTag, closeTag);
    parseSourceCode(script);
}

// Stored into an array so they can be sorted
var keys = Object.keys(strings).sort();

// And then converted to a hash array that should
// maintain the sort
var output = {};
keys.forEach(key => output[key] = strings[key]);

var i18n_dir = path.join(__dirname, "localizations");
var en_dir = path.join(i18n_dir, "en-US");
var outputFile = path.join(en_dir, "strings.json");

fs.writeFileSync(outputFile, JSON.stringify(output, null, "    "));

console.log('localization finished');
