/*
 https://github.com/arlogy/jsu
 Released under the MIT License (see LICENSE file)
 Copyright (c) 2022 https://github.com/arlogy
*/

(function(factory) {
    if (typeof module !== 'undefined' && typeof exports !== 'undefined') {
        // export module in Node.js-like environments
        module.exports = factory(true);
    }
    else {
        // set global variable
        if(typeof Jsu === 'undefined') Jsu = {};
        if(Jsu.Latex) throw new Error('Jsu.Latex is already defined');
        Jsu.Latex = factory();
    }
})(
function(nodejs) {
    // regex-alternation-note: when entries in an object/array are joined using
    // alternation (OR) to create patterns like '...|...|...', make sure for
    // example that 'abc|a' is always created instead of 'a|abc', otherwise the
    // 'abc' part might not get a chance to match; this means that the order of
    // the elements in the object/array is important for the resulting pattern
    // to be valid.

    var JsuCmn = undefined;
    if(nodejs) {
        JsuCmn = require('./jsu_common.js');
    }
    else {
        if(typeof Jsu === 'undefined' || !Jsu.Common)
            throw new Error('Jsu.Common is required but not available');
        JsuCmn = Jsu.Common;
    }

    var API = {};

    var greekLetterNames = [
        'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
        'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho',
        'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega',
    ];

    // this object centralizes LaTeX shortcut data (mainly regular expression patterns for LaTeX shortcuts) and helps avoid copy/paste in source code
    // however, some entries are duplicated in rare places for optimal readability
    //     when this is the case, a comment referring to the duplicated properties is added
    // one must also be aware of regex-alternation-note for the regular expressions
    var latexShortcutData = (function() {
        var greekPatterns = greekLetterNames.map(function(name) {
            return ['\\\\' + name, '\\\\' + name.toLowerCase()];
        });
        greekPatterns = [].concat(...greekPatterns); // flatten array

        return {
            'greekLetter': {
                'pattern': {
                    'value': greekPatterns.join('|'), // the regular expression pattern for Greek letters
                    'list': greekPatterns, // an array from which the regular expression pattern can be built
                    'specialChar': '\\\\', // the regular expression pattern for the special character of Greek letter shortcuts
                },
                'extra': {
                    'specialChar': '\\', // the special character of Greek letter shortcuts
                    'shortcuts': greekPatterns.map(function(val) { return val.substring(1); }), // Greek letter shortcuts
                },
            },
            'subscript': { // all properties share the same meaning with greekLetter but target subscripts
                'pattern': {
                    'value': '_[0-9]',
                    'list': ['_0', '_1', '_2', '_3', '_4', '_5', '_6', '_7', '_8', '_9'],
                    'specialChar': '_',
                },
                'extra': {
                    'specialChar': '_',
                    'shortcuts': ['_0', '_1', '_2', '_3', '_4', '_5', '_6', '_7', '_8', '_9'],
                },
            },
        };
    })();

    // join LaTeX shortcut patterns using alternation (OR)
    var latexShortcutPatternForSpecialChars = '';
    var latexShortcutPatternForValues = '';
    (function() {
        var specialCharPatterns = [];
        var valuePatterns = [];
        for(var prop in latexShortcutData) {
            specialCharPatterns.push(latexShortcutData[prop].pattern.specialChar);
            valuePatterns.push(latexShortcutData[prop].pattern.value);
        }
        latexShortcutPatternForSpecialChars = specialCharPatterns.join('|');
        latexShortcutPatternForValues = valuePatterns.join('|');
    })();

    // a non-empty string that will not introduce a LaTeX shortcut if added before and/or after any string
    // e.g. 'a' is not such a character for '\bet', neither is '0' for '_'
    var safetyPadding = '-';

    // --- Data Provider ---

    // not used internally; always returns the same data (not the same array reference)
    API.getGreekLetterNames = function() {
        return JsuCmn.cloneDeep(greekLetterNames);
    };

    // not used internally; always returns the same data (not the same object reference)
    API.getLatexShortcutData = function() {
        return JsuCmn.cloneDeep(latexShortcutData);
    };

    // not used internally; always returns the same data
    API.getSafetyPadding = function() {
        return safetyPadding;
    };

    // --- Matcher ---

    API.findLatexShortcutSpecialCharsAndIndex = function(str) {
        return JsuCmn.matchAllAndIndex(str, latexShortcutPatternForSpecialChars);
    };

    API.isolateLatexShortcutData = function(str) {
        return JsuCmn.isolateMatchingData(str, latexShortcutPatternForValues);
    };

    API.isolateLatexShortcutValues = function(str) {
        return JsuCmn.isolateMatchingValues(str, latexShortcutPatternForValues);
    };

    // --- Converter

    API.convertLatexShortcuts = function(str) {
        var i = 0;

        // rules from latexShortcutData.greekLetter.pattern.value are duplicated below for readability
        var len = greekLetterNames.length;
        for(i = 0; i < len; i++) {
            var name = greekLetterNames[i];
            str = str.replace(new RegExp('\\\\' + name, 'g'), String.fromCharCode(913 + i + (i > 16)));
            str = str.replace(new RegExp('\\\\' + name.toLowerCase(), 'g'), String.fromCharCode(945 + i + (i > 16)));
        }

        // rules from latexShortcutData.subscript.pattern.value are duplicated below for readability
        for(i = 0; i < 10; i++) {
            str = str.replace(new RegExp('_' + i, 'g'), String.fromCharCode(8320 + i));
        }

        return str;
    };

    API.replaceSpecialCharsInLatexShortcuts = function(str, options) {
        if(!options) options = {};
        var greekLetterRepl = options.greekLetterRepl;
        var subscriptRepl = options.subscriptRepl;
        var padding = options.paddingEnabled ? safetyPadding : '';

        var repl = {}; // wrapper object for replacements
        if(greekLetterRepl !== undefined && greekLetterRepl !== null) repl.greekLetter = padding + greekLetterRepl + padding;
        if(subscriptRepl !== undefined && subscriptRepl !== null) repl.subscript = padding + subscriptRepl + padding;

        return API.isolateLatexShortcutData(str).map(function(data) {
            if(data.matched) {
                for(var prop in latexShortcutData) {
                    if(prop in repl) {
                        data.value = data.value.replace(new RegExp(latexShortcutData[prop].pattern.specialChar, 'g'), repl[prop]);
                    }
                }
            }
            return data.value;
        }).join('');
    };

    API.combineLatexSubscripts = function(str) {
        // rules from latexShortcutData.subscript.pattern.value are duplicated below for readability
        var matches = str.match(/_[0-9](_[0-9])+/g); // match subscripts next to each other only
        if(matches !== null) {
            for(var i = 0; i < matches.length; i++) {
                str = str.replace(matches[i], '_{' + matches[i].replace(/_/g, '') + '}');
            }
        }
        else if(str instanceof String) str = str.valueOf(); // force the return value to a primitive string
        return str;
    };

    API.rewriteLatexCommands = function(str, pattern) {
        var matches = JsuCmn.isolateMatchingData(str, pattern);
        return matches.map(function(data, i) {
            if(data.matched) {
                var j = i + 1; // next data index
                if(j < matches.length) {
                    var matchVal = matches[j].value;
                    if(matchVal !== '' && /[a-zA-Z]/.test(matchVal[0])) {
                        data.value += '{}';
                    }
                }
            }
            return data.value;
        }).join('');
    };

    API.rewriteKnownLatexCommands = function(str, patterns) {
        if(!patterns) patterns = [];
        patterns = patterns.slice(0); // shallow copy
        patterns.push(...latexShortcutData.greekLetter.pattern.list);
        patterns.sort(function (a, b) { return b.localeCompare(a); }); // sort in descending order (see regex-alternation-note)
        return API.rewriteLatexCommands(str, patterns.join('|'));
    };

    API.toLatex = function(str, mode) {
        // set the LaTeX commands to use to replace LaTeX special characters
        var backslash;
        var circumflex;
        var space;
        var tilde;
        var latexCommands = [];
        switch(mode) {
            case 'text':
                backslash = '\\textbackslash';
                circumflex = '\\textasciicircum';
                space = ' ';
                tilde = '\\textasciitilde';
                latexCommands.push(backslash, circumflex, tilde);
                break;
            case 'math':
                backslash = '\\backslash';
                circumflex = '\\hat';
                space = '\\mbox{ }'; // there are specific commands for spacing in LaTeX math mode
                                     // but we use \\mbox{ } because the space it displays is neither too wide nor too short
                tilde = '\\sim';
                latexCommands.push(backslash, circumflex, tilde);
                break;
            default:
                if(str instanceof String) str = str.valueOf(); // force the return value to a primitive string
                return str; // no replacement made
        }

        // LaTeX shortcuts in str must not have been converted at all for the code below to work
        //     indeed, replaceSpecialCharsInLatexShortcuts() might not find anything to replace otherwise
        //
        // we sometimes use temporary replacement values below
        // these values are chosen so that
        //     they are not changed by other replacement values
        //     they are unlikely to be guessed by mistake
        //
        var tmpId_ = new Date().toISOString();
        var tmpId1 = 'TMP1-' + tmpId_;
        var tmpId2 = 'TMP2-' + tmpId_;
        var tmpId3 = 'TMP3-' + tmpId_;
        str = // first replace all special characters in LaTeX shortcuts with temporary values
              // that must not contain said special characters
              API.replaceSpecialCharsInLatexShortcuts(str, {
                  'greekLetterRepl': tmpId1, 'subscriptRepl': tmpId2,
              })
              // handle LaTeX special characters
             .replace(/\\/g, tmpId3) // replaced here so as not to replace it when used as a replacement below
             .replace(/([\${}&#%_])/g, '\\$1') // replaced here so as not to replace it when used as a replacement below
             .replace(/\^/g, circumflex)
             .replace(/ /g, space)
             .replace(/~/g, tilde)
             .replace(new RegExp(tmpId3, 'g'), backslash)
              // restore the previously replaced special characters
             .replace(new RegExp(tmpId1, 'g'), latexShortcutData.greekLetter.extra.specialChar)
             .replace(new RegExp(tmpId2, 'g'), latexShortcutData.subscript.extra.specialChar)
        ;
        str = API.combineLatexSubscripts(str);
        str = API.rewriteKnownLatexCommands(
            str,
            latexCommands.map(function(cmd) { return '\\' + cmd; })
        );
        return str;
    };

    // --- Others ---

    API.insertString = function(strToUpdate, cursorPos, strToInsert) {
        if(cursorPos < 0) return null;
        var vals = API.isolateLatexShortcutValues(strToUpdate);
        if(cursorPos > vals.length) return null;

        var convert = API.convertLatexShortcuts;

        // insert the string
        var nextStrBeforeCursor = vals.slice(0, cursorPos).join('') + strToInsert;
        var strAfterCursor = vals.slice(cursorPos).join('');
        var nextStrVal = nextStrBeforeCursor + strAfterCursor;

        // compute the new position of the cursor
        var nextCursorPosStr = convert(nextStrBeforeCursor);
        var tmpId = new Date().toISOString();
        var strAfterCursorWithoutSpecialChars = API.replaceSpecialCharsInLatexShortcuts(strAfterCursor, {
            'greekLetterRepl': 'TMP1-' + tmpId, 'subscriptRepl': 'TMP2-' + tmpId, 'paddingEnabled': true,
        });
        var len = strAfterCursorWithoutSpecialChars.length;
        for(var i = 0, iStr = ''; i < len; i++) { // see (1) below
            iStr += strAfterCursorWithoutSpecialChars[i];
            var s = convert(nextCursorPosStr + iStr);
            if(nextCursorPosStr + iStr !== s) {
                nextCursorPosStr = s;
                break;
            }
        }

        return {
            'newStr': nextStrVal,
            'newPos': nextCursorPosStr.length,
        };

        // (1) required for cases like the examples described below
        //         when strToUpdate is '\\alha' and then 'p' is inserted after 'l'
        //             the LaTeX shortcut '\\alpha' is implicitly introduced
        //             so the cursor must not be positionned after 'p' but after '\\alpha'
        //         when strToUpdate is '\\alha\\beta' and then 'p' is inserted after 'l'
        //             this scenario is similar to the one above
        //             but here we need the call to replaceSpecialCharsInLatexShortcuts() as in the simpler example below
        //                 strToUpdate is '\\beta' and then a character is inserted before it (i.e. before the '\\')
    };

    API.deleteOne = function(strToUpdate, cursorPos) {
        if(cursorPos < 1) return null;
        var vals = API.isolateLatexShortcutValues(strToUpdate);
        if(cursorPos > vals.length) return null;

        var convert = API.convertLatexShortcuts;

        // delete a character (e.g. 'a') or a LaTeX shortcut (e.g. '\\alpha')
        var nextCursorPos = cursorPos - 1;
        var nextStrBeforeCursor = vals.slice(0, nextCursorPos).join(''); // set as if the cursor has already moved backwards
        var nextStrVal = nextStrBeforeCursor + vals.slice(cursorPos).join('');

        // compute the new position of the cursor
        var deletedStr = vals[nextCursorPos];
        var s1 = convert(strToUpdate);
        var s2 = convert(nextStrVal) + convert(deletedStr);
        if(s1.length !== s2.length) { // see (1) below
            var obj = API.findLatexShortcutSpecialCharsAndIndex(nextStrBeforeCursor); // see (2) below
            var k = Math.max(...Object.keys(obj));
            nextCursorPos = cursorPos - nextStrBeforeCursor.substring(k).length;
        }

        return {
            'newStr': nextStrVal,
            'newPos': nextCursorPos,
        };

        // (1) this happens in cases like the examples described below
        //         when strToUpdate is '\\alupha' and then 'u' is deleted
        //             the LaTeX shortcut '\\alpha' is implicitly introduced
        //             so the length of the '\\al' prefix string must be subtracted from the cursor position
        //         when strToUpdate is '\\alpha_u0' and then 'u' is deleted
        //             the LaTeX shortcut '_0' is implicitly introduced
        //             so the length of the '_' prefix string must be subtracted from the cursor position
        //
        // (2) obj will never be null because if this part of the code is reached, it means that a LaTeX
        //     shortcut that is not in s1 has been implicitly introduced in s2 (i.e. the shortcut has been
        //     introduced but was not there). In other words, the shortcut is surely in nextStrVal, because
        //     deletedStr is either a LaTeX shortcut or a character (whose length is preserved compared to s1).
        //     Put differently, the said shortcut actually originates in nextStrBeforeCursor, because if it
        //     started in the other part of nextStrVal, it would not be one that is implicitly introduced, i.e.
        //     this part of the code would not be reached: e.g. when strToUpdate is 'a\\alph' and the first 'a'
        //     is deleted.
    };

    return API;
}
);
