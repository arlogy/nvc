/*
 https://github.com/arlogy/nvc
 Released under the MIT License (see LICENSE file)
 Copyright (c) 2022 https://github.com/arlogy
*/

const assert = require('assert');
const { randomUUID } = require('crypto');

// checks that the expected JavaScript events have been registered or removed
// using addEventListener() or removeEventListener(); for your information, the
// name of this function is an abbreviation of "check add/remove event listener
// arguments"
//     - listenersManager: the function whose calls are to be checked and which
//       is used to add/remove event listeners; should be a sinon fake/spy/stub
//     - firstArgs: array containing the first argument passed to listenersManager
//       for each call
// e.g. `const addEventListener = sinon.spy(window, 'addEventListener');`
//      `checkAddRemEvtArgs(addEventListener, ['load']); // syntax 1`
//      `checkAddRemEvtArgs(window.addEventListener, ['load']); // syntax 2`
const checkAddRemEvtArgs = (listenersManager, firstArgs) => {
    assert.strictEqual(listenersManager.callCount, firstArgs.length);
    for(let i = 0; i < firstArgs.length; i++) {
        const call = listenersManager.getCall(i);
        assert.strictEqual(call.args.length, 2);
        assert.strictEqual(call.args[0], firstArgs[i]);
        assert.strictEqual(typeof call.args[1], 'function');
    }
};

// removes the JavaScript event listeners registered on an object using addEventListener()
//     - obj: the object for which event listeners are to be removed; must have
//       the addEventListener() and removeEventListener() functions, each being
//       a sinon fake/spy/stub
//     - evtNames: optional array of event names to remove; when not provided,
//       all registered events are removed
const remEvtLstnrs = (obj, evtNames) => {
    for(const call of obj.addEventListener.getCalls()) {
        if(!evtNames || evtNames.includes(call.args[0])) {
            obj.removeEventListener(call.args[0], call.args[1]);
        }
    }
};

// returns an arbitrary unique value that we don't care what it is
const dummy = () => 'dummy-' + randomUUID();

// value for optional parameters; used when a parameter is optional but passed
// to a function to allow generic test cases:
//     e.g. `for(const val of [optParamVal, null]) { doSomething(); myFunc(val); }`
//     instead of `doSomething(); myFunc(); doSomething(); myFunc(null);`
const optParamVal = undefined;

// values that can be used when an input similar to the JSON.stringify() space
// parameter is needed
const jsonStringifyIndents = Object.freeze([
    optParamVal, null,
    -2, 2, 11,
    '', '  ', ' '.repeat(11),
]);

module.exports = {
    checkAddRemEvtArgs,
    dummy,
    jsonStringifyIndents,
    optParamVal,
    remEvtLstnrs,
};
