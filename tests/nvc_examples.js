/*
 https://github.com/arlogy/nvc
 Released under the MIT License (see LICENSE file)
 Copyright (c) 2023 https://github.com/arlogy
*/

const {loadNvcScript, _setAlphabetContainer} = require('./setup.js');
loadNvcScript('core');
const {getExampleHtml} = require('./utils_gen_html_example.js');

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const readFileSync = (fname) => {
    return fs.readFileSync(fname, { encoding:'utf8' }).replace(/\r\n/g, '\n');
};

(function() {
    const samplePath = path.join(__dirname, '/../examples');
    assert.strictEqual(fs.existsSync(samplePath), true);

    (function() {
        describe('sample FSM data files', () => {
            const dirPath = `${samplePath}/fsm_data`;
            const fileNames = ['01.json', '02.json', '03_colored_items.json'];
            it('should be available', () => {
                assert.strictEqual(fs.existsSync(dirPath), true);
                assert.deepStrictEqual(fs.readdirSync(dirPath), fileNames);
            });
            it('should contain up-to-date JSON according to latest export rules', () => {
                for(const fname of fileNames) {
                    // import JSON data into nvc
                    const fileContent = readFileSync(`${dirPath}/${fname}`);
                    _setAlphabetContainer({});
                    Nvc.loadJsonString(fileContent, (e) => { throw e; });
                    // export JSON data from nvc and compare to imported one
                    assert.deepStrictEqual(Nvc.fetchJsonString(4) + '\n', fileContent);
                }
            });
        });
    })();

    (function() {
        describe('sample HTML files', () => {
            const dirPath = `${samplePath}/html_pages`;
            const fileNames = ['01_basic.html', '02_advanced.html'];
            it('should be available', () => {
                assert.strictEqual(fs.existsSync(dirPath), true);
                assert.deepStrictEqual(
                    fs.readdirSync(dirPath).filter(x => x !== 'api_files'), // ignore auto-generated directory
                    fileNames
                );
            });
            it('should contain the expected content', () => {
                // help detect changes made to an HTML example file that should be reproduced in the other files, among other possibilities
                // also note that '--reporter-option maxDiffSize=0' is passed to mocha when running this script, so that diffs are not truncated when large strings fail to match
                assert.deepStrictEqual(getExampleHtml('HTML_EXAMPLE_BASIC'), readFileSync(`${dirPath}/${fileNames[0]}`));
                assert.deepStrictEqual(getExampleHtml('HTML_EXAMPLE_ADVANCED'), readFileSync(`${dirPath}/${fileNames[1]}`));
                assert.strictEqual(fileNames.length, 2); // will fail when files are added or deleted
            });
        });
    })();
})();
