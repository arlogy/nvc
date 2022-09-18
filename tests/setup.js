/*
 https://github.com/arlogy/nvc
 Released under the MIT License (see LICENSE file)
 Copyright (c) 2022 https://github.com/arlogy
*/

if(!global.Jsu) {
    global.Jsu = {}; // define Jsu first so that each required script can reference it as needed
    const Jsu = global.Jsu;
    Jsu.Common = require('../src/jsu_common.js');
    Jsu.CsvParser = require('../src/jsu_csv_parser.js');
    Jsu.Event = require('../src/jsu_event.js');
    Jsu.Latex = require('../src/jsu_latex.js');
}
require('../src/nvc.js');

// Nvc properties are mostly accessor properties (i.e. get/set functions) around
// real internal values. These properties cannot be faked using sinon.stub(),
// sinon.stub().value() or sinon.replaceGetter() (see sinon sandboxes) for
// example. Therefore, we will explicitly override said properties as follows,
// and we will restore them after each test case using the NvcBackup variable.
//     - Nvc.myProp = myVal;
//           that's how we will stub Nvc properties
//     - Nvc.myProp = sinon.stub().callsFake(NvcBackup.myProp);
//           another approach when we want a function to call its original
//           version
const NvcBackup = Jsu.Common.cloneDeep(Nvc);

const _setCanvas = (val) => { Nvc.setCanvasObj(val); };

const _setAlphabetContainer = (val) => { Nvc.setFsmAlphabetContainerObj(val); };

const _getNodes = () => Nvc.getData().nodes;
const _setNodes = (array) => {
    const nodes = Nvc.getData().nodes;
    nodes.splice(0);
    nodes.push(...array);
};

const _getLinks = () => Nvc.getData().links;
const _setLinks = (array) => {
    const links = Nvc.getData().links;
    links.splice(0);
    links.push(...array);
};

const _getTextItems = () => Nvc.getData().textItems;
const _setTextItems = (array) => {
    const links = Nvc.getData().textItems;
    links.splice(0);
    links.push(...array);
};

const restoreNvc = () => {
    for(const prop in NvcBackup)
        Nvc[prop] = NvcBackup[prop];
    // prevent a test from passing or failing due to values set by a previous test
    _setCanvas(null);
    _setAlphabetContainer(null);
    _setNodes([]);
    _setLinks([]);
    _setTextItems([]);
};

const sinon = require('sinon');
afterEach(() => {
    sinon.restore(); // restore the default sandbox to prevent memory leak
    restoreNvc();
});

module.exports = {
    NvcBackup,
    _setCanvas,
    _setAlphabetContainer,
    _getNodes, _setNodes,
    _getLinks, _setLinks,
    _getTextItems, _setTextItems,
};
