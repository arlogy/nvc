/*
 This script was first written in 2010. It has been refactored in 2020 to be
 versatile and reusable in other projects.

                --- 2010 Copyright Notice ---

 Finite State Machine Designer (http://madebyevan.com/fsm/)
 License: MIT License (see below)

 Copyright (c) 2010 Evan Wallace

 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.

                --- 2020 Copyright Notice ---

 https://github.com/arlogy/nvc
 Licensed under the same agreements as above, or equivalently in the LICENSE file
 Copyright (c) 2020 https://github.com/arlogy
*/

if(!Jsu.Common.setStringPrototypeFormat()) {
    throw new Error('String.prototype.format is already set');
}

// ==============
// The Nvc object
// ==============

if(typeof Nvc !== 'undefined') throw new Error('Nvc is already defined');

Nvc = (function() {
    var JsuCmn = Jsu.Common;
    var JsuEvt = Jsu.Event;
    var JsuLtx = Jsu.Latex;

    // --- Config Object ---

    // Returns a convenient configuration object to customize the initial
    // implementation created in 2010, including newly implemented features. The
    // returned object is initialized for use with finite state machines, but it
    // can be modified to support other types of data structures.
    function getBaseConfig() {
        return {
            'global': {
                'autoBackup': true, // indicates whether a local backup must be saved automatically when interacting with the canvas
                                    // if enabled, the backup is also restored automatically when appropriate
                'autoBackupId': 'nvc_autoBackup_id', // the ID to use for automatic backup when enabled
                                                     // different values can be used to distinguish and switch between backups
            },
            'canvas': {
                'acceptLinks': true, // indicates whether instances of Link can be pushed into the canvas
                                     // these are arrows between two nodes
                'acceptSelfLinks': true, // indicates whether instances of SelfLink can be pushed into the canvas
                                         // these are arrows from a node to itself
                'acceptStartLinks': true, // indicates whether instances of StartLink can be pushed into the canvas
                                          // these are arrows indicating initial states in finite state machines
                'font': '20px "Times New Roman", serif', // fixed font for all canvas items
                'fontTextVerticalPadding': 5, // used to make node texts appear vertically centered
                                              // text centering is only simulated (i.e. no such algorithm is implemented)
                                              // a suitable value depends on the node's font and radius
                                              //     it also affects text positioning for the other canvas items
                                              // so a value for this property is best chosen accordingly
                                              //     after trying different node radiuses (15, 20, 25) and character shapes (a, b, p, 9) for example
                                              //     also note that texts do not need to appear centered in all cases: support for several cases is enough
                'lineDashSegments': [5, 3], // defines the line dash pattern to use for canvas items with dashes enabled
                                            //     [5, 3] means that each dash will be 5px long, followed by a space of 3px
                                            //     see HTML canvas setLineDash() method for detailed information
                'opacity': 1, // floating point number between 0 and 1 according to the HTML canvas globalAlpha property
                              // inherited by all new canvas items
                'caretAdvancedPositioning': true, // indicates whether advanced caret (cursor) positioning must be enabled for the canvas
                                                  //    when inserting or deleting characters, or simply when moving the caret
                                                  // if disabled, the initial base implementation is used
                'resizeStep': 5, // the incremental value to use when resizing canvas items
                                 // a negative value will reverse the resizing process
                                 // should rather not be a floating point number as this could lead to loss of precision in basic arithmetic operations
                                 //     the result would be that scaling an item up or down might never return it to its original size unless its size is reset
            },
            'links': {
                'arrowHeadAtSrc': false, // indicates whether arrowhead must be rendered at source node
                                         // inherited by all new links supporting it
                'arrowHeadAtSrcOverridable': false, // indicates whether the referenced property can be overridden from an action possibly initiated by the user
                                                    //     when importing JSON content for example
                'arrowHeadAtDst': true,  // same as links.arrowHeadAtSrc but for destination/target node
                'arrowHeadAtDstOverridable': false, // same as links.arrowHeadAtSrcOverridable but for destination/target node
                'lineColor': 'black', // CSS color inherited by all new links
                'arrowColor': 'black', // CSS color inherited by all new links
                'textColor': 'black', // CSS color inherited by all new links
            },
            'nodes': {
                'radius': 25, // inherited by all new nodes; ignored if less than the expected minimum value
                'canBeAcceptStates': true, // indicates whether nodes can become accept states (and thus are states in a finite state machine)
                'borderColor': 'black', // CSS color inherited by all new nodes
                'bgColor': 'transparent', // CSS color inherited by all new nodes
                'textColor': 'black', // CSS color inherited by all new nodes
            },
            'textItems': {
                'textColor': 'gray', // CSS color inherited by all new text items
            },
        }
    }

    // This is a configuration object. It can be modified either by using
    // setConfigFor() or by setting its properties directly. In any case, the
    // properties of the object are not checked at all for performance reasons
    // (e.g. faster execution when draw()ing): so one must use valid values or
    // unexpected behavior might occur. Finally, to reset the config object, set
    // it to the value returned by getBaseConfig().
    var config = getBaseConfig();

    // A helper function to initialize the config object. Also shows or hides
    // the FSM alphabet container accordingly.
    //     - type: must be any of 'fsm', 'digraph', 'undigraph' or 'nodesonly';
    //       otherwise it is ignored.
    function setConfigFor(type) {
        // note: setFsmAlphabetStr() is not called (for example setFsmAlphabetStr('')
        // for graph types) because we don't want FSM alphabet to implicitly
        // change when config is updated

        switch(type) {
            case 'fsm':
                config.canvas.acceptLinks = true;
                config.canvas.acceptSelfLinks = true;
                config.canvas.acceptStartLinks = true;
                config.links.arrowHeadAtSrc = false;
                config.links.arrowHeadAtSrcOverridable = false;
                config.links.arrowHeadAtDst = true;
                config.links.arrowHeadAtDstOverridable = false;
                config.nodes.canBeAcceptStates = true;
                setFsmAlphabetVisible(true);
                break;
            case 'digraph':
                config.canvas.acceptLinks = true;
                config.canvas.acceptSelfLinks = true;
                config.canvas.acceptStartLinks = false;
                config.links.arrowHeadAtSrc = false;
                config.links.arrowHeadAtSrcOverridable = true;
                config.links.arrowHeadAtDst = true;
                config.links.arrowHeadAtDstOverridable = false;
                config.nodes.canBeAcceptStates = false;
                setFsmAlphabetVisible(false);
                break;
            case 'undigraph':
                config.canvas.acceptLinks = true;
                config.canvas.acceptSelfLinks = true;
                config.canvas.acceptStartLinks = false;
                config.links.arrowHeadAtSrc = false;
                config.links.arrowHeadAtSrcOverridable = false;
                config.links.arrowHeadAtDst = false;
                config.links.arrowHeadAtDstOverridable = false;
                config.nodes.canBeAcceptStates = false;
                setFsmAlphabetVisible(false);
                break;
            case 'nodesonly':
                config.canvas.acceptLinks = false;
                config.canvas.acceptSelfLinks = false;
                config.canvas.acceptStartLinks = false;
                config.links.arrowHeadAtSrc = false;
                config.links.arrowHeadAtSrcOverridable = false;
                config.links.arrowHeadAtDst = false;
                config.links.arrowHeadAtDstOverridable = false;
                config.nodes.canBeAcceptStates = false;
                setFsmAlphabetVisible(false);
                break;
        }
    }

    // --- Item Definition ---

    // Generic algorithm to align an item to a target item.
    function snapTo(target) {
        if(this === target) {
            return;
        }

        if(Math.abs(this.x - target.x) < snapToPadding) {
            this.x = target.x;
        }

        if(Math.abs(this.y - target.y) < snapToPadding) {
            this.y = target.y;
        }
    }

    var nodeDistanceToInnerCircle = 5;
    var nodeMinRadius = 2 * nodeDistanceToInnerCircle;

    function Node(x, y) {
        this.x = x;
        this.y = y;
        this.text = '';
        this.isInitialState = false;
        this.isAcceptState = false;
        this.radius = config.nodes.radius;
        this.opacity = config.canvas.opacity;
        this.dashesEnabled = false;
        JsuCmn.copyPropsNoCheck(['borderColor', 'bgColor', 'textColor'], config.nodes, this);

        this.mouseOffsetX = 0;
        this.mouseOffsetY = 0;

        this._resizeBase = -1;
        this._resizeStep = 0;
    }

    // note that Object.getOwnPropertyNames(myNode) will not see the property defined here, but for(prop in myNode) {...} will
    Object.defineProperty(Node.prototype, 'radius', {
        get() { return this._radius; },
        set(value) {
            if(value < nodeMinRadius) {
                value = nodeMinRadius;
            }
            this._radius = value;
        },
        configurable: true, // for prototype extension (i.e. the property can be deleted and set again)
        enumerable: true,
    });

    Node.prototype.toJson = function() {
        return {
            'x': this.x,
            'y': this.y,
            'text': this.text,
            'isAcceptState': this.isAcceptState,
            'radius': this.radius,
            'opacity': this.opacity,
            'dashesEnabled': this.dashesEnabled,
            'borderColor': this.borderColor,
            'bgColor': this.bgColor,
            'textColor': this.textColor,
            'readonly.isInitialState': this.isInitialState, // exported for reading only
        };
    };

    Node.fromJson = function(obj) {
        try {
            var nodeX = JsuCmn.isNumber(obj.x) ? obj.x : canvas.width/4;
            var nodeY = JsuCmn.isNumber(obj.y) ? obj.y : canvas.height/4;
            var node = new Node(nodeX, nodeY);
            node.text = JsuCmn.isString(obj.text) ? filterTextAccordingToCanvasRules(obj.text) : '';
            node.isAcceptState = config.nodes.canBeAcceptStates && JsuCmn.isBoolean(obj.isAcceptState) && obj.isAcceptState;
            node.radius = JsuCmn.isNumber(obj.radius) && obj.radius >= 0 ? obj.radius : node.radius;
            node.opacity = isNumberInRange(obj.opacity, 0, 1) ? obj.opacity : node.opacity;
            node.dashesEnabled = JsuCmn.isBoolean(obj.dashesEnabled) && obj.dashesEnabled;
            JsuCmn.copyPropsAndCheck(['borderColor', 'bgColor', 'textColor'], obj, node, JsuCmn.isCssColorOrString);
            return node;
        } catch(e) {}
        return null;
    };

    Node.prototype.resizeBy = function(stepVal) {
        if(stepVal === 0) return false;
        if(stepVal < 0 && this.radius === nodeMinRadius) return false;

        if(this._resizeBase === -1) this._resizeBase = this.radius;
        this._resizeStep += stepVal;
        this.radius = this._resizeBase + this._resizeStep;
        return true;
    };

    Node.prototype.resetSize = function() {
        if(this._resizeBase !== -1) {
            this.radius = this._resizeBase;
            this._resizeBase = -1;
            this._resizeStep = 0;
            return true;
        }
        return false;
    };

    Node.prototype.setMouseStart = function(x, y) {
        this.mouseOffsetX = this.x - x;
        this.mouseOffsetY = this.y - y;
    };

    Node.prototype.setAnchorPoint = function(x, y) {
        this.x = x + this.mouseOffsetX;
        this.y = y + this.mouseOffsetY;
    };

    Node.prototype.draw = function(c, isSelected) {
        c.globalAlpha = this.opacity;
        c.fillStyle = this.bgColor;
        c.strokeStyle = this.borderColor;
        c.setLineDash(this.dashesEnabled ? config.canvas.lineDashSegments : []);

        // draw the circle
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
        c.fill();
        c.stroke();

        // draw a double circle for an accept state
        if(this.isAcceptState) {
            c.beginPath();
            c.arc(this.x, this.y, this.radius - nodeDistanceToInnerCircle, 0, 2 * Math.PI, false);
            c.fill();
            c.stroke();
        }

        c.setLineDash([]);

        // draw the text
        c.fillStyle = this.textColor;
        c.strokeStyle = this.textColor;
        drawText(c, this.text, this.x, this.y, null, isSelected);
    };

    Node.prototype.closestPointOnCircle = function(x, y) {
        var dx = x - this.x;
        var dy = y - this.y;
        var scale = Math.sqrt(dx * dx + dy * dy);
        return {
            'x': this.x + dx * this.radius / scale,
            'y': this.y + dy * this.radius / scale,
        };
    };

    Node.prototype.containsPoint = function(x, y) {
        return (x - this.x)*(x - this.x) + (y - this.y)*(y - this.y) < this.radius*this.radius;
    };

    Node.prototype.snapTo = snapTo;

    // Link between two nodes.
    function Link(a, b) {
        this.nodeA = a;
        this.nodeAHasArrow = config.links.arrowHeadAtSrc;
        this.nodeB = b;
        this.nodeBHasArrow = config.links.arrowHeadAtDst;
        this.text = '';
        this.opacity = config.canvas.opacity;
        this.dashesEnabled = false;
        JsuCmn.copyPropsNoCheck(['lineColor', 'arrowColor', 'textColor'], config.links, this);

        this.lineAngleAdjust = 0; // value to add to text angle when link is a straight line
        // make anchor point relative to the locations of nodeA and nodeB
        this.parallelPart = 0.5; // percentage from nodeA to nodeB
        this.perpendicularPart = 0; // pixels from the line between nodeA and nodeB
    };

    Link.prototype.getTwoExtremityNodes = function() {
        return [this.nodeA, this.nodeB];
    };

    Link.prototype.toJson = function(nodes) {
        return {
            'type': 'Link',
            'nodeAIndex': nodes.indexOf(this.nodeA),
            'nodeAHasArrow': this.nodeAHasArrow,
            'nodeBIndex': nodes.indexOf(this.nodeB),
            'nodeBHasArrow': this.nodeBHasArrow,
            'text': this.text,
            'opacity': this.opacity,
            'dashesEnabled': this.dashesEnabled,
            'lineColor': this.lineColor,
            'arrowColor': this.arrowColor,
            'textColor': this.textColor,
            'lineAngleAdjust': this.lineAngleAdjust,
            'parallelPart': this.parallelPart,
            'perpendicularPart': this.perpendicularPart,
        };
    };

    Link.fromJson = function(obj, nodes) {
        try {
            if(obj.type === 'Link' && obj.nodeAIndex !== obj.nodeBIndex) { // see (1) below
                var link = new Link(getNodeElt(nodes, obj.nodeAIndex), getNodeElt(nodes, obj.nodeBIndex));
                link.nodeAHasArrow = config.links.arrowHeadAtSrcOverridable ? JsuCmn.isBoolean(obj.nodeAHasArrow) && obj.nodeAHasArrow : link.nodeAHasArrow;
                link.nodeBHasArrow = config.links.arrowHeadAtDstOverridable ? JsuCmn.isBoolean(obj.nodeBHasArrow) && obj.nodeBHasArrow : link.nodeBHasArrow;
                link.text = JsuCmn.isString(obj.text) ? filterTextAccordingToCanvasRules(obj.text) : '';
                link.opacity = isNumberInRange(obj.opacity, 0, 1) ? obj.opacity : link.opacity;
                link.dashesEnabled = JsuCmn.isBoolean(obj.dashesEnabled) && obj.dashesEnabled;
                JsuCmn.copyPropsAndCheck(['lineColor', 'arrowColor', 'textColor'], obj, link, JsuCmn.isCssColorOrString);
                link.lineAngleAdjust = JsuCmn.isNumber(obj.lineAngleAdjust) ? obj.lineAngleAdjust : link.lineAngleAdjust;
                link.parallelPart = JsuCmn.isNumber(obj.parallelPart) ? obj.parallelPart : link.parallelPart;
                link.perpendicularPart = JsuCmn.isNumber(obj.perpendicularPart) ? obj.perpendicularPart : link.perpendicularPart;
                return link;
            }
        } catch(e) {}
        return null;

        // (1) We don't really need to check that nodes are different because
        //     in case they are not the observed behaviour is similar to the
        //     case where nodes are different but at the exact same position:
        //     the link is there but not visible on screen. However, we prefer
        //     to ignore instances of Link between two identical nodes because
        //     we already have the SelfLink class.
    };

    Link.prototype.prepareInsertionToCanvas = function() {
        return config.canvas.acceptLinks;
    };

    Link.prototype.prepareRemovalFromCanvas = function() {};

    Link.prototype.getAnchorPoint = function() {
        var dx = this.nodeB.x - this.nodeA.x;
        var dy = this.nodeB.y - this.nodeA.y;
        var scale = Math.sqrt(dx * dx + dy * dy);
        return {
            'x': this.nodeA.x + dx * this.parallelPart - dy * this.perpendicularPart / scale,
            'y': this.nodeA.y + dy * this.parallelPart + dx * this.perpendicularPart / scale
        };
    };

    Link.prototype.setAnchorPoint = function(x, y) {
        var dx = this.nodeB.x - this.nodeA.x;
        var dy = this.nodeB.y - this.nodeA.y;
        var scale = Math.sqrt(dx * dx + dy * dy);
        this.parallelPart = (dx * (x - this.nodeA.x) + dy * (y - this.nodeA.y)) / (scale * scale);
        this.perpendicularPart = (dx * (y - this.nodeA.y) - dy * (x - this.nodeA.x)) / scale;
        // snap to a straight line
        if(this.parallelPart > 0 && this.parallelPart < 1 && Math.abs(this.perpendicularPart) < snapToPadding) {
            this.lineAngleAdjust = (this.perpendicularPart < 0) * Math.PI;
            this.perpendicularPart = 0;
        }
    };

    Link.prototype.getEndPointsAndCircle = function() {
        if(this.perpendicularPart === 0) {
            var midX = (this.nodeA.x + this.nodeB.x) / 2;
            var midY = (this.nodeA.y + this.nodeB.y) / 2;
            var start = this.nodeA.closestPointOnCircle(midX, midY);
            var end = this.nodeB.closestPointOnCircle(midX, midY);
            return {
                'hasCircle': false,
                'startX': start.x,
                'startY': start.y,
                'startArrowRequested': this.nodeAHasArrow,
                'endX': end.x,
                'endY': end.y,
                'endArrowRequested': this.nodeBHasArrow,
            };
        }
        var anchor = this.getAnchorPoint();
        var circle = circleFromThreePoints(this.nodeA.x, this.nodeA.y, this.nodeB.x, this.nodeB.y, anchor.x, anchor.y);
        var isReversed = (this.perpendicularPart > 0);
        var reverseScale = isReversed ? 1 : -1;
        var startAngle = Math.atan2(this.nodeA.y - circle.y, this.nodeA.x - circle.x) - reverseScale * this.nodeA.radius / circle.radius;
        var endAngle = Math.atan2(this.nodeB.y - circle.y, this.nodeB.x - circle.x) + reverseScale * this.nodeB.radius / circle.radius;
        var startX = circle.x + circle.radius * Math.cos(startAngle);
        var startY = circle.y + circle.radius * Math.sin(startAngle);
        var endX = circle.x + circle.radius * Math.cos(endAngle);
        var endY = circle.y + circle.radius * Math.sin(endAngle);
        return {
            'hasCircle': true,
            'startX': startX,
            'startY': startY,
            'startArrowRequested': this.nodeAHasArrow,
            'endX': endX,
            'endY': endY,
            'endArrowRequested': this.nodeBHasArrow,
            'startAngle': startAngle,
            'endAngle': endAngle,
            'circleX': circle.x,
            'circleY': circle.y,
            'circleRadius': circle.radius,
            'reverseScale': reverseScale,
            'isReversed': isReversed,
        };
    };

    Link.prototype.draw = function(c, isSelected) {
        var stuff = this.getEndPointsAndCircle();
        var textX = 0;
        var textY = 0;
        var textAngle = 0;

        c.globalAlpha = this.opacity;

        // draw the arc
        if(c.extra_forceFillStyleTransparency) c.fillStyle = 'transparent';
        c.strokeStyle = this.lineColor;
        c.setLineDash(this.dashesEnabled ? config.canvas.lineDashSegments : []);
        c.beginPath();
        if(stuff.hasCircle) {
            c.arc(stuff.circleX, stuff.circleY, stuff.circleRadius, stuff.startAngle, stuff.endAngle, stuff.isReversed);
        } else {
            c.moveTo(stuff.startX, stuff.startY);
            c.lineTo(stuff.endX, stuff.endY);
        }
        c.stroke();
        c.setLineDash([]);

        // draw the heads of the arrow
        c.fillStyle = this.arrowColor;
        if(stuff.hasCircle) {
            if(stuff.startArrowRequested) {
                drawArrow(c, stuff.startX, stuff.startY, stuff.startAngle + stuff.reverseScale * (Math.PI / 2));
            }
            if(stuff.endArrowRequested) {
                drawArrow(c, stuff.endX, stuff.endY, stuff.endAngle - stuff.reverseScale * (Math.PI / 2));
            }
        } else {
            if(stuff.startArrowRequested) {
                drawArrow(c, stuff.startX, stuff.startY, Math.atan2(stuff.startY - stuff.endY, stuff.startX - stuff.endX));
            }
            if(stuff.endArrowRequested) {
                drawArrow(c, stuff.endX, stuff.endY, Math.atan2(stuff.endY - stuff.startY, stuff.endX - stuff.startX));
            }
        }

        // draw the text
        c.fillStyle = this.textColor;
        if(stuff.hasCircle) {
            var startAngle = stuff.startAngle;
            var endAngle = stuff.endAngle;
            if(endAngle < startAngle) {
                endAngle += Math.PI * 2;
            }
            textAngle = (startAngle + endAngle) / 2 + stuff.isReversed * Math.PI;
            textX = stuff.circleX + stuff.circleRadius * Math.cos(textAngle);
            textY = stuff.circleY + stuff.circleRadius * Math.sin(textAngle);
            drawText(c, this.text, textX, textY, textAngle, isSelected);
        } else {
            textX = (stuff.startX + stuff.endX) / 2;
            textY = (stuff.startY + stuff.endY) / 2;
            textAngle = Math.atan2(stuff.endX - stuff.startX, stuff.startY - stuff.endY);
            drawText(c, this.text, textX, textY, textAngle + this.lineAngleAdjust, isSelected);
        }
    };

    Link.prototype.containsPoint = function(x, y) {
        var stuff = this.getEndPointsAndCircle();
        var dx = 0;
        var dy = 0;
        var distance = 0;
        if(stuff.hasCircle) {
            dx = x - stuff.circleX;
            dy = y - stuff.circleY;
            distance = Math.sqrt(dx*dx + dy*dy) - stuff.circleRadius;
            if(Math.abs(distance) < hitTargetPadding) {
                var angle = Math.atan2(dy, dx);
                var startAngle = stuff.startAngle;
                var endAngle = stuff.endAngle;
                if(stuff.isReversed) {
                    var temp = startAngle;
                    startAngle = endAngle;
                    endAngle = temp;
                }
                if(endAngle < startAngle) {
                    endAngle += Math.PI * 2;
                }
                if(angle < startAngle) {
                    angle += Math.PI * 2;
                } else if(angle > endAngle) {
                    angle -= Math.PI * 2;
                }
                return (angle > startAngle && angle < endAngle);
            }
        } else {
            dx = stuff.endX - stuff.startX;
            dy = stuff.endY - stuff.startY;
            var length = Math.sqrt(dx*dx + dy*dy);
            var percent = (dx * (x - stuff.startX) + dy * (y - stuff.startY)) / (length * length);
            distance = (dx * (y - stuff.startY) - dy * (x - stuff.startX)) / length;
            return (percent > 0 && percent < 1 && Math.abs(distance) < hitTargetPadding);
        }
        return false;
    };

    // Link from one node to itself (i.e. a loop).
    function SelfLink(node, mouse) {
        this.node = node;
        this.nodeHasArrow = config.links.arrowHeadAtDst;
        this.text = '';
        this.opacity = config.canvas.opacity;
        this.dashesEnabled = false;
        JsuCmn.copyPropsNoCheck(['lineColor', 'arrowColor', 'textColor'], config.links, this);

        this.anchorAngle = 0;
        this.mouseOffsetAngle = 0;

        if(mouse) {
            this.setAnchorPoint(mouse.x, mouse.y);
        }
    }

    SelfLink.prototype.getTwoExtremityNodes = function() {
        return [this.node, this.node];
    };

    SelfLink.prototype.toJson = function(nodes) {
        return {
            'type': 'SelfLink',
            'nodeIndex': nodes.indexOf(this.node),
            'nodeHasArrow': this.nodeHasArrow,
            'text': this.text,
            'opacity': this.opacity,
            'dashesEnabled': this.dashesEnabled,
            'lineColor': this.lineColor,
            'arrowColor': this.arrowColor,
            'textColor': this.textColor,
            'anchorAngle': this.anchorAngle,
        };
    };

    SelfLink.fromJson = function(obj, nodes) {
        try {
            if(obj.type === 'SelfLink') {
                var link = new SelfLink(getNodeElt(nodes, obj.nodeIndex));
                link.nodeHasArrow = config.links.arrowHeadAtDstOverridable ? JsuCmn.isBoolean(obj.nodeHasArrow) && obj.nodeHasArrow : link.nodeHasArrow;
                link.text = JsuCmn.isString(obj.text) ? filterTextAccordingToCanvasRules(obj.text) : '';
                link.opacity = isNumberInRange(obj.opacity, 0, 1) ? obj.opacity : link.opacity;
                link.dashesEnabled = JsuCmn.isBoolean(obj.dashesEnabled) && obj.dashesEnabled;
                JsuCmn.copyPropsAndCheck(['lineColor', 'arrowColor', 'textColor'], obj, link, JsuCmn.isCssColorOrString);
                link.anchorAngle = JsuCmn.isNumber(obj.anchorAngle) ? obj.anchorAngle : link.anchorAngle;
                return link;
            }
        } catch(e) {}
        return null;
    };

    SelfLink.prototype.prepareInsertionToCanvas = function() {
        return config.canvas.acceptSelfLinks;
    };

    SelfLink.prototype.prepareRemovalFromCanvas = function() {};

    SelfLink.prototype.setMouseStart = function(x, y) {
        this.mouseOffsetAngle = this.anchorAngle - Math.atan2(y - this.node.y, x - this.node.x);
    };

    SelfLink.prototype.setAnchorPoint = function(x, y) {
        this.anchorAngle = Math.atan2(y - this.node.y, x - this.node.x) + this.mouseOffsetAngle;
        // snap to 90 degrees
        var snap = Math.round(this.anchorAngle / (Math.PI / 2)) * (Math.PI / 2);
        if(Math.abs(this.anchorAngle - snap) < 0.1) this.anchorAngle = snap;
        // keep in the range -pi to pi so our containsPoint() function always works
        if(this.anchorAngle < -Math.PI) this.anchorAngle += 2 * Math.PI;
        if(this.anchorAngle > Math.PI) this.anchorAngle -= 2 * Math.PI;
    };

    SelfLink.prototype.getEndPointsAndCircle = function() {
        var circleX = this.node.x + 1.5 * this.node.radius * Math.cos(this.anchorAngle);
        var circleY = this.node.y + 1.5 * this.node.radius * Math.sin(this.anchorAngle);
        var circleRadius = 0.75 * this.node.radius;
        var startAngle = this.anchorAngle - Math.PI * 0.8;
        var endAngle = this.anchorAngle + Math.PI * 0.8;
        var startX = circleX + circleRadius * Math.cos(startAngle);
        var startY = circleY + circleRadius * Math.sin(startAngle);
        var endX = circleX + circleRadius * Math.cos(endAngle);
        var endY = circleY + circleRadius * Math.sin(endAngle);
        return {
            'hasCircle': true,
            'startX': startX,
            'startY': startY,
            'endX': endX,
            'endY': endY,
            'startAngle': startAngle,
            'endAngle': endAngle,
            'circleX': circleX,
            'circleY': circleY,
            'circleRadius': circleRadius,
            'arrowRequested': this.nodeHasArrow,
        };
    };

    SelfLink.prototype.draw = function(c, isSelected) {
        var stuff = this.getEndPointsAndCircle();

        c.globalAlpha = this.opacity;

        // draw the arc
        if(c.extra_forceFillStyleTransparency) c.fillStyle = 'transparent';
        c.strokeStyle = this.lineColor;
        c.setLineDash(this.dashesEnabled ? config.canvas.lineDashSegments : []);
        c.beginPath();
        c.arc(stuff.circleX, stuff.circleY, stuff.circleRadius, stuff.startAngle, stuff.endAngle, false);
        c.stroke();
        c.setLineDash([]);

        // draw the head of the arrow
        c.fillStyle = this.arrowColor;
        if(stuff.arrowRequested) {
            drawArrow(c, stuff.endX, stuff.endY, stuff.endAngle + Math.PI * 0.4);
        }

        // draw the text on the loop farthest from the node
        c.fillStyle = this.textColor;
        var textX = stuff.circleX + stuff.circleRadius * Math.cos(this.anchorAngle);
        var textY = stuff.circleY + stuff.circleRadius * Math.sin(this.anchorAngle);
        drawText(c, this.text, textX, textY, this.anchorAngle, isSelected);
    };

    SelfLink.prototype.containsPoint = function(x, y) {
        var stuff = this.getEndPointsAndCircle();
        var dx = x - stuff.circleX;
        var dy = y - stuff.circleY;
        var distance = Math.sqrt(dx*dx + dy*dy) - stuff.circleRadius;
        return (Math.abs(distance) < hitTargetPadding);
    };

    // Link to represent initial states in finite state machines.
    function StartLink(node, start) {
        this.node = node;
        this.text = '';
        this.opacity = config.canvas.opacity;
        this.dashesEnabled = false;
        JsuCmn.copyPropsNoCheck(['lineColor', 'arrowColor', 'textColor'], config.links, this);
        this.prefersNodeVisualAttrs = true;

        this.deltaX = 0;
        this.deltaY = 0;

        if(start) {
            this.setAnchorPoint(start.x, start.y);
        }
    }

    StartLink.prototype.toJson = function(nodes) {
        return {
            'type': 'StartLink',
            'nodeIndex': nodes.indexOf(this.node),
            'text': this.text,
            'opacity': this.opacity,
            'dashesEnabled': this.dashesEnabled,
            'lineColor': this.lineColor,
            'arrowColor': this.arrowColor,
            'textColor': this.textColor,
            'prefersNodeVisualAttrs': this.prefersNodeVisualAttrs,
            'deltaX': this.deltaX,
            'deltaY': this.deltaY,
        };
    };

    StartLink.fromJson = function(obj, nodes) {
        try {
            if(obj.type === 'StartLink') {
                var link = new StartLink(getNodeElt(nodes, obj.nodeIndex));
                link.text = JsuCmn.isString(obj.text) ? filterTextAccordingToCanvasRules(obj.text) : '';
                link.opacity = isNumberInRange(obj.opacity, 0, 1) ? obj.opacity : link.opacity;
                link.dashesEnabled = JsuCmn.isBoolean(obj.dashesEnabled) && obj.dashesEnabled;
                JsuCmn.copyPropsAndCheck(['lineColor', 'arrowColor', 'textColor'], obj, link, JsuCmn.isCssColorOrString);
                link.prefersNodeVisualAttrs = JsuCmn.isBoolean(obj.prefersNodeVisualAttrs) && obj.prefersNodeVisualAttrs;
                link.deltaX = JsuCmn.isNumber(obj.deltaX) ? obj.deltaX : link.deltaX;
                link.deltaY = JsuCmn.isNumber(obj.deltaY) ? obj.deltaY : link.deltaY;
                return link;
            }
        } catch(e) {}
        return null;
    };

    StartLink.prototype.prepareInsertionToCanvas = function() {
        if(config.canvas.acceptStartLinks && !this.node.isInitialState) {
            this.node.isInitialState = true;
            return true;
        }
        return false;
    };

    StartLink.prototype.prepareRemovalFromCanvas = function() {
        this.node.isInitialState = false;
    };

    StartLink.prototype.setAnchorPoint = function(x, y) {
        this.deltaX = x - this.node.x;
        this.deltaY = y - this.node.y;

        if(Math.abs(this.deltaX) < snapToPadding) {
            this.deltaX = 0;
        }

        if(Math.abs(this.deltaY) < snapToPadding) {
            this.deltaY = 0;
        }
    };

    StartLink.prototype.getEndPoints = function() {
        var startX = this.node.x + this.deltaX;
        var startY = this.node.y + this.deltaY;
        var end = this.node.closestPointOnCircle(startX, startY);
        return {
            'startX': startX,
            'startY': startY,
            'endX': end.x,
            'endY': end.y,
        };
    };

    StartLink.prototype.draw = function(c, isSelected) {
        var stuff = this.getEndPoints();

        c.globalAlpha = this.prefersNodeVisualAttrs ?
                        this.node.opacity*0.9 : // similar opacity for both node and link
                        this.opacity;

        // draw the line
        c.strokeStyle = this.prefersNodeVisualAttrs ? this.node.borderColor : this.lineColor;
        c.setLineDash((this.prefersNodeVisualAttrs ? this.node.dashesEnabled : this.dashesEnabled) ? config.canvas.lineDashSegments : []);
        c.beginPath();
        c.moveTo(stuff.startX, stuff.startY);
        c.lineTo(stuff.endX, stuff.endY);
        c.stroke();
        c.setLineDash([]);

        // draw the head of the arrow
        c.fillStyle = this.prefersNodeVisualAttrs ? this.node.borderColor : this.arrowColor;
        if(config.links.arrowHeadAtDst) {
            drawArrow(c, stuff.endX, stuff.endY, Math.atan2(-this.deltaY, -this.deltaX));
        }

        // draw the text at the end without the arrow
        c.fillStyle = this.prefersNodeVisualAttrs ? this.node.borderColor : this.textColor;
        var textAngle = Math.atan2(stuff.startY - stuff.endY, stuff.startX - stuff.endX);
        drawText(c, this.text, stuff.startX, stuff.startY, textAngle, isSelected);
    };

    StartLink.prototype.containsPoint = function(x, y) {
        var stuff = this.getEndPoints();
        var dx = stuff.endX - stuff.startX;
        var dy = stuff.endY - stuff.startY;
        var length = Math.sqrt(dx*dx + dy*dy);
        var percent = (dx * (x - stuff.startX) + dy * (y - stuff.startY)) / (length * length);
        var distance = (dx * (y - stuff.startY) - dy * (x - stuff.startX)) / length;
        return (percent > 0 && percent < 1 && Math.abs(distance) < hitTargetPadding);
    };

    // Temporary link which is never pushed to the canvas.
    function TemporaryLink(from, to) {
        this.from = from;
        this.to = to;
    }

    TemporaryLink.prototype.prepareInsertionToCanvas = function() {
        return false;
    };

    TemporaryLink.prototype.draw = function(c, isSelected) {
        c.globalAlpha = config.canvas.opacity;
        c.fillStyle = config.links.arrowColor;
        c.strokeStyle = config.links.lineColor;

        // draw the line
        c.beginPath();
        c.moveTo(this.to.x, this.to.y);
        c.lineTo(this.from.x, this.from.y);
        c.stroke();

        // draw the heads of the arrow
        if(config.links.arrowHeadAtSrc) {
            drawArrow(c, this.from.x, this.from.y, Math.atan2(this.from.y - this.to.y, this.from.x - this.to.x));
        }
        if(config.links.arrowHeadAtDst) {
            drawArrow(c, this.to.x, this.to.y, Math.atan2(this.to.y - this.from.y, this.to.x - this.from.x));
        }
    };

    // Text item with automatic resizing.
    function TextItem(x, y) {
        this.x = x;
        this.y = y;
        this.text = '';
        this.opacity = config.canvas.opacity;
        JsuCmn.copyPropsNoCheck(['textColor'], config.textItems, this);

        this.mouseOffsetX = 0;
        this.mouseOffsetY = 0;
    }

    TextItem.prototype.toJson = function() {
        return {
            'x': this.x,
            'y': this.y,
            'text': this.text,
            'opacity': this.opacity,
            'textColor': this.textColor,
        };
    };

    TextItem.fromJson = function(obj) {
        try {
            var textItemX = JsuCmn.isNumber(obj.x) ? obj.x : canvas.width/4;
            var textItemY = JsuCmn.isNumber(obj.y) ? obj.y : canvas.height/4;
            var textItem = new TextItem(textItemX, textItemY);
            textItem.text = JsuCmn.isString(obj.text) ? filterTextAccordingToCanvasRules(obj.text) : '';
            textItem.opacity = isNumberInRange(obj.opacity, 0, 1) ? obj.opacity : textItem.opacity;
            JsuCmn.copyPropsAndCheck(['textColor'], obj, textItem, JsuCmn.isCssColorOrString);
            return textItem;
        } catch(e) {}
        return null;
    };

    TextItem.prototype.setMouseStart = function(x, y) {
        this.mouseOffsetX = this.x - x;
        this.mouseOffsetY = this.y - y;
    };

    TextItem.prototype.setAnchorPoint = function(x, y) {
        this.x = x + this.mouseOffsetX;
        this.y = y + this.mouseOffsetY;
    };

    TextItem.prototype.draw = function(c, isSelected) {
        c.globalAlpha = this.opacity;
        c.strokeStyle = this.textColor;

        if(!c.extra_ignoreSpecialRendering) {
            // draw the bounding rectangle
            var proceed = this.text.trim() === '' || (selectionHighlightable() && isSelected);
            if(proceed) {
                var rect = this.getBoundingRect();
                if(c.extra_forceFillStyleTransparency) c.fillStyle = 'transparent';
                c.beginPath();
                c.rect(rect.x, rect.y, rect.width, rect.height);
                c.stroke();
            }
        }

        c.fillStyle = this.textColor;
        drawText(c, this.text, this.x, this.y, null, isSelected);
    };

    TextItem.prototype.getBoundingRect = function() {
        var text = JsuLtx.convertLatexShortcuts(this.text);
        var width = Math.round(measureTextUsingCanvas(text, config.canvas.font).width) + 6; // padding is useful when text is empty for example
        var height = caretHeight + 6; // add padding here too
        return {
            'x': this.x - width/2,
            'y': this.y - height/2,
            'width': width,
            'height': height,
        };
    };

    TextItem.prototype.containsPoint = function(x, y) {
        var rect = this.getBoundingRect();
        return (rect.x <= x && x <= rect.x + rect.width) && (rect.y <= y && y <= rect.y + rect.height);
    };

    TextItem.prototype.snapTo = snapTo;

    // --- General Routines ---

    function canvasHasFocus() {
        return (document.activeElement || document.body) === document.body;
    }

    // Draws all canvas items on the screen using drawUsing().
    function draw() {
        if(canvas) {
            drawUsing(canvas.getContext('2d'));
        }
    }

    // A helper function that draw() and saveBackupAuto() accordingly.
    //     - ignoreAutoBackup: optional; indicates whether saveBackupAuto() must
    //       not be called; defaults to false.
    function draw_(ignoreAutoBackup) {
        draw();
        if(!ignoreAutoBackup) {
            saveBackupAuto();
        }
    }

    // Draws all canvas items in a custom way.
    //     - c: the 2D rendering context to use to draw each canvas item.
    //       canvas.getContext('2d') is passed as a parameter when this function
    //       is called during draw(), but any other object can be passed as long
    //       as it provides all properties and functions of the CanvasRenderingContext2D
    //       interface that are accessed (get) or called when executing the
    //       function, including additional attributes that start with 'extra_'
    //       to supplement those of said interface:
    //           - extra_advancedFillText: custom text drawing function used if
    //             present.
    //           - extra_forceFillStyleTransparency: indicates whether canvas
    //             fillStyle must be set to transparent in several places when
    //             drawing, even if the canvas fill() function is not involved
    //             in those places at all. For example, when drawing a <path>
    //             element to represent a link (an arrow) in an SVG document,
    //             the 'fill' property should be set to 'transparent' so that
    //             the resulting drawing is not filled.
    //           - extra_ignoreSpecialRendering: indicates whether special
    //             drawing operations must be ignored, such as drawing the caret
    //             on the selected canvas item for example.
    function drawUsing(c) {
        c.clearRect(0, 0, canvas.width, canvas.height);
        c.save();
        c.translate(0.5, 0.5);

        c.lineWidth = 1;
        c.font = config.canvas.font;
        var i = 0;
        for(i = 0; i < nodes.length; i++) {
            nodes[i].draw(c, nodes[i] === selectedObject);
        }
        for(i = 0; i < links.length; i++) {
            links[i].draw(c, links[i] === selectedObject);
        }
        for(i = 0; i < textItems.length; i++) {
            textItems[i].draw(c, textItems[i] === selectedObject);
        }
        if(currentLink !== null) {
            currentLink.draw(c, currentLink === selectedObject);
        }

        c.restore();
    }

    function drawText(c, originalText, x, y, angleOrNull, isSelected) {
        var text = JsuLtx.convertLatexShortcuts(originalText);
        var width = c.measureText(text).width;
        var widthHalf = width / 2;

        // center the text horizontally
        x -= widthHalf;

        // position the text intelligently if given an angle
        if(angleOrNull !== null) {
            var cos = Math.cos(angleOrNull);
            var sin = Math.sin(angleOrNull);
            var cornerPointX = (widthHalf + 5) * (cos > 0 ? 1 : -1);
            var cornerPointY = (textPosSpacing + 5) * (sin > 0 ? 1 : -1);
            var slide = sin * Math.pow(Math.abs(sin), 40) * cornerPointX - cos * Math.pow(Math.abs(cos), 10) * cornerPointY;
            x += cornerPointX - sin * slide;
            y += cornerPointY + cos * slide;
        }

        // draw text and caret (round the coordinates so the caret falls on a pixel)
        if('extra_advancedFillText' in c) {
            c.extra_advancedFillText(text, originalText, x + widthHalf, y, angleOrNull);
        } else {
            x = Math.round(x);
            y = Math.round(y);
            c.fillText(text, x, y + config.canvas.fontTextVerticalPadding);
            if(!c.extra_ignoreSpecialRendering && selectionHighlightable() && isSelected && caretVisible) {
                if(config.canvas.caretAdvancedPositioning) {
                    var textBeforeCaret = text.substring(0, caretPos); // so caretPos must have been set with the appropriate string indexes in mind
                    x += c.measureText(textBeforeCaret).width;
                } else {
                    x += width;
                }
                c.beginPath();
                c.moveTo(x, y - caretHeightHalf);
                c.lineTo(x, y + caretHeightHalf);
                c.stroke();
            }
        }
    }

    function drawArrow(c, x, y, angle) {
        var dx = Math.cos(angle);
        var dy = Math.sin(angle);
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x - 8 * dx + 5 * dy, y - 8 * dy - 5 * dx);
        c.lineTo(x - 8 * dx - 5 * dy, y - 8 * dy + 5 * dx);
        c.fill();
    }

    // Returns whether a selected item in the canvas can be highlighted.
    function selectionHighlightable() {
        // the document.hasFocus() condition ensures that the focus has not
        // moved from the document to the Web Developer Tool for example
        return canvasHasFocus() && document.hasFocus();
    }

    function measureTextUsingCanvas(text, font) {
        var retVal = null;
        var c = canvas.getContext('2d');
        var f = c.font; // temporary font backup
        c.font = font; retVal = c.measureText(text); c.font = f;
        return retVal;
    }

    function det(a, b, c, d, e, f, g, h, i) {
        return a*e*i + b*f*g + c*d*h - a*f*h - b*d*i - c*e*g;
    }

    function circleFromThreePoints(x1, y1, x2, y2, x3, y3) {
        var a = det(x1, y1, 1, x2, y2, 1, x3, y3, 1);
        var bx = -det(x1*x1 + y1*y1, y1, 1, x2*x2 + y2*y2, y2, 1, x3*x3 + y3*y3, y3, 1);
        var by = det(x1*x1 + y1*y1, x1, 1, x2*x2 + y2*y2, x2, 1, x3*x3 + y3*y3, x3, 1);
        var c = -det(x1*x1 + y1*y1, x1, y1, x2*x2 + y2*y2, x2, y2, x3*x3 + y3*y3, x3, y3);
        return {
            'x': -bx / (2*a),
            'y': -by / (2*a),
            'radius': Math.sqrt(bx*bx + by*by - 4*a*c) / (2*Math.abs(a))
        };
    }

    // Sets HTML elements (canvas and FSM alphabet container) accordingly, then
    // draw() and starts event listeners. Returns a boolean success/failure flag
    // according to setCanvas(). This is a helper function and existing
    // listeners are stopped before new ones are started.
    //     - canvas: passed to setCanvas().
    //     - fsmAlphabetContainer: optional; passed to setFsmAlphabetContainer().
    //     - options: optional object that can have the following optional
    //       properties.
    //           - 'canvas': passed to setCanvas().
    //           - 'fsmAlphabetContainer': passed to setFsmAlphabetContainer().
    function start(canvas, fsmAlphabetContainer, options) {
        var optionsCanvas = undefined;
        var optionsFsmAlphabetContainer = undefined;
        if(options) {
            if('canvas' in options) optionsCanvas = options.canvas;
            if('fsmAlphabetContainer' in options) optionsFsmAlphabetContainer = options.fsmAlphabetContainer;
        }

        stopListeners(); // in case listeners were previously started

        var canvasOk = setCanvas(canvas, optionsCanvas);
        setFsmAlphabetContainer(fsmAlphabetContainer, optionsFsmAlphabetContainer);
        if(canvasOk) {
            if(!restoreBackupAuto()) {
                draw_(); // we draw() only if restoreBackupAuto() didn't do so
            }
            startListeners();
        }
        return canvasOk;
    }

    // Returns a reference to the FSM alphabet container used internally; see
    // setFsmAlphabetContainerObj().
    function getFsmAlphabetContainerObj() { return fsmAlphabetContainer; }

    // Sets the FSM alphabet container to be used internally. Note that the FSM
    // alphabet container is not required to use nvc features; so null is a
    // valid value for example.
    //     - container: the FSM alphabet container object to use; if not null or
    //       undefined, it should be a valid HTML <input type="text"> element,
    //       as returned by document.getElementById() for example.
    function setFsmAlphabetContainerObj(container) { fsmAlphabetContainer = container; }

    // Sets the HTML attributes of the FSM alphabet container accordingly.
    // However, some of these HTML attributes are set based on the HTML
    // attributes of the canvas, and this function will not set any attributes
    // if a canvas is not already set. In any case, tieFsmAlphabetContainerToCanvas()
    // is called.
    //     - options: optional object that can have the following optional
    //       properties.
    //           - 'width': FSM alphabet container width in pixels; must be a
    //             number (>= 0) or a function returning such a number; if not
    //             valid, a default value is used instead.
    //           - 'height': same behavior as 'width' but for FSM alphabet
    //             container height.
    //           - 'showAlphabet': a function whose implementation depends on
    //             the developer but is meant to show the FSM alphabet container
    //             (if it was hidden for example); called with a single argument
    //             (the FSM alphabet container object) and can refer to
    //             the options object using the this keyword.
    //           - Any property allowed by tieFsmAlphabetContainerToCanvas().
    function setFsmAlphabetContainerAttrs(options) {
        if(!fsmAlphabetContainer || !canvas) {
            // make sure extra options are handled before early return from this function
            tieFsmAlphabetContainerToCanvas(options);
            return;
        }

        var width = null;
        var height = null;
        if(options) {
            if(JsuCmn.isNumber(options.width)) width = options.width; else try { width = options.width(); } catch(e) {}
            if(JsuCmn.isNumber(options.height)) height = options.height; else try { height = options.height(); } catch(e) {}
        }
        if(!JsuCmn.isNumber(width) || width < 0) width = 0.75 * canvas.width;
        if(!JsuCmn.isNumber(height) || height < 0) height = 20;
        fsmAlphabetContainer.placeholder = 'FSM alphabet';
        fsmAlphabetContainer.title = '';
        fsmAlphabetContainer.style.position = 'absolute';
        tieFsmAlphabetContainerToCanvas(options);
        fsmAlphabetContainer.style.width = width + 'px';
        fsmAlphabetContainer.style.height = height + 'px';
        if(options && 'showAlphabet' in options) {
            options.showAlphabet(fsmAlphabetContainer);
        }
    }

    // setFsmAlphabetContainerObj() and setFsmAlphabetContainerAttrs(). This is
    // a helper function.
    //     - fsmAlphabetContainer: passed to setFsmAlphabetContainerObj().
    //     - options: passed to setFsmAlphabetContainerAttrs().
    function setFsmAlphabetContainer(fsmAlphabetContainer, options) {
        setFsmAlphabetContainerObj(fsmAlphabetContainer);
        setFsmAlphabetContainerAttrs(options);
    }

    // Ties the FSM alphabet container to the canvas. Useful when the window
    // containing the canvas is resized for example. Note that the canvas must
    // be visible when this function is called due to getBoundingClientRect()
    // being called internally on the canvas: see options.showCanvas described
    // below.
    //     - options: optional object that can have the following optional
    //       properties.
    //           - 'spacingLeft': the number of pixels between the left of the
    //             canvas and the left of the FSM alphabet container; must be a
    //             number or a function returning a number; if not valid, a
    //             default value is used instead.
    //           - 'spacingTop': same behavior as 'spacingLeft' but for the top.
    //           - 'showCanvas': a function whose implementation depends on the
    //             developer but is meant to show the canvas (if it was hidden
    //             for example); called without any arguments and can refer to
    //             the options object using the this keyword.
    function tieFsmAlphabetContainerToCanvas(options) {
        if(!canvas) return;

        if(!fsmAlphabetContainer) {
            // make sure canvas is shown (if expected) before early return from this function
            if(options && 'showCanvas' in options) {
                options.showCanvas();
            }
            return;
        }

        var spacingLeft = null;
        var spacingTop = null;
        if(options) {
            if(JsuCmn.isNumber(options.spacingLeft)) spacingLeft = options.spacingLeft; else try { spacingLeft = options.spacingLeft(); } catch(e) {}
            if(JsuCmn.isNumber(options.spacingTop)) spacingTop = options.spacingTop; else try { spacingTop = options.spacingTop(); } catch(e) {}
            if('showCanvas' in options) { // make sure canvas is visible due to getBoundingClientRect()
                options.showCanvas();
            }
        }
        if(!JsuCmn.isNumber(spacingLeft)) spacingLeft = 10;
        if(!JsuCmn.isNumber(spacingTop)) spacingTop = 10;
        var canvasRect = canvas.getBoundingClientRect(); // note that computation will be wrong if canvas is invisible
        var canvasRectTop = canvasRect.top + window.scrollY; // in case page is scrolled
        var canvasRectLeft = canvasRect.left + window.scrollX; // in case page is scrolled
        fsmAlphabetContainer.style.top = (canvasRectTop + spacingTop) + 'px';
        fsmAlphabetContainer.style.left = (canvasRectLeft + spacingLeft) + 'px';
    }

    function getFsmAlphabetStr() { return fsmAlphabetContainer ? fsmAlphabetContainer.value : ''; }
    function setFsmAlphabetStr(str) {
        if(fsmAlphabetContainer) {
            fsmAlphabetContainer.value = filterTextAccordingToCanvasRules(str);
        }
    }
    function setFsmAlphabetVisible(visible) {
        if(fsmAlphabetContainer) {
            fsmAlphabetContainer.style.display = visible ? 'block': 'none';
        }
    }

    // Returns a reference to the canvas used internally; see setCanvasObj().
    function getCanvasObj() { return canvas; }

    // Sets the canvas to be used internally and returns a boolean
    // success/failure flag. The returned value merely indicates whether the
    // canvas has a truthy value.
    //     - canv: the canvas object to use; if not null or undefined, it should
    //       be a valid HTML canvas element, as returned by document.getElementById()
    //       for example. Moreover, when defining the canvas element in HTML, do
    //       not set 'width' and 'height' from CSS code, otherwise you might not
    //       be able to interact with the canvas at all. Instead, set these
    //       properties directly at HTML attributes level for the <canvas> tag
    //       or from JavaScript code.
    function setCanvasObj(canv) {
        canvas = canv;
        return !!canvas;
    }

    // Sets canvas size accordingly.
    //     - options: optional object that can have the following optional
    //       properties.
    //           - 'width': the value to use for the canvas width; ignored if
    //             not convertible to number (>= 0); when '%' is matched at the
    //             end of the value, the corresponding percentage of screen
    //             width is used if screen data are available. Note however that
    //             changing the canvas width might silently fail, for example if
    //             a CSS property such as max-width has been set for the canvas
    //             element to a lower value than set here.
    //           - 'height': same behavior as 'width' but for the canvas height.
    function setCanvasSize(options) {
        if(!canvas || !options) return;

        var optionsData = null;
        var screenObj = window.screen;
        var screenWidth = null;
        var screenHeight = null;
        if(screenObj) {
            if('availWidth' in screenObj) screenWidth = screenObj.availWidth;
            if('availHeight' in screenObj) screenHeight = screenObj.availHeight;
        }

        var canvasWidth = null;
        optionsData = JsuCmn.parseSuffixedValue(options.width);
        if(optionsData !== null && optionsData.number >= 0) {
            switch(optionsData.suffix) {
                case '': canvasWidth = optionsData.number; break;
                case '%': if(screenWidth !== null) canvasWidth = optionsData.number * screenWidth * 0.01; break;
            }
        }

        var canvasHeight = null;
        optionsData = JsuCmn.parseSuffixedValue(options.height);
        if(optionsData !== null && optionsData.number >= 0) {
            switch(optionsData.suffix) {
                case '': canvasHeight = optionsData.number; break;
                case '%': if(screenHeight !== null) canvasHeight = optionsData.number * screenHeight * 0.01; break;
            }
        }

        if(canvasWidth !== null) canvas.width = canvasWidth;
        if(canvasHeight !== null) canvas.height = canvasHeight;
    }

    // setCanvasObj(), setCanvasSize() and returns a boolean success/failure
    // flag as returned by setCanvasObj(). This is a helper function.
    //     - canvas: passed to setCanvasObj().
    //     - options: passed to setCanvasSize().
    function setCanvas(canvas, options) {
        var success = setCanvasObj(canvas);
        setCanvasSize(options);
        return success;
    }

    // Moves partly or fully invisible nodes into canvas visible area: each node
    // is moved so that its border is fully visible in the canvas if possible.
    // However, this function doesn't draw().
    function moveNodesIntoCanvasVisibleArea() {
        // we assume that the canvas is at least
        //     - as large as the largest node it contains
        //     - as long as the longest node it contains
        // also note that
        //     - the coordinate point (0, 0) is in the upper left corner of the canvas
        //     - nodes are positioned at their center point, so only a quarter
        //       of a node at (0, 0) will be seen (depending on the border-radius
        //       CSS property of the canvas)
        for(var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var radius = node.radius;
            if(node.x < radius) node.x = radius;
            if(node.x > canvas.width - radius) node.x = canvas.width - radius;
            if(node.y < radius) node.y = radius;
            if(node.y > canvas.height - radius) node.y = canvas.height - radius;
        }
    }

    // Similar to moveNodesIntoCanvasVisibleArea() but for text items. This
    // function also doesn't draw().
    function moveTextItemsIntoCanvasVisibleArea() {
        for(var i = 0; i < textItems.length; i++) {
            var textItem = textItems[i];
            var rect = textItem.getBoundingRect();
            if(rect.x < 0) textItem.x = rect.width / 2;
            if(rect.x + rect.width > canvas.width) textItem.x = canvas.width - rect.width / 2;
            if(rect.y < 0) textItem.y = rect.height / 2;
            if(rect.y + rect.height > canvas.height) textItem.y = canvas.height - rect.height / 2;
        }
    }

    // --- Canvas Caret (Cursor) ---

    var caretTimer = JsuEvt.createTimer();
    var caretVisible = false;
    var caretPos = 0; // same as the number of characters before the caret
    var caretHeightHalf = 10; // pixels
    var caretHeight = 2 * caretHeightHalf;

    function startCaret() {
        if(listenersStarted) {
            caretVisible = true;
            caretTimer.start(500);
        }
    }

    function stopCaret() {
        caretVisible = false;
        caretTimer.stop();
    }

    // Useful so we don't have to worry about the state of the caret when we
    // want it visible. This is also because the caret timer will automatically
    // stop receiving updates if needed: see updateCaret().
    function resetCaret() {
        stopCaret();
        startCaret();
    }

    function updateCaret() {
        if(!selectedObject || !canvasHasFocus()) { // see (1) below
            stopCaret();
        } else {
            caretVisible = !caretVisible;
        }
        draw_(true);

        // (1) We could use !selectionHighlightable() here (which implies
        //     !document.hasFocus()) instead of just using !canvasHasFocus(), so
        //     that the caret is no longer updated for the selected canvas item
        //     when the Web Developer Tool gets the focus for example. But then
        //     if we move the focus from the Web Developer Tool back to an empty
        //     area around the canvas in the HTML body element, the caret would
        //     not be visible whereas it would have been if we had clicked
        //     directly in the HTML body element instead of clicking in the Web
        //     Developer Tool first. Thus, for consistency, we prefer not to use
        //     said condition.
    }

    // --- Canvas Events ---

    var listenersStarted = false;

    var canvas = null;
    var fsmAlphabetContainer = null;
    var nodes = [];
    var links = [];
    var textItems = [];

    // range of codes for characters that can be inserted into the canvas
    //     for(var i = insertableCharCodeMin; i <= insertableCharCodeMax; i++) console.log(i, String.fromCharCode(i));
    // these codes correspond to ASCII characters
    var insertableCharCodeMin = 0x20;
    var insertableCharCodeMax = 0x7E;

    var snapToPadding = 6; // pixels
    var hitTargetPadding = 6; // pixels
    var textPosSpacing = 10; // pixels (spacing for text positioning)
    var selectedObject = null;
    var currentLink = null;
    var movingObject = false;
    var originalClick = null;

    var ctrl = false;
    var shift = false;

    // Filters a text and returns the modified version containing only
    // characters allowed in the canvas, or the empty string if none are found
    // in the text.
    //     - text: the text to filter.
    //
    // This function is only introduced to conform to canvas rules. For example,
    // it helps avoid LaTeX shortcut values that could be obtained using
    // JsuLtx.convertLatexShortcuts(), forcing the use of unconverted LaTeX
    // shortcuts as recommended by JsuLtx.toLatex() (called from textToLatex())
    // which will otherwise be unusable.
    //
    // See insertableCharCodeMin and insertableCharCodeMax for more information.
    function filterTextAccordingToCanvasRules(text) {
        var retVal = '';
        for(var i = 0; i < text.length; i++) {
            var c = text.charCodeAt(i);
            if(c >= insertableCharCodeMin && c <= insertableCharCodeMax) {
                retVal += text[i];
            }
        }
        return retVal;
    }

    function selectedObjectHasText() {
        return selectedObject && 'text' in selectedObject;
    }

    // Starts listening to events.
    function startListeners() {
        caretTimer.addEventListener('timeout', updateCaret);

        if(canvas) {
            canvas.ondblclick = onCanvasDblclick; // see (1) below
            canvas.onmousedown = onCanvasMousedown; // see (1) below
            canvas.onmousemove = onCanvasMousemove; // see (1) below
            canvas.onmouseup = onCanvasMouseup; // see (1) below
            if('onwheel' in canvas) canvas.addEventListener('wheel', onCanvasWheel);
            else if('onmousewheel' in canvas) canvas.addEventListener('mousewheel', onCanvasWheel);
        }

        if(fsmAlphabetContainer) {
            fsmAlphabetContainer.addEventListener('input', onFsmAlphabetContainerUpdatedByUser);
            fsmAlphabetContainer.readOnly = false;
        }

        document.addEventListener('keydown', onDocumentKeydown);
        document.addEventListener('keyup', onDocumentKeyup);
        document.addEventListener('keypress', onDocumentKeypress);

        listenersStarted = true;

        // (1) We didn't use addEventListener() because in Chrome 79.0.*, canvas
        //     events are also propagated to surrounding text elements. As a
        //     result, one could select text in page by double-clicking in the
        //     canvas for example.
    }

    // Stops listening to events, resets all related variables and draw().
    function stopListeners() {
        stopCaret();
        caretTimer.removeEventListener('timeout', updateCaret);

        if(canvas) {
            canvas.ondblclick = null;
            canvas.onmousedown = null;
            canvas.onmousemove = null;
            canvas.onmouseup = null;
            if('onwheel' in canvas) canvas.removeEventListener('wheel', onCanvasWheel);
            else if('onmousewheel' in canvas) canvas.removeEventListener('mousewheel', onCanvasWheel);
        }

        if(fsmAlphabetContainer) {
            fsmAlphabetContainer.removeEventListener('input', onFsmAlphabetContainerUpdatedByUser);
            fsmAlphabetContainer.readOnly = true;
        }

        document.removeEventListener('keydown', onDocumentKeydown);
        document.removeEventListener('keyup', onDocumentKeyup);
        document.removeEventListener('keypress', onDocumentKeypress);

        selectedObject = null;
        currentLink = null;
        movingObject = false;
        originalClick = null;
        ctrl = false;
        shift = false;
        listenersStarted = false;

        draw_(true);
    }

    function onCanvasDblclick(e) {
        var mouse = crossBrowserRelativeMousePos(e);
        var prevSelectedObject = selectedObject;
        selectedObject = selectObject(mouse.x, mouse.y);

        if(selectedObject === null) {
            if(ctrl) {
                selectedObject = new TextItem(mouse.x, mouse.y);
                textItems.push(selectedObject);
            } else {
                selectedObject = new Node(mouse.x, mouse.y);
                nodes.push(selectedObject);
            }
            if(config.canvas.caretAdvancedPositioning && selectedObjectHasText() && prevSelectedObject !== selectedObject) {
                caretPos = JsuLtx.convertLatexShortcuts(selectedObject.text).length;
            }
            resetCaret();
            draw_();
        } else {
            if(selectedObject instanceof Node) {
                if(config.nodes.canBeAcceptStates) {
                    selectedObject.isAcceptState = !selectedObject.isAcceptState;
                    draw_();
                }
            } else if(selectedObject instanceof Link) {
                if(config.links.arrowHeadAtSrcOverridable) {
                    selectedObject.nodeAHasArrow = !selectedObject.nodeAHasArrow;
                    draw_();
                }
            }
        }
    }

    function onCanvasMousedown(e) {
        var mouse = crossBrowserRelativeMousePos(e);
        var prevSelectedObject = selectedObject;
        selectedObject = selectObject(mouse.x, mouse.y);
        movingObject = false;
        originalClick = mouse;

        if(shift && !canvasHasFocus() && document.activeElement) {
            // remove focus so that mouse movements in the canvas never lead to
            // selecting text in a previously focused element (fsmAlphabetContainer
            // for example); required at least for Chrome 103.0.* and Edge 103.0.*
            document.activeElement.blur();
        }

        if(selectedObject !== null) {
            if(shift && selectedObject instanceof Node) {
                currentLink = new SelfLink(selectedObject, mouse);
            } else {
                movingObject = true;
                if(selectedObject.setMouseStart) {
                    selectedObject.setMouseStart(mouse.x, mouse.y);
                }
            }
            if(config.canvas.caretAdvancedPositioning && selectedObjectHasText() && prevSelectedObject !== selectedObject) {
                caretPos = JsuLtx.convertLatexShortcuts(selectedObject.text).length;
            }
            resetCaret();
        } else {
            if(shift) {
                currentLink = new TemporaryLink(mouse, mouse);
            }
            if(config.canvas.caretAdvancedPositioning) {
                caretPos = 0;
            }
        }

        draw_();

        if(canvasHasFocus()) {
            // disable drag-and-drop only if the canvas is already focused
            return false;
        } else {
            // otherwise, let the browser switch the focus away from wherever it was
            resetCaret();
            return true;
        }
    }

    function onCanvasMousemove(e) {
        var mouse = crossBrowserRelativeMousePos(e);

        if(currentLink !== null) {
            var targetNode = selectObject(mouse.x, mouse.y);
            if(!(targetNode instanceof Node)) {
                targetNode = null;
            }

            if(selectedObject === null) {
                if(targetNode !== null) {
                    currentLink = new StartLink(targetNode, originalClick);
                } else {
                    currentLink = new TemporaryLink(originalClick, mouse);
                }
            } else {
                if(targetNode === selectedObject) {
                    currentLink = new SelfLink(selectedObject, mouse);
                } else if(targetNode !== null) {
                    currentLink = new Link(selectedObject, targetNode);
                } else {
                    currentLink = new TemporaryLink(selectedObject.closestPointOnCircle(mouse.x, mouse.y), mouse);
                }
            }
            draw_();
        }

        if(movingObject) {
            selectedObject.setAnchorPoint(mouse.x, mouse.y);
            if(selectedObject instanceof Node) {
                snapItem(selectedObject, nodes);
            } else if(selectedObject instanceof TextItem) {
                snapItem(selectedObject, textItems);
            }
            draw_();
        }
    }

    function onCanvasMouseup(e) {
        var mouse = crossBrowserRelativeMousePos(e);
        movingObject = false;

        if(currentLink !== null) {
            if(currentLink.prepareInsertionToCanvas()) {
                selectedObject = currentLink;
                links.push(currentLink);
                if(config.canvas.caretAdvancedPositioning && selectedObjectHasText()) {
                    caretPos = JsuLtx.convertLatexShortcuts(selectedObject.text).length;
                }
                resetCaret();
            }
            currentLink = null;
            draw_();
        } else if(!selectedObject && originalClick) {
            var dx = mouse.x - originalClick.x;
            var dy = mouse.y - originalClick.y;
            for(var i = 0; i < nodes.length; i++) {
                nodes[i].x += dx;
                nodes[i].y += dy;
            }
            draw_();
        }
    }

    function onCanvasWheel(e) {
        if(shift) {
            var delta = e.wheelDelta || -e.deltaY;
            if(resizeSelection(delta > 0 ? 1 : -1)) {
                draw_();
            }
            // prevent page scrolling via horizontal scrollbar if visible
            e.preventDefault(); return false;
        }
    }

    function onFsmAlphabetContainerUpdatedByUser(e) {
        var selStart = this.selectionStart;
        var currVal = this.value;
        var validVal = filterTextAccordingToCanvasRules(currVal); // see (1) below
        if(currVal !== validVal) {
            this.value = validVal; // this will move the cursor to the end and clear undo/redo history for the input
            // return the cursor to its previous position
            this.selectionStart = this.selectionEnd = selStart - (currVal.length - validVal.length);
        }
        saveBackupAuto();
        // (1) note that filtering the value on every change would have been a
        //     problem if FSM alphabet container was meant to contain a large
        //     text; in this case one could listen to the keydown and paste
        //     events and cancel them if the inserted character or the new
        //     string value is not acceptable according to canvas text rules;
        //     the keydown event however would likely require to distinguish
        //     between printable and non-printable characters before canvas
        //     rules are checked
    }

    function onDocumentKeydown(e) {
        var key = crossBrowserKey(e);

        if(key === 16) {
            shift = true;
        } else if(key === 17) {
            ctrl = true;
        } else if(!canvasHasFocus()) {
            // don't read keystrokes when other things have focus
            return true;
        } else if(key === 8) { // backspace key
            if(selectedObjectHasText() && selectedObject.text !== '') {
                if(config.canvas.caretAdvancedPositioning) {
                    var obj = JsuLtx.deleteOne(selectedObject.text, caretPos);
                    if(obj) { // can be null because we can have caretPos < 1
                        selectedObject.text = obj.newStr;
                        caretPos = obj.newPos;
                    }
                } else {
                    selectedObject.text = selectedObject.text.substring(0, selectedObject.text.length - 1)
                }
                resetCaret();
                draw_();
            }
            // backspace might be a shortcut for the back button and we do NOT want to change pages
            e.preventDefault(); return false;
        } else if(key === 35 && config.canvas.caretAdvancedPositioning && selectedObjectHasText() && selectedObject.text !== '') { // end key (to move caret to the end)
            caretPos = JsuLtx.convertLatexShortcuts(selectedObject.text).length;
            resetCaret();
            draw_();
            // prevent page scrolling via scrollbar if visible
            e.preventDefault(); return false;
        } else if(key === 36 && config.canvas.caretAdvancedPositioning && selectedObjectHasText() && selectedObject.text !== '') { // home key (to move caret to the beginning)
            caretPos = 0;
            resetCaret();
            draw_();
            // prevent page scrolling via scrollbar if visible
            e.preventDefault(); return false;
        } else if(key === 37 && config.canvas.caretAdvancedPositioning) { // left arrow key
            if(selectedObjectHasText() && selectedObject.text !== '') {
                if(--caretPos < 0) {
                    caretPos = 0;
                }
                resetCaret();
                draw_();
            }
            // prevent page scrolling via scrollbar if visible
            e.preventDefault(); return false;
        } else if(key === 38 && config.canvas.caretAdvancedPositioning) { // up arrow key (only to prevent page scrolling for consistency with the other arrow keys)
            // prevent page scrolling via scrollbar if visible
            e.preventDefault(); return false;
        } else if(key === 39 && config.canvas.caretAdvancedPositioning) { // right arrow key
            if(selectedObjectHasText() && selectedObject.text !== '') {
                var maxPos = JsuLtx.convertLatexShortcuts(selectedObject.text).length;
                if(++caretPos > maxPos) {
                    caretPos = maxPos;
                }
                resetCaret();
                draw_();
            }
            // prevent page scrolling via scrollbar if visible
            e.preventDefault(); return false;
        } else if(key === 40 && config.canvas.caretAdvancedPositioning) { // down arrow key (only to prevent page scrolling for consistency with the other arrow keys)
            // prevent page scrolling via scrollbar if visible
            e.preventDefault(); return false;
        } else if(key === 46) { // delete key
            if(selectedObject !== null) {
                var i = 0;
                for(i = 0; i < nodes.length; i++) {
                    if(nodes[i] === selectedObject) {
                        nodes.splice(i--, 1);
                    }
                }
                for(i = 0; i < links.length; i++) {
                    if(links[i] === selectedObject || links[i].node === selectedObject || links[i].nodeA === selectedObject || links[i].nodeB === selectedObject) {
                        links[i].prepareRemovalFromCanvas();
                        links.splice(i--, 1);
                    }
                }
                for(i = 0; i < textItems.length; i++) {
                    if(textItems[i] === selectedObject) {
                        textItems.splice(i--, 1);
                    }
                }
                selectedObject = null;
                draw_();
            }
        }
    }

    function onDocumentKeyup(e) {
        var key = crossBrowserKey(e);

        if(key === 16) {
            shift = false;
        } else if(key === 17) {
            ctrl = false;
        }
    }

    function onDocumentKeypress(e) {
        var key = crossBrowserKey(e);
        if(!canvasHasFocus()) {
            // don't read keystrokes when other things have focus
            return true;
        } else if(key === 13 && shift) { // enter or return key
            if(resizeSelection()) {
                draw_();
            }
            // prevent default action if any for the event
            e.preventDefault(); return false;
        } else if(key >= insertableCharCodeMin && key <= insertableCharCodeMax && !e.metaKey && !e.altKey && !e.ctrlKey && selectedObjectHasText()) {
            var charToInsert = String.fromCharCode(key);
            if(config.canvas.caretAdvancedPositioning) {
                var obj = JsuLtx.insertString(selectedObject.text, caretPos, charToInsert);
                selectedObject.text = obj.newStr;
                caretPos = obj.newPos;
            } else {
                selectedObject.text += charToInsert;
            }
            resetCaret();
            draw_();

            // don't let keys do their actions (like space scrolls down the page)
            e.preventDefault(); return false;
        } else if(key === 8) {
            // backspace might be a shortcut for the back button and we do NOT want to change pages
            e.preventDefault(); return false;
        }
    }

    function selectObject(x, y) {
        var i = 0;
        for(i = 0; i < nodes.length; i++) {
            if(nodes[i].containsPoint(x, y)) {
                return nodes[i];
            }
        }
        for(i = 0; i < links.length; i++) {
            if(links[i].containsPoint(x, y)) {
                return links[i];
            }
        }
        for(i = 0; i < textItems.length; i++) {
            if(textItems[i].containsPoint(x, y)) {
                return textItems[i];
            }
        }
        return null;
    }

    function snapItem(item, targets) {
        for(var i = 0; i < targets.length; i++) {
            item.snapTo(targets[i]);
        }
    }

    function resizeSelection(stepSign) {
        if(selectedObject && selectedObject instanceof Node) {
            return stepSign !== undefined ?
                   selectedObject.resizeBy(stepSign * config.canvas.resizeStep) :
                   selectedObject.resetSize();
        }
        return false;
    }

    function crossBrowserKey(e) {
        e = e || window.event;
        return e.which || e.keyCode;
    }

    function crossBrowserElementPos(e) {
        e = e || window.event;
        var obj = e.target || e.srcElement;
        var x = 0, y = 0;
        while(obj.offsetParent) {
            x += obj.offsetLeft;
            y += obj.offsetTop;
            obj = obj.offsetParent;
        }
        return { 'x': x, 'y': y };
    }

    function crossBrowserMousePos(e) {
        e = e || window.event;
        return {
            'x': e.pageX || e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft,
            'y': e.pageY || e.clientY + document.body.scrollTop + document.documentElement.scrollTop,
        };
    }

    function crossBrowserRelativeMousePos(e) {
        var element = crossBrowserElementPos(e);
        var mouse = crossBrowserMousePos(e);
        return {
            'x': mouse.x - element.x,
            'y': mouse.y - element.y
        };
    }

    // --- I/O Routines ---

    // Implements the CanvasRenderingContext2D interface according to drawUsing()
    // to perform LaTeX export.
    function ExportAsLatex() {
        // initialize properties even if some are meant to be set accordingly from the outside of this class
        this.strokeStyle = 'black';
        this.font = config.canvas.font;
        this.extra_ignoreSpecialRendering = true;

        this.toLatex = function() {
            return '% View this file after installing all imported packages if not already installed.\n'
                 + '% Only certain visual attributes are exported for each canvas item.\n'
                 + '% Also note that items with long text might prevent other items from appearing in the rendered LaTeX document.\n'
                 + '\n'
                 + '\\documentclass[12pt]{article}\n'
                 + '\\usepackage{tikz}\n'
                 + '\n'
                 // define Greek letter commands that could not be interpreted otherwise
                 //     to understand why this is necessary, you can search "greek alphabet in latex" on the internet
                 //     note that all Greek letters are defined by JsuLtx.getGreekLetterNames()
                 + '\\newcommand{\\Alpha}{A}\n'
                 + '\\newcommand{\\Beta}{B}\n'
                 + '\\newcommand{\\Epsilon}{E}\n'
                 + '\\newcommand{\\Zeta}{Z}\n'
                 + '\\newcommand{\\Eta}{H}\n'
                 + '\\newcommand{\\Iota}{I}\n'
                 + '\\newcommand{\\Kappa}{K}\n'
                 + '\\newcommand{\\Mu}{M}\n'
                 + '\\newcommand{\\Nu}{N}\n'
                 + '\\newcommand{\\omicron}{o}\n'
                 + '\\newcommand{\\Omicron}{O}\n'
                 + '\\newcommand{\\Rho}{P}\n'
                 + '\\newcommand{\\Tau}{T}\n'
                 + '\\newcommand{\\Chi}{X}\n'
                 + '\n'
                 + '\\begin{document}\n'
                 + '\n'
                 + '\\begin{center}\n'
                 + '\\begin{tikzpicture}[scale=0.2]\n'
                 + '\\tikzstyle{every node}+=[inner sep=0pt]\n'
                 + this._latexData
                 + '\\end{tikzpicture}\n'
                 + '\\end{center}\n'
                 + '\n'
                 + '\\end{document}';
        };
        this.beginPath = function() {
            this._points = [];
        };
        this.arc = function(x, y, radius, startAngle, endAngle, isReversed) {
            x *= this._scale;
            y *= this._scale;
            radius *= this._scale;
            if(endAngle - startAngle == Math.PI * 2) {
                this._latexData += '\\draw [' + this.strokeStyle + '] (' + fixed(x, 3) + ',' + fixed(-y, 3) + ') circle (' + fixed(radius, 3) + ');\n';
            } else {
                if(isReversed) {
                    var temp = startAngle;
                    startAngle = endAngle;
                    endAngle = temp;
                }
                if(endAngle < startAngle) {
                    endAngle += Math.PI * 2;
                }
                // TikZ needs the angles to be in between -2pi and 2pi or it breaks
                if(Math.min(startAngle, endAngle) < -2*Math.PI) {
                    startAngle += 2*Math.PI;
                    endAngle += 2*Math.PI;
                } else if(Math.max(startAngle, endAngle) > 2*Math.PI) {
                    startAngle -= 2*Math.PI;
                    endAngle -= 2*Math.PI;
                }
                startAngle = -startAngle;
                endAngle = -endAngle;
                this._latexData += '\\draw [' + this.strokeStyle + '] (' + fixed(x + radius * Math.cos(startAngle), 3) + ',' + fixed(-y + radius * Math.sin(startAngle), 3) + ') arc (' + fixed(startAngle * 180 / Math.PI, 5) + ':' + fixed(endAngle * 180 / Math.PI, 5) + ':' + fixed(radius, 3) + ');\n';
            }
        };
        this.rect = function(x, y, width, height) {
            x *= this._scale;
            y *= this._scale;
            width *= this._scale;
            height *= this._scale;
            y += 2.6; // needed to achieve accuracy but not sure why
            this._latexData += '\\draw [{0}] ({1},{2}) rectangle ({3},{4});\n'
                              .format(this.strokeStyle, fixed(x, 3), fixed(-y, 3), fixed(x + width, 3), fixed(-y + height, 3));
        };
        this.moveTo = this.lineTo = function(x, y) {
            x *= this._scale;
            y *= this._scale;
            this._points.push({ 'x': x, 'y': y });
        };
        this.stroke = function() {
            if(this._points.length === 0) return;
            this._latexData += '\\draw [' + this.strokeStyle + ']';
            for(var i = 0; i < this._points.length; i++) {
                var p = this._points[i];
                this._latexData += (i > 0 ? ' --' : '') + ' (' + fixed(p.x, 2) + ',' + fixed(-p.y, 2) + ')';
            }
            this._latexData += ';\n';
        };
        this.fill = function() {
            if(this._points.length === 0) return;
            this._latexData += '\\fill [' + this.strokeStyle + ']';
            for(var i = 0; i < this._points.length; i++) {
                var p = this._points[i];
                this._latexData += (i > 0 ? ' --' : '') + ' (' + fixed(p.x, 2) + ',' + fixed(-p.y, 2) + ')';
            }
            this._latexData += ';\n';
        };
        this.measureText = function(text) {
            return measureTextUsingCanvas(text, this.font);
        };
        this.extra_advancedFillText = function(text, originalText, x, y, angleOrNull) {
            if(text.trim() !== '') {
                var nodeParams = '';
                // x and y start off as the center of the text, but will be moved to one side of the box when angleOrNull != null
                if(angleOrNull !== null) {
                    var width = this.measureText(text).width;
                    var dx = Math.cos(angleOrNull);
                    var dy = Math.sin(angleOrNull);
                    if(Math.abs(dx) > Math.abs(dy)) {
                        if(dx > 0) { nodeParams = '[right] '; x -= width / 2; }
                        else { nodeParams = '[left] '; x += width / 2; }
                    } else {
                        if(dy > 0) { nodeParams = '[below] '; y -= textPosSpacing; }
                        else { nodeParams = '[above] '; y += textPosSpacing; }
                    }
                }
                x *= this._scale;
                y *= this._scale;
                this._latexData += '\\draw (' + fixed(x, 2) + ',' + fixed(-y, 2) + ') node ' + nodeParams + '{$' + textToLatex(originalText, 'math') + '$};\n';
            }
        };
        this.setLineDash = this.translate = this.save = this.restore = this.clearRect = function() {};

        this._points = [];
        this._latexData = '';
        this._scale = 0.1; // to convert pixels to document space (TikZ breaks if the numbers get too big, above 500?)
    }

    // Implements the CanvasRenderingContext2D interface according to drawUsing()
    // to perform SVG export.
    //     - indents: optional indentations similar to JSON.stringify() space
    //       parameter.
    function ExportAsSvg(indents) {
        // initialize properties even if some are meant to be set accordingly from the outside of this class
        this.globalAlpha = 1;
        this.fillStyle = 'black';
        this.strokeStyle = 'black';
        this.lineWidth = 1;
        this.font = config.canvas.font;
        this.extra_ignoreSpecialRendering = true;
        this.extra_forceFillStyleTransparency = true;

        this.toSvg = function() {
            var canvasWidth = -1, canvasHeight = -1;
            if(canvas) {
                canvasWidth = canvas.width;
                canvasHeight = canvas.height;
            }
            return '<!-- View this file using any online SVG viewer.\n'
                 + '     All visual attributes are exported for each canvas item. -->\n'
                 + '\n'
                 + '<?xml version="1.0" standalone="no"?>\n'
                 + '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n'
                 + '\n'
                 + '<svg width="{0}" height="{1}" version="1.1" xmlns="http://www.w3.org/2000/svg">\n'.format(canvasWidth, canvasHeight)
                 + this._svgData
                 + '</svg>';
        };
        this.setLineDash = function(segments) {
            this._lineDashSegments = segments.join(', ');
        }
        this.beginPath = function() {
            this._points = [];
        };
        this.arc = function(x, y, radius, startAngle, endAngle, isReversed) {
            x += this._transX;
            y += this._transY;

            if(endAngle - startAngle == Math.PI * 2) {
                this._svgData += this._indents + '<ellipse ' + this._style() + ' cx="' + fixed(x, 3) + '" cy="' + fixed(y, 3) + '" rx="' + fixed(radius, 3) + '" ry="' + fixed(radius, 3) + '"/>\n';
            } else {
                if(isReversed) {
                    var temp = startAngle;
                    startAngle = endAngle;
                    endAngle = temp;
                }

                if(endAngle < startAngle) {
                    endAngle += Math.PI * 2;
                }

                var startX = x + radius * Math.cos(startAngle);
                var startY = y + radius * Math.sin(startAngle);
                var endX = x + radius * Math.cos(endAngle);
                var endY = y + radius * Math.sin(endAngle);
                var useGreaterThan180 = (Math.abs(endAngle - startAngle) > Math.PI);
                var goInPositiveDirection = 1;

                this._svgData += this._indents + '<path ' + this._style() + ' d="';
                this._svgData += 'M ' + fixed(startX, 3) + ',' + fixed(startY, 3) + ' '; // startPoint(startX, startY)
                this._svgData += 'A ' + fixed(radius, 3) + ',' + fixed(radius, 3) + ' '; // radii(radius, radius)
                this._svgData += '0 '; // value of 0 means perfect circle, others mean ellipse
                this._svgData += +useGreaterThan180 + ' ';
                this._svgData += +goInPositiveDirection + ' ';
                this._svgData += fixed(endX, 3) + ',' + fixed(endY, 3); // endPoint(endX, endY)
                this._svgData += '"/>\n';
            }
        };
        this.rect = function(x, y, width, height) {
            this._svgData += this._indents + '<rect ' + this._style() + ' x="{0}" y="{1}" width="{2}" height="{3}"/>\n'.format(x, y, width, height);
        };
        this.moveTo = this.lineTo = function(x, y) {
            x += this._transX;
            y += this._transY;
            this._points.push({ 'x': x, 'y': y });
        };
        this.stroke = function() {
            if(this._points.length === 0) return;
            this._svgData += this._indents + '<polygon ' + this._styleForStroke() + ' points="';
            for(var i = 0; i < this._points.length; i++) {
                this._svgData += (i > 0 ? ' ' : '') + fixed(this._points[i].x, 3) + ',' + fixed(this._points[i].y, 3);
            }
            this._svgData += '"/>\n';
        };
        this.fill = function() {
            if(this._points.length === 0) return;
            this._svgData += this._indents + '<polygon ' + this._styleForFill() + ' points="';
            for(var i = 0; i < this._points.length; i++) {
                this._svgData += (i > 0 ? ' ' : '') + fixed(this._points[i].x, 3) + ',' + fixed(this._points[i].y, 3);
            }
            this._svgData += '"/>\n';
        };
        this.measureText = function(text) {
            return measureTextUsingCanvas(text, this.font);
        };
        this.fillText = function(text, x, y) {
            var fontData = JsuCmn.parseInlineCssStyle('font: {0};'.format(this.font));
            x += this._transX;
            y += this._transY;
            if(text.trim() !== '') {
                this._svgData += this._indents +
                    '<text {0} x="{1}" y="{2}" font-family="{3}" font-size="{4}" font-style="{5}" font-weight="{6}">{7}</text>\n'
                   .format(this._styleForFill(), fixed(x, 3), fixed(y, 3),
                           fontData['fontFamily'].replace(/"/g, ''), // remove double quotes if any
                           fontData['fontSize'],
                           fontData['fontStyle'],
                           fontData['fontWeight'],
                           textToXml(text));
            }
        };
        this.translate = function(x, y) {
            this._transX = x;
            this._transY = y;
        };
        this.save = this.restore = this.clearRect = function() {};

        this._lineDashSegments = "";
        this._points = [];
        this._svgData = '';
        this._transX = 0;
        this._transY = 0;
        this._indents = JsuCmn.parseSpaceAsPerJsonStringify(indents);

        this._style = function() {
            return 'stroke="{0}" stroke-opacity="{1}" stroke-width="{2}" stroke-dasharray="{3}" fill="{4}" fill-opacity="{5}"'
                  .format(this.strokeStyle, this.globalAlpha, this.lineWidth, this._lineDashSegments, this.fillStyle, this.globalAlpha);
        };
        this._styleForFill = function() {
            return 'fill="{0}" fill-opacity="{1}" stroke-width="{2}" stroke-dasharray="{3}"'
                  .format(this.fillStyle, this.globalAlpha, this.lineWidth, this._lineDashSegments);
        };
        this._styleForStroke = function() {
            return 'stroke="{0}" stroke-opacity="{1}" stroke-width="{2}" stroke-dasharray="{3}"'
                  .format(this.strokeStyle, this.globalAlpha, this.lineWidth, this._lineDashSegments);
        };
    }

    // Converts text for use in a LaTeX document, escaping special characters if
    // any, and returns the converted text.
    //     - text: passed to JsuLtx.toLatex().
    //     - mode: passed to JsuLtx.toLatex().
    function textToLatex(text, mode) {
        return JsuLtx.toLatex(text, mode);
    }

    // Converts text for use in an XML document, escaping special characters if
    // any, and returns the converted text.
    //     - text: the text to convert; LaTeX shortcuts in the text that are
    //       already converted using JsuLtx.convertLatexShortcuts() will be
    //       processed correctly.
    // Can be used for SVG or HTML documents for example.
    function textToXml(text) {
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
    }

    function fixed(number, digits) {
        return number.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
    }

    // Clears internal data and draw().
    function clear() { clearAll(); }

    // Clears internal data and draw() accordingly.
    //     - ignoreAutoBackup: optional; passed to draw_().
    function clearAll(ignoreAutoBackup) {
        setFsmAlphabetStr('');
        nodes = [];
        links = [];
        textItems = [];
        draw_(ignoreAutoBackup);
    }

    // Collects and returns internal data as object.
    function fetchJsonObject() {
        var obj = {
            'fsmAlphabet': getFsmAlphabetStr(),
            'nodes': [],
            'links': [],
            'textItems': [],
        };
        var i = 0;
        for(i = 0; i < nodes.length; i++) {
            obj.nodes.push(nodes[i].toJson());
        }
        for(i = 0; i < links.length; i++) {
            obj.links.push(links[i].toJson(nodes));
        }
        for(i = 0; i < textItems.length; i++) {
            obj.textItems.push(textItems[i].toJson());
        }
        return obj;
    }

    // Collects and returns internal data as JSON string.
    //     - indents: optional indentations similar to JSON.stringify() space
    //       parameter.
    function fetchJsonString(indents) {
        return JSON ? JSON.stringify(fetchJsonObject(), null, indents) : '';
    }

    // Collects and returns internal data as PNG URL string.
    function fetchPngDataString() {
        var c = canvas.getContext('2d');
        c.extra_ignoreSpecialRendering = true;
        drawUsing(c);
        var imgData = canvas.toDataURL('image/png');

        // display UI again in its original state
        delete c.extra_ignoreSpecialRendering;
        drawUsing(c);

        return imgData;
    }

    // Collects and returns internal data in SVG format.
    //     - indents: optional indentations similar to JSON.stringify() space
    //       parameter.
    function fetchSvgString(indents) {
        var exporter = new ExportAsSvg(indents);
        drawUsing(exporter);
        return exporter.toSvg();
    }

    // Collects and returns internal data in LaTeX format.
    function fetchLatexString() {
        var exporter = new ExportAsLatex();
        drawUsing(exporter);
        return exporter.toLatex();
    }

    // Sets internal data from object ignoring invalid attributes and draw().
    function loadJsonObject(obj) {
        clearAll(true);

        // prepare to load
        if(!obj) obj = {};
        var objFsmAlphabet = !JsuCmn.isString(obj.fsmAlphabet) ? '' : obj.fsmAlphabet;
        var objNodes = !JsuCmn.isArray(obj.nodes) ? [] : obj.nodes;
        var objLinks = !JsuCmn.isArray(obj.links) ? [] : obj.links;
        var objTextItems = !JsuCmn.isArray(obj.textItems) ? [] : obj.textItems;

        // load
        setFsmAlphabetStr(objFsmAlphabet);
        var i = 0;
        for(i = 0; i < objNodes.length; i++) {
            var node = Node.fromJson(objNodes[i]);
            if(node) {
                nodes.push(node);
            }
        }
        for(i = 0; i < objLinks.length; i++) {
            var objLink = objLinks[i];
            var link = null;
            if(objLink.type === 'Link') {
                link = Link.fromJson(objLink, nodes);
            } else if(objLink.type === 'SelfLink') {
                link = SelfLink.fromJson(objLink, nodes);
            } else if(objLink.type === 'StartLink') {
                link = StartLink.fromJson(objLink, nodes);
            }
            if(link !== null && link.prepareInsertionToCanvas()) {
                links.push(link);
            }
        }
        for(i = 0; i < objTextItems.length; i++) {
            var textItem = TextItem.fromJson(objTextItems[i]);
            if(textItem) {
                textItems.push(textItem);
            }
        }

        draw_();
    }

    // Sets internal data from JSON string.
    //     - str: the JSON string to parse.
    //     - jsonFailedToParseCallback: optional function called on failure;
    //       receives the caught exception (object or other) as an argument.
    //     - jsonLoadedCallback: optional function called on success; receives
    //       no arguments.
    function loadJsonString(str, jsonFailedToParseCallback, jsonLoadedCallback) {
        if(JSON) {
            var obj = null;
            try { obj = JSON.parse(str); }
            catch(e) {
                if(jsonFailedToParseCallback) jsonFailedToParseCallback(e);
                return;
            }
            loadJsonObject(obj);
            if(jsonLoadedCallback) jsonLoadedCallback();
        }
    }

    // --- Utility Routines ---

    function isNumberInRange(value, min, max) { return JsuCmn.isNumber(value) && min <= value && value <= max; }

    // Returns the array element (if any) at an index, throws an exception
    // otherwise.
    function getArrayElt(array, eltIndex, eltQualifier) {
        if(isNumberInRange(eltIndex, 0, array.length-1) && Math.floor(eltIndex) === eltIndex) {
            return array[eltIndex];
        }
        // we throw an exception instead of returning null or undefined
        // because the given array might contain null or undefined
        throw new Error('No ' + eltQualifier + ' at index ' + idx);
    }

    function getNodeElt(nodes, nodeIndex) {
        return getArrayElt(nodes, nodeIndex, 'node');
    }

    // Saves data to a local backup and returns a boolean success/failure flag.
    //     - id: the ID to use for the backup when saved; if a backup already
    //       exists for this ID, it will be overwritten.
    //     - jsonStr: the JSON string to back up.
    //
    // Note: instead of calling this function, you might only want to enable
    // automatic backup; see saveBackupAuto().
    function saveBackup(id, jsonStr) {
        return JsuCmn.setLocalStorageItem(id, jsonStr);
    }

    // Restores internal data from a local backup and returns a boolean
    // success/failure flag.
    //     - id: the ID of the backup to restore.
    //
    // Note: instead of calling this function, you might only want to enable
    // automatic backup; see restoreBackupAuto().
    function restoreBackup(id) {
        var success = true;
        loadJsonString(JsuCmn.getLocalStorageItem(id), function() {
            JsuCmn.setLocalStorageItem(id, ''); // clear invalid backup
            success = false;
        });
        return success;
    }

    // saveBackup() automatically when relevant, thus overwriting the previous
    // one.
    function saveBackupAuto() {
        // we don't want to overwrite an existing backup unless a canvas is set
        if(canvas && config.global.autoBackup) {
            saveBackup(config.global.autoBackupId, fetchJsonString());
        }
    }

    // restoreBackup() automatically when relevant.
    function restoreBackupAuto() {
        return config.global.autoBackup ? restoreBackup(config.global.autoBackupId) : false;
    }

    // Returns all possible types of canvas items. This function must only be
    // used from the outside of this script. Use cases include checking item
    // types as returned by getData() for example.
    function getTypes() {
        return {
            'Node': Node,
            'Link': Link,
            'SelfLink': SelfLink,
            'StartLink': StartLink,
            'TextItem': TextItem,
        };
    }

    // Returns internal data as object. This function must only be used from the
    // outside of this script. It might be used for example to synchronize with
    // external models or update canvas content from source code (not directly
    // from the user interface). Note that for performance reasons we return the
    // actual items used internally in this script, not some proxies or
    // equivalents. So be consistent when working with these items, i.e.
    //     - don't add links when you have configured nvc to not accept any (see
    //       config object);
    //     - check how item properties are used in item classes before setting
    //       these properties;
    //     - and that's it!
    function getData() {
        return {
            'fsmAlphabet': getFsmAlphabetStr(),
            'nodes': nodes,
            'links': links, // there are several types of link; you can use the instanceof operator to check a link family; see getTypes()
            'textItems': textItems,
        };
    }

    // --- Exposing Attributes ---

    return {
        'getBaseConfig': getBaseConfig, // see (1) below; one should set config directly instead
        get config() { return config; }, set config(v) { config = v; },
        get setConfigFor() { return setConfigFor; }, set setConfigFor(v) { setConfigFor = v; },

        get start() { return start; }, set start(v) { start = v; },
        get startListeners() { return startListeners; }, set startListeners(v) { startListeners = v; },
        get stopListeners() { return stopListeners; }, set stopListeners(v) { stopListeners = v; },

        get getCanvasObj() { return getCanvasObj; }, set getCanvasObj(v) { getCanvasObj = v; },
        get setCanvasObj() { return setCanvasObj; }, set setCanvasObj(v) { setCanvasObj = v; },
        get setCanvasSize() { return setCanvasSize; }, set setCanvasSize(v) { setCanvasSize = v; },
        get setCanvas() { return setCanvas; }, set setCanvas(v) { setCanvas = v; },

        get getFsmAlphabetContainerObj() { return getFsmAlphabetContainerObj; }, set getFsmAlphabetContainerObj(v) { getFsmAlphabetContainerObj = v; },
        get setFsmAlphabetContainerObj() { return setFsmAlphabetContainerObj; }, set setFsmAlphabetContainerObj(v) { setFsmAlphabetContainerObj = v; },
        get setFsmAlphabetContainerAttrs() { return setFsmAlphabetContainerAttrs; }, set setFsmAlphabetContainerAttrs(v) { setFsmAlphabetContainerAttrs = v; },
        get setFsmAlphabetContainer() { return setFsmAlphabetContainer; }, set setFsmAlphabetContainer(v) { setFsmAlphabetContainer = v; },
        get tieFsmAlphabetContainerToCanvas() { return tieFsmAlphabetContainerToCanvas; }, set tieFsmAlphabetContainerToCanvas(v) { tieFsmAlphabetContainerToCanvas = v; },

        get moveNodesIntoCanvasVisibleArea() { return moveNodesIntoCanvasVisibleArea; }, set moveNodesIntoCanvasVisibleArea(v) { moveNodesIntoCanvasVisibleArea = v; },
        get moveTextItemsIntoCanvasVisibleArea() { return moveTextItemsIntoCanvasVisibleArea; }, set moveTextItemsIntoCanvasVisibleArea(v) { moveTextItemsIntoCanvasVisibleArea = v; },
        get draw() { return draw; }, set draw(v) { draw = v; },
        get drawUsing() { return drawUsing; }, set drawUsing(v) { drawUsing = v; },

        get fetchJsonObject() { return fetchJsonObject; }, set fetchJsonObject(v) { fetchJsonObject = v; },
        get fetchJsonString() { return fetchJsonString; }, set fetchJsonString(v) { fetchJsonString = v; },
        get fetchPngDataString() { return fetchPngDataString; }, set fetchPngDataString(v) { fetchPngDataString = v; },
        get fetchSvgString() { return fetchSvgString; }, set fetchSvgString(v) { fetchSvgString = v; },
        get fetchLatexString() { return fetchLatexString; }, set fetchLatexString(v) { fetchLatexString = v; },

        get clear() { return clear; }, set clear(v) { clear = v; },
        get loadJsonObject() { return loadJsonObject; }, set loadJsonObject(v) { loadJsonObject = v; },
        get loadJsonString() { return loadJsonString; }, set loadJsonString(v) { loadJsonString = v; },

        get getTypes() { return getTypes; }, set getTypes(v) { getTypes = v; },
        get getData() { return getData; }, set getData(v) { getData = v; },

        get filterTextAccordingToCanvasRules() { return filterTextAccordingToCanvasRules; }, set filterTextAccordingToCanvasRules(v) { filterTextAccordingToCanvasRules = v; },
        get textToLatex() { return textToLatex; }, set textToLatex(v) { textToLatex = v; },
        get textToXml() { return textToXml; }, set textToXml(v) { textToXml = v; },

        get saveBackup() { return saveBackup; }, set saveBackup(v) { saveBackup = v; },
        get restoreBackup() { return restoreBackup; }, set restoreBackup(v) { restoreBackup = v; },

        // (1) this function cannot be overridden because it is used during initialization
    };
})();
