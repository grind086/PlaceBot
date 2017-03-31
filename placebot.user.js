(function() {
    'use strict';
    
    // ==UserScript==
    // @name        PlaceBot
    // @version     0.1
    // @namespace   https://github.com/grind086/PlaceBot
    // @description A bot that automates drawing on reddit.com/r/place
    // @include     http://www.reddit.com/r/place
    // @include     https://www.reddit.com/r/place
    // ==/UserScript==
    
    /* global r */
    
    var place = r.place;
    
    /**
     * @class PlaceBot
     */
    var PlaceBot = function() {
        /**
         * @property {Array} toPlace - An array of tiles to place stored as [x, y, color]
         */
        this.toPlace = [];

        /**
         * @property {Function} tileSelector - A function that returns the index of the next tile to draw
         */
        this.tileSelector = PlaceBot.selector.TopDown;
        
        /**
         * @property {Timer} drawTimer - The id of the current draw timer
         */
        this.drawTimer = undefined;
        
        /**
         * @property {Number} lastDrawTime - The last time a tile was drawn
         */
        this.lastDrawTime = 0;
        
        // Start the draw timer
        this.drawNext();
    };
    
    // Define getters
    Object.defineProperties(PlaceBot.prototype, {
        /**
         * @property {Number} cooldownRemaining - The time in ms until another draw is allowed
         */
        cooldownRemaining: {
            get: function() { return this.nextDrawTime - Date.now(); }
        },
        
        /**
         * @property {Number} nextDrawTime - The time that the next draw is allowed
         */
        nextDrawTime: {
            get: function() { return r.place.cooldownEndTime; }
        },
        
        /**
         * @property {Boolean} canDraw - Whether or not drawing is currently allowed
         */
        canDraw: {
            get: function() { return this.cooldownRemaining < 0 && this.lastDrawTime !== this.nextDrawTime; }
        }
    });
    
    /**
     * Draws the next tile (as chosen by this.tileSelector) if allowed, then sets
     * a timer for the next available draw.
     * 
     * @method drawNext
     */
    PlaceBot.prototype.drawNext = function() {
        if (this.canDraw()) {
            var tileIndex = this.tileSelector(this.toPlace);
            
            this.drawTile.apply(this, this.toPlace[tileIndex]);
            this.toPlace.splice(tileIndex, 1);
        }
        
        clearTimeout(this.drawTimer); // Ensure we only have one timer running
        setTimeout(this.drawNext.bind(this), Math.max(100, this.cooldownRemaining));
    };
    
    /**
     * @method drawTile
     * @property {Number} x - The tile x coordinate
     * @property {Number} y - The tile y coordinate
     * @property {Number} color - The index of the color to use
     */
    PlaceBot.prototype.drawTile = function(x, y, color) {
        if (this.canDraw) {
            this.lastDrawTime = this.nextDrawTime;
            
            place.colorIndex = color;
            place.drawTile(x, y);
        }
    };
    
    /**
     * @property {Object} selector - Collection of tile selection functions
     * @static
     */
    PlaceBot.selector = {
        // Top -> Down, Left -> Right
        TopDown: function(tiles) {
            var index = -1,
                minX = Infinity,
                minY = Infinity;
            
            tiles.forEach(function(tile, i) {
                if (tile[1] < minY || (tile[1] === minY && tile[0] < minX)) {
                    index = i;
                    minX = tile[0];
                    minY = tile[1];
                }
            });
            
            return index;
        },
        
        // Chooses any random tile
        Random: function(tiles) {
            return Math.floor(Math.random() * tiles.length);
        },
        
        // Keeps the order that tiles were added
        DrawOrder: function(tiles) {
            return 0;
        }
    };
    
    new PlaceBot();
})();
