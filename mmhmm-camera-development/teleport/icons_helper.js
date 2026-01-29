function toAppIconCode(svgElem) {
    const toAppIcon = function(node) {
        let r = {
            kind: node.tagName,
        };

        const attributes = Array.from(node.attributes);
        if (attributes.length > 0) {
            r.attributes = {};
            for (var idx=0; idx<attributes.length; idx+=1) {
                const attr = attributes[idx];
                const name = attr.name;
                const value = attr.value;
                r.attributes[name] = value;
            }
        }
    
        const children = Array.from(node.childNodes).filter((node) => node.nodeType == Node.ELEMENT_NODE);
        if (children.length > 0) {
            r.children = children.map((child) => toAppIcon(child))
        }
        return r;
    };
    
    const children = Array.from(svgElem.childNodes)
                    .filter((node) => node.nodeType == Node.ELEMENT_NODE)
                    .map((child) => toAppIcon(child));
    const width = svgElem.getAttribute("width");
    const height = svgElem.getAttribute("height");
    
    const code = `return SVGCanvasOfSize(${width}, ${height}, ${JSON.stringify(children, null, "\t")});`;
    return code;
}