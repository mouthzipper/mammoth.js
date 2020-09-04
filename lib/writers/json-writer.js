var util = require("util");
var _ = require("underscore");
const { object } = require("underscore");

exports.writer = writer;

function writer(options) {
    return simpleWriter();
}

function getReadableElement (tagName) {
    const elMapping = {
        p: 'paragraph',
        img: 'image',
        ul: 'bulletList',
        ol: 'numberList',
        li: 'listItem',
        tr: 'table_row',
        td: 'table_cell',
        th: 'table_cell',
    };
    return elMapping[tagName] || tagName
}
const TEXT_STYLE_TAGS = ['bold', 'italic', 'underlined'];
const DEFERRED_TYPES = ['th', 'forceWrite'];

function simpleWriter() {
    function element(node, assetsArray, parentEl) {
        const tagName = getReadableElement(node.tag.tagName);
        if(DEFERRED_TYPES.includes(tagName)) return;
        if(tagName === 'image') {
            const dataImage = {
                src: node.tag.attributes && node.tag.attributes.src ? node.tag.attributes.src : ''
            }
            assetsArray.push({
                data: dataImage,
                type: tagName,
                nodes: [
                    {
                        text: '',
                        marks: [],
                        object: 'text',
                    }
                ],
                object: 'block',
            })
        }
        if(tagName === 'listItem') {
            parentEl.nodes.push({
                data: {},
                type: 'listItem',
                nodes: [],
                object: 'block'
            })
        }
        if(parentEl.type === 'table') {
            const trIndex = parentEl.nodes.length === 0 ? 0 : parentEl.nodes.length -1;
            if(tagName === 'table_row') {
                parentEl.nodes.push({
                    type: tagName,
                    data: {},
                    object: 'block',
                    nodes: [],
                })
            }
            if(tagName === 'table_cell') {
                parentEl.nodes[trIndex].nodes.push({
                    type: tagName,
                    data: {},
                    object: 'block',
                    nodes: [],
                })
            }
            if(tagName === 'paragraph') {
                if(parentEl.nodes[trIndex].type !== 'table_row') return;
                const tdIndex = parentEl.nodes[trIndex].nodes.length === 0 ? 0 : parentEl.nodes[trIndex].nodes.length -1;
                parentEl.nodes[trIndex].nodes[tdIndex].nodes.push({
                    type: tagName,
                    data: {},
                    object: 'block',
                    nodes: [],
                })
            }
        }
        if(TEXT_STYLE_TAGS.includes(tagName)) {
            const parentElNodesLen = parentEl.nodes.length;
            if(parentElNodesLen > 0) {
                const nodesIndex = parentElNodesLen -1;
                const marks = parentEl.nodes[nodesIndex].marks;
                if(marks && marks.length > 0) {
                    marks.push({
                        data: {},
                        type: tagName,
                        object: 'mark',
                    })
                }
               
            } else {
                parentEl.nodes.push({
                    text: '',
                    marks: [{
                        data: {},
                        type: tagName,
                        object: 'mark'
                    }],
                    object: 'text',
                })
            }
            
        }
    }
    
    function text(value, parentEl) {
        const textObj = {
            text: value,
            marks: [],
            object: 'text',
        };
        if(parentEl && parentEl.nodes && Array.isArray(parentEl.nodes)) {
            const isList = parentEl.type === 'bulletList' || parentEl.type === 'numberList';
            if(isList) {
                const nodesIndex = parentEl.nodes.length === 0 ? 0 : parentEl.nodes.length -1;
                parentEl.nodes[nodesIndex].nodes.push({
                    data: {},
                    type: 'listItemChild',
                    nodes: [textObj],
                    object: 'block'
                })
            } else if(parentEl.type === 'table') {
                const trIndex = parentEl.nodes.length === 0 ? 0 : parentEl.nodes.length -1;
                
                if(parentEl.nodes[trIndex].type !== 'table_row') return;
                const tdIndex = parentEl.nodes[trIndex].nodes.length === 0 ? 0 : parentEl.nodes[trIndex].nodes.length -1;
                if(parentEl.nodes[trIndex].nodes[tdIndex].type !== 'table_cell') return;
                const pIndex = parentEl.nodes[trIndex].nodes[tdIndex].nodes.length === 0 ? 0 : parentEl.nodes[trIndex].nodes[tdIndex].nodes.length -1;
                const pEl =  parentEl.nodes[trIndex].nodes[tdIndex].nodes[pIndex];
                if(pEl && pEl.nodes) {
                    pEl.nodes.push(textObj);
                }
            } else if(parentEl.nodes.length > 0 && parentEl.nodes[0].marks.length > 0) {
                parentEl.nodes[0].text = value;
            } else {
                parentEl.nodes.push(textObj)
            }
        }
    }
    
    function groupAssets(flatAssets) {
        let assets = [];
        let assetsArray = [];
        flatAssets.forEach(data => {
            if(data && data.nodes && (data.nodes.length > 0 || _.keys(data.data).length > 0)) {
                assets.push(data);
            } else {
                if(assets.length > 0) {
                    assetsArray.push(assets);
                }
                assets = [];
            }
        })
        return assetsArray;
    }
    
    return {
        element: element,
        text: text,
        groupAssets: groupAssets,
    };
}