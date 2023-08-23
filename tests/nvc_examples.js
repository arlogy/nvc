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
    const samplePath = path.join(__dirname, '/../examples');
    assert.strictEqual(fs.existsSync(samplePath), true);

    // note that we use '\\' instead of '\' in howToStr
    const howToStr = `
        <div id="elt_how_to" style="display: none;">
            <p>
                Use the white box below (aka the canvas) to draw networks and such.
                Automatic backup/restore is enabled for most browsers unless cookies are blocked.
            </p>
            <ul>
                <li><b class="shallow">Add a node:</b> double-click on an empty area in the canvas.</li>
                <li><b class="shallow">Add an arrow:</b> shift-drag on the canvas from a node or an empty area.</li>
                <li><b class="shallow">Move something:</b> drag it around; also do this to change the angle or direction of an arrow.</li>
                <li><b class="shallow">Move all nodes and arrows:</b> drag an empty area in the canvas.</li>
                <li><b class="shallow">Delete something:</b> click it and press the delete key (not the backspace key).</li>
                <li><b class="shallow">Resize selected node:</b> shift-scroll on the canvas; use the keyboard shortcut <i>Shift+Enter</i> to reset the size.</li>
            </ul>
            <ul>
                <li><b class="shallow">Type a numeric subscript:</b> put an underscore before each digit (e.g. S_0_9).</li>
                <li><b class="shallow">Type a Greek letter:</b> put a backslash before it (e.g. \\beta or \\Beta).</li>
                <li><b class="shallow">Move text cursor when visible:</b> use left/right arrow keys; home/end keys move the cursor to the beginning or end.</li>
                <li><b class="shallow">Add a text item:</b> double-click on an empty area in the canvas while holding down the <i>Ctrl</i> key.</li>
            </ul>
            <ul>
                <li><b class="shallow">Make initial state in FSM:</b> add the appropriate arrow.</li>
                <li><b class="shallow">Make accept state in FSM:</b> double-click on an existing state.</li>
                <li><b class="shallow">Set FSM alphabet or transition input:</b> enter a comma-separated value (e.g. a, 0, \\alpha, "\\gamma", _0, " ", ",", """", ');
                the comma character possibly followed by a maximum of four spaces are the field separators;
                a double quote inside a field enclosed with double quotes must be escaped by preceding it with another double quote (hence """" instead of """);
                characters that cannot be typed in the canvas are ignored.</li>
            </ul>
            <ul>
                <li><b class="shallow">Set arrow-head at source node for digraphs:</b> double-click on an arrow joining two distinct nodes.</li>
            </ul>
        </div>`;

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
        describe("sample HTML files (try 'npm run examples:html:about' for possible troubleshooting in case of failure)", () => {
            const dirPath = `${samplePath}/html_pages`;
            const fileNames = ['01_basic.html', '02_advanced.html'];
            it('should be available', () => {
                assert.strictEqual(fs.existsSync(dirPath), true);
                assert.deepStrictEqual(fs.readdirSync(dirPath), [...fileNames, 'api_deps']);
            });
            it('should contain the same How-To section', async () => {
                // we check this because the HTML pages are not generated using additional entries such as the How-To section (as this is not necessary)
                for(const fname of fileNames) {
                    const fileContent = await readFile(`${dirPath}/${fname}`);
                    assert.strictEqual(fileContent.indexOf(howToStr) !== -1, true);
                }
            });
            it('should refer to latest dependencies', async () => {
                const depsPath = `${dirPath}/api_deps`; // dependencies path
                const fileNames = ['jsu_common.js', 'jsu_csv_parser.js', 'jsu_event.js', 'jsu_latex.js'];
                assert.strictEqual(fs.existsSync(depsPath), true);
                assert.deepStrictEqual(fs.readdirSync(depsPath), fileNames);
                const jsuSrcPath = path.join(__dirname, '/../node_modules/jsupack/src');
                for(const fname of fileNames) {
                    const actualFileContent = await readFile(`${depsPath}/${fname}`);
                    const expectedFileContent = await readFile(`${jsuSrcPath}/${fname}`);
                    assert.deepStrictEqual(actualFileContent, expectedFileContent);
                }
            });
        });
    })();
})();
