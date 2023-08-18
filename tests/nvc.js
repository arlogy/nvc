/*
 https://github.com/arlogy/nvc
 Released under the MIT License (see LICENSE file)
 Copyright (c) 2022 https://github.com/arlogy
*/

const {
    loadNvcScript,
    _setCanvas,
    _getAlphabetFromData, _getAlphabetFromContainer, _setAlphabetContainer,
    _getNodes, _setNodes,
    _getLinks, _setLinks,
    _getTextItems, _setTextItems,
} = require('./setup.js');
const NvcBackup = loadNvcScript('core');
const {checkAddRemEvtArgs, dummy, jsonStringifyIndents, optParamVal} = require('./utils.js');

const assert = require('assert');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const sinon = require('sinon');

const jsonStringData = (valid) => valid ? `{"x":"${dummy()}"}` : dummy();
(function() {
    JSON.parse(jsonStringData(true));
    assert.throws(() => JSON.parse(jsonStringData(false)), SyntaxError);
})();

(function() {
    const dom = new JSDOM('<!DOCTYPE html><html></html>');
    global.window = dom.window;
    global.document = dom.window.document;

    const JsuCmn = Jsu.Common;
    const JsuLtx = Jsu.Latex;

    (function() {
        describe('getBaseConfig()', () => {
            it('should return a new reference for each call', () => {
                assert.strictEqual(Nvc.getBaseConfig() !== Nvc.getBaseConfig(), true);
            });
            it('should not preserve changes to the returned object', () => {
                const unchangedConfig = Nvc.getBaseConfig();
                const changedConfig = Nvc.getBaseConfig();
                for(const prop in changedConfig) delete changedConfig[prop];
                assert.deepStrictEqual(Nvc.getBaseConfig(), unchangedConfig);
            });
            // no need to further test this function because changes to it that
            // break tested behaviors will be reflected in corresponding test
            // cases
        });
    })();

    (function() {
        describe('config', () => {
            // no need to test this property because changes to it that break
            // tested behaviors will be reflected in corresponding test cases
        });
    })();

    (function() {
        describe('setConfigFor()', () => {
            const newConfig = (config) => { // creates a new config from a given one
                const bconf = Nvc.getBaseConfig();
                bconf.canvas.acceptLinks = config.canvas.acceptLinks;
                bconf.canvas.acceptSelfLinks = config.canvas.acceptSelfLinks;
                bconf.canvas.acceptStartLinks = config.canvas.acceptStartLinks;
                bconf.links.arrowHeadAtSrc = config.links.arrowHeadAtSrc;
                bconf.links.arrowHeadAtSrcOverridable = config.links.arrowHeadAtSrcOverridable;
                bconf.links.arrowHeadAtDst = config.links.arrowHeadAtDst;
                bconf.links.arrowHeadAtDstOverridable = config.links.arrowHeadAtDstOverridable;
                bconf.nodes.canBeAcceptStates = config.nodes.canBeAcceptStates;
                return bconf;
            };
            it('should set config correctly when type=fsm', () => {
                const config = Nvc.config;
                Nvc.setConfigFor('fsm');
                assert.strictEqual(config.canvas.acceptLinks, true);
                assert.strictEqual(config.canvas.acceptSelfLinks, true);
                assert.strictEqual(config.canvas.acceptStartLinks, true);
                assert.strictEqual(config.links.arrowHeadAtSrc, false);
                assert.strictEqual(config.links.arrowHeadAtSrcOverridable, false);
                assert.strictEqual(config.links.arrowHeadAtDst, true);
                assert.strictEqual(config.links.arrowHeadAtDstOverridable, false);
                assert.strictEqual(config.nodes.canBeAcceptStates, true);
                assert.deepStrictEqual(config, Nvc.getBaseConfig()); // the base config should be our final config because it is also initialized for use with FSMs
            });
            it('should set config correctly when type=digraph', () => {
                const config = Nvc.config;
                Nvc.setConfigFor('digraph');
                assert.strictEqual(config.canvas.acceptLinks, true);
                assert.strictEqual(config.canvas.acceptSelfLinks, true);
                assert.strictEqual(config.canvas.acceptStartLinks, false);
                assert.strictEqual(config.links.arrowHeadAtSrc, false);
                assert.strictEqual(config.links.arrowHeadAtSrcOverridable, true);
                assert.strictEqual(config.links.arrowHeadAtDst, true);
                assert.strictEqual(config.links.arrowHeadAtDstOverridable, false);
                assert.strictEqual(config.nodes.canBeAcceptStates, false);
                assert.deepStrictEqual(config, newConfig(config)); // only the above properties should have changed
            });
            it('should set config correctly when type=undigraph', () => {
                const config = Nvc.config;
                Nvc.setConfigFor('undigraph');
                assert.strictEqual(config.canvas.acceptLinks, true);
                assert.strictEqual(config.canvas.acceptSelfLinks, true);
                assert.strictEqual(config.canvas.acceptStartLinks, false);
                assert.strictEqual(config.links.arrowHeadAtSrc, false);
                assert.strictEqual(config.links.arrowHeadAtSrcOverridable, false);
                assert.strictEqual(config.links.arrowHeadAtDst, false);
                assert.strictEqual(config.links.arrowHeadAtDstOverridable, false);
                assert.strictEqual(config.nodes.canBeAcceptStates, false);
                assert.deepStrictEqual(config, newConfig(config)); // only the above properties should have changed
            });
            it('should set config correctly when type=nodesonly', () => {
                const config = Nvc.config;
                Nvc.setConfigFor('nodesonly');
                assert.strictEqual(config.canvas.acceptLinks, false);
                assert.strictEqual(config.canvas.acceptSelfLinks, false);
                assert.strictEqual(config.canvas.acceptStartLinks, false);
                assert.strictEqual(config.links.arrowHeadAtSrc, false);
                assert.strictEqual(config.links.arrowHeadAtSrcOverridable, false);
                assert.strictEqual(config.links.arrowHeadAtDst, false);
                assert.strictEqual(config.links.arrowHeadAtDstOverridable, false);
                assert.strictEqual(config.nodes.canBeAcceptStates, false);
                assert.deepStrictEqual(config, newConfig(config)); // only the above properties should have changed
            });
            it('should set fsmAlphabetContainer accordingly for all possible types', () => {
                for(const type of ['fsm', 'digraph', 'undigraph', 'nodesonly']) {
                    const fsmAlphabetContainer = {style:{}};
                    _setAlphabetContainer(fsmAlphabetContainer);
                    Nvc.setConfigFor(type);
                    assert.deepStrictEqual(fsmAlphabetContainer, (function() {
                        const display = type === 'fsm' ? 'block' : 'none'; // visibility
                        return {style:{display}};
                    })());
                }
            });
        });
    })();

    (function() {
        describe('start()', () => {
            const checkImpl = (canvasIsSet, fsmAlphabetContainer, options) => {
                const canvas = canvasIsSet ? dummy() : null;
                let optionsCanvas = undefined;
                let optionsFsmAlphabetContainer = undefined;
                if(options) {
                    if('canvas' in options) optionsCanvas = options.canvas;
                    if('fsmAlphabetContainer' in options) optionsFsmAlphabetContainer = options.fsmAlphabetContainer;
                }
                const stopListeners = Nvc.stopListeners = sinon.spy();
                const setCanvas = Nvc.setCanvas = sinon.fake.returns(canvasIsSet);
                const setFsmAlphabetContainer = Nvc.setFsmAlphabetContainer = sinon.spy();
                const draw = Nvc.draw = sinon.spy();
                const startListeners = Nvc.startListeners = sinon.spy();
                const retVal = Nvc.start(canvas, fsmAlphabetContainer, options);
                assert.strictEqual(stopListeners.calledOnceWithExactly(), true);
                assert.strictEqual(setCanvas.calledOnceWithExactly(canvas, optionsCanvas), true);
                assert.strictEqual(setCanvas.calledAfter(stopListeners), true);
                assert.strictEqual(setFsmAlphabetContainer.calledOnceWithExactly(fsmAlphabetContainer, optionsFsmAlphabetContainer), true);
                assert.strictEqual(setFsmAlphabetContainer.calledAfter(setCanvas), true);
                if(setCanvas.getCall(0).returnValue) {
                    assert.strictEqual(draw.called, true);
                    assert.strictEqual(draw.calledAfter(setFsmAlphabetContainer), true);
                    assert.strictEqual(startListeners.calledOnceWithExactly(), true);
                    assert.strictEqual(startListeners.calledAfter(draw), true);
                }
                assert.strictEqual(retVal, setCanvas.getCall(0).returnValue);
            };
            for(const options of [
                optParamVal, null,
                {},
                {canvas:dummy()}, {fsmAlphabetContainer:dummy()}, {canvas:dummy(), fsmAlphabetContainer:dummy()},
            ]) {
                it(`should behave as expected when options=${JSON.stringify(options)}`, () => {
                    for(const canvasIsSet of [true, false]) {
                        for(const fsmAlphabetContainer of [optParamVal, null, dummy()]) {
                            checkImpl(canvasIsSet, fsmAlphabetContainer, options);
                        }
                    }
                });
            }
        });
    })();

    (function() {
        describe('startListeners()', () => {
            const checkImpl = (canvasIsSet, canvasHasOnWheel, canvasHasOnMouseWheel, fsmAlphabetContainerIsSet) => {
                const canvas = canvasIsSet ? {} : null;
                if(canvas) {
                    if(canvasHasOnWheel) canvas.onwheel = dummy();
                    if(canvasHasOnMouseWheel) canvas.onmousewheel = dummy();
                    canvas.addEventListener = sinon.spy();
                }
                const canvasInitialProps = canvas ? Object.getOwnPropertyNames(canvas) : [];
                _setCanvas(canvas);
                const fsmAlphabetContainer = fsmAlphabetContainerIsSet ? {addEventListener:sinon.spy()} : null;
                const fsmAlphabetContainerInitialProps = fsmAlphabetContainer ? Object.getOwnPropertyNames(fsmAlphabetContainer) : [];
                _setAlphabetContainer(fsmAlphabetContainer);
                const documentListener = sinon.spy(document, 'addEventListener');
                Nvc.startListeners();
                if(canvas) {
                    assert.strictEqual(typeof canvas.ondblclick, 'function');
                    assert.strictEqual(typeof canvas.onmousedown, 'function');
                    assert.strictEqual(typeof canvas.onmousemove, 'function');
                    assert.strictEqual(typeof canvas.onmouseup, 'function');
                    if('onwheel' in canvas) checkAddRemEvtArgs(canvas.addEventListener, ['wheel']);
                    else if('onmousewheel' in canvas) checkAddRemEvtArgs(canvas.addEventListener, ['mousewheel']);
                    else checkAddRemEvtArgs(canvas.addEventListener, []);
                    for(const prop of [...canvasInitialProps, 'ondblclick', 'onmousedown', 'onmousemove', 'onmouseup']) delete canvas[prop];
                    assert.deepStrictEqual(canvas, {});
                }
                if(fsmAlphabetContainer) {
                    checkAddRemEvtArgs(fsmAlphabetContainer.addEventListener, ['input']);
                    for(const prop of fsmAlphabetContainerInitialProps) delete fsmAlphabetContainer[prop];
                    assert.deepStrictEqual(fsmAlphabetContainer, {readOnly:false});
                }
                checkAddRemEvtArgs(documentListener, ['keydown', 'keyup', 'keypress']);
                documentListener.restore();
            };
            it('should behave as expected', () => {
                for(const canvasIsSet of [true, false]) {
                    for(const canvasHasOnWheel of [true, false]) {
                        for(const canvasHasOnMouseWheel of [true, false]) {
                            for(const fsmAlphabetContainerIsSet of [true, false]) {
                                checkImpl(canvasIsSet, canvasHasOnWheel, canvasHasOnMouseWheel, fsmAlphabetContainerIsSet);
                            }
                        }
                    }
                }
            });
        });
        describe('stopListeners()', () => {
            const checkImpl = (canvasIsSet, canvasHasOnWheel, canvasHasOnMouseWheel, fsmAlphabetContainerIsSet) => {
                const canvas = canvasIsSet ? {} : null;
                if(canvas) {
                    if(canvasHasOnWheel) canvas.onwheel = dummy();
                    if(canvasHasOnMouseWheel) canvas.onmousewheel = dummy();
                    canvas.removeEventListener = sinon.spy();
                }
                const canvasInitialProps = canvas ? Object.getOwnPropertyNames(canvas) : [];
                _setCanvas(canvas);
                const fsmAlphabetContainer = fsmAlphabetContainerIsSet ? {removeEventListener:sinon.spy()} : null;
                const fsmAlphabetContainerInitialProps = fsmAlphabetContainer ? Object.getOwnPropertyNames(fsmAlphabetContainer) : [];
                _setAlphabetContainer(fsmAlphabetContainer);
                const documentListener = sinon.spy(document, 'removeEventListener');
                const draw = Nvc.draw = sinon.spy();
                Nvc.stopListeners();
                if(canvas) {
                    assert.strictEqual(canvas.ondblclick, null);
                    assert.strictEqual(canvas.onmousedown, null);
                    assert.strictEqual(canvas.onmousemove, null);
                    assert.strictEqual(canvas.onmouseup, null);
                    if('onwheel' in canvas) checkAddRemEvtArgs(canvas.removeEventListener, ['wheel']);
                    else if('onmousewheel' in canvas) checkAddRemEvtArgs(canvas.removeEventListener, ['mousewheel']);
                    else checkAddRemEvtArgs(canvas.removeEventListener, []);
                    for(const prop of [...canvasInitialProps, 'ondblclick', 'onmousedown', 'onmousemove', 'onmouseup']) delete canvas[prop];
                    assert.deepStrictEqual(canvas, {});
                }
                if(fsmAlphabetContainer) {
                    checkAddRemEvtArgs(fsmAlphabetContainer.removeEventListener, ['input']);
                    for(const prop of fsmAlphabetContainerInitialProps) delete fsmAlphabetContainer[prop];
                    assert.deepStrictEqual(fsmAlphabetContainer, {readOnly:true});
                }
                checkAddRemEvtArgs(documentListener, ['keydown', 'keyup', 'keypress']);
                assert.strictEqual(draw.calledOnceWithExactly(), true);
                if(canvas && canvas.removeEventListener)
                    assert.strictEqual(draw.calledAfter(canvas.removeEventListener), true);
                if(fsmAlphabetContainer && fsmAlphabetContainer.removeEventListener)
                    assert.strictEqual(draw.calledAfter(fsmAlphabetContainer.removeEventListener), true);
                assert.strictEqual(draw.calledAfter(documentListener), true);
                documentListener.restore();
            };
            it('should behave as expected', () => {
                for(const canvasIsSet of [true, false]) {
                    for(const canvasHasOnWheel of [true, false]) {
                        for(const canvasHasOnMouseWheel of [true, false]) {
                            for(const fsmAlphabetContainerIsSet of [true, false]) {
                                checkImpl(canvasIsSet, canvasHasOnWheel, canvasHasOnMouseWheel, fsmAlphabetContainerIsSet);
                            }
                        }
                    }
                }
            });
        });
    })();

    (function() {
        describe('getCanvasObj() & setCanvasObj()', () => {
            const checkImpl = (canvas) => {
                const retVal = Nvc.setCanvasObj(canvas);
                assert.strictEqual(retVal, !!canvas); // succeds if canvas is a truthy value
                assert.strictEqual(Nvc.getCanvasObj(), canvas);
            };
            for(const canvas of [undefined, null, dummy()]) {
                it(`should behave as expected when canvas=${canvas}`, () => {
                    checkImpl(canvas);
                });
            }
        });
    })();

    (function() {
        describe('setCanvasSize()', () => {
            const checkImpl = (options, screenObj) => {
                // we only handle the case where canvas and options are set (they have non null values for example)
                // indeed the function being tested does nothing in the other case
                //
                sinon.stub(global, 'window').value({screen:screenObj});
                let screenWidth = null;
                let screenHeight = null;
                if(screenObj) {
                    if('availWidth' in screenObj) screenWidth = screenObj.availWidth;
                    if('availHeight' in screenObj) screenHeight = screenObj.availHeight;
                }
                const parseSuffixedValue = sinon.spy(JsuCmn, 'parseSuffixedValue');
                const cwidth = dummy(), cheight = dummy();
                const canvas = {width:cwidth, height:cheight};
                _setCanvas(canvas);
                Nvc.setCanvasSize(options);
                assert.strictEqual(parseSuffixedValue.calledTwice, true);
                assert.strictEqual(parseSuffixedValue.getCall(0).calledWithExactly(options.width), true);
                assert.strictEqual(canvas.width, (function() {
                    const optionsData = parseSuffixedValue.getCall(0).returnValue;
                    if(optionsData !== null && optionsData.number >= 0) {
                        switch(optionsData.suffix) {
                            case '': return optionsData.number;
                            case '%': if(screenWidth !== null) return optionsData.number * screenWidth * 0.01;
                        }
                    }
                    return cwidth; // width unchanged
                })());
                assert.strictEqual(parseSuffixedValue.getCall(1).calledWithExactly(options.height), true);
                assert.strictEqual(canvas.height, (function() {
                    const optionsData = parseSuffixedValue.getCall(1).returnValue;
                    if(optionsData !== null && optionsData.number >= 0) {
                        switch(optionsData.suffix) {
                            case '': return optionsData.number;
                            case '%': if(screenHeight !== null) return optionsData.number * screenHeight * 0.01;
                        }
                    }
                    return cheight; // height unchanged
                })());
                delete canvas.width;
                delete canvas.height;
                assert.deepStrictEqual(canvas, {});
                parseSuffixedValue.restore();
            };
            const availWidth = 1920, availHeight = 1080;
            for(const options of [
                {},
                { width:-10.99}, { width:-10}, { width:10}, { width:10.99}, { width:'-10.99%'}, { width:'-10%'}, { width:'10%'}, { width:'10.99%'}, { width:'-10.99'}, { width:'-10'}, { width:'10'}, { width:'10.99'}, { width:'neither a number nor a suffixed value'},
                {height:-10.99}, {height:-10}, {height:10}, {height:10.99}, {height:'-10.99%'}, {height:'-10%'}, {height:'10%'}, {height:'10.99%'}, {height:'-10.99'}, {height:'-10'}, {height:'10'}, {height:'10.99'}, {height:'neither a number nor a suffixed value'},
                {width:10, height:20}, {width:-10, height:-20}, {width:10, height:'x'}, {width:'x', height:10}, {width:'x', height:'y'},
            ]) {
                it(`should behave as expected when options=${JSON.stringify(options)}`, () => {
                    for(const screenObj of [undefined, null, {}, {availWidth}, {availHeight}, {availWidth, availHeight}]) {
                        checkImpl(options, screenObj);
                    }
                });
            }
        });
    })();

    (function() {
        describe('setCanvas()', () => {
            const checkImpl = (canvasIsSuccessfullySet) => {
                const canvas = dummy();
                const options = dummy();
                const setCanvasObj = Nvc.setCanvasObj = sinon.fake.returns(canvasIsSuccessfullySet);
                const setCanvasSize = Nvc.setCanvasSize = sinon.spy();
                const retVal = Nvc.setCanvas(canvas, options);
                assert.strictEqual(setCanvasObj.calledOnceWithExactly(canvas), true);
                assert.strictEqual(setCanvasSize.calledOnceWithExactly(options), true);
                assert.strictEqual(setCanvasSize.calledAfter(setCanvasObj), true);
                assert.strictEqual(retVal, setCanvasObj.getCall(0).returnValue);
            };
            for(const canvasIsSuccessfullySet of [true, false]) {
                it(`should behave as expected when canvasIsSuccessfullySet=${canvasIsSuccessfullySet}`, () => {
                    checkImpl(canvasIsSuccessfullySet);
                });
            }
        });
    })();

    (function() {
        describe('getFsmAlphabetContainerObj() & setFsmAlphabetContainerObj()', () => {
            const checkImpl = (fsmAlphabetContainer) => {
                Nvc.setFsmAlphabetContainerObj(fsmAlphabetContainer);
                assert.strictEqual(Nvc.getFsmAlphabetContainerObj(), fsmAlphabetContainer);
            };
            for(const fsmAlphabetContainer of [undefined, null, dummy()]) {
                it(`should behave as expected when fsmAlphabetContainer=${fsmAlphabetContainer}`, () => {
                    checkImpl(fsmAlphabetContainer);
                });
            }
        });
    })();

    (function() {
        describe('setFsmAlphabetContainerAttrs()', () => {
            const checkImpl = (fsmAlphabetContainerIsSet, canvasIsSet, options) => {
                const fsmAlphabetContainer = fsmAlphabetContainerIsSet ? {style:{}} : null;
                _setAlphabetContainer(fsmAlphabetContainer);
                const canvas = canvasIsSet ? {} : null;
                _setCanvas(canvas);
                const tieFsmAlphabetContainerToCanvas = Nvc.tieFsmAlphabetContainerToCanvas = sinon.spy();
                Nvc.setFsmAlphabetContainerAttrs(options);
                assert.strictEqual(tieFsmAlphabetContainerToCanvas.calledOnceWithExactly(options), true);
                if(fsmAlphabetContainer && !canvas) {
                    // no new property should be set on fsmAlphabetContainer
                    assert.deepStrictEqual(fsmAlphabetContainer.style, {});
                    delete fsmAlphabetContainer.style;
                    assert.deepStrictEqual(fsmAlphabetContainer, {});
                }
                if(fsmAlphabetContainer && canvas) {
                    assert.deepStrictEqual(fsmAlphabetContainer, {
                        placeholder: 'FSM alphabet',
                        title: '',
                        style: {
                            position: 'absolute',
                            width: (function() {
                                let width = null;
                                if(options) {
                                    if(JsuCmn.isNumber(options.width)) width = options.width;
                                    else try { width = options.width(); } catch(e) {}
                                }
                                if(!JsuCmn.isNumber(width) || width < 0) width = 0.75 * canvas.width;
                                return width + 'px';
                            })(),
                            height: (function() {
                                let height = null;
                                if(options) {
                                    if(JsuCmn.isNumber(options.height)) height = options.height;
                                    else try { height = options.height(); } catch(e) {}
                                }
                                if(!JsuCmn.isNumber(height) || height < 0) height = 20;
                                return height + 'px';
                            })(),
                        },
                    });
                    if(options && 'showAlphabet' in options) {
                        assert.strictEqual(options.showAlphabet.calledOnceWithExactly(fsmAlphabetContainer), true);
                        assert.strictEqual(options.showAlphabet.calledOn(options), true);
                        assert.strictEqual(options.showAlphabet.calledAfter(tieFsmAlphabetContainerToCanvas), true);
                    }
                }
            };
            it('should behave as expected when canvas is not set and/or fsmAlphabetContainer is not set', () => {
                for(const options of [optParamVal, null, dummy()]) {
                    checkImpl(false, true, options);
                    checkImpl(true, false, options);
                    checkImpl(false, false, options);
                }
            });
            it('should behave as expected when canvas and fsmAlphabetContainer are set', () => {
                for(const options of [
                    optParamVal, null,
                    {},
                    { width:-10.99}, { width:-10}, { width:10}, { width:10.99}, { width:()=>-10.99}, { width:()=>-10}, { width:()=>10}, { width:()=>10.99}, { width:'neither a number nor a function returning a number'},
                    {height:-10.99}, {height:-10}, {height:10}, {height:10.99}, {height:()=>-10.99}, {height:()=>-10}, {height:()=>10}, {height:()=>10.99}, {height:'neither a number nor a function returning a number'},
                    {width:10, height:20}, {width:-10, height:-20}, {width:10, height:'x'}, {width:'x', height:10}, {width:'x', height:'y'},
                    {showAlphabet:sinon.spy()},
                ]) {
                    checkImpl(true, true, options);
                }
            });
        });
    })();

    (function() {
        describe('setFsmAlphabetContainer()', () => {
            it('should behave as expected', () => {
                const fsmAlphabetContainer = dummy();
                const options = dummy();
                const setFsmAlphabetContainerObj = Nvc.setFsmAlphabetContainerObj = sinon.spy();
                const setFsmAlphabetContainerAttrs = Nvc.setFsmAlphabetContainerAttrs = sinon.spy();
                Nvc.setFsmAlphabetContainer(fsmAlphabetContainer, options);
                assert.strictEqual(setFsmAlphabetContainerObj.calledOnceWithExactly(fsmAlphabetContainer), true);
                assert.strictEqual(setFsmAlphabetContainerAttrs.calledOnceWithExactly(options), true);
                assert.strictEqual(setFsmAlphabetContainerAttrs.calledAfter(setFsmAlphabetContainerObj), true);
            });
        });
    })();

    (function() {
        describe('tieFsmAlphabetContainerToCanvas()', () => {
            const checkImpl = (fsmAlphabetContainerIsSet, options) => {
                // we only handle the case where canvas is set (it has a non null value for example)
                // indeed the function being tested does nothing in the other case
                //
                const fsmAlphabetContainer = fsmAlphabetContainerIsSet ? {style:{}} : null;
                _setAlphabetContainer(fsmAlphabetContainer);
                const getBoundingClientRect = sinon.fake.returns({left:15, top:25});
                _setCanvas({getBoundingClientRect});
                Nvc.tieFsmAlphabetContainerToCanvas(options);
                if(options && 'showCanvas' in options) {
                    assert.strictEqual(options.showCanvas.calledOnceWithExactly(), true);
                    assert.strictEqual(options.showCanvas.calledOn(options), true);
                    assert.strictEqual(options.showCanvas.calledBefore(getBoundingClientRect), true);
                }
                if(fsmAlphabetContainer) {
                    assert.strictEqual(getBoundingClientRect.calledOnce, true);
                    assert.deepStrictEqual(fsmAlphabetContainer, {
                        style: {
                            left: (function() {
                                let spacingLeft = null;
                                if(options) {
                                    if(JsuCmn.isNumber(options.spacingLeft)) spacingLeft = options.spacingLeft;
                                    else try { spacingLeft = options.spacingLeft(); } catch(e) {}
                                }
                                if(!JsuCmn.isNumber(spacingLeft)) spacingLeft = 10;
                                return getBoundingClientRect.getCall(0).returnValue.left + window.scrollX + spacingLeft + 'px';
                            })(),
                            top: (function() {
                                let spacingTop = null;
                                if(options) {
                                    if(JsuCmn.isNumber(options.spacingTop)) spacingTop = options.spacingTop;
                                    else try { spacingTop = options.spacingTop(); } catch(e) {}
                                }
                                if(!JsuCmn.isNumber(spacingTop)) spacingTop = 10;
                                return getBoundingClientRect.getCall(0).returnValue.top + window.scrollY + spacingTop + 'px';
                            })(),
                        },
                    });
                }
            };
            it('should behave as expected when fsmAlphabetContainer is not set', () => {
                for(const options of [
                    optParamVal, null,
                    {},
                    {showCanvas:sinon.spy()},
                ]) {
                    checkImpl(false, options);
                }
            });
            it('should behave as expected otherwise', () => {
                for(const options of [
                    optParamVal, null,
                    {},
                    {showCanvas:sinon.spy()},
                    {spacingLeft:-10.99}, {spacingLeft:-10}, {spacingLeft:10}, {spacingLeft:10.99}, {spacingLeft:()=>-10.99}, {spacingLeft:()=>-10}, {spacingLeft:()=>10}, {spacingLeft:()=>10.99}, {spacingLeft:'neither a number nor a function returning a number'},
                    { spacingTop:-10.99}, { spacingTop:-10}, { spacingTop:10}, { spacingTop:10.99}, { spacingTop:()=>-10.99}, { spacingTop:()=>-10}, { spacingTop:()=>10}, { spacingTop:()=>10.99}, { spacingTop:'neither a number nor a function returning a number'},
                    {spacingLeft:10, spacingTop:20}, {spacingLeft:-10, spacingTop:-20}, {spacingLeft:10, spacingTop:'x'}, {spacingLeft:'x', spacingTop:10}, {spacingLeft:'x', spacingTop:'y'},
                ]) {
                    checkImpl(true, options);
                }
            });
        });
    })();

    (function() {
        describe('moveNodesIntoCanvasVisibleArea() (assuming mcondX functions are move preconditions)', () => {
            const canvas = () => Nvc.getCanvasObj();
            const mcond1 = (node) => node.x < node.radius;
            const mcond2 = (node) => node.x > canvas().width - node.radius;
            const mcond3 = (node) => node.y < node.radius;
            const mcond4 = (node) => node.y > canvas().height - node.radius;
            const simulateMove = (node) => {
                node = Object.assign({}, node); // a shallow copy of node is enough because its properties are not objects
                if(mcond1(node)) node.x = node.radius;
                if(mcond2(node)) node.x = canvas().width - node.radius;
                if(mcond3(node)) node.y = node.radius;
                if(mcond4(node)) node.y = canvas().height - node.radius;
                return node;
            };
            const radius = 25;
            beforeEach(function () {
                _setCanvas({width:800, height:600});
            });
            // note that node and/or canvas properties are set accordingly for each test case below
            //     in order to meet the expected mcondX move preconditions
            it('should move node accordingly if mcond1(node) only', () => {
                const node = {x:radius-1, radius};
                assert.strictEqual(mcond1(node) && !mcond2(node) && !mcond3(node) && !mcond4(node), true);
                const target = simulateMove(node);
                _setNodes([node]);
                Nvc.moveNodesIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getNodes()[0], target);
            });
            it('should move node accordingly if mcond1(node) && mcond2(node) only', () => {
                const node = {x:radius-1, radius};
                canvas().width = node.x + node.radius - 1;
                assert.strictEqual(mcond1(node) && mcond2(node) && !mcond3(node) && !mcond4(node), true);
                const target = simulateMove(node);
                _setNodes([node]);
                Nvc.moveNodesIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getNodes()[0], target);
            });
            it('should move node accordingly if mcond1(node) && mcond2(node) && mcond3(node) only', () => {
                const node = {x:radius-1, y:radius-1, radius};
                canvas().width = node.x + node.radius - 1;
                assert.strictEqual(mcond1(node) && mcond2(node) && mcond3(node) && !mcond4(node), true);
                const target = simulateMove(node);
                _setNodes([node]);
                Nvc.moveNodesIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getNodes()[0], target);
            });
            it('should move node accordingly if mcond1(node) && mcond2(node) && mcond3(node) && mcond4(node) only', () => {
                const node = {x:radius-1, y:radius-1, radius};
                canvas().width = node.x + node.radius - 1;
                canvas().height = node.y + node.radius - 1;
                assert.strictEqual(mcond1(node) && mcond2(node) && mcond3(node) && mcond4(node), true);
                const target = simulateMove(node);
                _setNodes([node]);
                Nvc.moveNodesIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getNodes()[0], target);
            });
            it('should move node accordingly if mcond1(node) && mcond3(node) only', () => {
                const node = {x:radius-1, y:radius-1, radius};
                canvas().width = node.x + node.radius;
                assert.strictEqual(mcond1(node) && !mcond2(node) && mcond3(node) && !mcond4(node), true);
                const target = simulateMove(node);
                _setNodes([node]);
                Nvc.moveNodesIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getNodes()[0], target);
            });
            it('should move node accordingly if mcond1(node) && mcond3(node) && mcond4(node) only', () => {
                const node = {x:radius-1, y:radius-1, radius};
                canvas().height = node.y + node.radius - 1;
                assert.strictEqual(mcond1(node) && !mcond2(node) && mcond3(node) && mcond4(node), true);
                const target = simulateMove(node);
                _setNodes([node]);
                Nvc.moveNodesIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getNodes()[0], target);
            });
            it('should move node accordingly if mcond1(node) && mcond4(node) only', () => {
                const node = {x:radius-1, y:radius, radius};
                canvas().width = node.x + node.radius;
                canvas().height = node.y + node.radius - 1;
                assert.strictEqual(mcond1(node) && !mcond2(node) && !mcond3(node) && mcond4(node), true);
                const target = simulateMove(node);
                _setNodes([node]);
                Nvc.moveNodesIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getNodes()[0], target);
            });
            it('should move node accordingly if mcond2(node) only', () => {
                const node = {x:radius, radius};
                canvas().width = node.x + node.radius - 1;
                assert.strictEqual(!mcond1(node) && mcond2(node) && !mcond3(node) && !mcond4(node), true);
                const target = simulateMove(node);
                _setNodes([node]);
                Nvc.moveNodesIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getNodes()[0], target);
            });
            it('should move node accordingly if mcond2(node) && mcond3(node) only', () => {
                const node = {x:radius, y:radius-1, radius};
                canvas().width = node.x + node.radius - 1;
                canvas().height = node.y + node.radius;
                assert.strictEqual(!mcond1(node) && mcond2(node) && mcond3(node) && !mcond4(node), true);
                const target = simulateMove(node);
                _setNodes([node]);
                Nvc.moveNodesIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getNodes()[0], target);
            });
            it('should move node accordingly if mcond2(node) && mcond3(node) && mcond4(node) only', () => {
                const node = {x:radius, y:radius-1, radius};
                canvas().width = node.x + node.radius - 1;
                canvas().height = node.y + node.radius - 1;
                assert.strictEqual(!mcond1(node) && mcond2(node) && mcond3(node) && mcond4(node), true);
                const target = simulateMove(node);
                _setNodes([node]);
                Nvc.moveNodesIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getNodes()[0], target);
            });
            it('should move node accordingly if mcond2(node) && mcond4(node) only', () => {
                const node = {x:radius, y:radius, radius};
                canvas().width = node.x + node.radius - 1;
                canvas().height = node.y + node.radius - 1;
                assert.strictEqual(!mcond1(node) && mcond2(node) && !mcond3(node) && mcond4(node), true);
                const target = simulateMove(node);
                _setNodes([node]);
                Nvc.moveNodesIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getNodes()[0], target);
            });
            it('should move node accordingly if mcond3(node) only', () => {
                const node = {x:radius, y:radius-1, radius};
                canvas().width = node.x + node.radius;
                canvas().height = node.y + node.radius;
                assert.strictEqual(!mcond1(node) && !mcond2(node) && mcond3(node) && !mcond4(node), true);
                const target = simulateMove(node);
                _setNodes([node]);
                Nvc.moveNodesIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getNodes()[0], target);
            });
            it('should move node accordingly if mcond3(node) && mcond4(node) only', () => {
                const node = {x:radius, y:radius-1, radius};
                canvas().width = node.x + node.radius;
                canvas().height = node.y + node.radius - 1;
                assert.strictEqual(!mcond1(node) && !mcond2(node) && mcond3(node) && mcond4(node), true);
                const target = simulateMove(node);
                _setNodes([node]);
                Nvc.moveNodesIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getNodes()[0], target);
            });
            it('should move node accordingly if mcond4(node) only', () => {
                const node = {x:radius, y:radius, radius};
                canvas().width = node.x + node.radius;
                canvas().height = node.y + node.radius - 1;
                assert.strictEqual(!mcond1(node) && !mcond2(node) && !mcond3(node) && mcond4(node), true);
                const target = simulateMove(node);
                _setNodes([node]);
                Nvc.moveNodesIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getNodes()[0], target);
            });
            it('should not call draw()', () => {
                const draw = Nvc.draw = sinon.spy();
                for(const nodes of [[], [dummy(), dummy()]]) {
                    _setNodes(nodes);
                    Nvc.moveNodesIntoCanvasVisibleArea();
                    assert.strictEqual(draw.notCalled, true);
                }
            });
        });
    })();

    (function() {
        describe('moveTextItemsIntoCanvasVisibleArea() (assuming mcondX functions are move preconditions)', () => {
            const canvas = () => Nvc.getCanvasObj();
            const mcond1 = (textItem) => { const rect = textItem.getBoundingRect(); return rect.x < 0; }
            const mcond2 = (textItem) => { const rect = textItem.getBoundingRect(); return rect.x + rect.width > canvas().width; }
            const mcond3 = (textItem) => { const rect = textItem.getBoundingRect(); return rect.y < 0; }
            const mcond4 = (textItem) => { const rect = textItem.getBoundingRect(); return rect.y + rect.height > canvas().height; }
            const simulateMove = (textItem) => {
                textItem = Object.assign({}, textItem); // a shallow copy of textItem is enough because its properties are not objects
                const rect = textItem.getBoundingRect();
                if(mcond1(textItem)) textItem.x = rect.width / 2;
                if(mcond2(textItem)) textItem.x = canvas().width - rect.width / 2;
                if(mcond3(textItem)) textItem.y = rect.height / 2;
                if(mcond4(textItem)) textItem.y = canvas().height - rect.height / 2;
                return textItem;
            };
            const getTextItem = (rectObj) => {
                rectObj = Object.assign({x:2, y:3, width:5, height:7}, rectObj);
                return {getBoundingRect:()=>rectObj};
            };
            beforeEach(function () {
                _setCanvas({width:800, height:600});
            });
            // note that textItem properties are set accordingly for each test case below
            //     in order to meet the expected mcondX move preconditions
            it('should move textItem accordingly if mcond1(textItem) only', () => {
                const textItem = getTextItem({x:-1});
                assert.strictEqual(mcond1(textItem) && !mcond2(textItem) && !mcond3(textItem) && !mcond4(textItem), true);
                const target = simulateMove(textItem);
                _setTextItems([textItem]);
                Nvc.moveTextItemsIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getTextItems()[0], target);
            });
            it('should move textItem accordingly if mcond1(textItem) && mcond2(textItem) only', () => {
                const textItem = getTextItem({x:-1, width:canvas().width+2});
                assert.strictEqual(mcond1(textItem) && mcond2(textItem) && !mcond3(textItem) && !mcond4(textItem), true);
                const target = simulateMove(textItem);
                _setTextItems([textItem]);
                Nvc.moveTextItemsIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getTextItems()[0], target);
            });
            it('should move textItem accordingly if mcond1(textItem) && mcond2(textItem) && mcond3(textItem) only', () => {
                const textItem = getTextItem({x:-1, width:canvas().width+2, y:-1});
                assert.strictEqual(mcond1(textItem) && mcond2(textItem) && mcond3(textItem) && !mcond4(textItem), true);
                const target = simulateMove(textItem);
                _setTextItems([textItem]);
                Nvc.moveTextItemsIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getTextItems()[0], target);
            });
            it('should move textItem accordingly if mcond1(textItem) && mcond2(textItem) && mcond3(textItem) && mcond4(textItem) only', () => {
                const textItem = getTextItem({x:-1, width:canvas().width+2, y:-1, height:canvas().height+2});
                assert.strictEqual(mcond1(textItem) && mcond2(textItem) && mcond3(textItem) && mcond4(textItem), true);
                const target = simulateMove(textItem);
                _setTextItems([textItem]);
                Nvc.moveTextItemsIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getTextItems()[0], target);
            });
            it('should move textItem accordingly if mcond1(textItem) && mcond3(textItem) only', () => {
                const textItem = getTextItem({x:-1, y:-1});
                assert.strictEqual(mcond1(textItem) && !mcond2(textItem) && mcond3(textItem) && !mcond4(textItem), true);
                const target = simulateMove(textItem);
                _setTextItems([textItem]);
                Nvc.moveTextItemsIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getTextItems()[0], target);
            });
            it('should move textItem accordingly if mcond1(textItem) && mcond3(textItem) && mcond4(textItem) only', () => {
                const textItem = getTextItem({x:-1, y:-1, height:canvas().height+2});
                assert.strictEqual(mcond1(textItem) && !mcond2(textItem) && mcond3(textItem) && mcond4(textItem), true);
                const target = simulateMove(textItem);
                _setTextItems([textItem]);
                Nvc.moveTextItemsIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getTextItems()[0], target);
            });
            it('should move textItem accordingly if mcond1(textItem) && mcond4(textItem) only', () => {
                const textItem = getTextItem({x:-1, y:0, height:canvas().height+1});
                assert.strictEqual(mcond1(textItem) && !mcond2(textItem) && !mcond3(textItem) && mcond4(textItem), true);
                const target = simulateMove(textItem);
                _setTextItems([textItem]);
                Nvc.moveTextItemsIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getTextItems()[0], target);
            });
            it('should move textItem accordingly if mcond2(textItem) only', () => {
                const textItem = getTextItem({x:0, y:0, width:canvas().width+1, height:canvas().height});
                assert.strictEqual(!mcond1(textItem) && mcond2(textItem) && !mcond3(textItem) && !mcond4(textItem), true);
                const target = simulateMove(textItem);
                _setTextItems([textItem]);
                Nvc.moveTextItemsIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getTextItems()[0], target);
            });
            it('should move textItem accordingly if mcond2(textItem) && mcond3(textItem) only', () => {
                const textItem = getTextItem({x:0, y:-1, width:canvas().width+1});
                assert.strictEqual(!mcond1(textItem) && mcond2(textItem) && mcond3(textItem) && !mcond4(textItem), true);
                const target = simulateMove(textItem);
                _setTextItems([textItem]);
                Nvc.moveTextItemsIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getTextItems()[0], target);
            });
            it('should move textItem accordingly if mcond2(textItem) && mcond3(textItem) && mcond4(textItem) only', () => {
                const textItem = getTextItem({x:0, y:-1, width:canvas().width+1, height:canvas().height+2});
                assert.strictEqual(!mcond1(textItem) && mcond2(textItem) && mcond3(textItem) && mcond4(textItem), true);
                const target = simulateMove(textItem);
                _setTextItems([textItem]);
                Nvc.moveTextItemsIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getTextItems()[0], target);
            });
            it('should move textItem accordingly if mcond2(textItem) && mcond4(textItem) only', () => {
                const textItem = getTextItem({x:0, y:0, width:canvas().width+1, height:canvas().height+1});
                assert.strictEqual(!mcond1(textItem) && mcond2(textItem) && !mcond3(textItem) && mcond4(textItem), true);
                const target = simulateMove(textItem);
                _setTextItems([textItem]);
                Nvc.moveTextItemsIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getTextItems()[0], target);
            });
            it('should move textItem accordingly if mcond3(textItem) only', () => {
                const textItem = getTextItem({x:0, y:-1});
                assert.strictEqual(!mcond1(textItem) && !mcond2(textItem) && mcond3(textItem) && !mcond4(textItem), true);
                const target = simulateMove(textItem);
                _setTextItems([textItem]);
                Nvc.moveTextItemsIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getTextItems()[0], target);
            });
            it('should move textItem accordingly if mcond3(textItem) && mcond4(textItem) only', () => {
                const textItem = getTextItem({x:0, y:-1, height:canvas().height+2});
                assert.strictEqual(!mcond1(textItem) && !mcond2(textItem) && mcond3(textItem) && mcond4(textItem), true);
                const target = simulateMove(textItem);
                _setTextItems([textItem]);
                Nvc.moveTextItemsIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getTextItems()[0], target);
            });
            it('should move textItem accordingly if mcond4(textItem) only', () => {
                const textItem = getTextItem({x:0, height:canvas().height+1});
                assert.strictEqual(!mcond1(textItem) && !mcond2(textItem) && !mcond3(textItem) && mcond4(textItem), true);
                const target = simulateMove(textItem);
                _setTextItems([textItem]);
                Nvc.moveTextItemsIntoCanvasVisibleArea();
                assert.deepStrictEqual(_getTextItems()[0], target);
            });
            it('should not call draw()', () => {
                const draw = Nvc.draw = sinon.spy();
                for(const textItems of [[], [{getBoundingRect:()=>dummy()}, {getBoundingRect:()=>dummy()}]]) {
                    _setTextItems(textItems);
                    Nvc.moveTextItemsIntoCanvasVisibleArea();
                    assert.strictEqual(draw.notCalled, true);
                }
            });
        });
    })();

    (function() {
        describe('draw()', () => {
            it('should not call drawUsing() if canvas is not set', () => {
                _setCanvas(null);
                const drawUsing = Nvc.drawUsing = sinon.spy();
                Nvc.draw();
                assert.strictEqual(drawUsing.notCalled, true);
            });
            it('should call drawUsing() accordingly if canvas is set', () => {
                const getContext = sinon.fake.returns(dummy());
                _setCanvas({getContext});
                const drawUsing = Nvc.drawUsing = sinon.spy();
                Nvc.draw();
                assert.strictEqual(getContext.calledOnceWithExactly('2d'), true);
                assert.strictEqual(drawUsing.calledOnceWithExactly(getContext.getCall(0).returnValue), true);
                assert.strictEqual(drawUsing.calledAfter(getContext), true);
            });
        });
    })();

    (function() {
        describe('drawUsing()', () => {
            const getItem = () => ({draw:sinon.spy()});
            const checkImpl = (noNodes, noLinks, noTextItems) => {
                const c = {
                    clearRect:sinon.spy(), save:sinon.spy(),
                    translate:sinon.spy(), restore:sinon.spy(),
                };
                const canvas = {width:dummy(), height:dummy()};
                _setCanvas(canvas);
                const config = {canvas:{font:dummy()}};
                Nvc.config = config;
                const nodes = noNodes ? [] : [getItem(), getItem()];
                const links = noLinks ? [] : [getItem(), getItem()];
                const textItems = noTextItems ? [] : [getItem(), getItem()];
                _setNodes(nodes);
                _setLinks(links);
                _setTextItems(textItems);
                Nvc.drawUsing(c);
                assert.strictEqual(c.clearRect.calledOnceWithExactly(0, 0, canvas.width, canvas.height), true);
                assert.strictEqual(c.save.calledOnceWithExactly(), true);
                assert.strictEqual(c.save.calledAfter(c.clearRect), true);
                assert.strictEqual(c.translate.calledOnceWithExactly(0.5, 0.5), true);
                assert.strictEqual(c.translate.calledAfter(c.save), true);
                assert.strictEqual(c.lineWidth, 1);
                assert.strictEqual(c.font, config.canvas.font);
                const lastFunc = c.translate; // last function called at this point
                const allItems = [...nodes, ...links, ...textItems];
                for(const x of allItems) {
                    assert.strictEqual(x.draw.calledOnce, true);
                    assert.strictEqual(x.draw.calledAfter(lastFunc), true);
                    assert.strictEqual(x.draw.getCall(0).args.length === 2, true);
                    assert.strictEqual(x.draw.getCall(0).args[0], c);
                    assert.strictEqual(typeof x.draw.getCall(0).args[1], 'boolean');
                }
                assert.strictEqual(c.restore.calledOnceWithExactly(), true);
                assert.strictEqual(allItems.every(x => c.restore.calledAfter(x.draw)), true);
            };
            it('should behave as expected', () => {
                for(const noNodes of [true, false]) {
                    for(const noLinks of [true, false]) {
                        for(const noTextItems of [true, false]) {
                            checkImpl(noNodes, noLinks, noTextItems);
                        }
                    }
                }
            });
        });
    })();

    (function() {
        describe('fetchJsonObject()', () => {
            const getItem = () => ({toJson:sinon.fake.returns(dummy())});
            const applyChanges = (fsmAlphabetContainer) => {
                const nodes = [getItem(), getItem()];
                const links = [getItem(), getItem()];
                const textItems = [getItem(), getItem()];
                _setAlphabetContainer(fsmAlphabetContainer);
                _setNodes(nodes);
                _setLinks(links);
                _setTextItems(textItems);
                return {nodes, links, textItems};
            };
            it('should return a new reference for each call', () => {
                assert.strictEqual(Nvc.fetchJsonObject() !== Nvc.fetchJsonObject(), true);
                for(const fsmAlphabetContainer of [undefined, null, dummy()]) {
                    applyChanges(fsmAlphabetContainer);
                    assert.strictEqual(Nvc.fetchJsonObject() !== Nvc.fetchJsonObject(), true);
                }
            });
            it('should behave as expected when called prior to any change', () => {
                const fetchedData = Nvc.fetchJsonObject();
                assert.deepStrictEqual(fetchedData, {
                    'fsmAlphabet': '',
                    'nodes': [],
                    'links': [],
                    'textItems': [],
                });
            });
            it('should behave as expected when called after changes', () => {
                for(const fsmAlphabetContainer of [undefined, null, {}, {value:dummy()}]) {
                    const {nodes, links, textItems} = applyChanges(fsmAlphabetContainer);
                    const fetchedData = Nvc.fetchJsonObject();
                    assert.strictEqual(nodes.every(x => x.toJson.calledOnce), true);
                    assert.strictEqual(links.every(x => x.toJson.calledOnce), true);
                    assert.strictEqual(textItems.every(x => x.toJson.calledOnce), true);
                    assert.deepStrictEqual(fetchedData, {
                        'fsmAlphabet': _getAlphabetFromContainer(fsmAlphabetContainer),
                        'nodes': nodes.map(x => x.toJson.getCall(0).returnValue),
                        'links': links.map(x => x.toJson.getCall(0).returnValue),
                        'textItems': textItems.map(x => x.toJson.getCall(0).returnValue),
                    });
                }
            });
        });
    })();

    (function() {
        describe('fetchJsonString()', () => {
            it('should return the expected value if JSON is not set', () => {
                for(const json of [undefined, null]) {
                    sinon.stub(global, 'JSON').value(json);
                    for(const indents of jsonStringifyIndents) {
                        assert.strictEqual(Nvc.fetchJsonString(indents), '');
                    }
                }
            });
            it('should bahave as expected otherwise', () => {
                for(const indents of jsonStringifyIndents) {
                    const stringify = sinon.stub(JSON, 'stringify').returns(dummy());
                    const fetchJsonObject = Nvc.fetchJsonObject = sinon.fake.returns(dummy());
                    const fetchedData = Nvc.fetchJsonString(indents);
                    assert.strictEqual(fetchJsonObject.calledOnceWithExactly(), true);
                    assert.strictEqual(stringify.calledOnceWithExactly(fetchJsonObject.getCall(0).returnValue, null, indents), true);
                    assert.strictEqual(fetchedData, stringify.getCall(0).returnValue);
                    stringify.restore();
                }
            });
        });
    })();

    (function() {
        describe('fetchPngDataString()', () => {
            it('should bahave as expected', () => {
                const initialContex = () => ({_testSpecificProp:0});
                const getContext = sinon.fake.returns(initialContex());
                const toDataURL = sinon.fake.returns(dummy());
                _setCanvas({getContext, toDataURL});
                const drawUsing = Nvc.drawUsing = sinon.spy();
                const fetchedData = Nvc.fetchPngDataString();
                assert.strictEqual(getContext.calledOnceWithExactly('2d'), true);
                assert.strictEqual(drawUsing.alwaysCalledWithExactly(getContext.getCall(0).returnValue), true);
                assert.deepStrictEqual(drawUsing.lastCall.args[0], initialContex()); // see (1) below
                assert.strictEqual(toDataURL.calledOnceWithExactly('image/png'), true);
                assert.strictEqual(toDataURL.calledAfter(drawUsing), true);
                assert.strictEqual(fetchedData, toDataURL.getCall(0).returnValue);
                // (1) the last call to drawUsing() should use the initial context of the canvas
                //         so that the UI is restored to its original state
                //     in other words, any changes to the context object should be discarded before the last call
            });
        });
    })();

    (function() {
        describe('fetchSvgString()', () => {
            it('should bahave as expected', () => {
                for(const indents of jsonStringifyIndents) {
                    const drawUsing = Nvc.drawUsing = sinon.spy();
                    const fetchedData = Nvc.fetchSvgString(indents);
                    assert.strictEqual(drawUsing.calledOnce, true);
                    assert.strictEqual(drawUsing.getCall(0).args.length, 1);
                    assert.strictEqual(fetchedData, drawUsing.getCall(0).args[0].toSvg());
                }
            });
        });
    })();

    (function() {
        describe('fetchLatexString()', () => {
            it('should bahave as expected', () => {
                const drawUsing = Nvc.drawUsing = sinon.spy();
                const fetchedData = Nvc.fetchLatexString();
                assert.strictEqual(drawUsing.calledOnce, true);
                assert.strictEqual(drawUsing.getCall(0).args.length, 1);
                assert.strictEqual(fetchedData, drawUsing.getCall(0).args[0].toLatex());
            });
        });
    })();

    (function() {
        describe('clear()', () => {
            it('should clear all data and call draw()', () => {
                for(const fsmAlphabetContainer of [undefined, null, {}, {value:dummy()}]) {
                    _setAlphabetContainer(fsmAlphabetContainer);
                    _setNodes([dummy(), dummy()]);
                    _setLinks([dummy(), dummy()]);
                    _setTextItems([dummy(), dummy()]);
                    const draw = Nvc.draw = sinon.spy();
                    Nvc.clear();
                    assert.deepStrictEqual(_getAlphabetFromContainer(fsmAlphabetContainer), '');
                    assert.deepStrictEqual(_getNodes(), []);
                    assert.deepStrictEqual(_getLinks(), []);
                    assert.deepStrictEqual(_getTextItems(), []);
                    assert.strictEqual(draw.calledOnceWithExactly(), true);
                }
            });
        });
    })();

    (function() {
        describe('loadJsonObject()', () => {
            const NvcTypes = Nvc.getTypes();
            const Node = NvcTypes.Node;
            const Link = NvcTypes.Link;
            const SelfLink = NvcTypes.SelfLink;
            const StartLink = NvcTypes.StartLink;
            const TextItem = NvcTypes.TextItem;
            const checkImpl = (obj, jsonInvalid, linkCanBeInserted, fsmAlphabetContainer) => {
                if(!obj) obj = {};
                const objFsmAlphabet = !JsuCmn.isString(obj.fsmAlphabet) ? '' : obj.fsmAlphabet;
                const objNodes = !JsuCmn.isArray(obj.nodes) ? [] : obj.nodes;
                const objLinks = !JsuCmn.isArray(obj.links) ? [] : obj.links;
                const objTextItems = !JsuCmn.isArray(obj.textItems) ? [] : obj.textItems;
                const ijson = 0; // invalid JSON: a falsy value is enough to match implementation
                const jsonForNode = () => jsonInvalid ? ijson : dummy();
                const jsonForAnyLink = sinon.fake(
                    () => jsonInvalid ? ijson : {prepareInsertionToCanvas:sinon.fake.returns(linkCanBeInserted)}
                );
                const jsonForTextItem = () => jsonInvalid ? ijson : dummy();
                const Node_fromJson = sinon.stub(Node, 'fromJson').callsFake(jsonForNode);
                const Link_fromJson = sinon.stub(Link, 'fromJson').callsFake(jsonForAnyLink);
                const SelfLink_fromJson = sinon.stub(SelfLink, 'fromJson').callsFake(jsonForAnyLink);
                const StartLink_fromJson = sinon.stub(StartLink, 'fromJson').callsFake(jsonForAnyLink);
                const TextItem_fromJson = sinon.stub(TextItem, 'fromJson').callsFake(jsonForTextItem);
                const draw = Nvc.draw = sinon.spy();
                _setAlphabetContainer(fsmAlphabetContainer);
                Nvc.loadJsonObject(obj);
                // check alphabet
                if(fsmAlphabetContainer) {
                    assert.strictEqual(fsmAlphabetContainer.value, Nvc.filterTextAccordingToCanvasRules(objFsmAlphabet));
                    assert.strictEqual(_getAlphabetFromData(), fsmAlphabetContainer.value);
                }
                else {
                    assert.strictEqual(_getAlphabetFromData(), '');
                }
                // check nodes
                assert.strictEqual(Node_fromJson.callCount, objNodes.length);
                assert.deepStrictEqual(_getNodes(), Node_fromJson.returnValues.filter(x => x !== ijson));
                // check links
                assert.strictEqual(Link_fromJson.callCount, objLinks.filter(x => x.type === 'Link').length);
                assert.strictEqual(SelfLink_fromJson.callCount, objLinks.filter(x => x.type === 'SelfLink').length);
                assert.strictEqual(StartLink_fromJson.callCount, objLinks.filter(x => x.type === 'StartLink').length);
                const createdLinks = jsonForAnyLink.returnValues; // note that the order in which links are created is preserved
                assert.strictEqual(createdLinks.filter(x => x !== ijson).every(x => x.prepareInsertionToCanvas.calledOnce), true);
                assert.deepStrictEqual(_getLinks(), createdLinks.filter(x => x !== ijson && x.prepareInsertionToCanvas.returnValues[0] === true));
                // check text items
                assert.strictEqual(TextItem_fromJson.callCount, objTextItems.length);
                assert.deepStrictEqual(_getTextItems(), TextItem_fromJson.returnValues.filter(x => x !== ijson));
                // check everything else
                assert.strictEqual(draw.called, true);
                // ...
                Node_fromJson.restore();
                Link_fromJson.restore();
                SelfLink_fromJson.restore();
                StartLink_fromJson.restore();
                TextItem_fromJson.restore();
            };
            for(const obj of [
                null, {},

                {fsmAlphabet:[]}, // fsmAlphabet is not a string
                {fsmAlphabet:dummy()+''}, // explicitly indicate that we want fsmAlphabet to be string
                {fsmAlphabet:'\\alpha s_0'}, // use raw LaTeX shortcuts in fsmAlphabet
                {fsmAlphabet:JsuLtx.convertLatexShortcuts('\\alpha s_0')}, // use converted LaTeX shortcuts in fsmAlphabet
                                                                           // these are one of the values that will be filtered by Nvc.filterTextAccordingToCanvasRules()

                {nodes:'not an array'}, {nodes:[]}, {nodes:[{}]}, {nodes:[dummy(), dummy()]},

                {links:'not an array'}, {links:[]}, {links:[{}]},
                {links:[
                    {type:'Link'}, {type:'SelfLink'}, {type:'StartLink'}, // add all link types once
                    {type:'StartLink'}, {type:'SelfLink'}, {type:'Link'}, // add all link types again but change order
                ]},

                {textItems:'not an array'}, {textItems:[]}, {textItems:[{}]}, {textItems:[dummy(), dummy()]},
            ]) {
                it(`should bahave as expected when obj=${JSON.stringify(obj)}`, () => {
                    for(const jsonInvalid of [true, false]) {
                        for(const linkCanBeInserted of [true, false]) {
                            for(const fsmAlphabetContainer of [undefined, null, {}, {value:dummy()}]) {
                                checkImpl(obj, jsonInvalid, linkCanBeInserted, fsmAlphabetContainer);
                            }
                        }
                    }
                });
            }
        });
    })();

    (function() {
        describe('loadJsonString()', () => {
             // we only handle the case where JSON is set (it has a non null value for example)
             // indeed the function being tested does nothing in the other case
             //
             const jsonValidStr = jsonStringData(true);
            it('should fail and not call loadJsonObject() if the JSON string is invalid', () => {
                const jsonParseFunc = sinon.fake.throws(dummy());
                sinon.stub(global, 'JSON').value({parse:jsonParseFunc});
                const jsonFailedToParseCallback = sinon.spy();
                const jsonLoadedCallback = sinon.spy();
                const loadJsonObject = Nvc.loadJsonObject = sinon.spy();
                Nvc.loadJsonString(jsonValidStr, jsonFailedToParseCallback, jsonLoadedCallback);
                assert.strictEqual(jsonParseFunc.calledOnce, true);
                assert.strictEqual(jsonFailedToParseCallback.calledOnceWithExactly(jsonParseFunc.getCall(0).exception), true);
                assert.strictEqual(jsonLoadedCallback.notCalled, true);
                assert.strictEqual(loadJsonObject.notCalled, true);
            });
            it('should suceed and call loadJsonObject() otherwise', () => {
                const jsonFailedToParseCallback = sinon.spy();
                const jsonLoadedCallback = sinon.spy();
                const loadJsonObject = Nvc.loadJsonObject = sinon.spy();
                Nvc.loadJsonString(jsonValidStr, jsonFailedToParseCallback, jsonLoadedCallback);
                assert.strictEqual(jsonFailedToParseCallback.notCalled, true);
                assert.strictEqual(jsonLoadedCallback.calledOnceWithExactly(), true);
                assert.strictEqual(jsonLoadedCallback.calledAfter(loadJsonObject), true);
                assert.strictEqual(loadJsonObject.calledOnceWithExactly(JSON.parse(jsonValidStr)), true);
            });
        });
    })();

    (function() {
        describe('getTypes()', () => {
            it('should return a new reference for each call', () => {
                assert.strictEqual(Nvc.getTypes() !== Nvc.getTypes(), true);
            });
            it('should return only the expected data types', () => {
                const expectedProps = ['Node', 'Link', 'SelfLink', 'StartLink', 'TextItem'];
                const wrapper = Nvc.getTypes();
                assert.strictEqual(expectedProps.every(x => x in wrapper), true);
                for(const prop of expectedProps) delete wrapper[prop];
                assert.deepStrictEqual(wrapper, {});
            });
        });
    })();

    (function() {
        describe('getData()', () => {
            it('should return a new reference for each call', () => {
                assert.strictEqual(Nvc.getData() !== Nvc.getData(), true);
            });
            it('should return only the expected data', () => {
                const expectedProps = ['fsmAlphabet', 'nodes', 'links', 'textItems'];
                for(const fsmAlphabetContainer of [undefined, null, {}, {value:dummy()}]) {
                    _setAlphabetContainer(fsmAlphabetContainer);
                    const wrapper = Nvc.getData();
                    assert.deepStrictEqual(wrapper.fsmAlphabet, _getAlphabetFromContainer(fsmAlphabetContainer));
                    assert.strictEqual(expectedProps.every(x => x in wrapper), true);
                    for(const prop of expectedProps) delete wrapper[prop];
                    assert.deepStrictEqual(wrapper, {});
                }
            });
        });
    })();

    (function() {
        const insertableCharCodeMin = 0x20;
        const insertableCharCodeMax = 0x7E;
        const validCharCodesStr = () => {
            let str = '';
            for(let i = insertableCharCodeMin; i <= insertableCharCodeMax; i++) {
                str += String.fromCharCode(i);
            }
            return str;
        };
        const invalidCharCodesStr = () => {
            let str = '';
            for(let i = 1; i <= 20; i++) {
               str += String.fromCharCode(insertableCharCodeMin - i);
               str += String.fromCharCode(insertableCharCodeMax + i);
            }
            return str;
        };
        describe('filterTextAccordingToCanvasRules()', () => {
            it('should not filter characters corresponding to valid character codes', () => {
                const str = validCharCodesStr();
                assert.strictEqual(Nvc.filterTextAccordingToCanvasRules(str), str);
            });
            it('should filter out any other characters', () => {
                const str = invalidCharCodesStr();
                assert.strictEqual(Nvc.filterTextAccordingToCanvasRules(str), '');
            });
        });
        describe('textToXml()', () => {
            const xmlSpecialCharsStr = '&<>"\'';
            const source = xmlSpecialCharsStr + validCharCodesStr() + invalidCharCodesStr();
            const target = (function() {
                let text = source;
                // implementation expected for textToXml(text)
                text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&#34;').replace(/'/g, '&#39;');
                var result = '';
                for(var i = 0; i < text.length; i++) {
                    var c = text.charCodeAt(i);
                    if(c >= insertableCharCodeMin && c <= insertableCharCodeMax) {
                        result += text[i];
                    } else {
                        result += '&#' + c + ';';
                    }
                }
                return result;
            })();
            it('should convert a text correctly', () => {
                assert.strictEqual(Nvc.textToXml(source), target);
            });
        });
    })();

    (function() {
        describe('textToLatex()', () => {
            it('should bahave as expected', () => {
                const toLatex = sinon.stub(JsuLtx, 'toLatex').returns(dummy());
                const text = dummy(), mode = dummy();
                const retVal = Nvc.textToLatex(text, mode);
                assert.strictEqual(toLatex.calledOnceWithExactly(text, mode), true);
                assert.strictEqual(retVal, toLatex.getCall(0).returnValue);
            });
        });
    })();

    (function() {
        describe('saveBackup()', () => {
            it('should save a backup correctly', () => {
                const id = dummy();
                const jsonStr = dummy();
                const setLocalStorageItem = sinon.stub(JsuCmn, 'setLocalStorageItem').returns(dummy());
                const retVal = Nvc.saveBackup(id, jsonStr);
                assert.strictEqual(setLocalStorageItem.calledOnceWithExactly(id, jsonStr), true);
                assert.strictEqual(retVal, setLocalStorageItem.getCall(0).returnValue);
            });
        });
    })();

    (function() {
        describe('restoreBackup()', () => {
            it('should restore a backup correctly', () => {
                for(const backupJsonValid of [true, false]) {
                    const backupJsonStr = jsonStringData(backupJsonValid);
                    const getLocalStorageItem = sinon.stub(JsuCmn, 'getLocalStorageItem').returns(backupJsonStr);
                    const loadJsonString = Nvc.loadJsonString = sinon.stub().callsFake(NvcBackup.loadJsonString);
                    const setLocalStorageItem = sinon.stub(JsuCmn, 'setLocalStorageItem');
                    const id = dummy();
                    const retVal = Nvc.restoreBackup(id);
                    assert.strictEqual(getLocalStorageItem.calledOnceWithExactly(id), true);
                    assert.strictEqual(loadJsonString.calledOnce, true);
                    assert.strictEqual(loadJsonString.calledAfter(getLocalStorageItem), true);
                    assert.strictEqual(loadJsonString.getCall(0).args.length === 2, true);
                    assert.strictEqual(loadJsonString.getCall(0).args[0], getLocalStorageItem.getCall(0).returnValue);
                    assert.strictEqual(typeof loadJsonString.getCall(0).args[1], 'function'); // failure callback for loadJsonString
                    assert.strictEqual(retVal, backupJsonValid);
                    if(!retVal) {
                        assert.strictEqual(setLocalStorageItem.calledOnceWithExactly(id, ''), true); // invalid backup must be cleared
                        assert.strictEqual(setLocalStorageItem.calledAfter(loadJsonString), true);
                    }
                    getLocalStorageItem.restore();
                    setLocalStorageItem.restore();
                }
            });
        });
    })();
})();
