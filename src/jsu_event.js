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
        if(Jsu.Event) throw new Error('Jsu.Event is already defined');
        Jsu.Event = factory();
    }
})(
function() {
    function isNumber(value) {
        return typeof value === 'number' && isFinite(value);
    }

    function createCustomEvent(typeStr, detailObj) {
        return new CustomEvent(typeStr, {
            'detail': detailObj,
        });
    }

    var API = {};

    API.EventTarget = function() {
        var target = null;
        try {
            target = new EventTarget(); // constructor only supported in new browser versions (2018+)
        }
        catch(e) {
            target = document.createDocumentFragment(); // DocumentFragment implements the EventTarget interface
        }

        // forward calls to EventTarget functions from this object to the actual target object
        ['addEventListener', 'removeEventListener', 'dispatchEvent'].forEach(function(f) {
            this[f] = target[f].bind(target);
        }, this);
    };

    API.createTimer = function(config) {
        var timer = new API.EventTarget();

        var _running = false;
        var _delay = 0;
        var _timeoutCount = 0;
        var _timeoutLimit = -1; // no limit
        var _id = null;

        if(config) {
            if(isNumber(config.timeoutLimit)) {
                var limit = Math.floor(config.timeoutLimit);
                if(limit > 0) _timeoutLimit = limit; // see (1) below

                // (1) 0 excluded to not have to support timers that cannot start()
                //         indeed a limit of 0 would mean that the timer should never timeout
                //         and therefore should never start
            }
        }

        function timeout() {
            timer.dispatchEvent(createCustomEvent('timeout', {
                'count': ++_timeoutCount,
                'source': timer,
            }));
            if(_timeoutLimit !== -1 && _timeoutCount === _timeoutLimit) timer.stop();
        }

        timer.start = function(delay) {
            if(_running) return;
            _running = true;
            _delay = isNumber(delay) && delay >= 0 ? delay : 0;
            _timeoutCount = 0;
            _id = setInterval(timeout, _delay);
        };

        timer.stop = function() {
            if(!_running) return;
            _running = false;
            clearInterval(_id);
            _id = null;
            timer.dispatchEvent(createCustomEvent('stopped', {
                'count': _timeoutCount,
                'source': timer,
            }));
        };

        timer.isRunning = function() { return _running; };
        timer.getDelay = function() { return _delay; };
        timer.getTimeoutCount = function() { return _timeoutCount; };
        timer.getTimeoutLimit = function() { return _timeoutLimit; };
        timer.isSingleShot = function() { return _timeoutLimit === 1; };

        return timer;
    };

    return API;
}
);
