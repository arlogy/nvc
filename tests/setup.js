/*
 https://github.com/arlogy/nvc
 Released under the MIT License (see LICENSE file)
 Copyright (c) 2022 https://github.com/arlogy
*/

// first define the Jsu object so that it can be referenced as needed
if(!global.Jsu) global.Jsu = {};

const requireNvcCore = () => {
    if(!Jsu.Common) Jsu.Common = require('../src/jsu_common.js');
    if(!Jsu.Event) Jsu.Event = require('../src/jsu_event.js');
    if(!Jsu.Latex) Jsu.Latex = require('../src/jsu_latex.js');
    require('../src/nvc.js');
};

const requireNvcFsm = () => {
    requireNvcCore();
    if(!Jsu.Common) Jsu.Common = require('../src/jsu_common.js');
    if(!Jsu.CsvParser) Jsu.CsvParser = require('../src/jsu_csv_parser.js');
    if(!Jsu.Latex) Jsu.Latex = require('../src/jsu_latex.js');
    require('../src/nvc_fsm.js');
};

const loadNvcScript = (scriptId) => {
    switch(scriptId) {
        case 'core': requireNvcCore(); break;
        case 'fsm': requireNvcFsm(); break;
        default: throw new RangeError('Unable to load Nvc script with ID "' + scriptId + '"');
    }
    return backupNvc();
};

const cloneCustomImpl = (value, cache) => { // designed for cloneGetSet()
    const copy = {};
    cache.add(value, copy); // cache data before the recursive Jsu.Common.cloneDeep() calls below
    for(const prop in value) {
        const desctor = Object.getOwnPropertyDescriptor(value, prop);
        if(desctor !== undefined && (desctor.get || desctor.set)) { // accessor descriptor
            Object.defineProperty(copy, prop, desctor);
            if(desctor.get) {
                // "value[prop]" is similar but more concise than "desctor.get.apply(value)"
                copy[prop + '_getterInitialValue_fkqh7NvXjG'] = Jsu.Common.cloneDeep(value[prop], cache, cloneCustomImpl);
            }
        }
        else {
            copy[prop] = Jsu.Common.cloneDeep(value[prop], cache, cloneCustomImpl);
        }
    }
    return copy;
};
// clones object while preserving get/set accessors; this is one possible
// implementation
const cloneGetSet = (obj) => Jsu.Common.cloneDeep(obj, null, cloneCustomImpl);

// removes extra properties added to an object created using cloneGetSet()
const rmExtraGetSetProps = (obj) => {
    for(const prop in obj) {
        if(prop.indexOf('_getterInitialValue_fkqh7NvXjG') !== -1) {
            delete obj[prop];
        }
        else {
            const val = obj[prop];
            if(typeof val === 'object' && val !== null) rmExtraGetSetProps(val);
        }
    }
};

// restores properties from backup to target where backup is a clone (and a
// backup) of target created using cloneGetSet(target)
const restoreGetSet = (backup, target) => {
    for(const prop in target) {
        const desctor = Object.getOwnPropertyDescriptor(target, prop);
        const cond1 = !!(desctor !== undefined && desctor.get); // check desctor.get according to cloneGetSet()
        const cond2 = prop + '_getterInitialValue_fkqh7NvXjG' in backup;
        if(cond1 !== cond2) {
            throw new Error(`Incompatible data for property '${prop}'`); // inconsistency between cloneGetSet() and restoreGetSet()
        }
        else {
            if(cond1 && cond2) {
                target[prop] = cloneGetSet(backup[prop + '_getterInitialValue_fkqh7NvXjG']);
                rmExtraGetSetProps(target[prop]);
            }
            else {
                target[prop] = cloneGetSet(backup[prop]);
                rmExtraGetSetProps(target[prop]);
                restoreGetSet(backup[prop], target[prop]); // restore properties recursively
            }
        }
    }
};

// Nvc properties are mostly accessor properties (i.e. get/set functions) around
// real internal values. These properties cannot be faked using sinon.stub(),
// sinon.stub().value() or sinon.replaceGetter() (see sinon sandboxes) for
// example. Therefore, we will explicitly override said properties as follows,
// and we will restore them after each test case using the NvcBackup variable.
//     - Nvc.myProp1.myProp2.myPropN = myVal;
//           that's how we will stub Nvc properties
//     - Nvc.myProp1.myProp2.myPropN = sinon.stub().callsFake(NvcBackup.myProp1.myProp2.myPropN);
//           this is another approach when we want a function to call its
//           original implementation
let NvcBackup = {};

const backupNvc = () => { NvcBackup = cloneGetSet(Nvc); return NvcBackup; };

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
    restoreGetSet(NvcBackup, Nvc);
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
    loadNvcScript,
    _setCanvas,
    _setAlphabetContainer,
    _getNodes, _setNodes,
    _getLinks, _setLinks,
    _getTextItems, _setTextItems,
};
