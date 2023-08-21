/*
 https://github.com/arlogy/nvc
 Released under the MIT License (see LICENSE file)
 Copyright (c) 2023 https://github.com/arlogy
*/

const {loadNvcScript, _setAlphabetContainer} = require('./setup.js');
loadNvcScript('core');

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const readFile = async (fname) => {
    return (
        await fs.promises.readFile(fname, { encoding:'utf8' })
    ).replace(/\r\n/g, '\n');
};

(function() {
    const samplePath = path.join(__dirname, '/../doc/examples');
    assert.strictEqual(fs.existsSync(samplePath), true);

    (function() {
        describe('sample FSM data files', () => {
            const dirPath = `${samplePath}/fsm_data`;
            const fileNames = ['01.json', '02.json', '03_colored_items.json'];
            it('should be available', () => {
                assert.strictEqual(fs.existsSync(dirPath), true);
                assert.deepStrictEqual(fs.readdirSync(dirPath), fileNames);
            });
            it('should contain up-to-date JSON according to latest export rules', async () => {
                for(const fname of fileNames) {
                    // import JSON data into nvc
                    const fileContent = await readFile(`${dirPath}/${fname}`);
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
                assert.deepStrictEqual(fs.readdirSync(dirPath), fileNames);
            });
            it('should contain the same How-To section', async () => {
                // we check this because the HTML pages are not automatically generated (to integrate the How-To section for example)
                const howToPath = path.join(__dirname, '/nvc_examples.data.howTo.html');
                const howToStr = await readFile(howToPath);
                for(const fname of fileNames) {
                    const fileContent = await readFile(`${dirPath}/${fname}`);
                    assert.strictEqual(fileContent.indexOf(howToStr) !== -1, true);
                }
            });
        });
    })();
})();
