/*
 https://github.com/arlogy/nvc
 Released under the MIT License (see LICENSE file)
 Copyright (c) 2020 https://github.com/arlogy
*/

if(typeof Nvc.fsm !== 'undefined')
    throw new Error('Nvc.fsm is already defined');

Nvc.fsm = (function() {
    var JsuCmn = Jsu.Common;
    var JsuLtx = Jsu.Latex;

    // Parses a comma-separated string (e.g. FSM alphabet or FSM transition
    // input) using Jsu.CsvParser. Returns an object hosting several properties:
    // see initialization of retVal in source code for more details; this is to
    // avoid redundant documentation.
    //     - str: the string to parse; '"' is the field delimiter while ','
    //       optionally followed by a maximum of four spaces are the field
    //       separators; line breaks are ignored and therefore should not be
    //       used in the string; see Jsu.CsvParser.readChunk() for detailed
    //       information on parsing rules.
    //     - allowFullBlanks: optional; indicates whether str can be empty or
    //       contain only whitespace characters; defaults to false; if falsy, an
    //       error is recorded (in the 'errors' property of the returned object)
    //       when str contains only blanks.
    //     - allowDuplicates: optional; indicates whether duplicates must be
    //       allowed in str; defaults to false; if falsy, an error is recorded
    //       (in the 'errors' property of the returned object) when a duplicate
    //       is matched.
    //     - errorPrefix: optional; the generic prefix string to use when
    //       generating error messages; defaults to the empty string.
    function parseFsmCsv(str, allowFullBlanks, allowDuplicates, errorPrefix) {
        var retVal = { // retVal referenced in above documentation to avoid duplicates
            'errors': [],   // possibly empty array of error messages
                            //     empty if the input string is successfully parsed
            'matchArr': [], // possibly empty array of characters after parsing the input string
            'matchMap': {}, // object with all and only characters in matchArr as properties
                            //     maps each character to the number of times it was found (minimum 1)
                            //     useful for checking if a character is in matchArr without traversing it
                            //         might be faster when looking up entries frequently
                            //         especially since there are no duplicate keys in the object unlike in the array
        };

        var JsuCsvPsr = Jsu.CsvParser;

        if(allowFullBlanks === undefined) allowFullBlanks = false;
        if(allowDuplicates === undefined) allowDuplicates = false;
        if(errorPrefix === undefined) errorPrefix = '';

        var errPrefixColunned = '';
        var errPrefixSpaced = '';
        if(errorPrefix !== '') {
            errPrefixColunned = errorPrefix + ': ';
            errPrefixSpaced = errorPrefix + ' input ';
        }

        // create a single line for CSV parsing, ignoring parser lineSeparators
        // (and any other line breaks as per this function's documentation)
        str = str.replace(/\r|\n/g, '');

        var blankInput = str.trim() === '';
        if(blankInput && !allowFullBlanks) {
            retVal.errors.push(errPrefixColunned + 'The entire string is empty or contains only whitespaces.');
        }

        var fieldSeparators = (function() {
            var seps = [','];
            for(var i = 0; i < 4; i++) {
                seps.push(seps[i] + ' ');
            }
            return seps;
        })();

        var entries = [];
        var parser = new JsuCsvPsr({'fieldDelimiter': '"', 'fieldSeparators': fieldSeparators, 'lineSeparators': ['\n']});
        parser.readChunk(str);
        parser.flush();
        if(parser.getRecordsRef().length !== 0) {
            entries = parser.getRecordsRef()[0]; // get the only record (no need to copy the records using getRecordsCopy())
        }
        retVal.errors.push( // treat all warnings as errors
            ...parser.getWarningsRef().map(function(w) { return errPrefixColunned + w.message; })
        );

        for(var i = 0; i < entries.length; i++) {
            var entry = entries[i];

            if(JsuLtx.convertLatexShortcuts(entry).length !== 1) {
                retVal.errors.push(errPrefixSpaced + "'{0}' is neither a character nor a LaTeX shortcut.".format(entry));
            }
            else {
                retVal.matchArr.push(entry);
                if(retVal.matchMap[entry] === undefined) {
                    retVal.matchMap[entry] = 1;
                }
                else {
                    retVal.matchMap[entry]++;
                    if(retVal.matchMap[entry] === 2 && !allowDuplicates) {
                        retVal.errors.push(errPrefixSpaced + "'{0}' is duplicated.".format(entry));
                    }
                }
            }
        }

        return retVal;
    }

    function parseFsmAlphabet(str) {
        return parseFsmCsv(str, true, false, 'Alphabet');
    }

    function parseFsmTransitionInput(str) {
        return parseFsmCsv(str, false, true, 'Transition');
    }

    // Returns an object with several properties describing an empty FSM. These
    // properties can then be initialized to represent a non-empty FSM. Indeed,
    // this function was introduced as a starting point for buildFsmModel(). See
    // detailed comments below on what to expect from the properties in a FSM
    // model; this is to avoid redundant documentation.
    function getEmptyFsmModel() {
        return {
            // please note that when string values are added to the FSM model
            //     they might contain LaTeX shortcuts that require explicit conversion (using JsuLtx.convertLatexShortcuts() for example)
            // the following data can be string values: error messages, FSM alphabet entries, state ids, etc.

            'errors': [],        // possibly empty array of error messages indicating whether the FSM is valid or not

            // important note for the other properties below except 'getSymbols' which does not depend on any FSM model
            //     to avoid long explanations, the following documentation only indicates what to expect from a valid FSM
            //     it is therefore necessary to check the validity of the FSM before accessing these properties

            'alphabet': [],      // possibly empty array of entries representing the FSM alphabet; contains no duplicates

            'states': {
                'all': [],       // possibly empty array of state ids; contains all states and no duplicates
                'initial': [],   // possibly empty array of state ids; contains only initial states and no duplicates
                'accept': [],    // possibly empty array of state ids; contains only accept states and no duplicates
                'getSymbols': function(initial, accept) { // returns an object providing textual symbols to visually represent the nature of a state
                                                          // an empty string value for any property in the object means that no symbol is required
                    var retVal = { 'initial': '', 'accept': '' };
                    if(initial) retVal.initial = '->';
                    if(accept) retVal.accept = '*';
                    return retVal;
                },
                'getSymbolsString': function(initial, accept) {
                    var symbols = this.getSymbols(initial, accept);
                    symbols = [symbols.initial, symbols.accept];
                    return symbols.filter(function(s) { return s !== ''; }).join(' ');
                },
                'someInitialIn': function(stateIds) { // returns whether at least one of the given states is an initial state
                    for(var i = 0; i < stateIds.length; i++)
                        if(this.initial.indexOf(stateIds[i]) !== -1)
                            return true;
                    return false;
                },
                'someAcceptIn': function(stateIds) { // returns whether at least one of the given states is an accept state
                    for(var i = 0; i < stateIds.length; i++)
                        if(this.accept.indexOf(stateIds[i]) !== -1)
                            return true;
                    return false;
                },
                'allInitialIn': function(stateIds) { // returns whether all of the given states are initial states
                    for(var i = 0; i < stateIds.length; i++)
                        if(this.initial.indexOf(stateIds[i]) === -1)
                            return false;
                    return true;
                },
                'allAcceptIn': function(stateIds) { // returns whether all of the given states are accept states
                    for(var i = 0; i < stateIds.length; i++)
                        if(this.accept.indexOf(stateIds[i]) === -1)
                            return false;
                    return true;
                },
            },

            'transitions': {
                'all': {},       // object mapping the ID of each state in the FSM to state-transition data if any for the state
                                 // helps to get a list of destination states if there are any, given a source state and an input (an entry in the FSM alphabet)
                                 // here are all the possible scenarios
                                 //     1.   all[<from_state_id>]          yields undefined if there is no transition from the state
                                 //     2.   all[<from_state_id>]          yields a transition object if there is at least one transition from the state
                                 //     2.1. all[<from_state_id>][<input>] yields undefined if no state is reachable from the state when the input is read
                                 //     2.2. all[<from_state_id>][<input>] yields the non-empty array of state ids reachable from the state when the input is read
                                 //                                        the array does not contain duplicates
                'get': function(fromStateId, input) { // returns the array of state ids that are reachable from a state when an input is read
                                                      //     an empty array instead of undefined is returned if no state can be reached
                    var transitionObj = this.all[fromStateId];
                    var destinationStates = transitionObj ? transitionObj[input] : [];
                    return destinationStates === undefined ? [] : destinationStates;
                },
            },

            'canvas': {
                'nodes': {},     // object to easily retrieve the canvas node corresponding to a state in the FSM
                                 //     each property is a state ID and is mapped to a node object in the canvas
                'links': {       // provides a get() function to access the link object corresponding to a transition in the FSM
                                 //     the returned value is undefined if no such transition exists
                    'get': function(fromStateId, input, toStateId) {
                        return this._data[this._idOf(fromStateId, input, toStateId)];
                    },
                    '_data': {},
                    '_set': function(fromStateId, input, toStateId, linkObj) {
                        var id = this._idOf(fromStateId, input, toStateId);
                        if(this._data[id] === undefined) {
                            this._data[id] = linkObj;
                            return true;
                        }
                        return false;
                    },
                    '_idOf': function(fromStateId, input, toStateId) {
                        return fromStateId + '-' + input + '-' + toStateId;
                    },
                },
            },
        };
    }

    // Builds and returns a FSM model from canvas content. The returned model is
    // an object whose properties are defined by getEmptyFsmModel().
    //     - ensureInitialState: optional; indicates whether the FSM must be
    //       considered invalid if it does not contain an initial state;
    //       defaults to true.
    // Once the model is created, it can be sorted using sortFsmModel().
    function buildFsmModel(ensureInitialState) {
        // useful function to ensure at least the same transformation rule for all state ids
        function processText(text) { return text.trim(); }

        var nvcData = Nvc.getData();
        var alphabetStr = nvcData.fsmAlphabet;
        var nodes = nvcData.nodes;
        var links = nvcData.links;

        var nvcTypes = Nvc.getTypes();
        var Link = nvcTypes.Link;
        var SelfLink = nvcTypes.SelfLink;

        var fsmObj = getEmptyFsmModel();
        var fsmErrors = fsmObj.errors;
        var fsmCanvas = fsmObj.canvas;
        var fsmStates = fsmObj.states;
        var fsmTransi = fsmObj.transitions;

        var i = 0;

        if(ensureInitialState === undefined) ensureInitialState = true;

        var alphabetData = parseFsmAlphabet(alphabetStr);
        if(alphabetData.errors.length === 0) {
            fsmObj.alphabet = alphabetData.matchArr;
        }
        else {
            fsmErrors.push(...alphabetData.errors);
        }

        for(i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var stateId = processText(node.text);
            if(stateId !== '') {
                if(fsmCanvas.nodes[stateId] === undefined) {
                    fsmCanvas.nodes[stateId] = node;
                    fsmStates.all.push(stateId);
                    if(node.isInitialState) {
                        fsmStates.initial.push(stateId);
                    }
                    if(node.isAcceptState) {
                        fsmStates.accept.push(stateId);
                    }
                }
                else {
                    fsmErrors.push("State '{0}' is declared more than once.".format(stateId));
                }
            }
            else {
                fsmErrors.push('The ID of a state is empty.');
            }
        }

        if(ensureInitialState) {
            if(fsmStates.initial.length === 0) {
                fsmErrors.push('No state has been marked initial.');
            }
        }

        for(i = 0; i < links.length; i++) {
            var link = links[i];
            if(link instanceof Link || link instanceof SelfLink) {
                var linkText = processText(link.text);
                var linkNodes = link.getTwoExtremityNodes();
                var transitionState1Id = processText(linkNodes[0].text);
                var transitionState2Id = processText(linkNodes[1].text);
                var transitionInputData = parseFsmTransitionInput(linkText);
                if(transitionInputData.errors.length === 0) {
                    if(fsmTransi.all[transitionState1Id] === undefined)
                        fsmTransi.all[transitionState1Id] = {};
                    var transitionObj = fsmTransi.all[transitionState1Id];
                    for(var j = 0; j < transitionInputData.matchArr.length; j++) {
                        var input = transitionInputData.matchArr[j];
                        if(alphabetData.matchMap[input]) {
                            if(fsmCanvas.links._set(transitionState1Id, input, transitionState2Id, link)) {
                                if(transitionObj[input] === undefined)
                                    transitionObj[input] = [];
                                transitionObj[input].push(transitionState2Id);
                            }
                            else {
                                fsmErrors.push(
                                    "Transition ('{0}', '{1}', '{2}') is duplicated."
                                   .format(transitionState1Id, input, transitionState2Id)
                                );
                            }
                        }
                        else {
                            fsmErrors.push("Transition input '{0}' is not declared in alphabet.".format(input));
                        }
                    }
                }
                else {
                    fsmErrors.push(
                        "Transition ('{0}', '{1}', '{2}') has an invalid comma-separated string."
                       .format(transitionState1Id, linkText, transitionState2Id)
                    );
                    fsmErrors.push(...transitionInputData.errors.map(function(err) { return '    ' + err; }));
                }
            }
        }

        return fsmObj;
    }

    // Sorts a FSM model if it is valid, does nothing otherwise. Useful when
    // displaying a FSM to the user for example. Note that the model is modified
    // directly, but it is also returned by this function.
    //     - model: the FSM model to sort; must have been initialized according
    //       to buildFsmModel(); see information below on how it is sorted.
    //           - The alphabet is sorted in ascending order.
    //           - All arrays of state ids are sorted in ascending order,
    //             including those that can be retrieved using the 'transitions'
    //             property of the model.
    //                 As for the 'transitions' property of the model, be aware
    //                 that the traversal order of the 'for ... in' statement is
    //                 either implementation-specific or defined by recent
    //                 versions of the ECMAScript specification. So instead of
    //                 iterating over 'transitions.all' which would not
    //                 necessarily preserve the order in 'states.all', one might
    //                 want to loop over 'states.all' instead and only look
    //                 entries up in 'transitions.all'.
    //           - No other properties are sorted.
    //     - compareConvertedShortcuts: optional; indicates whether (when
    //       sorting model) each entry must be compared as is or first converted
    //       using JsuLtx.convertLatexShortcuts(); defaults to true. When
    //       enabled, the result is the same as if each array to be sorted
    //       contained only LaTeX shortcuts converted using JsuLtx.convertLatexShortcuts().
    //           For your information, this option was introduced because
    //           sorting LaTeX shortcuts can give different results depending on
    //           whether the shortcuts are converted before or after sorting;
    //           see code sample below.
    //               var alphabet = ['a', 'z', '0', '9', '_0', '_9', '\\epsilon', '\\gamma', '\\delta']; // contains unconverted LaTeX shortcuts
    //               var converter = JsuLtx.convertLatexShortcuts;
    //               console.log(alphabet);
    //               console.log(alphabet.map(converter).sort());
    //               console.log(alphabet.slice(0).sort().map(converter)); // slice() because sort() would change the array otherwise
    function sortFsmModel(model, compareConvertedShortcuts) {
        if(model.errors.length === 0) {
            if(compareConvertedShortcuts === undefined) compareConvertedShortcuts = true;

            var compareFunc = undefined;
            if(compareConvertedShortcuts) {
                var converter = JsuLtx.convertLatexShortcuts;
                compareFunc = function(a, b) {
                    a = converter(a);
                    b = converter(b);
                    if(a < b) return -1;
                    if(a > b) return 1;
                    return 0;
                };
            }

            model.alphabet.sort(compareFunc);

            model.states.all.sort(compareFunc);
            model.states.initial.sort(compareFunc);
            model.states.accept.sort(compareFunc);

            var transitions = model.transitions.all;
            for(var fromStateId in transitions) {
                var transitionObj = transitions[fromStateId];
                if(transitionObj) {
                    for(var input in transitionObj) {
                        if(transitionObj[input] !== undefined)
                            transitionObj[input].sort(compareFunc);
                    }
                }
            }
        }
        return model;
    }

    // Builds and returns the state-transition table of a FSM model.
    //     - model: the FSM model to build a state-transition table for; must
    //       have been initialized according to buildFsmModel().
    //
    // The returned value is null if the FSM model is invalid, otherwise it is
    // an array of rows (each an array of columns) representing the
    // state-transition table. The first row can be seen as the header of the
    // table while the other rows provide its content. For debugging purposes,
    // you can easily view the rows returned by this function using console.table()
    // among others.
    //
    // Below is an example explaining the structure of the rows.
    //
    //     |----|----|----|----|------------|-----|
    //     |    |    | a  | b  | c          | ... |
    //     |----|----|----|----|------------|-----|
    //     |    | q0 | q1 | q0 |            | ... |
    //     |----|----|----|----|------------|-----|
    //     |    | q1 |    |    | q0, q1, q2 | ... |
    //     |----|----|----|----|------------|-----|
    //     |    | q2 |    |    |            | ... |
    //     |----|----|----|----|------------|-----|
    //     | .................................... | etc.
    //     |----|----|----|----|------------|-----|
    //
    //     row 1:
    //         contains two empty columns followed by FSM alphabet entries (a, b, c, ...)
    //
    //     the other rows:
    //         describe what happens if an FSM alphabet entry is read from a state
    //         so the first row will also be the last row if FSM does not contain any state
    //         here is what to know about the other rows
    //             row 2 indicates for example that the FSM does not leave q0 when b is read
    //             row 3 indicates for example that from q1 when c is read the FSM can go to state q0, q1 or q2
    //                 note that when several states can be reached, they are separated by ', '
    //             row 4 indicates that no state can be reached when a, b or c is read
    //                 note that an empty string is used when no state can be reached
    //             ...
    //             for each of these rows
    //                 column 1 (left empty in our example) uses symbols to indicate whether the state is an initial/accept state
    //                 these symbols are determined using the getSymbols() function of the FSM model
    function buildFsmTransitionTableRows(model) {
        if(model.errors.length !== 0) return null;

        var alphabet = model.alphabet;
        var allStates = model.states.all;
        var initialStates = model.states.initial;
        var acceptStates = model.states.accept;

        var statesObj = model.states;
        var transitionsObj = model.transitions;

        var rows = [];
        var cols = [];
        var i = 0;

        // header row
        cols = [];
        cols.push('');
        cols.push('');
        for(i = 0; i < alphabet.length; i++) {
            cols.push(alphabet[i]);
        }
        rows.push(cols);

        // content rows
        for(i = 0; i < allStates.length; i++) {
            var sId = allStates[i]; // state ID
            var sIdInitial = initialStates.indexOf(sId) !== -1;
            var sIdAccept = acceptStates.indexOf(sId) !== -1;
            cols = [];
            cols.push(statesObj.getSymbolsString(sIdInitial, sIdAccept));
            cols.push(sId);
            for(var j = 0; j < alphabet.length; j++) {
                var input = alphabet[j];
                cols.push(transitionsObj.get(sId, input).join(', '));
            }
            rows.push(cols);
        }

        return rows;
    }

    // Builds the state-transition table of a FSM model in HTML format and
    // returns an object with two properties: 'table' to get the HTML table
    // string and 'css' to get a convenient CSS string.
    //     - model: the FSM model to build a state-transition table for; must
    //       have been initialized according to buildFsmModel().
    //     - htmlAttrs: optional object that can have the following optional
    //       properties to initialize several HTML attributes for the table.
    //       Here is an example with each property initialized to an arbitrary
    //       value (must be a string).
    //           {table:'id="myTable" class="table-class"', thead:'class="thead-class"', tbody:'class="tbody-class"'}
    //     - indents: optional indentations similar to JSON.stringify() space
    //       parameter.
    function buildFsmTransitionTableHtml(model, htmlAttrs, indents) {
        indents = JsuCmn.parseSpaceAsPerJsonStringify(indents);

        var convert = convertFsmTransitionTableHtmlEntry;

        // set table content

        var invalidFsmMsg = '';
        var tableRows = buildFsmTransitionTableRows(model);
        var tableHead = [];
        var tableBody = [];
        if(tableRows !== null) {
            var currRow = null;
            var j = 0;

            // first row
            currRow = tableRows[0];
            tableHead.push('<tr>');
            for(j = 0; j < currRow.length; j++) {
                tableHead.push('{0}<th>{1}</th>'.format(indents, convert(currRow[j])));
            }
            tableHead.push('</tr>');

            // other rows if any
            for(var i = 1; i < tableRows.length; i++) {
                currRow = tableRows[i];
                tableBody.push('<tr>');
                for(j = 0; j < currRow.length; j++) {
                    tableBody.push('{0}<td>{1}</td>'.format(indents, convert(currRow[j])));
                }
                tableBody.push('</tr>');
            }
        }
        else {
            invalidFsmMsg = 'Finite state machine is invalid';
            tableHead.push('<tr>', '{0}<th>{1}</th>'.format(indents, invalidFsmMsg), '</tr>');
            tableBody.push('<tr>', '{0}<td>No content available</td>'.format(indents), '</tr>');
        }

        var tableColsCount = tableHead.length - 2; // ignore opening <tr> and closing </tr>
                                                   // note that we could have used tableBody.length - 2 instead

        // set HTML attributes for the table
        //     from here on we use 't' as a prefix in variable names as shorthand for 'table'

        var tAttrs = '';
        var theadAttrs = '';
        var tbodyAttrs = '';
        if(htmlAttrs) {
            if('table' in htmlAttrs) tAttrs = htmlAttrs.table;
            if('thead' in htmlAttrs) theadAttrs = htmlAttrs.thead;
            if('tbody' in htmlAttrs) tbodyAttrs = htmlAttrs.tbody;
        }

        var tId = '';
        var tIdRegex = /id="([^"]+)"/; // regex is quite permissive for simplicity
        var tIdMatch = tAttrs.match(tIdRegex);
        if(tIdMatch !== null) {
            tId = tIdMatch[1];
        }
        else {
            // set default values so that the output CSS is specific to the output table (values are picked with tIdRegex in mind)
            tId = 't_{0}'.format(Math.random().toString(32).substring(2)); // see (1) below
            tAttrs = 'id="{0}"'.format(tId) + (tAttrs === '' ? '' : ' ') + tAttrs; // use tId but also the content already in tAttrs

            // (1) substring() to remove floating-point prefix (0.)
            //     also note that the length of the generated value might be different between executions but we don't care
            //         indeed Math.random() could have generated strings of different length
        }

        tAttrs = tAttrs.trim(); if(tAttrs !== '') tAttrs = ' ' + tAttrs;
        theadAttrs = theadAttrs.trim(); if(theadAttrs !== '') theadAttrs = ' ' + theadAttrs;
        tbodyAttrs = tbodyAttrs.trim(); if(tbodyAttrs !== '') tbodyAttrs = ' ' + tbodyAttrs;

        // set output data

        var invalidFsmMsgComment = invalidFsmMsg ? '<!-- {0} -->\n\n'.format(invalidFsmMsg) : '';
        var stateSymbols = model.states.getSymbols(true, true); // all possible symbols
        var legend = '{0}: initial state<br>{1}: accept state'.format(convert(stateSymbols.initial), convert(stateSymbols.accept));
        var tContent =
            '{0}'.format(invalidFsmMsgComment)
          + '<!-- FSM State-Transition Table in HTML format\n'
          + '     Can be saved to *.html file along with the convenient CSS code\n'
          + '     Can also be viewed using online HTML viewers -->\n'
          + '\n'
          + '<table{0}>\n'.format(tAttrs)
          + '{0}<caption>{1}</caption>\n'.format(indents, legend)
          + '{0}<thead{1}>\n'.format(indents, theadAttrs)
          + '{0}{0}{1}\n'.format(indents, tableHead.join('\n'+indents+indents)) // we pass as many indents to join() as prepended to the string
          + '{0}</thead>\n'.format(indents)
          + '{0}<tbody{1}>\n'.format(indents, tbodyAttrs)
          + '{0}{0}{1}\n'.format(indents, tableBody.join('\n'+indents+indents)) // we pass as many indents to join() as prepended to the string
          + '{0}</tbody>\n'.format(indents)
          + '</table>'
        ;

        var tSelector = '#{0}'.format(tId);
        var tBodyFirstColsSelector =
            model.errors.length === 0 ?
            '{0} {1} tr td:first-child, {0} {1} tr td:nth-child(2)'.format(tSelector, 'tbody') :
            ''
        ;
        var tCss = JsuCmn.formatString(
            // the CSS string is not entered by the user, so replacement placeholders such as {indents} can be used
            '<style type="text/css">\n'
          + '{indents}{tSelector} caption {\n'
          + '{indents}{indents}caption-side: bottom;\n'
          + '{indents}}\n'
          + '{indents}{tSelector}, {tSelector} th, {tSelector} td {\n'
          + '{indents}{indents}border: 1px solid grey;\n'
          + '{indents}}\n'
          + '{indents}{tSelector} th, {tSelector} td {\n'
          + '{indents}{indents}text-align: center;\n'
          + '{indents}{indents}color: #333;\n'
          + '{indents}{indents}width: {0}%;\n'.format(100/tableColsCount)
          + '{indents}}\n'
          + '{indents}{tSelector} thead th {\n'
          + '{indents}{indents}font-weight: normal;\n'
          + '{indents}}\n'
          + '{indents}{tSelector} thead th, {tSelector} thead td{0}{tBodyFirstColsSelector} {\n' // see (1) below
           .format(tBodyFirstColsSelector ? ', ' : '')
          + '{indents}{indents}background-color: #333;\n'
          + '{indents}{indents}color: white;\n'
          + '{indents}}\n'
          + '</style>', {
            indents: indents,
            tBodyFirstColsSelector: tBodyFirstColsSelector,
            tSelector: tSelector,
        });
        // (1) the CSS selector '... thead td ...' is only used to automatically
        //     take into account cases where <td> (instead of <th>) is used in
        //     <thead>, for example when modifying the generated table

        return {
            'table': tContent,
            'css': tCss,
        };
    }

    // Used to convert entries during buildFsmTransitionTableHtml(). Can also be
    // used when building such a table without using the dedicated function.
    function convertFsmTransitionTableHtmlEntry(val) {
        return Nvc.textToXml( // to escape HTML special characters
            JsuLtx.convertLatexShortcuts(val)
        );
    }

    return {
        get parseFsmCsv() { return parseFsmCsv; }, set parseFsmCsv(v) { parseFsmCsv = v; },
        get parseFsmAlphabet() { return parseFsmAlphabet; }, set parseFsmAlphabet(v) { parseFsmAlphabet = v; },
        get parseFsmTransitionInput() { return parseFsmTransitionInput; }, set parseFsmTransitionInput(v) { parseFsmTransitionInput = v; },

        get getEmptyFsmModel() { return getEmptyFsmModel; }, set getEmptyFsmModel(v) { getEmptyFsmModel = v; },
        get buildFsmModel() { return buildFsmModel; }, set buildFsmModel(v) { buildFsmModel = v; },
        get sortFsmModel() { return sortFsmModel; }, set sortFsmModel(v) { sortFsmModel = v; },
        get buildFsmTransitionTableRows() { return buildFsmTransitionTableRows; }, set buildFsmTransitionTableRows(v) { buildFsmTransitionTableRows = v; },
        get buildFsmTransitionTableHtml() { return buildFsmTransitionTableHtml; }, set buildFsmTransitionTableHtml(v) { buildFsmTransitionTableHtml = v; },
        get convertFsmTransitionTableHtmlEntry() { return convertFsmTransitionTableHtmlEntry; }, set convertFsmTransitionTableHtmlEntry(v) { convertFsmTransitionTableHtmlEntry = v; },
    };
})();
