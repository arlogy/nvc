/*
 https://github.com/arlogy/nvc
 Released under the MIT License (see LICENSE file)
 Copyright (c) 2022 https://github.com/arlogy
*/

const {loadNvcScript} = require('./setup.js');
loadNvcScript('fsm');
const {dummy, optParamVal, jsonStringifyIndents} = require('./utils.js');

const assert = require('assert');
const sinon = require('sinon');

(function() {
    // simplifies a FSM model created based on Nvc.fsm.getEmptyFsmModel(), so
    // that the model can be compared to other models using assert.*Equal()
    // functions for example; this is because the functions set by default as
    // properties in Nvc.fsm.getEmptyFsmModel() have different references
    // between models, even though they have the same behavior
    const simplifyFsmModel = (model) => {
        delete model.states.getSymbols;
        delete model.states.getSymbolsString;
        delete model.states.someInitialIn;
        delete model.states.someAcceptIn;
        delete model.states.allInitialIn;
        delete model.states.allAcceptIn;
        delete model.transitions.get;
        delete model.canvas.links.get;
        delete model.canvas.links._set;
        delete model.canvas.links._idOf;
        return model;
    };

    (function() {
        describe('parseFsmCsv()', () => {
            const fieldDelimiter = '"';
            const fieldSeparator = ',';
            const fieldSeparators = [
                fieldSeparator, fieldSeparator + ' ', fieldSeparator + '  ', fieldSeparator + '   ', fieldSeparator + '    ',
            ];
            const lineSeparators = ['\n'];
            const valuesForAllowOptions = [optParamVal, null, false, true];
            it('should correctly rely on the Jsu.CsvParser parser', () => {
                const checkImpl = (str, allowFullBlanks, allowDuplicates) => {
                    for(const recordArr of [[], [['x']], [['x', 'y']], [['x'], ['y']]]) {
                        for(const warningArr of [[], [{message:dummy()}], [{message:dummy()}, {message:dummy()}]]) {
                            const JsuCsvPsr = sinon.stub(Jsu, 'CsvParser').returns({
                                readChunk:sinon.fake(), flush:sinon.fake(),
                                getRecordsRef:sinon.fake.returns(recordArr), getWarningsRef:sinon.fake.returns(warningArr),
                            });
                            const retVal = Nvc.fsm.parseFsmCsv(str, allowFullBlanks, allowDuplicates);
                            assert.strictEqual(JsuCsvPsr.calledOnceWithExactly({fieldDelimiter, fieldSeparators, lineSeparators}), true);
                            assert.strictEqual(JsuCsvPsr.calledWithNew(), true);
                            const parser = JsuCsvPsr.getCall(0).returnValue;
                            assert.strictEqual(parser.readChunk.calledOnceWithExactly(str.replace(/\r|\n/g, '')), true);
                            assert.strictEqual(parser.flush.calledOnceWithExactly(), true);
                            assert.strictEqual(parser.flush.calledAfter(parser.readChunk), true);
                            assert.strictEqual(parser.getRecordsRef.calledOnceWithExactly(), true);
                            assert.strictEqual(parser.getRecordsRef.calledAfter(parser.flush), true);
                            assert.strictEqual(parser.getWarningsRef.calledOnceWithExactly(), true);
                            assert.strictEqual(parser.getWarningsRef.calledAfter(parser.flush), true);
                            assert.deepStrictEqual(retVal, (function() {
                                const errors = warningArr.map(w => w.message);
                                const matchArr = recordArr.length !== 0 ? recordArr[0] : [];
                                const matchMap = (function() {
                                    const obj = {};
                                    for(const m of matchArr) obj[m] = 1;
                                    return obj;
                                })();
                                return {errors, matchArr, matchMap};
                            })());
                            JsuCsvPsr.restore();
                        }
                    }
                };
                for(const str of ['no line breaks in this string', `\r.\n.${dummy()}.\r.\n.${dummy()}`]) {
                    for(const allowFullBlanks of valuesForAllowOptions) {
                        for(const allowDuplicates of valuesForAllowOptions) {
                            checkImpl(str, allowFullBlanks, allowDuplicates);
                        }
                    }
                }
            });
            it('should correctly handle the allowFullBlanks option', () => {
                for(const str of ['', ' ', '\n', '\r', '\t', '\n\r\t', '\n\r ']) {
                    for(const allowFullBlanks of valuesForAllowOptions) {
                        const obj = Nvc.fsm.parseFsmCsv(str, allowFullBlanks, false);
                        assert.deepStrictEqual(obj.errors, (function() {
                            return allowFullBlanks ? [] : ['The entire string is empty or contains only whitespaces'];
                        })());
                    }
                }
            });
            it('should correctly handle the allowDuplicates option', () => {
                const str = 'y{0}y{0}x{0}y{0}x{0}z'.format(fieldSeparator);
                for(const allowDuplicates of valuesForAllowOptions) {
                    const obj = Nvc.fsm.parseFsmCsv(str, false, allowDuplicates);
                    assert.deepStrictEqual(obj.matchMap, (function() {
                        return {x:2, y:3, z:1};
                    })());
                    assert.deepStrictEqual(obj.errors, (function() {
                        return allowDuplicates ? [] : ["Symbol 'y' is duplicated", "Symbol 'x' is duplicated"];
                    })());
                }
            });
            it('should accept only characters or LaTeX shortcuts in the matched entries', () => {
                const entries = ['x', '_0', '\\alpha', 'x\\alpha', '\\alphax', '99', '9'];
                const str = entries.join(fieldSeparator);
                for(const allowFullBlanks of valuesForAllowOptions) {
                    for(const allowDuplicates of valuesForAllowOptions) {
                        const obj = Nvc.fsm.parseFsmCsv(str, allowFullBlanks, allowDuplicates);
                        assert.deepStrictEqual(obj.errors, [
                            "Symbol 'x\\alpha' is neither a character nor a LaTeX shortcut",
                            "Symbol '\\alphax' is neither a character nor a LaTeX shortcut",
                            "Symbol '99' is neither a character nor a LaTeX shortcut",
                        ]);
                    }
                }
            });
        });
    })();

    (function() {
        describe('parseFsmAlphabet()', () => {
            it('should behave as expected', () => {
                const parseFsmCsv = Nvc.fsm.parseFsmCsv = sinon.fake.returns(dummy());
                const input = dummy();
                const retVal = Nvc.fsm.parseFsmAlphabet(input);
                assert.strictEqual(parseFsmCsv.calledOnceWithExactly(input, true, false), true);
                assert.strictEqual(retVal, parseFsmCsv.getCall(0).returnValue);
            });
        });
    })();

    (function() {
        describe('parseFsmTransitionInput()', () => {
            it('should behave as expected', () => {
                const parseFsmCsv = Nvc.fsm.parseFsmCsv = sinon.fake.returns(dummy());
                const input = dummy();
                const retVal = Nvc.fsm.parseFsmTransitionInput(input);
                assert.strictEqual(parseFsmCsv.calledOnceWithExactly(input, false, true), true);
                assert.strictEqual(retVal, parseFsmCsv.getCall(0).returnValue);
            });
        });
    })();

    (function() {
        describe('getEmptyFsmModel()', () => {
            it('should return an object with the expected properties correctly initialized', () => {
                const initSymb = '->', accSymb = '*'; // initial and accept symbols for a FSM model
                const model = Nvc.fsm.getEmptyFsmModel(); // all properties are checked below
                                                          //     sometimes a temporary model is created to avoid modifying the original
                                                          //     and undoing the changes made to it
                assert.deepStrictEqual(model.errors, []);
                assert.deepStrictEqual(model.alphabet, []);
                const states = model.states;
                assert.deepStrictEqual(states.all, []);
                assert.deepStrictEqual(states.initial, []);
                assert.deepStrictEqual(states.accept, []);
                (function() {
                    assert.deepStrictEqual(states.getSymbols(true, true), {initial:initSymb, accept:accSymb});
                    assert.deepStrictEqual(states.getSymbols(true, false), {initial:initSymb, accept:''});
                    assert.deepStrictEqual(states.getSymbols(false, true), {initial:'', accept:accSymb});
                    assert.deepStrictEqual(states.getSymbols(false, false), {initial:'', accept:''});
                })();
                (function() {
                    assert.deepStrictEqual(states.getSymbolsString(true, true), initSymb+' '+accSymb);
                    assert.deepStrictEqual(states.getSymbolsString(true, false), initSymb);
                    assert.deepStrictEqual(states.getSymbolsString(false, true), accSymb);
                    assert.deepStrictEqual(states.getSymbolsString(false, false), '');
                })();
                (function() {
                    const tmpStates = Nvc.fsm.getEmptyFsmModel().states;
                    assert.strictEqual(tmpStates.someInitialIn(['s1']), false);
                    assert.strictEqual(tmpStates.someInitialIn(['s2']), false);
                    assert.strictEqual(tmpStates.someInitialIn(['s1', 's2']), false);
                    tmpStates.initial.push('s1');
                    assert.strictEqual(tmpStates.someInitialIn(['s1']), true);
                    assert.strictEqual(tmpStates.someInitialIn(['s2']), false);
                    assert.strictEqual(tmpStates.someInitialIn(['s1', 's2']), true);
                    tmpStates.initial.push('s2');
                    assert.strictEqual(tmpStates.someInitialIn(['s1']), true);
                    assert.strictEqual(tmpStates.someInitialIn(['s2']), true);
                    assert.strictEqual(tmpStates.someInitialIn(['s1', 's2']), true);
                })();
                (function() {
                    const tmpStates = Nvc.fsm.getEmptyFsmModel().states;
                    assert.strictEqual(tmpStates.someAcceptIn(['s1']), false);
                    assert.strictEqual(tmpStates.someAcceptIn(['s2']), false);
                    assert.strictEqual(tmpStates.someAcceptIn(['s1', 's2']), false);
                    tmpStates.accept.push('s1');
                    assert.strictEqual(tmpStates.someAcceptIn(['s1']), true);
                    assert.strictEqual(tmpStates.someAcceptIn(['s2']), false);
                    assert.strictEqual(tmpStates.someAcceptIn(['s1', 's2']), true);
                    tmpStates.accept.push('s2');
                    assert.strictEqual(tmpStates.someAcceptIn(['s1']), true);
                    assert.strictEqual(tmpStates.someAcceptIn(['s2']), true);
                    assert.strictEqual(tmpStates.someAcceptIn(['s1', 's2']), true);
                })();
                (function() {
                    const tmpStates = Nvc.fsm.getEmptyFsmModel().states;
                    assert.strictEqual(tmpStates.allInitialIn(['s1']), false);
                    tmpStates.initial.push('s1', 's2');
                    assert.strictEqual(tmpStates.allInitialIn(['s1']), true);
                    assert.strictEqual(tmpStates.allInitialIn(['s2']), true);
                    assert.strictEqual(tmpStates.allInitialIn(['s1', 's2']), true);
                    assert.strictEqual(tmpStates.allInitialIn(['s1', 's2', 's3']), false);
                })();
                (function() {
                    const tmpStates = Nvc.fsm.getEmptyFsmModel().states;
                    assert.strictEqual(tmpStates.allAcceptIn(['s1']), false);
                    tmpStates.accept.push('s1', 's2');
                    assert.strictEqual(tmpStates.allAcceptIn(['s1']), true);
                    assert.strictEqual(tmpStates.allAcceptIn(['s2']), true);
                    assert.strictEqual(tmpStates.allAcceptIn(['s1', 's2']), true);
                    assert.strictEqual(tmpStates.allAcceptIn(['s1', 's2', 's3']), false);
                })();
                const transitions = model.transitions;
                assert.deepStrictEqual(transitions.all, {});
                (function() {
                    const entries = [undefined, null, 0, '', [], [dummy(), dummy()], {}, function() {}];
                    const tmpTransitions = Nvc.fsm.getEmptyFsmModel().transitions;
                    assert.deepStrictEqual(tmpTransitions.get('s1', 'x'), []);
                    // when the transition data of 's1' does not have the 'x' property
                    for(const val of entries) {
                        tmpTransitions.all['s1'] = val;
                        assert.deepStrictEqual(tmpTransitions.get('s1', 'x'), []);
                    }
                    // when the transition data of 's1' has the 'x' property
                    for(const val of entries) {
                        tmpTransitions.all['s1'] = {x:val};
                        assert.deepStrictEqual(tmpTransitions.get('s1', 'x'), val === undefined ? [] : val);
                    }
                })();
                const canvas = model.canvas;
                assert.deepStrictEqual(canvas.nodes, {});
                (function() {
                    const tmpLinks = Nvc.fsm.getEmptyFsmModel().canvas.links;
                    assert.deepStrictEqual(tmpLinks.get('s1', 'x', 's2'), undefined);
                    tmpLinks._data['s1-x-s2'] = null;
                    assert.deepStrictEqual(tmpLinks.get('s1', 'x', 's2'), null);
                    tmpLinks._data['s1-x-s2'] = dummy();
                    assert.deepStrictEqual(tmpLinks.get('s1', 'x', 's2'), tmpLinks._data['s1-x-s2']);
                })();
            });
            it('should return distinct references for multiple calls', () => {
                const func = Nvc.fsm.getEmptyFsmModel;
                const a = func(), b = func(), c = func();
                assert.strictEqual(a === b, false);
                assert.strictEqual(b === c, false);
                assert.strictEqual(a === c, false);
            });
        });
    })();

    (function() {
        describe('buildFsmModel()', () => {
            function Link(from, to) { // constructor function
                this.text = `\r ${dummy()} \t`; // add white spaces because we want to check that the text is trimmed
                this.getTwoExtremityNodes = function() { return [{text:from}, {text:to}]; };
                this.__testData = `a link from '${from}' to '${to}'`; // useful when the link is logged
            }
            function SelfLink(from) { // constructor function
                this.text = `\r ${dummy()} \t`; // add white spaces because we want to check that the text is trimmed
                this.getTwoExtremityNodes = function() { return [{text:from}, {text:from}]; };
                this.__testData = `a link from '${from}' to itself`; // useful when the link is logged
            }
            const typesWrapper = Nvc.getTypes();
            delete typesWrapper.Link;
            delete typesWrapper.SelfLink;
            const alphabetExpectations = {
                'invalid alphabet': {
                    value: dummy(),
                    parsedData: { errors:[dummy(), dummy()] },
                    updateFsmModel: function(fsmObj) {
                        fsmObj.errors.push(...this.parsedData.errors.map(x => '[alphabet] ' + x));
                    },
                },
                'valid alphabet': {
                    value: dummy(),
                    parsedData: { errors:[], matchArr:[dummy(), dummy()] },
                    updateFsmModel: function(fsmObj) {
                        fsmObj.alphabet = this.parsedData.matchArr;
                    },
                },
            };
            const nodesExpectations = {
                'no nodes': {
                    value: [],
                    updateFsmModel: function() {},
                },
                'nodes with empty text (1)': {
                    value: [ { text:''} ],
                    updateFsmModel: function(fsmObj) {
                        fsmObj.errors.push('The ID of a state is empty');
                    },
                },
                'nodes with empty text (2)': {
                    value: [ { text:'\r \t'} ],
                    updateFsmModel: function(fsmObj) {
                        fsmObj.errors.push('The ID of a state is empty');
                    },
                },
                'nodes with empty text (3)': {
                    value: [ { text:''}, { text:'\r \t'} ],
                    updateFsmModel: function(fsmObj) {
                        fsmObj.errors.push('The ID of a state is empty', 'The ID of a state is empty');
                    },
                },
                'nodes with non-empty text & no duplicates': {
                    value: [ { text:'state 0' }, { text:'s1' }, { text:'s2', isInitialState:true }, { text:'s3', isAcceptState:true }, { text:'s4', isInitialState:true, isAcceptState:true } ],
                    updateFsmModel: function(fsmObj) {
                        const fsmCanvas = fsmObj.canvas, fsmStates = fsmObj.states;
                        fsmCanvas.nodes['state 0'] = this.value[0]; fsmStates.all.push('state 0');
                        fsmCanvas.nodes['s1'] = this.value[1]; fsmStates.all.push('s1');
                        fsmCanvas.nodes['s2'] = this.value[2]; fsmStates.all.push('s2'); fsmStates.initial.push('s2');
                        fsmCanvas.nodes['s3'] = this.value[3]; fsmStates.all.push('s3'); fsmStates.accept.push('s3');
                        fsmCanvas.nodes['s4'] = this.value[4]; fsmStates.all.push('s4'); fsmStates.initial.push('s4'); fsmStates.accept.push('s4');
                    },
                },
                'nodes with non-empty text & duplicates (1)': {
                    value: [ { text:'s1' }, { text:'s1' }, { text:'s2' }, { text:'\r s2 \t' }, { text:'\r s3 \t' }, { text:'s3' }, { text:'s4' }, { text:'s4' }, { text:'s4' }, { text:'s5' } ],
                    updateFsmModel: function(fsmObj) {
                        const fsmCanvas = fsmObj.canvas, fsmStates = fsmObj.states, fsmErrors = fsmObj.errors;
                        fsmCanvas.nodes['s1'] = this.value[0]; fsmStates.all.push('s1'); fsmErrors.push("State 's1' is declared more than once");
                        fsmCanvas.nodes['s2'] = this.value[2]; fsmStates.all.push('s2'); fsmErrors.push("State 's2' is declared more than once");
                        fsmCanvas.nodes['s3'] = this.value[4]; fsmStates.all.push('s3'); fsmErrors.push("State 's3' is declared more than once");
                        fsmCanvas.nodes['s4'] = this.value[6]; fsmStates.all.push('s4'); fsmErrors.push("State 's4' is declared more than once", "State 's4' is declared more than once");
                        fsmCanvas.nodes['s5'] = this.value[9]; fsmStates.all.push('s5');
                    },
                },
                'nodes with non-empty text & duplicates (2)': {
                    value: [ { text:'s1' }, { text:'\r s1 \t', isInitialState:true, isAcceptState:true }, { text:'s2', isInitialState:true, isAcceptState:true }, { text:'\r s2 \t' } ],
                    updateFsmModel: function(fsmObj) {
                        const fsmCanvas = fsmObj.canvas, fsmStates = fsmObj.states, fsmErrors = fsmObj.errors;
                        fsmCanvas.nodes['s1'] = this.value[0]; fsmStates.all.push('s1'); fsmErrors.push("State 's1' is declared more than once");
                        fsmCanvas.nodes['s2'] = this.value[2]; fsmStates.all.push('s2'); fsmStates.initial.push('s2'); fsmStates.accept.push('s2'); fsmErrors.push("State 's2' is declared more than once");
                    },
                },
                'nodes with a case of each of the other configurations': { // [non-]empty text, [non-]duplicates
                    value: [ { text:'' }, { text:'s1' }, { text:'s2' }, { text:'\r s2 \t' } ],
                    updateFsmModel: function(fsmObj) {
                        const fsmCanvas = fsmObj.canvas, fsmStates = fsmObj.states, fsmErrors = fsmObj.errors;
                        fsmErrors.push('The ID of a state is empty');
                        fsmCanvas.nodes['s1'] = this.value[1]; fsmStates.all.push('s1');
                        fsmCanvas.nodes['s2'] = this.value[2]; fsmStates.all.push('s2'); fsmErrors.push("State 's2' is declared more than once");
                    },
                },
            };
            const linksExpectations = {
                'no links': {
                    entries: [],
                    updateFsmModel: function() {},
                },
                'links of unexpected type': { // i.e. not Link, not SelfLink
                    entries: [
                        { value: dummy() },
                        { value: {} },
                        ...Object.values(typesWrapper).map(X => ({value: new X})),
                    ],
                    updateFsmModel: function() {},
                },
                'links of expected type & invalid transition strings': {
                    entries: [
                        { value: new Link('\r s1 \t', '\r ab \t'), parsedData: { errors: [dummy(), dummy()] } },
                        { value: new SelfLink('\r s2 \t'), parsedData: { errors: [dummy(), dummy()] } },
                        { value: new Link('s3', 's3'), parsedData: { errors: [dummy(), dummy()] } }, // s3 appears several times
                        { value: new SelfLink('s3'), parsedData: { errors: [dummy(), dummy()] } },
                    ],
                    updateFsmModel: function(fsmObj) {
                        fsmObj.errors.push(`Transition ('s1', '${this.entries[0].value.text.trim()}', 'ab') has an invalid comma-separated string`);
                        fsmObj.errors.push(...this.entries[0].parsedData.errors.map(x => '    ' + x));

                        fsmObj.errors.push(`Transition ('s2', '${this.entries[1].value.text.trim()}', 's2') has an invalid comma-separated string`);
                        fsmObj.errors.push(...this.entries[1].parsedData.errors.map(x => '    ' + x));

                        fsmObj.errors.push(`Transition ('s3', '${this.entries[2].value.text.trim()}', 's3') has an invalid comma-separated string`);
                        fsmObj.errors.push(...this.entries[2].parsedData.errors.map(x => '    ' + x));

                        fsmObj.errors.push(`Transition ('s3', '${this.entries[3].value.text.trim()}', 's3') has an invalid comma-separated string`);
                        fsmObj.errors.push(...this.entries[3].parsedData.errors.map(x => '    ' + x));
                    },
                },
                'links of expected type & valid transition strings & no transition inputs': {
                    entries: [
                        { value: new Link('\r s1 \t', dummy()), parsedData: { errors: [], matchArr: [] } },
                        { value: new SelfLink('\r s2 \t'), parsedData: { errors: [], matchArr: [] } },
                        { value: new Link('s3', 's3'), parsedData: { errors: [], matchArr: [] } }, // s3 appears several times
                        { value: new SelfLink('s3'), parsedData: { errors: [], matchArr: [] } },
                    ],
                    updateFsmModel: function(fsmObj) {
                        fsmObj.transitions.all['s1'] = {};
                        fsmObj.transitions.all['s2'] = {};
                        fsmObj.transitions.all['s3'] = {};
                    },
                },
                'links of expected type & valid transition strings & transition inputs not declared in alphabet': {
                    entries: [
                        { value: new Link('\r s1 \t', dummy()), parsedData: { errors: [], matchArr: ['1.1', '1.2'] } },
                        { value: new SelfLink('\r s2 \t'), parsedData: { errors: [], matchArr: ['2.2', '1.2'] } },
                        { value: new Link('s3', 's3'), parsedData: { errors: [], matchArr: ['3.1'] } }, // s3 appears several times
                        { value: new SelfLink('s3'), parsedData: { errors: [], matchArr: ['3.2'] } },
                    ],
                    parsedAlphabetDataMap: { '1.1':false, '1.2':0 }, // the other transition inputs that are not set will also be considered absent from the alphabet
                    updateFsmModel: function(fsmObj) {
                        fsmObj.transitions.all['s1'] = {};
                        fsmObj.errors.push("Transition input '1.1' is not declared in alphabet");
                        fsmObj.errors.push("Transition input '1.2' is not declared in alphabet");

                        fsmObj.transitions.all['s2'] = {};
                        fsmObj.errors.push("Transition input '2.2' is not declared in alphabet");
                        fsmObj.errors.push("Transition input '1.2' is not declared in alphabet");

                        fsmObj.transitions.all['s3'] = {};
                        fsmObj.errors.push("Transition input '3.1' is not declared in alphabet");
                        fsmObj.errors.push("Transition input '3.2' is not declared in alphabet");
                    },
                },
                'links of expected type & valid transition strings & transition inputs declared in alphabet & no duplicate transitions': {
                    entries: [
                        { value: new Link('\r s1 \t', '\r ab \t'), parsedData: { errors: [], matchArr: ['1.1', '1.2', '1.3', '1.4'] } },
                        { value: new SelfLink('\r s2 \t'), parsedData: { errors: [], matchArr: ['1.4', '1.1'] } },
                        { value: new Link('s3', 'yz'), parsedData: { errors: [], matchArr: ['1.1', '1.3'] } }, // s3 appears several times
                        { value: new SelfLink('s3'), parsedData: { errors: [], matchArr: ['1.3', '1.2'] } },
                    ],
                    parsedAlphabetDataMap: { '1.1':true, '1.2':1, '1.3':2, '1.4':3 },
                    updateFsmModel: function(fsmObj) {
                        fsmObj.transitions.all['s1'] = {
                            '1.1':['ab'], '1.2':['ab'], '1.3':['ab'], '1.4':['ab'],
                        };
                        fsmObj.canvas.links._data['s1-1.1-ab'] = this.entries[0].value;
                        fsmObj.canvas.links._data['s1-1.2-ab'] = this.entries[0].value;
                        fsmObj.canvas.links._data['s1-1.3-ab'] = this.entries[0].value;
                        fsmObj.canvas.links._data['s1-1.4-ab'] = this.entries[0].value;

                        fsmObj.transitions.all['s2'] = {
                            '1.1':['s2'], '1.4':['s2'],
                        };
                        fsmObj.canvas.links._data['s2-1.4-s2'] = this.entries[1].value;
                        fsmObj.canvas.links._data['s2-1.1-s2'] = this.entries[1].value;

                        fsmObj.transitions.all['s3'] = {
                            '1.1':['yz'], '1.2':['s3'], '1.3':['yz', 's3'],
                        };
                        fsmObj.canvas.links._data['s3-1.1-yz'] = this.entries[2].value;
                        fsmObj.canvas.links._data['s3-1.3-yz'] = this.entries[2].value;
                        fsmObj.canvas.links._data['s3-1.3-s3'] = this.entries[3].value;
                        fsmObj.canvas.links._data['s3-1.2-s3'] = this.entries[3].value;
                    },
                },
                'links of expected type & valid transition strings & transition inputs declared in alphabet & duplicate transitions': {
                    entries: [
                        { value: new Link('\r s1 \t', '\r ab \t'), parsedData: { errors: [], matchArr: ['1.1', '1.2', '1.1'] } },
                        { value: new SelfLink('\r s2 \t'), parsedData: { errors: [], matchArr: ['1.1', '1.1', '1.1'] } },
                        { value: new Link('s3', 's3'), parsedData: { errors: [], matchArr: ['1.1', '1.3'] } }, // s3 appears several times
                        { value: new SelfLink('s3'), parsedData: { errors: [], matchArr: ['1.3', '1.1'] } },
                    ],
                    parsedAlphabetDataMap: { '1.1':true, '1.2':1, '1.3':2 },
                    updateFsmModel: function(fsmObj) {
                        fsmObj.transitions.all['s1'] = {
                            '1.1':['ab'], '1.2':['ab'],
                        };
                        fsmObj.canvas.links._data['s1-1.1-ab'] = this.entries[0].value;
                        fsmObj.canvas.links._data['s1-1.2-ab'] = this.entries[0].value;
                        fsmObj.errors.push("Transition ('s1', '1.1', 'ab') is duplicated");

                        fsmObj.transitions.all['s2'] = {
                            '1.1':['s2'],
                        };
                        fsmObj.canvas.links._data['s2-1.1-s2'] = this.entries[1].value;
                        fsmObj.errors.push("Transition ('s2', '1.1', 's2') is duplicated");
                        fsmObj.errors.push("Transition ('s2', '1.1', 's2') is duplicated");

                        fsmObj.transitions.all['s3'] = {
                            '1.1':['s3'], '1.3':['s3'],
                        };
                        fsmObj.canvas.links._data['s3-1.1-s3'] = this.entries[2].value;
                        fsmObj.canvas.links._data['s3-1.3-s3'] = this.entries[2].value;
                        fsmObj.errors.push("Transition ('s3', '1.3', 's3') is duplicated");
                        fsmObj.errors.push("Transition ('s3', '1.1', 's3') is duplicated");
                    },
                },
                'links with a case of each of the other configurations': { // [un]expected types, [in]valid transition strings, no transition inputs or they are [un]declared in alphabet,
                                                                           // [non-]duplicate transitions
                    entries: [
                        { value: dummy() },
                        { value: new Link('\r s1_1 \t', '\r ab \t'), parsedData: { errors: [dummy(), dummy()] } },
                        { value: new SelfLink('\r s1_2 \t'), parsedData: { errors: [dummy(), dummy()] } },
                        { value: new SelfLink('\r s2_1 \t', dummy()), parsedData: { errors: [], matchArr: [] } },
                        { value: new SelfLink('\r s2_2 \t'), parsedData: { errors: [], matchArr: [] } },
                        { value: new Link('\r s3_1 \t', dummy()), parsedData: { errors: [], matchArr: ['undecl. input 1'] } },
                        { value: new SelfLink('\r s3_2 \t'), parsedData: { errors: [], matchArr: ['undecl. input 2'] } },
                        { value: new Link('\r s4_1 \t', '\r cd \t'), parsedData: { errors: [], matchArr: ['1.2', '1.1'] } },
                        { value: new SelfLink('\r s4_2 \t'), parsedData: { errors: [], matchArr: ['1.1'] } },
                        { value: new Link('\r s5 \t', '\r ef \t'), parsedData: { errors: [], matchArr: ['1.1', '1.1'] } },
                    ],
                    parsedAlphabetDataMap: { '1.1':1, '1.2':2 },
                    updateFsmModel: function(fsmObj) {
                        fsmObj.errors.push(`Transition ('s1_1', '${this.entries[1].value.text.trim()}', 'ab') has an invalid comma-separated string`);
                        fsmObj.errors.push(...this.entries[1].parsedData.errors.map(x => '    ' + x));
                        fsmObj.errors.push(`Transition ('s1_2', '${this.entries[2].value.text.trim()}', 's1_2') has an invalid comma-separated string`);
                        fsmObj.errors.push(...this.entries[2].parsedData.errors.map(x => '    ' + x));

                        fsmObj.transitions.all['s2_1'] = {};
                        fsmObj.transitions.all['s2_2'] = {};

                        fsmObj.transitions.all['s3_1'] = {};
                        fsmObj.errors.push("Transition input 'undecl. input 1' is not declared in alphabet");
                        fsmObj.transitions.all['s3_2'] = {};
                        fsmObj.errors.push("Transition input 'undecl. input 2' is not declared in alphabet");

                        fsmObj.transitions.all['s4_1'] = {
                            '1.1':['cd'], '1.2':['cd'],
                        };
                        fsmObj.canvas.links._data['s4_1-1.2-cd'] = this.entries[7].value;
                        fsmObj.canvas.links._data['s4_1-1.1-cd'] = this.entries[7].value;
                        fsmObj.transitions.all['s4_2'] = {
                            '1.1':['s4_2'],
                        };
                        fsmObj.canvas.links._data['s4_2-1.1-s4_2'] = this.entries[8].value;

                        fsmObj.transitions.all['s5'] = {
                            '1.1':['ef'],
                        };
                        fsmObj.canvas.links._data['s5-1.1-ef'] = this.entries[9].value;
                        fsmObj.errors.push("Transition ('s5', '1.1', 'ef') is duplicated");
                    },
                },
            };
            it('should bahave as expected', () => {
                for(const [alphabetExpKey, alphabetExpVal] of Object.entries(alphabetExpectations)) {
                    for(const [nodesExpKey, nodesExpVal] of Object.entries(nodesExpectations)) {
                        for(const [linksExpKey, linksExpVal] of Object.entries(linksExpectations)) {
                            for(const ensureInitialState of [
                                null, false, // will disable the option
                                optParamVal, true, 1, dummy(), // will enable the option
                            ]) {
                                try {
                                    const parsedAlphabetDataMap = linksExpVal.parsedAlphabetDataMap ?? alphabetExpVal.parsedData.matchMap;
                                    const getData = Nvc.getData = sinon.fake.returns({
                                        fsmAlphabet:alphabetExpVal.value, nodes:nodesExpVal.value, links:linksExpVal.entries.map(x => x.value),
                                    });
                                    const getTypes = Nvc.getTypes = sinon.fake.returns({...typesWrapper, Link, SelfLink});
                                    const parseFsmAlphabet = Nvc.fsm.parseFsmAlphabet = sinon.fake.returns({...alphabetExpVal.parsedData, matchMap:parsedAlphabetDataMap});
                                    const hasValidLinkType = x => x.value instanceof Link || x.value instanceof SelfLink;
                                    const transitionDataArr = linksExpVal.entries.filter(hasValidLinkType).map(x => x.parsedData);
                                    let transitionDataIdx = -1;
                                    const parseFsmTransitionInput = Nvc.fsm.parseFsmTransitionInput = sinon.fake(() => {
                                        transitionDataIdx++;
                                        return transitionDataArr[transitionDataIdx];
                                    });
                                    const actualRetVal = Nvc.fsm.buildFsmModel(ensureInitialState);
                                    const expectedRetVal = (function() {
                                        const fsmObj = Nvc.fsm.getEmptyFsmModel();
                                        alphabetExpVal.updateFsmModel(fsmObj);
                                        nodesExpVal.updateFsmModel(fsmObj);
                                        if(ensureInitialState === optParamVal || ensureInitialState) {
                                            if(fsmObj.states.initial.length === 0) {
                                                fsmObj.errors.push('No state has been marked initial');
                                            }
                                        }
                                        linksExpVal.updateFsmModel(fsmObj);
                                        return fsmObj;
                                    })();
                                    assert.strictEqual(getData.calledOnceWithExactly(), true);
                                    assert.strictEqual(getTypes.calledOnceWithExactly(), true);
                                    assert.strictEqual(parseFsmAlphabet.calledOnceWithExactly(alphabetExpVal.value), true);
                                    assert.deepStrictEqual(
                                        parseFsmTransitionInput.getCalls().map(x => x.args),
                                        linksExpVal.entries.filter(hasValidLinkType).map(x => [x.value.text.trim()])
                                    );
                                    assert.deepStrictEqual(simplifyFsmModel(actualRetVal), simplifyFsmModel(expectedRetVal));
                                }
                                catch(e) {
                                    console.log('FSM expectations')
                                    console.log(`  alphabet: ${alphabetExpKey}`);
                                    console.log(`  nodes: ${nodesExpKey}`);
                                    console.log(`  links: ${linksExpKey}`);
                                    console.log(e.stack);
                                    throw new Error('something went wrong when checking FSM expectations: see stack trace above the output of the corresponding it() block');
                                }
                            }
                        }
                    }
                }
            });
        });
    })();

    (function() {
        describe('sortFsmModel()', () => {
            const randInt = (max) => Math.floor(Math.random() * max);
            const getSortData = () => { // returns the actual data that will be sorted when sortFsmModel() is called on a model
                const arr = ['a', 'z', '0', '9', '_0', '_9', '\\epsilon', '\\gamma', '\\delta']; // all LaTeX shortcuts are raw (unconverted)
                arr.splice(randInt(arr.length - 1), 0, dummy()); // insert an element at a randomly chosen index
                arr.splice(randInt(arr.length - 1), 0, dummy()); // do it one more time
                return arr;
            };
            const getModel = () => { // returns a model with custom initialization for properties that will be changed during sortFsmModel()
                const model = Nvc.fsm.getEmptyFsmModel();
                model.alphabet = getSortData();
                model.states.all = getSortData();
                model.states.initial = getSortData();
                model.states.accept = getSortData();
                model.transitions.all = {
                    stateId1:undefined,
                    stateId2:{},
                    stateId3:{a:undefined, b:getSortData()},
                };
                return model;
            };
            const compareConvertedShortcutsArr = [optParamVal, null, true, false];
            it('should not change an invalid model', () => {
                for(const compareConvertedShortcuts of compareConvertedShortcutsArr) {
                    // we want to test that an invalid model is not modified after sorting
                    const model = getModel();
                    model.errors.push(dummy()); // make model invalid
                    const copy = Jsu.Common.cloneDeep(model); // copy model before sorting
                    const retVal = Nvc.fsm.sortFsmModel(model, compareConvertedShortcuts);
                    assert.strictEqual(retVal, model); // same references
                    assert.deepStrictEqual(retVal, model); // same data
                    assert.deepStrictEqual(simplifyFsmModel(model), simplifyFsmModel(copy));
                }
            });
            it('should correctly sort a valid model', () => {
                const converter = Jsu.Latex.convertLatexShortcuts;
                for(const compareConvertedShortcuts of compareConvertedShortcutsArr) {
                    const model = getModel();
                    const copy = Jsu.Common.cloneDeep(model); // copy model before sorting
                    const retVal = Nvc.fsm.sortFsmModel(model, compareConvertedShortcuts);
                    const sortedConverted = (data) => {
                        return compareConvertedShortcuts === undefined || compareConvertedShortcuts ? // would sortFsmModel() compare converted LaTeX shortcuts while sorting?
                               data.map(converter).sort() :
                               data.slice(0).sort().map(converter) // slice() because sort() would change the array otherwise
                    };
                    assert.strictEqual(retVal, model); // same references
                    assert.deepStrictEqual(retVal, model); // same data
                    assert.deepStrictEqual(model.alphabet.map(x => converter(x)), sortedConverted(copy.alphabet));
                    assert.deepStrictEqual(model.states.all.map(x => converter(x)), sortedConverted(copy.states.all));
                    assert.deepStrictEqual(model.states.initial.map(x => converter(x)), sortedConverted(copy.states.initial));
                    assert.deepStrictEqual(model.states.accept.map(x => converter(x)), sortedConverted(copy.states.accept));
                    assert.deepStrictEqual(model.transitions.all.stateId1, undefined);
                    assert.deepStrictEqual(model.transitions.all.stateId2, {});
                    assert.deepStrictEqual(
                        {...model.transitions.all.stateId3, b:model.transitions.all.stateId3.b.map(x => converter(x))},
                        {a:undefined, b:sortedConverted(copy.transitions.all.stateId3.b)}
                    );
                    // check that no other changes have been made to model during sorting
                    const empty = Nvc.fsm.getEmptyFsmModel();
                    for(const md of [model, empty]) {
                        delete md.alphabet;
                        delete md.states.all;
                        delete md.states.initial;
                        delete md.states.accept;
                        delete md.transitions.all.stateId1;
                        delete md.transitions.all.stateId2;
                        delete md.transitions.all.stateId3;
                    }
                    assert.deepStrictEqual(simplifyFsmModel(model), simplifyFsmModel(empty));
                }
            });
        });
    })();

    (function() {
        const getModel = ({alphabet, bStates, iStates, aStates, transObj}) => {
            // bStates = basic states (all possible states); iStates = initial states; aStates = accept states
            // transObj = transition object
            const model = Nvc.fsm.getEmptyFsmModel();
            model.alphabet.push(...alphabet);
            model.states.all.push(...bStates);
            model.states.initial.push(...iStates);
            model.states.accept.push(...aStates);
            model.transitions.all = transObj;
            return model;
        };
        const getInvalidModels = () => {
            const models = [
                Nvc.fsm.getEmptyFsmModel(),
                getModel({
                    alphabet:['a1','a2'], bStates:['s1','s2','s3'], iStates:['s1'], aStates:['s3'], transObj:{s1:{a1:['s1','s2','s3']}}
                }),
            ];
            models.forEach(x => { x.errors.push(dummy()); }); // make models invalid
            return models;
        };
        const getValidModelsExpectationsForTableRows = () => {
            const expectations = {
                'alphabet is not empty & no states & no transitions': {
                    input:{alphabet:['a2','a3','a1'], bStates:[], iStates:[], aStates:[], transObj:{}},
                    output:[['','','a2','a3','a1']],
                },
                'alphabet is not empty & some states & no transitions (1)': {
                    input:{alphabet:['a1','a2','a3'], bStates:['s2','s3','s4','s1'], iStates:[], aStates:[], transObj:{}},
                    output:[['','','a1','a2','a3'], ['','s2','','',''], ['','s3','','',''], ['','s4','','',''], ['','s1','','','']],
                },
                'alphabet is not empty & some states & no transitions (2)': {
                    input:{alphabet:['a1','a2','a3'], bStates:['s1','s2','s3','s4'], iStates:['s1','s4'], aStates:['s2','s4'], transObj:{}},
                    output:[['','','a1','a2','a3'], ['->','s1','','',''], ['*','s2','','',''], ['','s3','','',''], ['-> *','s4','','','']],
                },
                'alphabet is not empty & some states & some transitions': {
                    input:{alphabet:['a1','a2','a3'], bStates:['s1','s2','s3','s4'], iStates:['s1','s4'], aStates:['s2','s4'], transObj:{s1:{a1:['s1'],a2:['s1','s4','s2']},
                                                                                                                                         s2:{a2:['s3']},
                                                                                                                                         s3:{a3:['s2']},
                                                                                                                                         }},
                    output:[['','','a1','a2','a3'], ['->','s1','s1','s1, s4, s2',''], ['*','s2','','s3',''], ['','s3','','','s2'], ['-> *','s4','','','']],
                },
                'alphabet is empty & no states & no transitions': {
                    input:{alphabet:[], bStates:[], iStates:[], aStates:[], transObj:{}},
                    output:[['','']],
                },
                'alphabet is empty & some states & some transitions': {
                    input:{alphabet:[], bStates:['s1','s2','s3','s4'], iStates:['s1','s4'], aStates:['s2','s4'], transObj:{s3:{a1:['s4']},s4:{a1:['s3']}}},
                    output:[['',''], ['->','s1'], ['*','s2'], ['','s3'], ['-> *','s4']],
                },
            };
            Object.values(expectations).forEach(x => { x.input = getModel(x.input); });
            return expectations;
        };

        describe('buildFsmTransitionTableRows()', () => {
            it('should behave as expected when model is invalid', () => {
                for(const model of getInvalidModels()) {
                    const retVal = Nvc.fsm.buildFsmTransitionTableRows(model);
                    assert.deepStrictEqual(retVal, null);
                }
            });
            it('should behave as expected when model is valid', () => {
                for(const [key, exp] of Object.entries(getValidModelsExpectationsForTableRows())) {
                    try {
                        const retVal = Nvc.fsm.buildFsmTransitionTableRows(exp.input);
                        assert.deepStrictEqual(retVal, exp.output);
                    }
                    catch(e) {
                        console.log(`Expectation: ${key}`);
                        console.log(e.stack);
                        throw new Error(`something went wrong when checking expectation: see stack trace above the output of the corresponding it() block`);
                    }
                };
            });
        });

        describe('buildFsmTransitionTableHtml()', () => {
            const getHtmlData = (model, output, htmlAttrs, indents) => {
                // note: the 't' prefix in variable names means 'table'

                indents = Jsu.Common.parseSpaceAsPerJsonStringify(indents);
                const convert = Nvc.fsm.convertFsmTransitionTableHtmlEntry;

                // set table content

                let invalidFsmMsg = '';
                const tRows = Nvc.fsm.buildFsmTransitionTableRows(model);
                const theadData = [];
                const tbodyData = [];
                if(tRows !== null) {
                    let currRow = null;
        
                    // first row
                    currRow = tRows[0];
                    theadData.push('<tr>');
                    for(let j = 0; j < currRow.length; j++) {
                        theadData.push(`${indents}<th>${convert(currRow[j])}</th>`);
                    }
                    theadData.push('</tr>');
        
                    // other rows if any
                    for(let i = 1; i < tRows.length; i++) {
                        currRow = tRows[i];
                        tbodyData.push('<tr>');
                        for(let j = 0; j < currRow.length; j++) {
                            tbodyData.push(`${indents}<td>${convert(currRow[j])}</td>`);
                        }
                        tbodyData.push('</tr>');
                    }
                }
                else {
                    invalidFsmMsg = 'Finite state machine is invalid';
                    theadData.push('<tr>', `${indents}<th>${invalidFsmMsg}</th>`, '</tr>');
                    tbodyData.push('<tr>', `${indents}<td>No content available</td>`, '</tr>');
                }

                const tcolsCount = theadData.length - 2; // ignore opening <tr> and closing </tr>
                                                         // note that we could have used tbodyData.length - 2 instead

                // set HTML attributes for the table

                const idRegex = /id="([^"]+)"/;
                const tId = output.table.match(idRegex)[1]; // the HTML table ID used in the output
                let tAttrs = '', theadAttrs = '', tbodyAttrs = '';
                if(htmlAttrs) {
                    if('table' in htmlAttrs) tAttrs = htmlAttrs.table.trim();
                    if('thead' in htmlAttrs) theadAttrs = htmlAttrs.thead.trim();
                    if('tbody' in htmlAttrs) tbodyAttrs = htmlAttrs.tbody.trim();
                }
                const tRequestedIdMatch = tAttrs.match(idRegex);
                if(tRequestedIdMatch === null) { // no ID was explicitly requested for the table
                    tAttrs = `id="${tId}"` + (tAttrs !== '' ? ' ' : '') + tAttrs;
                }
                if(tAttrs !== '') tAttrs = ' ' + tAttrs;
                if(theadAttrs !== '') theadAttrs = ' ' + theadAttrs;
                if(tbodyAttrs !== '') tbodyAttrs = ' ' + tbodyAttrs;

                // set return data

                const invalidFsmMsgComment = invalidFsmMsg ? `<!-- ${invalidFsmMsg} -->\n\n` : '';
                const stateSymbols = model.states.getSymbols(true, true); // all possible symbols
                const legend = `${convert(stateSymbols.initial)}: initial state<br>${convert(stateSymbols.accept)}: accept state`;
                const tSelector = `#${tId}`;
                const tBodyFirstColsSelector =
                    model.errors.length === 0 ?
                    `${tSelector} tbody tr td:first-child, ${tSelector} tbody tr td:nth-child(2)` :
                    ''
                ;
                return {
                    table:
                        `${invalidFsmMsgComment}` +
                        '<!-- FSM State-Transition Table in HTML format\n' +
                        '     Can be saved to *.html file along with the convenient CSS code\n' +
                        '     Can also be viewed using online HTML viewers -->\n' +
                        '\n' +
                        `<table${tAttrs}>\n` +
                        `${indents}<caption>${legend}</caption>\n` +
                        `${indents}<thead${theadAttrs}>\n` +
                        `${indents}${indents}${theadData.join('\n'+indents+indents)}\n` +
                        `${indents}</thead>\n` +
                        `${indents}<tbody${tbodyAttrs}>\n` +
                        `${indents}${indents}${tbodyData.join('\n'+indents+indents)}\n` +
                        `${indents}</tbody>\n` +
                        '</table>',
                    css:
                        '<style type="text/css">\n' +
                        `${indents}#${tId} caption {\n` +
                        `${indents}${indents}caption-side: bottom;\n` +
                        `${indents}}\n` +
                        `${indents}#${tId}, #${tId} th, #${tId} td {\n` +
                        `${indents}${indents}border: 1px solid grey;\n` +
                        `${indents}}\n` +
                        `${indents}#${tId} th, #${tId} td {\n` +
                        `${indents}${indents}text-align: center;\n` +
                        `${indents}${indents}color: #333;\n` +
                        `${indents}${indents}width: ${100/tcolsCount}%;\n` +
                        `${indents}}\n` +
                        `${indents}#${tId} thead th {\n` +
                        `${indents}${indents}font-weight: normal;\n` +
                        `${indents}}\n` +
                        `${indents}#${tId} thead th, #${tId} thead td${tBodyFirstColsSelector ? ', ' : ''}${tBodyFirstColsSelector} {\n` +
                        `${indents}${indents}background-color: #333;\n` +
                        `${indents}${indents}color: white;\n` +
                        `${indents}}\n` +
                        '</style>',
                };
            };
            const htmlAttrsArr = [
                optParamVal, null, {},
                {table:dummy()}, {table:`\t${dummy()}\t`}, {table:`\tid="${dummy()}" class="${dummy()}"\t`},
                {thead:dummy()}, {thead:`\t${dummy()}\t`},
                {tbody:dummy()}, {tbody:`\t${dummy()}\t`},
                {table:dummy(), thead:dummy(), tbody:dummy()}, {table:`\tid="${dummy()}" class="${dummy()}"\t`, thead:`\t${dummy()}\t`, tbody:`\t${dummy()}\t`},
            ];
            it('should behave as expected when model is invalid', () => {
                for(const model of getInvalidModels()) {
                    for(const htmlAttrs of htmlAttrsArr) {
                        for(const indents of jsonStringifyIndents) {
                            const retVal = Nvc.fsm.buildFsmTransitionTableHtml(model, htmlAttrs, indents);
                            assert.deepStrictEqual(retVal, getHtmlData(model, retVal, htmlAttrs, indents));
                        }
                    }
                }
            });
            it('should behave as expected when model is valid', () => {
                for(const model of Object.values(getValidModelsExpectationsForTableRows()).map(x => x.input)) {
                    for(const htmlAttrs of htmlAttrsArr) {
                        for(const indents of jsonStringifyIndents) {
                            const retVal = Nvc.fsm.buildFsmTransitionTableHtml(model, htmlAttrs, indents);
                            assert.deepStrictEqual(retVal, getHtmlData(model, retVal, htmlAttrs, indents));
                        }
                    }
                }
            });
        });
    })();

    (function() {
        describe('convertFsmTransitionTableHtmlEntry()', () => {
            it('should behave as expected', () => {
                const convertLatexShortcuts = sinon.stub(Jsu.Latex, 'convertLatexShortcuts').callsFake(() => dummy());
                const textToXml = Nvc.textToXml = sinon.fake.returns(dummy());
                const input = dummy();
                const retVal = Nvc.fsm.convertFsmTransitionTableHtmlEntry(input);
                assert.strictEqual(convertLatexShortcuts.calledOnceWithExactly(input), true);
                assert.strictEqual(textToXml.calledOnceWithExactly(convertLatexShortcuts.getCall(0).returnValue), true);
                assert.strictEqual(textToXml.calledAfter(convertLatexShortcuts), true);
                assert.strictEqual(retVal, textToXml.getCall(0).returnValue);
            });
        });
    })();
})();
