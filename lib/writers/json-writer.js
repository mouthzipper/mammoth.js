var util = require("util");
var _ = require("underscore");
var get = require('lodash').get;
var isEmpty = require('lodash').isEmpty;
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
        a: 'link'
    };
    return elMapping[tagName] || tagName
}
const TEXT_STYLE_TAGS = ['bold', 'italic', 'underlined'];
const DEFERRED_TYPES = ['th', 'forceWrite'];
const LIST_ITEM_BLOCK = {
    data: {},
    type: 'listItem',
    nodes: [],
    object: 'block'
};

const blockByTagName = (tagName) => ({
    type: tagName,
    data: {},
    object: 'block',
    nodes: [],
});

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
        if(tagName === 'link' && _.has(node.tag.attributes, 'href')) {
            parentEl.nodes.push({
                data: {
                    href: node.tag.attributes.href
                },
                type: tagName,
                nodes: [
                    {
                        text: '',
                        marks: [],
                        object: 'text',
                    }
                ],
                object: 'inline',
            })
        }
        if(parentEl.type === 'table') {
            const trIndex = parentEl.nodes.length === 0 ? 0 : parentEl.nodes.length -1;
            if(tagName === 'table_row') {
                parentEl.nodes.push(blockByTagName(tagName));
            }
            if(tagName === 'table_cell') {
                const colspan =  parseInt(get(node.tag.attributes, 'colspan', 0), 10);
                const rowspan =  parseInt(get(node.tag.attributes, 'rowspan', 0), 10);
                const cellData = {
                    ...(colspan > 1 || rowspan > 1 && (
                        {
                        ...({colspan: colspan === 0 && rowspan > 1 ? 1 : colspan}),
                        ...({rowspan: rowspan === 0 && colspan > 1 ? 1: rowspan }),
                        mergeDirection: {
                        ...(colspan > 1 && ({right: true})),
                        ...(rowspan > 1 && ({down: true}))
                        }
                    }))
                }
                parentEl.nodes[trIndex].nodes.push({
                    type: tagName,
                    data: cellData,
                    object: 'block',
                    nodes: [],
                })
            }
            if(tagName === 'paragraph') {
                if(parentEl.nodes[trIndex].type !== 'table_row') return;
                const tdIndex = parentEl.nodes[trIndex].nodes.length === 0 ? 0 : parentEl.nodes[trIndex].nodes.length -1;
                parentEl.nodes[trIndex].nodes[tdIndex].nodes.push(blockByTagName(tagName));
            }
            if(tagName === 'link') {
                console.log('node link', node);
            }
            if(TEXT_STYLE_TAGS.includes(tagName)) {
                const tdIndex = parentEl.nodes[trIndex].nodes.length === 0 ? 0 : parentEl.nodes[trIndex].nodes.length -1;
                const pIndex = parentEl.nodes[trIndex].nodes[tdIndex].nodes.length === 0 ? 0 : parentEl.nodes[trIndex].nodes[tdIndex].nodes.length - 1;
                const pEl = parentEl.nodes[trIndex].nodes[tdIndex].nodes[pIndex];
                if(pEl.type === 'bulletList') {
                    const lIndex = pEl.nodes.length === 0 ? 0 : pEl.nodes.length - 1;
                    pEl.nodes[lIndex].nodes.push({
                        data: {},
                        type: 'listItemChild',
                        nodes: [{
                            text: '',
                            marks: [{
                                data: {},
                                type: tagName,
                                object: 'mark'
                            }],
                            object: 'text'
                        }],
                        object: 'block',
                    });
                }
                else {
                    pEl.nodes.push({
                        text: '',
                        marks: [{
                            data: {},
                            type: tagName,
                            object: 'mark'
                        }],
                        object: 'text',
                    });
                }
            }
            if(['bulletList', 'numberList'].includes(tagName)) {
                const tdIndex = parentEl.nodes[trIndex].nodes.length === 0 ? 0 : parentEl.nodes[trIndex].nodes.length -1;
                parentEl.nodes[trIndex].nodes[tdIndex].nodes.push(blockByTagName(tagName));
            }
            if(tagName === 'listItem') {
                const tdIndex = parentEl.nodes[trIndex].nodes.length === 0 ? 0 : parentEl.nodes[trIndex].nodes.length -1;
                const pIndex = parentEl.nodes[trIndex].nodes[tdIndex].nodes.length === 0 ? 0 : parentEl.nodes[trIndex].nodes[tdIndex].nodes.length - 1;
                parentEl.nodes[trIndex].nodes[tdIndex].nodes[pIndex].nodes.push(LIST_ITEM_BLOCK)
            }
        }  else if(tagName === 'listItem') {
            parentEl.nodes.push(LIST_ITEM_BLOCK);
        } else if(TEXT_STYLE_TAGS.includes(tagName)) {
            const parentElNodesLen = parentEl.nodes.length;
            // if(parentElNodesLen > 0) {
            //     const nodesIndex = parentElNodesLen -1;
            //     const marks = parentEl.nodes[nodesIndex].marks;
            //     if(marks && marks.length > 0) {
            //         marks.push({
            //             data: {},
            //             type: tagName,
            //             object: 'mark',
            //         })
            //     }
               
            // } else {
                parentEl.nodes.push({
                    text: '',
                    marks: [{
                        data: {},
                        type: tagName,
                        object: 'mark'
                    }],
                    object: 'text',
                })
            // }
            
        }
    }
    
    function text(value, parentEl) {
        const textObj = {
            text: value,
            marks: [],
            object: 'text',
        };
        // console.log('value', value);
        // console.log('text before parentEl', JSON.stringify(parentEl, null, 4));
        if(parentEl && parentEl.nodes && Array.isArray(parentEl.nodes)) {
            const isList = parentEl.type === 'bulletList' || parentEl.type === 'numberList';
            const isTable = parentEl.type === 'table';
            const nodesIndex = parentEl.nodes.length === 0 ? 0 : parentEl.nodes.length -1;
            if(isTable) {
                const trIndex = nodesIndex;
                
                if(parentEl.nodes[trIndex].type !== 'table_row') return;
                const tdIndex = parentEl.nodes[trIndex].nodes.length === 0 ? 0 : parentEl.nodes[trIndex].nodes.length -1;
                if(parentEl.nodes[trIndex].nodes[tdIndex].type !== 'table_cell') return;
                const pIndex = parentEl.nodes[trIndex].nodes[tdIndex].nodes.length === 0 ? 0 : parentEl.nodes[trIndex].nodes[tdIndex].nodes.length -1;
                const pEl =  parentEl.nodes[trIndex].nodes[tdIndex].nodes[pIndex];
                // console.log('pEl', JSON.stringify(pEl, null, 4));
                if(!pEl || !_.has(pEl, 'nodes')) return;
                const pElIndex = pEl.nodes.length === 0 ? 0 : pEl.nodes.length - 1;
                if(['bulletList', 'numberList'].includes(pEl.type)) {
                    const listIndex = pEl.nodes.length === 0 ? 0 : pEl.nodes.length - 1;
                    // console.log('listItem', pEl.nodes[listIndex]);
                    const childIndex = pEl.nodes[listIndex].nodes.length === 0 ? 0 : pEl.nodes[listIndex].nodes.length - 1;
                    // console.log('childInde', pEl.nodes[listIndex].nodes[childIndex]);
                    const childEl = pEl.nodes[listIndex].nodes[childIndex];
                  
                    if(childEl) {
                        const childElIndex = childEl.nodes.length === 0 ? 0 : childEl.nodes.length - 1;
                        if(_.has(childEl.nodes[childElIndex], 'text') && childEl.nodes[childElIndex].text === '') {
                            childEl.nodes[childElIndex].text = value;
                             childEl.nodes[childElIndex].object = 'text';
                        } else {
                            pEl.nodes[listIndex].nodes.push({
                                data: {},
                                type: 'listItemChild',
                                nodes: [textObj],
                                object: 'block'
                            })
                        }
                        
                    } else {
                        pEl.nodes[listIndex].nodes.push({
                            data: {},
                            type: 'listItemChild',
                            nodes: [textObj],
                            object: 'block'
                        })
                    }
                    

                } else if(pEl && _.has(pEl.nodes[pElIndex], 'marks') && pEl.nodes[pElIndex].marks.length > 0) {
                    pEl.nodes[pElIndex].text = value;
                } else {
                    pEl.nodes.push(textObj);
                }
            } else if(isList) {
                const listEl = parentEl.nodes[nodesIndex];
                if(listEl && _.has(listEl, 'marks')) {
                    listEl.text = value;
                } else if(listEl && listEl.nodes) {
                   listEl.nodes.push({
                    data: {},
                    type: 'listItemChild',
                    nodes: [textObj],
                    object: 'block'
                   })
                }
            } else if(_.has(parentEl.nodes[nodesIndex], 'marks') && parentEl.nodes[nodesIndex].marks.length > 0 && parentEl.nodes[nodesIndex].text === '') {
                parentEl.nodes[nodesIndex].text = value;
            } else if(_.has(parentEl.nodes[nodesIndex], 'data') && _.has(parentEl.nodes[nodesIndex].data, 'href') && parentEl.nodes[nodesIndex].nodes[0].text === '') {
                parentEl.nodes[nodesIndex].nodes[0].text = value;
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