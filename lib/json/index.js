var ast = require("./ast");

exports.freshElement = ast.freshElement;
exports.nonFreshElement = ast.nonFreshElement;
exports.elementWithTag = ast.elementWithTag;
exports.text = ast.text;
exports.forceWrite = ast.forceWrite;

exports.simplify = require("./simplify");

let parentEl = {};
let assetsArray = [];

function getReadableElement (tagName) {
    const elMapping = {
        p: 'paragraph',
        img: 'image',
        ul: 'bulletList',
        ol: 'numberList',
        li: 'listItem',
    };
    return elMapping[tagName] || tagName
}

function nodeWrite(writer, nodes) {
    nodes.forEach(function (node) {
        writeNode(writer, node);
    })

}
function write(writer, nodes) {
    nodes.forEach(function(node) {
        const tagName = getReadableElement(node.tag.tagName);
        if(parentEl && parentEl.type === 'bulletList' && tagName === 'bulletList') {
            if(node && node.children && node.children.length > 0) {
                parentEl = assetsArray[assetsArray.length -1];
                nodeWrite(writer, node.children);
            }
        } else {
            const asset = {
                type: tagName,
                object: 'block',
                data: tagName === 'image' ? dataImage : {},
                nodes: [],
            };
            assetsArray.push(asset);
            if(node && node.children && node.children.length > 0) {
                parentEl = assetsArray[assetsArray.length-1];
                nodeWrite(writer, node.children);
            }
        }
    });
    const groupedAssets = writer.groupAssets(assetsArray);
    assetsArray = [];
    parent = {};
    return groupedAssets;
}


function writeNode(writer, node) {
    toStrings[node.type](writer, node);
}

var toStrings = {
    element: generateElementObject,
    text: generateTextNode,
    forceWrite: function() { }
};
function generateElementObject(writer, node) {
    writer.element(node, assetsArray, parentEl);
    nodeWrite(writer, node.children);
}

function generateTextNode(writer, node) {
    writer.text(node.value, parentEl);
}

exports.write = write;
