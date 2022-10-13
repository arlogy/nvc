/*
 https://github.com/arlogy/jsu
 Released under the MIT License (see LICENSE file)
 Copyright (c) 2022 https://github.com/arlogy
*/

(function(factory) {
    if (typeof module !== 'undefined' && typeof exports !== 'undefined') {
        // export module in Node.js-like environments
        module.exports = factory();
    }
    else {
        // set global variable
        if(typeof Jsu === 'undefined') Jsu = {};
        if(Jsu.CsvParser) throw new Error('Jsu.CsvParser is already defined');
        Jsu.CsvParser = factory();
    }
})(
function() {
    // internal utility functions; regarding strings, please note that they
    // should be transformed using toString() to allow consistent comparison of
    // string primitives and string objects using the === operator or the switch
    // statement for example
    function isArray(val) { return Object.prototype.toString.call(val) === '[object Array]'; }
    function hasNoDuplicates(arr) {
        return arr.every(function(val, idx) { return arr.indexOf(val) === idx; });
    }
    function hasDuplicates(arr) { return !hasNoDuplicates(arr); }
    function isString(val) { return typeof val === 'string' || val instanceof String; }
    function isStringAndNonEmpty(val) { return isString(val) && val.toString() !== ''; }

    // internal utility function from the documentation of JavaScript regular
    // expressions; we added '\-' so that '-' can also be escaped; note however
    // that '\' in '\n' will not be escaped for example, because '\n' is a
    // single character (encoded using an escape sequence)
    function escapeRegExp(string) {
        return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    function CsvParser(options) {
        // read options

        if(options === undefined) options = {};
        var fieldDels = 'fieldDelimiter' in options ? [options.fieldDelimiter] : ['"'];
        var fieldSeps = 'fieldSeparators' in options ? options.fieldSeparators : [','];
        var lineSeps = 'lineSeparators' in options ? options.lineSeparators : ['\n'];
        var smartRegex = 'smartRegex' in options === false || options.smartRegex === true;
        var skipEmptyLinesWhen = 'skipEmptyLinesWhen' in options ? options.skipEmptyLinesWhen : -1;
        var skipLinesWithWarnings = 'skipLinesWithWarnings' in options && options.skipLinesWithWarnings === true;

        // reject invalid options

        function validate() {
            [fieldDels, fieldSeps, lineSeps].forEach(function(arr) {
                if(!isArray(arr)) throw new RangeError(
                    'The field or line separators are not an array, or there is an internal error on the field delimiter'
                );

                if(!arr.every(isStringAndNonEmpty)) throw new RangeError(
                    'Only non-empty strings are allowed for the field delimiter, field separators and line separators'
                );

                if(hasDuplicates(arr)) throw new RangeError(
                    'The field or line separators contain duplicates, or there is an internal error on the field delimiter'
                );
            });

            [
                [fieldDels, fieldSeps, lineSeps],
                [fieldSeps, fieldDels, lineSeps],
                [lineSeps, fieldDels, fieldSeps],
            ].forEach(function(arr) {
                if(!arr[0].every(function(val) { return arr[1].indexOf(val) === -1 && arr[2].indexOf(val) === -1; }))
                    throw new RangeError('Values cannot be shared between field delimiter, field separators and line separators');
            });
        }

        validate();

        // convert object strings to primitive strings

        fieldDels = fieldDels.map(function(val) { return val.toString(); });
        fieldSeps = fieldSeps.map(function(val) { return val.toString(); });
        lineSeps = lineSeps.map(function(val) { return val.toString(); });

        // set the properties of this parser

        var stdLineSeps = ['\r', '\n', '\r\n']; // standard line separators (aka line breaks)
        smartRegex = smartRegex
                  && fieldDels.every(function(val) { return val.length === 1; })
                  && fieldSeps.every(function(val) { return val.length === 1; })
                  && lineSeps.every(function(val) { return stdLineSeps.indexOf(val) !== -1; })
        ;

        var regexPatterns = [];
        if(smartRegex) {
            var regexFieldDels = fieldDels.map(function(val) { return escapeRegExp(val); }).join('');
            var regexFieldSeps = fieldSeps.map(function(val) { return escapeRegExp(val); }).join('');
            regexPatterns = [
                '[^' + regexFieldDels + regexFieldSeps + '\n\r]+', // line breaks are characters from stdLineSeps
                '[' + regexFieldDels + regexFieldSeps + ']',
                stdLineSeps.slice(0).sort().reverse().join('|'), // see (1) below
            ];
        }
        else {
            // more permissive regex, but slower because matching a single
            // character (.) in a string can result in a lot of checks during
            // readChunk()
            regexPatterns = fieldDels.concat(fieldSeps, lineSeps);
            regexPatterns = regexPatterns.map(function(val) { return escapeRegExp(val); });
            regexPatterns.sort().reverse(); // see (1) below
            regexPatterns.push('.');
        }

        this._fieldDel = fieldDels[0];
        this._fieldSeps = fieldSeps;
        this._lineSeps = lineSeps;
        this._smartRegex = smartRegex;
        this._regexPattern = regexPatterns.join('|');
        this._skipEmptyLinesWhen = skipEmptyLinesWhen;
        this._skipLinesWithWarnings = skipLinesWithWarnings;

        this.reset(); // will automatically define new properties

        // (1) sort entries in descending order so that with ['a', 'abc'] for
        //     example, we can create the pattern 'abc|a' instead of 'a|abc',
        //     otherwise the 'abc' part might not get a chance to match
    }

    CsvParser.prototype.getConfig = function() {
        return {
            'fieldDelimiter': this._fieldDel,
            'fieldSeparators': this._fieldSeps.slice(0),
            'lineSeparators': this._lineSeps.slice(0),
            'smartRegex': this._smartRegex,
            'regexPattern': this._regexPattern,
            'skipEmptyLinesWhen': this._skipEmptyLinesWhen,
            'skipLinesWithWarnings': this._skipLinesWithWarnings,
        };
    };

    CsvParser.prototype.readChunk = function(str) {
        var fieldDel = this._fieldDel;
        var fieldSeps = this._fieldSeps;
        var lineSeps = this._lineSeps;

        var regex = new RegExp(this._regexPattern, 'g');
        var match = null;
        var matchStr = null;
        while((match = regex.exec(str)) !== null) {
            matchStr = match[0];
            this._currLineStr += matchStr;
            switch(this._currState) {
                case 'q0': // initial state
                    switch(true) {
                        case fieldDel === matchStr: this._currState = 'q2'; break;
                        case fieldSeps.indexOf(matchStr) !== -1: this._saveNewField(); break;
                        case lineSeps.indexOf(matchStr) !== -1: this._saveNewLine(); break;
                        default: this._currMatch += matchStr; this._currState = 'q1'; break;
                    }
                    break;

                case 'q1': // continue reading a field not enclosed with delimiters
                    switch(true) {
                        case fieldSeps.indexOf(matchStr) !== -1: this._saveNewField(); this._currState = 'q0'; break;
                        case lineSeps.indexOf(matchStr) !== -1: this._saveNewLine(); this._currState = 'q0'; break;
                        default: this._currMatch += matchStr; break;
                    }
                    break;

                case 'q2': // read the content of a field enclosed with delimiters
                    switch(true) {
                        case fieldDel === matchStr: this._currState = 'q3'; break;
                        default: this._currMatch += matchStr; break;
                    }
                    break;

                case 'q3': // determine whether a field delimiter closes or escapes a preceding field delimiter
                    switch(true) {
                        case fieldDel === matchStr: this._currMatch += matchStr; this._currState = 'q2'; break;
                        case fieldSeps.indexOf(matchStr) !== -1: this._saveNewField(); this._currState = 'q0'; break;
                        case lineSeps.indexOf(matchStr) !== -1: this._saveNewLine(); this._currState = 'q0'; break;
                        default:
                            this._saveNewWarning(CsvParser._getUnescapedDelimiterInfo(this._records.length + 1, fieldDel, matchStr));
                            this._currMatch += fieldDel + matchStr; this._curState = 'q2'; break;
                    }
                    break;

                default:
                    throw new Error('State ' + this._currState + ' is unknown: this should never happen');
            }
        }
    };

    CsvParser.prototype.flush = function() {
        if(this.hasPendingData()) {
            switch(this._currState) {
                case 'q0': case 'q1': case 'q3': break;
                case 'q2': this._saveNewWarning(CsvParser._getMissingDelimiterInfo(this._records.length + 1, this._fieldDel)); break;
                default: throw new Error('State ' + this._currState + ' is unknown: this should never happen');
            }
            this._saveNewLine();
            this._currState = 'q0';
        }
    };

    CsvParser.prototype.hasPendingData = function() {
        // we check states q2 and q3 for cases where the only or last line read
        // by readChunk() is '"' or '""'; so _currMatch and _currLineFields are
        // empty
        return this._currMatch !== '' || this._currLineFields.length !== 0 || this._currState === 'q2' || this._currState === 'q3';
    };

    CsvParser.prototype.getRecordsRef = function() {
        return this._records;
    };

    CsvParser.prototype.getRecordsCopy = function() {
        var records = this.getRecordsRef();
        return records.map(function(arr) {
            return arr.slice(0);
        });
    };

    CsvParser.prototype.getWarningsRef = function() {
        // always include temporary warnings on the current line because data
        // have already been parsed and the temporary warnings help understand
        // why getRecordsRef() doesn't show the expected output for example
        return this._warnings.concat(this._currLineWarnings);
    };

    CsvParser.prototype.getWarningsCopy = function() {
        var warnings = this.getWarningsRef();
        return warnings.map(function(obj) {
            return {
                'context': obj.context,
                'type': obj.type,
                'message': obj.message,
                'linePos': obj.linePos,
            };
        });
    };

    CsvParser.prototype.reset = function() {
        // temporary data (about the line being parsed)
        this._currState = 'q0';
        this._currMatch = '';
        this._currLineStr = '';
        this._currLineFields = [];
        this._currLineWarnings = [];

        // final data (about lines already parsed)
        this._records = [];
        this._warnings = [];
    };

    CsvParser.prototype._saveNewField = function() {
        this._currLineFields.push(this._currMatch);
        this._currMatch = '';
    };

    CsvParser.prototype._saveNewWarning = function(warning) {
        this._currLineWarnings.push(warning);
    };

    CsvParser.prototype._saveNewLine = function() {
        this._saveNewField();

        var skipLine = false;
        switch(this._skipEmptyLinesWhen) {
            case CsvParser.LineIsReallyEmpty: if(this._currLineStr === '') skipLine = true; break;
            case CsvParser.LineIsBlank: if(this._currLineStr.trim() === '') skipLine = true; break;
            case CsvParser.LineHasOnlyBlankFields: if(this._currLineFields.join('').trim() === '') skipLine = true; break;
            default: break;
        }
        if(this._skipLinesWithWarnings && this._currLineWarnings.length !== 0) {
            skipLine = true;
        }

        if(!skipLine) {
            this._records.push(this._currLineFields);
            this._warnings.push(...this._currLineWarnings); // push each warning
        }
        this._currLineStr = '';
        this._currLineFields = [];
        this._currLineWarnings = [];
    };

    // in other programming languages you may define these as constants
    CsvParser.LineIsReallyEmpty = 0;
    CsvParser.LineIsBlank = 1;
    CsvParser.LineHasOnlyBlankFields = 2;

    CsvParser._getInfo = function(context, type, message, linePos) {
        return {
            'context': context,
            'type': type,
            'message': message,
            'linePos': linePos,
        };
    };

    CsvParser._getUnescapedDelimiterInfo = function(linePos, delim, c) {
        return CsvParser._getInfo(
            'DelimitedField',
            'DelimiterNotEscaped',
            'Expects field delimiter (' + delim + ') but got character ' + c[0],
            linePos
        );
    };

    CsvParser._getMissingDelimiterInfo = function(linePos, delim) {
        return CsvParser._getInfo(
            'DelimitedField',
            'DelimiterNotTerminated',
            'Expects field delimiter (' + delim + ') but reached end of line',
            linePos
        );
    };

    return CsvParser;
}
);
