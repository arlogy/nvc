/*
 https://github.com/arlogy/nvc
 Released under the MIT License (see LICENSE file)
 Copyright (c) 2023 https://github.com/arlogy
*/

const {loadNvcScript} = require('./setup.js');
loadNvcScript('quick');
const {checkAddRemEvtArgs, dummy, optParamVal, remEvtLstnrs} = require('./utils.js');

const assert = require('assert');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const sinon = require('sinon');

(function() {
    const dom = new JSDOM('<!DOCTYPE html><html></html>');
    global.window = dom.window;
    global.document = dom.window.document;

    const JsuCmn = Jsu.Common;
    const JsuLtx = Jsu.Latex;

    const setOutput = (elt) => { // sets output element
        const getElementById = sinon.stub(document, 'getElementById').returns(elt);
        assert.strictEqual(Nvc.quick.setOutput(), true); // also make sure the operation succeeded
        getElementById.restore();
    };

    (function() {
        describe('bootstrap()', () => {
            const checkImpl = (canvasId, outputId, options, setOutputSucceeded, startNvcSucceeded) => {
                let startOptions = undefined;
                let beforeStart = undefined;
                let onFailure = Nvc.quick.defaultAlert;
                let onLoad = undefined;
                let onResize = undefined;
                if(options) {
                    if('startOptions' in options) startOptions = options.startOptions = {fsmAlphabetContainer:dummy()};
                    if('beforeStart' in options) beforeStart = options.beforeStart = sinon.fake();
                    if('onFailure' in options) onFailure = options.onFailure = dummy();
                    if('onLoad' in options) onLoad = options.onLoad = sinon.fake();
                    if('onResize' in options) onResize = options.onResize = sinon.fake();
                }
                const addEventListener = sinon.spy(window, 'addEventListener');
                const setOutput = Nvc.quick.setOutput = sinon.fake.returns(setOutputSucceeded);
                const startNvc = Nvc.quick.startNvc = sinon.fake.returns(startNvcSucceeded);
                const tieFsmAlphabetContainerToCanvas = Nvc.tieFsmAlphabetContainerToCanvas = sinon.fake();
                const installOutputFocusListeners = Nvc.quick.installOutputFocusListeners = sinon.fake();
                Nvc.quick.bootstrap(canvasId, outputId, options);
                checkAddRemEvtArgs(addEventListener, ['load']);
                // check data related to the 'load' event, but before it is dispatched
                assert.strictEqual(setOutput.called, false);
                if(beforeStart) assert.strictEqual(beforeStart.called, false);
                assert.strictEqual(startNvc.called, false);
                assert.strictEqual(addEventListener.callCount, 1);
                assert.strictEqual(installOutputFocusListeners.called, false);
                if(onLoad) assert.strictEqual(onLoad.called, false);
                // check data related to the 'load' event, but after it is dispatched
                window.dispatchEvent(new window.Event('load')); // the event is unregistered later so that it is not dispatched more than once when checkImpl() is called
                assert.strictEqual(setOutput.calledOnceWithExactly(outputId, onFailure), true);
                if(setOutput.getCall(0).returnValue) {
                    if(beforeStart) {
                        assert.strictEqual(beforeStart.calledOnceWithExactly(), true);
                        assert.strictEqual(beforeStart.calledAfter(setOutput), true);
                        assert.strictEqual(beforeStart.calledBefore(startNvc), true);
                    }
                    assert.strictEqual(startNvc.calledOnceWithExactly(canvasId, startOptions, onFailure), true);
                    if(startNvc.getCall(0).returnValue) {
                        checkAddRemEvtArgs(addEventListener, ['load', 'resize']);
                        assert.strictEqual(addEventListener.calledAfter(startNvc), true)
                        // check data related to the 'resize' event, but before it is dispatched
                        assert.strictEqual(tieFsmAlphabetContainerToCanvas.called, false);
                        if(onResize) assert.strictEqual(onResize.called, false);
                        // check data related to the 'resize' event, but after it is dispatched
                        window.dispatchEvent(new window.Event('resize')); // the event is unregistered later so that it is not dispatched more than once when checkImpl() is called
                        assert.strictEqual(tieFsmAlphabetContainerToCanvas.calledOnceWithExactly(startOptions ? startOptions.fsmAlphabetContainer : undefined), true);
                        if(onResize) {
                            assert.strictEqual(onResize.calledOnceWithExactly(), true);
                            assert.strictEqual(onResize.calledAfter(tieFsmAlphabetContainerToCanvas), true);
                        }
                        // other checks
                        assert.strictEqual(installOutputFocusListeners.calledOnceWithExactly(), true);
                        const lastFunc = installOutputFocusListeners; // last function called at this point
                        if(onLoad) {
                            assert.strictEqual(onLoad.calledOnceWithExactly(), true);
                            assert.strictEqual(onLoad.calledAfter(lastFunc), true);
                        }
                    }
                }
                // ...
                remEvtLstnrs(window);
                addEventListener.restore();
            };
            it('should behave as expected', () => {
                const canvasId = dummy();
                const outputId = dummy();
                for(const options of [
                    optParamVal, null,
                    {}, {startOptions:null}, {beforeStart:null}, {onFailure:null}, {onLoad:null}, {onResize:null},
                    {startOptions:null, beforeStart:null, onFailure:null, onLoad:null, onResize:null},
                ]) {
                    for(const setOutputSucceeded of [true, false]) {
                        for(const startNvcSucceeded of [true, false]) {
                            checkImpl(canvasId, outputId, options, setOutputSucceeded, startNvcSucceeded);
                        }
                    }
                }
            });
        });
    })();

    (function() {
        describe('startNvc()', () => {
            const checkImpl = (canvasId, options, onFailure, startSucceeded) => {
                let realFailure = null
                if(!onFailure) realFailure = Nvc.quick.defaultAlert = sinon.fake();
                else realFailure = onFailure;
                const getElementById = sinon.stub(document, 'getElementById').callsFake(() => dummy());
                const start = Nvc.start = sinon.fake.returns(startSucceeded);
                const retVal = Nvc.quick.startNvc(canvasId, options, onFailure);
                assert.strictEqual(getElementById.calledTwice, true);
                assert.deepStrictEqual(getElementById.getCall(0).args, [canvasId]);
                assert.deepStrictEqual(getElementById.getCall(1).args, [canvasId + '_fsm_alphabet']);
                assert.strictEqual(start.calledOnceWithExactly(getElementById.getCall(0).returnValue, getElementById.getCall(1).returnValue, options), true);
                if(start.getCall(0).returnValue) {
                    assert.strictEqual(realFailure.called, false);
                }
                else {
                    assert.strictEqual(realFailure.calledOnceWithExactly(`Failed to start nvc with canvas ID "${canvasId}"`), true);
                    assert.strictEqual(realFailure.calledAfter(start), true);
                }
                assert.deepStrictEqual(retVal, start.getCall(0).returnValue);
                getElementById.restore();
            }
            it('should behave as expected', () => {
                const canvasId = dummy();
                const options = dummy();
                for(const onFailure of [optParamVal, sinon.fake()]) {
                    for(const startSucceeded of [true, false]) {
                        checkImpl(canvasId, options, onFailure, startSucceeded);
                    }
                }
            });
        });
    })();

    (function() {
        const repeat = 5;

        describe('installOutputFocusListeners()', () => {
            afterEach(() => {
                // runs once after each test in this block
                Nvc.quick.revertOutputFocusListeners();
                setOutput(dummy());
            });
            it('should install expected events accordingly', () => {
                sinon.spy(window, 'addEventListener');
                sinon.spy(window, 'removeEventListener');
                const checkImpl = (outputElt) => {
                    checkAddRemEvtArgs(window.addEventListener, ['keydown', 'keyup']);
                    checkAddRemEvtArgs(window.removeEventListener, []);
                    checkAddRemEvtArgs(outputElt.addEventListener, ['blur']);
                    checkAddRemEvtArgs(outputElt.removeEventListener, []);
                };
                // check expectations, making sure they are preserved even after several calls to installOutputFocusListeners()
                const outputElt = {addEventListener:sinon.fake(), removeEventListener:sinon.fake()};
                setOutput(outputElt);
                for(let i = 0; i < repeat; i++) {
                    Nvc.quick.installOutputFocusListeners();
                    checkImpl(outputElt);
                }
            });
            it('should handle Ctrl + Space combination accordingly', () => {
                const outputElt = {addEventListener:sinon.fake(), removeEventListener:sinon.fake()};
                const switchOutputFocus = Nvc.quick.switchOutputFocus = sinon.fake();
                setOutput(outputElt);
                Nvc.quick.installOutputFocusListeners();
                const down = (keyCode) => window.dispatchEvent(new window.KeyboardEvent('keydown', {keyCode}));
                const up = (keyCode) => window.dispatchEvent(new window.KeyboardEvent('keyup', {keyCode}));
                const Ctrl = 17, Space = 32;
                const checkKeys = (complete) => { // checks expectations based on key combination
                                                  //     - complete: indicates whether Ctrl + Space key combination has been matched
                    if(complete) {
                        assert.strictEqual(switchOutputFocus.calledOnceWithExactly(), true);
                    }
                    else {
                        assert.strictEqual(switchOutputFocus.called, false);
                    }
                    switchOutputFocus.resetHistory();
                };
                down(Ctrl); // Ctrl key down
                up(Ctrl); // Ctrl key up
                up(Space); // Space key up (but will be ignored)
                checkKeys(false);
                down(Ctrl); // Ctrl key down
                up(Space); // Space key up (and will be taken into account)
                checkKeys(true);
                for(let i = 0; i < repeat; i++) {
                    up(Space); // Space key up (and will be taken into account)
                    checkKeys(true);
                }
                up(Ctrl); // Ctrl key up
                up(Space); // Space key up (but will be ignored)
                checkKeys(false);
            });
        });

        describe('revertOutputFocusListeners()', () => {
            afterEach(() => {
                // runs once after each test in this block
                setOutput(dummy());
            });
            it('should do nothing when installOutputFocusListeners() was not called first', () => {
                sinon.spy(window, 'addEventListener');
                sinon.spy(window, 'removeEventListener');
                const checkImpl = (outputElt) => {
                    checkAddRemEvtArgs(window.addEventListener, []);
                    checkAddRemEvtArgs(window.removeEventListener, []);
                    checkAddRemEvtArgs(outputElt.addEventListener, []);
                    checkAddRemEvtArgs(outputElt.removeEventListener, []);
                };
                // check expectations, making sure they are preserved even after several calls to revertOutputFocusListeners()
                const outputElt = {addEventListener:sinon.fake(), removeEventListener:sinon.fake()};
                setOutput(outputElt);
                for(let i = 0; i < repeat; i++) {
                    Nvc.quick.revertOutputFocusListeners();
                    checkImpl(outputElt);
                }
            });
            it('should uninstall expected events accordingly otherwise', () => {
                sinon.spy(window, 'addEventListener');
                sinon.spy(window, 'removeEventListener');
                const checkImpl = (outputElt) => {
                    checkAddRemEvtArgs(window.addEventListener, []);
                    checkAddRemEvtArgs(window.removeEventListener, ['keydown', 'keyup']);
                    checkAddRemEvtArgs(outputElt.addEventListener, []);
                    checkAddRemEvtArgs(outputElt.removeEventListener, ['blur']);
                };
                // check expectations, making sure they are preserved even after several calls to revertOutputFocusListeners()
                const outputElt = {addEventListener:sinon.fake(), removeEventListener:sinon.fake()};
                setOutput(outputElt);
                Nvc.quick.installOutputFocusListeners();
                for(const obj of [window, outputElt]) { // clear data related to the above installation
                    obj.addEventListener.resetHistory();
                    obj.removeEventListener.resetHistory();
                }
                for(let i = 0; i < repeat; i++) {
                    Nvc.quick.revertOutputFocusListeners();
                    checkImpl(outputElt);
                }
            });
        });
    })();

    (function() {
        describe('clearData()', () => {
            const checkImpl = (confirmCallback, confirmRetVal) => {
                let realConfirm = null;
                if(!confirmCallback) realConfirm = Nvc.quick.defaultConfirm = sinon.fake.returns(confirmRetVal);
                else realConfirm = confirmCallback = sinon.fake.returns(confirmRetVal);
                const clear = Nvc.clear = sinon.fake();
                Nvc.quick.clearData(confirmCallback);
                assert.strictEqual(realConfirm.calledOnceWithExactly('Do you really want to clear all data?'), true);
                if(realConfirm.getCall(0).returnValue) {
                    assert.strictEqual(clear.calledOnceWithExactly(), true);
                    assert.strictEqual(clear.calledAfter(realConfirm), true);
                }
                else {
                    assert.strictEqual(clear.called, false);
                }
            };
            it('should behave as expected', () => {
                for(const confirmCallback of [optParamVal, dummy()]) {
                    for(const confirmRetVal of [true, false]) {
                        checkImpl(confirmCallback, confirmRetVal);
                    }
                }
            });
        });
    })();

    (function() {
        describe('switchConfig()', () => {
            it('should behave as expected', () => {
                const type = dummy();
                const setConfigFor = Nvc.setConfigFor = sinon.fake();
                const restoreBackup = Nvc.restoreBackup = sinon.fake();
                const autoBackupId = dummy();
                sinon.stub(Nvc.config.global, 'autoBackupId').value(autoBackupId);
                Nvc.quick.switchConfig(type);
                assert.strictEqual(setConfigFor.calledOnceWithExactly(type), true);
                assert.strictEqual(restoreBackup.calledOnceWithExactly(autoBackupId), true);
            });
        });
    })();

    (function() {
        describe('defaultAlert()', () => {
            it('should behave as expected', () => {
                const message = dummy();
                for(const sideNode of [optParamVal, dummy()]) {
                    const alert = sinon.stub(window, 'alert');
                    Nvc.quick.defaultAlert(message, sideNode);
                    const finalMsg = message + (sideNode ? `\n\n${sideNode}` : '');
                    assert.strictEqual(alert.calledOnceWithExactly(finalMsg), true);
                    alert.restore();
                }
            });
        });
    })();

    (function() {
        describe('defaultAlertStatus()', () => {
            it('should behave as expected', () => {
                const message = dummy();
                const sideNode = dummy();
                for(const success of [true, false]) {
                    const defaultAlert = Nvc.quick.defaultAlert = sinon.spy();
                    Nvc.quick.defaultAlertStatus(success, message, sideNode);
                    const finalMsg = (success ? '[success]' : '[failure]') + ` ${message}`;
                    assert.strictEqual(defaultAlert.calledOnceWithExactly(finalMsg, sideNode), true);
                }
            });
        });
    })();

    (function() {
        describe('defaultConfirm()', () => {
            it('should behave as expected', () => {
                const message = dummy();
                const confirm = sinon.stub(window, 'confirm');
                Nvc.quick.defaultConfirm(message);
                assert.strictEqual(confirm.calledOnceWithExactly(message), true);
            });
        });
    })();

    (function() {
        describe('setOutput()', () => {
            it('should behave as expected', () => {
                const id = dummy();
                for(const onFailure of [optParamVal, sinon.fake()]) {
                    for(const eltFound of [true, false]) {
                        let realFailure = null;
                        if(!onFailure) realFailure = Nvc.quick.defaultAlert = sinon.fake();
                        else realFailure = onFailure;
                        const getElementById = sinon.stub(document, 'getElementById').returns(eltFound ? dummy() : null);
                        const retVal = Nvc.quick.setOutput(id, onFailure);
                        assert.strictEqual(getElementById.calledOnceWithExactly(id), true);
                        if(getElementById.getCall(0).returnValue) {
                            assert.strictEqual(realFailure.called, false);
                        }
                        else {
                            assert.strictEqual(realFailure.calledOnceWithExactly(`Failed to set output element from ID "${id}"`), true);
                            assert.strictEqual(realFailure.calledAfter(getElementById), true);
                        }
                        assert.deepStrictEqual(retVal, !!getElementById.getCall(0).returnValue);
                        getElementById.restore();
                    }
                }
            });
        });
    })();

    (function() {
        describe('isOutputVisible()', () => {
            afterEach(() => {
                // runs once after each test in this block
                setOutput(dummy());
            });
            it('should behave as expected', () => {
                const outputElt = dummy();
                const isEltVisible = sinon.stub(JsuCmn, 'isEltVisible').returns(dummy());
                setOutput(outputElt);
                const retVal = Nvc.quick.isOutputVisible();
                assert.strictEqual(isEltVisible.calledOnceWithExactly(outputElt), true);
                assert.deepStrictEqual(retVal, isEltVisible.getCall(0).returnValue);
            });
        });
    })();

    (function() {
        describe('setOutputVisible()', () => {
            afterEach(() => {
                // runs once after each test in this block
                setOutput(dummy());
            });
            it('should behave as expected', () => {
                const visible = dummy();
                const outputElt = dummy();
                const setEltVisible = sinon.stub(JsuCmn, 'setEltVisible');
                setOutput(outputElt);
                Nvc.quick.setOutputVisible(visible);
                assert.strictEqual(setEltVisible.calledOnceWithExactly(outputElt, visible, 'block'), true);
            });
        });
    })();

    (function() {
        describe('updateOutputFocus()', () => {
            let outputElt_focusPreviousElt = null;
            const checkImpl = (outputVisible, outputElt, activeElt) => {
                const isOutputVisible = Nvc.quick.isOutputVisible = sinon.fake.returns(outputVisible);
                setOutput(outputElt);
                outputElt.focus.resetHistory();
                sinon.stub(document, 'activeElement').value(activeElt);
                Nvc.quick.updateOutputFocus();
                assert.strictEqual(isOutputVisible.calledOnceWithExactly(), true);
                if(isOutputVisible.getCall(0).returnValue) {
                    if(outputElt !== activeElt) {
                        outputElt_focusPreviousElt = activeElt; // save the element that currently has the focus, if any
                        assert.strictEqual(outputElt.focus.calledOnceWithExactly(), true);
                    }
                    else {
                        assert.strictEqual(outputElt.focus.called, false);
                    }
                }
                else {
                    assert.strictEqual(outputElt_focusPreviousElt.focus.calledOnceWithExactly(), true);
                    outputElt_focusPreviousElt = null;
                }
            };
            afterEach(() => {
                // runs once after each test in this block
                setOutput(dummy());
            });
            it('should behave as expected when output is visible', () => {
                const outputVisible = true;
                const outputElt = {focus:sinon.fake()};
                for(const activeElt of [{focus:sinon.fake()}, outputElt]) {
                    checkImpl(outputVisible, outputElt, activeElt);
                }
            });
            it('should behave as expected otherwise', () => {
                const outputVisible = false;
                const outputElt = {focus:sinon.fake()};
                const activeElt = dummy();
                checkImpl(outputVisible, outputElt, activeElt);
            });
        });
    })();

    (function() {
        describe('switchOutputVisibility()', () => {
            it('should behave as expected', () => {
                for(const outputVisible of [true, false]) {
                    const setOutputVisible = Nvc.quick.setOutputVisible = sinon.fake();
                    const isOutputVisible = Nvc.quick.isOutputVisible = sinon.fake.returns(outputVisible);
                    Nvc.quick.switchOutputVisibility();
                    assert.strictEqual(setOutputVisible.calledOnceWithExactly(!isOutputVisible.getCall(0).returnValue), true);
                }
            });
        });
    })();

    (function() {
        describe('switchOutputFocus()', () => {
            it('should behave as expected', () => {
                const switchOutputVisibility = Nvc.quick.switchOutputVisibility = sinon.fake();
                const updateOutputFocus = Nvc.quick.updateOutputFocus = sinon.fake();
                Nvc.quick.switchOutputFocus();
                assert.strictEqual(switchOutputVisibility.calledOnceWithExactly(), true);
                assert.strictEqual(updateOutputFocus.calledOnceWithExactly(), true);
            });
        });
    })();

    (function() {
        describe('getOutputValue() & setOutputValue()', () => {
            afterEach(() => {
                // runs once after each test in this block
                setOutput(dummy());
            });
            it('should behave as expected', () => {
                const outputVal = dummy();
                setOutput({});
                Nvc.quick.setOutputValue(outputVal);
                assert.deepStrictEqual(Nvc.quick.getOutputValue(), outputVal);
            });
        });
    })();

    (function() {
        describe('outputText()', () => {
            it('should behave as expected', () => {
                const text = dummy();
                const setOutputVisible = Nvc.quick.setOutputVisible = sinon.fake();
                const setOutputValue = Nvc.quick.setOutputValue = sinon.fake();
                Nvc.quick.outputText(text);
                assert.strictEqual(setOutputVisible.calledOnceWithExactly(true), true);
                assert.strictEqual(setOutputValue.calledOnceWithExactly(text), true);
            });
        });
    })();

    (function() {
        describe('outputJson()', () => {
            it('should behave as expected', () => {
                const indents = dummy();
                const fetchJsonString = Nvc.fetchJsonString = sinon.fake.returns(dummy());
                const outputText = Nvc.quick.outputText = sinon.fake();
                Nvc.quick.outputJson(indents);
                assert.strictEqual(fetchJsonString.calledOnceWithExactly(indents), true);
                assert.strictEqual(outputText.calledOnceWithExactly(fetchJsonString.getCall(0).returnValue), true);
            });
        });
    })();

    (function() {
        describe('outputPng()', () => {
            it('should behave as expected', () => {
                const createElement = sinon.stub(document, 'createElement').returns({click:sinon.fake(), remove:sinon.fake()});
                const fetchPngDataString = Nvc.fetchPngDataString = sinon.fake.returns(dummy());
                Nvc.quick.outputPng();
                assert.strictEqual(createElement.calledOnceWithExactly('a'), true);
                const obj = createElement.getCall(0).returnValue;
                assert.deepStrictEqual(obj.download, 'network.png');
                assert.strictEqual(fetchPngDataString.calledOnceWithExactly(), true);
                assert.deepStrictEqual(obj.href, fetchPngDataString.getCall(0).returnValue);
                assert.strictEqual(obj.click.calledOnceWithExactly(), true);
                assert.strictEqual(obj.remove.calledOnceWithExactly(), true);
                assert.strictEqual(obj.remove.calledAfter(obj.click), true);
                for(const prop of ['click', 'download', 'href', 'remove']) delete obj[prop];
                assert.deepStrictEqual(obj, {});
            });
        });
    })();

    (function() {
        describe('outputSvg()', () => {
            it('should behave as expected', () => {
                const indents = dummy();
                const fetchSvgString = Nvc.fetchSvgString = sinon.fake.returns(dummy());
                const outputText = Nvc.quick.outputText = sinon.fake();
                Nvc.quick.outputSvg(indents);
                assert.strictEqual(fetchSvgString.calledOnceWithExactly(indents), true);
                assert.strictEqual(outputText.calledOnceWithExactly(fetchSvgString.getCall(0).returnValue), true);
            });
        });
    })();

    (function() {
        describe('outputLatex()', () => {
            it('should behave as expected', () => {
                const fetchLatexString = Nvc.fetchLatexString = sinon.fake.returns(dummy());
                const outputText = Nvc.quick.outputText = sinon.fake();
                Nvc.quick.outputLatex();
                assert.strictEqual(fetchLatexString.calledOnceWithExactly(), true);
                assert.strictEqual(outputText.calledOnceWithExactly(fetchLatexString.getCall(0).returnValue), true);
            });
        });
    })();

    (function() {
        describe('outputFsmState()', () => {
            it('should behave as expected when model is valid', () => {
                const outputText = Nvc.quick.outputText = sinon.fake();
                Nvc.quick.outputFsmState({errors:[]});
                assert.strictEqual(outputText.calledOnceWithExactly('Finite state machine is valid'), true);
            });
            it('should behave as expected otherwise', () => {
                const model = {errors:[dummy(), '\\alpha s_0']};
                const outputText = Nvc.quick.outputText = sinon.fake();
                Nvc.quick.outputFsmState(model);
                let text = 'Finite state machine is not valid';
                for(const err of model.errors) {
                    text += `\n    - ${JsuLtx.convertLatexShortcuts(err)}`;
                }
                assert.strictEqual(outputText.calledOnceWithExactly(text), true);
            });
        });
    })();

    (function() {
        describe('outputFsmTransitionTableHtml()', () => {
            it('should behave as expected', () => {
                const model = dummy();
                const indents = dummy();
                const buildFsmTransitionTableHtml = Nvc.fsm.buildFsmTransitionTableHtml = sinon.fake.returns({table:dummy(), css:dummy()});
                const outputText = Nvc.quick.outputText = sinon.fake();
                Nvc.quick.outputFsmTransitionTableHtml(model, indents);
                assert.strictEqual(buildFsmTransitionTableHtml.calledOnceWithExactly(model, null, indents), true);
                const obj = buildFsmTransitionTableHtml.getCall(0).returnValue;
                assert.strictEqual(outputText.calledOnceWithExactly(`${obj.table}\n\n${obj.css}`), true);
            });
        });
    })();

    (function() {
        describe('loadJsonFromOutput()', () => {
            const checkImpl = (terminateCallback, outputVisible) => {
                let realTerminate = null;
                if(!terminateCallback) realTerminate = Nvc.quick.defaultAlertStatus = sinon.fake();
                else realTerminate = terminateCallback;
                const isOutputVisible = Nvc.quick.isOutputVisible = sinon.fake.returns(outputVisible);
                const switchOutputFocus = Nvc.quick.switchOutputFocus = sinon.fake();
                const getOutputValue = Nvc.quick.getOutputValue = sinon.fake.returns(dummy());
                const loadJsonString = Nvc.loadJsonString = sinon.fake();
                Nvc.quick.loadJsonFromOutput(terminateCallback);
                if(!isOutputVisible.getCall(0).returnValue) {
                    assert.strictEqual(switchOutputFocus.calledOnceWithExactly(), true);
                    assert.strictEqual(loadJsonString.called, false);
                }
                else {
                    assert.strictEqual(getOutputValue.calledOnceWithExactly(), true);
                    assert.strictEqual(loadJsonString.calledOnce, true);
                    assert.deepStrictEqual(loadJsonString.getCall(0).args.length, 3);
                    assert.deepStrictEqual(loadJsonString.getCall(0).args[0], getOutputValue.getCall(0).returnValue);
                    assert.deepStrictEqual(typeof loadJsonString.getCall(0).args[1], 'function');
                    assert.deepStrictEqual(typeof loadJsonString.getCall(0).args[2], 'function');
                    (function() {
                        let jsonFailedToParseCallback = loadJsonString.getCall(0).args[1];
                        const ex = dummy(); // exception
                        jsonFailedToParseCallback(ex);
                        assert.strictEqual(
                            realTerminate.calledOnceWithExactly(false, `JSON failed to parse with a ${ex}.`, 'Please perform a JSON export and try again.'),
                            true
                        );
                        realTerminate.resetHistory();
                        let jsonLoadedCallback = loadJsonString.getCall(0).args[2];
                        jsonLoadedCallback();
                        assert.strictEqual(
                            realTerminate.calledOnceWithExactly(true, `JSON loaded!`, 'Note that invalid items are ignored or adjusted when necessary.'),
                            true
                        );
                    })();
                }
            };
            it('should behave as expected', () => {
                for(const terminateCallback of [optParamVal, sinon.fake()]) {
                    for(const outputVisible of [true, false]) {
                        checkImpl(terminateCallback, outputVisible);
                    }
                }
            });
        });
    })();

    (function() {
        describe('buildAndSortFsmModel', () => {
            it('should behave as expected', () => {
                const buildFsmModel = Nvc.fsm.buildFsmModel = sinon.fake.returns(dummy());
                const sortFsmModel = Nvc.fsm.sortFsmModel = sinon.fake();
                Nvc.quick.buildAndSortFsmModel();
                assert.strictEqual(buildFsmModel.calledOnceWithExactly(), true);
                assert.strictEqual(sortFsmModel.calledOnceWithExactly(buildFsmModel.getCall(0).returnValue), true);
            });
        });
    })();
})();
