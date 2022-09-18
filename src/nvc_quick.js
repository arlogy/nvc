/*
 https://github.com/arlogy/nvc
 Released under the MIT License (see LICENSE file)
 Copyright (c) 2020 https://github.com/arlogy
*/

if(typeof Nvc.quick !== 'undefined')
    throw new Error('Nvc.quick is already defined');

Nvc.quick = (function() {
    var JsuCmn = Jsu.Common;
    var JsuLtx = Jsu.Latex;

    var outputElt = null; // see setOutput()
    var outputElt_focusListenersData = null;
    var outputElt_focusPreviousElt = null;

    // Boots nvc with minimal configuration. Useful for basic use cases or as
    // inspiration for advanced scenarios. In the second case, please read the
    // source code of this function: basically, to use nvc, two event listeners
    // would be needed most of the time (window load & window resize, or their
    // equivalents).
    //     - canvasId: passed to startNvc().
    //     - outputId: passed to setOutput().
    //     - options: optional object that can have the following optional
    //       properties.
    //           - 'startOptions': passed to startNvc().
    //           - 'beforeStart': function called before startNvc() in window
    //             load event listener; receives no arguments; useful for
    //             pre-initialization.
    //           - 'onFailure': function called on failure in window load event
    //             listener; must be implemented according to defaultAlert()
    //             which is used if not provided.
    //           - 'onLoad': function called after default code execution in
    //             window load event listener; receives no arguments.
    //           - 'onResize': function called after default code execution in
    //             window resize event listener; receives no arguments.
    function bootstrap(canvasId, outputId, options) {
        window.addEventListener('load', function() {
            var startOptions = undefined;
            var beforeStart = undefined;
            var onFailure = defaultAlert;
            var onLoad = undefined;
            var onResize = undefined;
            if(options) {
                if('startOptions' in options) startOptions = options.startOptions;
                if('beforeStart' in options) beforeStart = options.beforeStart;
                if('onFailure' in options) onFailure = options.onFailure;
                if('onLoad' in options) onLoad = options.onLoad;
                if('onResize' in options) onResize = options.onResize;
            }

            // set output first so it's ready to use at any time
            if(!setOutput(outputId, onFailure)) {
                return;
            }

            // custom code (you can ignore this when implementing an alternative to bootstrap())
            if(beforeStart) {
                beforeStart();
            }

            // start nvc
            if(!startNvc(canvasId, startOptions, onFailure)) {
                return;
            }

            // do relevant actions on window resize
            window.addEventListener('resize', function() {
                Nvc.tieFsmAlphabetContainerToCanvas(startOptions ? startOptions.fsmAlphabetContainer : undefined);
                // custom code (you can ignore this when implementing an alternative to bootstrap())
                if(onResize) {
                    onResize();
                }
            });

            // install useful events (you can ignore this when implementing an alternative to bootstrap())
            installOutputFocusListeners();

            // custom code (you can ignore this when implementing an alternative to bootstrap())
            if(onLoad) {
                onLoad();
            }
        });
    }

    // A wrapper for Nvc.start().
    //     - canvasId: used to find the canvas component; also used as prefix
    //       for the FSM alphabet container ID (canvasId + '_fsm_alphabet'). The
    //       two resulting objects are passed to Nvc.start().
    //     - options: passed to Nvc.start().
    //     - onFailure: function called on failure; must be implemented
    //       according to defaultAlert() which is used if not provided.
    function startNvc(canvasId, options, onFailure) {
        if(!onFailure) onFailure = defaultAlert;

        var canvas = document.getElementById(canvasId);
        var fsmAlphabetContainer = document.getElementById(canvasId + '_fsm_alphabet');
        if(!Nvc.start(canvas, fsmAlphabetContainer, options)) {
            onFailure('Failed to start nvc with canvas ID "{0}"'.format(canvasId));
            return false;
        }
        return true;
    }

    // Installs all necessary event listeners to easily switch focus to/from the
    // output element. The listeners are only installed once regardless of the
    // number of function calls. The hotkey combination to trigger focus
    // switching is Ctrl + Space. However, this combination is already reserved
    // on Mac (the equivalent of Ctrl being Command), so Mac users can use
    // Ctrl + Shift + Space instead for example.
    function installOutputFocusListeners() {
        if(!outputElt_focusListenersData) {
            outputElt_focusListenersData = {
                'ctrlDown': false,
            };

            window.addEventListener('keydown', function(e) {
                if(e.keyCode === 17) outputElt_focusListenersData.ctrlDown = true;
            });

            window.addEventListener('keyup', function(e) {
                if(e.keyCode === 17) outputElt_focusListenersData.ctrlDown = false;
                if(outputElt_focusListenersData.ctrlDown && e.keyCode === 32) { // Ctrl + Space (+ whatever); see (1) below
                    switchOutputFocus();
                }
                // (1) Mac users would use Ctrl + Shift + Space for example
                //     because the Command + Space shortcut is already reserved;
                //     indeed, Command on Mac is the equivalent of Ctrl on
                //     Windows
            });

            // we prefer the blur event because it was released for Firefox long
            // before the focusout event; however, keep in mind (for future
            // changes to this code) that the documentation says
            //     The value of Document.activeElement varies across browsers while this event is being handled [...]
            outputElt.addEventListener('blur', function(e) {
                // reset the previously focused element when the user explicitly unfocused the output element
                outputElt_focusPreviousElt = null;
            });
        }
    }

    // Clears data.
    //     - confirmCallback: optional function to request confirmation from the
    //       user; must be implemented according to defaultConfirm() which is
    //       used if not provided.
    function clearData(confirmCallback) {
        if(!confirmCallback) confirmCallback = defaultConfirm;

        if(confirmCallback('Do you really want to clear all data?')) {
            Nvc.clear();
        }
    }

    function switchConfig(type) {
        Nvc.setConfigFor(type);
        Nvc.restoreBackup(Nvc.config.global.autoBackupId); // reload the current backup data taking into account the new config
    }

    // Displays information to the user in a dialog.
    //     - message: the message to display.
    //     - sideNode: optional side note to display.
    function defaultAlert(message, sideNode) {
        var text = message;
        if(sideNode) {
            text += '\n\n' + sideNode;
        }
        window.alert(text);
    }

    // Displays status information to the user in a dialog using defaultAlert().
    //     - success: boolean indicating success or failure status.
    //     - message: passed to defaultAlert() with a prefix success/failure
    //       text.
    //     - sideNode: passed to defaultAlert().
    function defaultAlertStatus(success, message, sideNode) {
        defaultAlert(
            (success ? '[success]' : '[failure]') + ' ' + message,
            sideNode
        );
    }

    // Displays a Yes/No confirmation dialog to the user and returns a boolean
    // relative to the user's choice, true meaning Yes/Accept and false meaning
    // No/Cancel.
    //     - message: the confirmation message to display.
    function defaultConfirm(message) {
        return window.confirm(message);
    }

    // Sets the output element for all data requested by the user and returns a
    // boolean success/failure flag. Note that the output element can also be
    // used as input by reading from it.
    //     - id: the ID of an HTML <textarea> element.
    //     - onFailure: function called on failure; must be implemented
    //       according to defaultAlert() which is used if not provided.
    function setOutput(id, onFailure) {
        if(!onFailure) onFailure = defaultAlert;

        var elt = document.getElementById(id);
        if(elt) {
            outputElt = elt;
            return true;
        }
        onFailure('Failed to set output element from ID "{0}"'.format(id));
        return false;
    }

    function isOutputVisible() { return JsuCmn.isEltVisible(outputElt); }
    function setOutputVisible(visible) { JsuCmn.setEltVisible(outputElt, visible, 'block'); }
    function updateOutputFocus() {
        if(isOutputVisible()) {
            var activeElt = document.activeElement;
            if(outputElt !== activeElt) {
                outputElt_focusPreviousElt = activeElt; // save the element that currently has the focus, if any
                outputElt.focus();
            }
        }
        else {
            if(outputElt_focusPreviousElt) outputElt_focusPreviousElt.focus();
            outputElt_focusPreviousElt = null;
        }
    }
    function switchOutputVisibility() { setOutputVisible(!isOutputVisible()); }
    function switchOutputFocus() {
        switchOutputVisibility();
        updateOutputFocus();
    }

    function getOutputValue() { return outputElt.value; }
    function setOutputValue(value) { outputElt.value = value; }

    function outputText(text) {
        setOutputVisible(true);
        setOutputValue(text);
    }
    function outputJson(indents) { outputText(Nvc.fetchJsonString(indents)); }
    function outputPng() {
        document.location.href = Nvc.fetchPngDataString(); // will fail on Chrome
        outputText('Please take a screenshot on your own.\n' +
                   'Indeed, if you are reading this message, then the image most likely did not show up.');
    }
    function outputSvg(indents) {
        var svgStr = Nvc.fetchSvgString(indents);
        outputText(svgStr);
        // Chrome isn't ready for this yet, the 'Save As' menu item is disabled
        // document.location.href = 'data:image/svg+xml;base64,' + btoa(svgStr);
    }
    function outputLatex() { outputText(Nvc.fetchLatexString()); }

    // Checks if a FSM model is valid and outputs a relevant status message.
    //     - model: the FSM model to check; must have been initialized according
    //       to Nvc.fsm.buildFsmModel().
    function outputFsmState(model) {
        if(model.errors.length === 0) {
            outputText('Finite state machine is valid.');
        }
        else {
            var text = 'Finite state machine is not valid.'
            for(var i = 0; i < model.errors.length; i++) {
                text += '\n    - ' + JsuLtx.convertLatexShortcuts(model.errors[i]);
            }
            outputText(text);
        }
    }

    function outputFsmTransitionTableHtml(model, indents) {
        var obj = Nvc.fsm.buildFsmTransitionTableHtml(model, null, indents);
        outputText(obj.table + '\n\n' + obj.css);
    }

    // Loads JSON from output element. When the output element is not visible,
    // this function switchOutputFocus() and terminates immediately so the user
    // can paste their JSON string (i.e. no JSON content is loaded from the
    // output element).
    //     - callback: optional function called on success or failure after
    //       loading the JSON content; must be implemented according to
    //       defaultAlertStatus() which is used if not provided.
    function loadJsonFromOutput(callback) {
        if(!callback) callback = defaultAlertStatus;

        if(!isOutputVisible()) {
            switchOutputFocus(); // so the user can paste their JSON string
            return; // prevents current changes, if any, from being lost unexpectedly
        }

        Nvc.loadJsonString(
            getOutputValue(),
            function(exception) {
                callback(false,
                         'JSON failed to parse with a {0}.'.format(exception),
                         'Please perform a JSON export and try again.');
            },
            function() {
                callback(true,
                        'JSON loaded!',
                        'Note that invalid items are ignored or adjusted when necessary.');
            }
        );
    }

    function buildAndSortFsmModel() {
        return Nvc.fsm.sortFsmModel(Nvc.fsm.buildFsmModel());
    }

    return {
        get bootstrap() { return bootstrap; }, set bootstrap(v) { bootstrap = v; },
        get startNvc() { return startNvc; }, set startNvc(v) { startNvc = v; },
        get installOutputFocusListeners() { return installOutputFocusListeners; }, set installOutputFocusListeners(v) { installOutputFocusListeners = v; },

        get clearData() { return clearData; }, set clearData(v) { clearData = v; },
        get switchConfig() { return switchConfig; }, set switchConfig(v) { switchConfig = v; },

        get defaultAlert() { return defaultAlert; }, set defaultAlert(v) { defaultAlert = v; },
        get defaultAlertStatus() { return defaultAlertStatus; }, set defaultAlertStatus(v) { defaultAlertStatus = v; },
        get defaultConfirm() { return defaultConfirm; }, set defaultConfirm(v) { defaultConfirm = v; },

        get setOutput() { return setOutput; }, set setOutput(v) { setOutput = v; },
        //
        get isOutputVisible() { return isOutputVisible; }, set isOutputVisible(v) { isOutputVisible = v; },
        get setOutputVisible() { return setOutputVisible; }, set setOutputVisible(v) { setOutputVisible = v; },
        get updateOutputFocus() { return updateOutputFocus; }, set updateOutputFocus(v) { updateOutputFocus = v; },
        get switchOutputVisibility() { return switchOutputVisibility; }, set switchOutputVisibility(v) { switchOutputVisibility = v; },
        get switchOutputFocus() { return switchOutputFocus; }, set switchOutputFocus(v) { switchOutputFocus = v; },
        //
        get getOutputValue() { return getOutputValue; }, set getOutputValue(v) { getOutputValue = v; },
        get setOutputValue() { return setOutputValue; }, set setOutputValue(v) { setOutputValue = v; },
        //
        get outputText() { return outputText; }, set outputText(v) { outputText = v; },
        get outputJson() { return outputJson; }, set outputJson(v) { outputJson = v; },
        get outputPng() { return outputPng; }, set outputPng(v) { outputPng = v; },
        get outputSvg() { return outputSvg; }, set outputSvg(v) { outputSvg = v; },
        get outputLatex() { return outputLatex; }, set outputLatex(v) { outputLatex = v; },
        get outputFsmState() { return outputFsmState; }, set outputFsmState(v) { outputFsmState = v; },
        get outputFsmTransitionTableHtml() { return outputFsmTransitionTableHtml; }, set outputFsmTransitionTableHtml(v) { outputFsmTransitionTableHtml = v; },
        //
        get loadJsonFromOutput() { return loadJsonFromOutput; }, set loadJsonFromOutput(v) { loadJsonFromOutput = v; },

        get buildAndSortFsmModel() { return buildAndSortFsmModel; }, set buildAndSortFsmModel(v) { buildAndSortFsmModel = v; },
    };
})();

/*
 * base64.js - Base64 encoding and decoding functions
 *
 * See: http://developer.mozilla.org/en/docs/DOM:window.btoa
 *      http://developer.mozilla.org/en/docs/DOM:window.atob
 *
 * Copyright (c) 2007, David Lindquist <david.lindquist@gmail.com>
 * Released under the MIT license
 */

if (typeof btoa == 'undefined') {
    function btoa(str) {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var encoded = [];
        var c = 0;
        while (c < str.length) {
            var b0 = str.charCodeAt(c++);
            var b1 = str.charCodeAt(c++);
            var b2 = str.charCodeAt(c++);
            var buf = (b0 << 16) + ((b1 || 0) << 8) + (b2 || 0);
            var i0 = (buf & (63 << 18)) >> 18;
            var i1 = (buf & (63 << 12)) >> 12;
            var i2 = isNaN(b1) ? 64 : (buf & (63 << 6)) >> 6;
            var i3 = isNaN(b2) ? 64 : (buf & 63);
            encoded[encoded.length] = chars.charAt(i0);
            encoded[encoded.length] = chars.charAt(i1);
            encoded[encoded.length] = chars.charAt(i2);
            encoded[encoded.length] = chars.charAt(i3);
        }
        return encoded.join('');
    }
}
