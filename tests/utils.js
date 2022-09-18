/*
 https://github.com/arlogy/nvc
 Released under the MIT License (see LICENSE file)
 Copyright (c) 2022 https://github.com/arlogy
*/

const { randomUUID } = require('crypto');

// returns an arbitrary unique value that we don't care what it is
const dummy = () => 'dummy-' + randomUUID();

module.exports = {
    dummy,
};
