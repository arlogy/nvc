/*
 https://github.com/arlogy/nvc
 Released under the MIT License (see LICENSE file)
 Copyright (c) 2022 https://github.com/arlogy
*/

const { randomUUID } = require('crypto');

// returns an arbitrary unique value that we don't care what it is
const dummy = () => 'dummy-' + randomUUID();

// value used when a parameter is optional but passed to a function to allow
// generic test cases: e.g. `for(const val of [optParamVal, null]) { doSomething(); myFunc(val); }`
// instead of `doSomething(); myFunc(); doSomething(); myFunc(null);`
const optParamVal = undefined;

// possible values when an input similar to the JSON.stringify() space parameter
// is needed
const jsonStringifyIndents = [optParamVal, null, '', -2, 2, '  '];

module.exports = {
    dummy,
    optParamVal,
    jsonStringifyIndents,
};
