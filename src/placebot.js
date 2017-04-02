(function(global) {
    'use strict';
    
    /**
     * @class PlaceBot
     */
    var PlaceBot = function() {
        /**
         * @property {Number} placeMode - Either PlaceBot.PlaceArray or PlaceBot.PlaceFunction
         */
        this.placeMode = PlaceBot.placeMode.ARRAY;
        
        /**
         * @property {Array} tiles - An array of tiles stored as [x, y, color]. 
         *   Used as a queue for placeMode.ARRAY, and as data storage for 
         *   placeMode.FUNCTION.
         */
        this.tiles = [];
    
        /**
         * @property {Function} tileSelector - A function that returns the index of the next tile to draw
         */
        this.tileSelector = PlaceBot.selector.TopDown;
        
        /**
         * @property {Function} _tileGeneratorFactory - The function that actually returns a tile generator
         */
        this._tileGeneratorFactory = undefined;
        
        /**
         * @property {Function} tileGenerator - Returns the next tile to draw
         */
        this.tileGenerator = undefined;
        
        /**
         * @property {Timer} drawTimer - The id of the current draw timer
         */
        this.drawTimer = undefined;
        
        /**
         * @property {Number} minTimer - The minimum time to use between trying to draw
         */
        this.minTimer = 100;
        
        /**
         * @property {Number} lastDrawTime - The last time a tile was drawn
         */
        this.lastDrawTime = 0;
        
        console.log([
            '------------',
          , 'PlaceBot ' + PlaceBot.version
          , '------------'
        ].join('\n'));
        
        this.load();
        this._setTimer();
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
            get: function() { return PlaceBot.place.cooldownEndTime; }
        },
        
        /**
         * @property {Boolean} canDraw - Whether or not drawing is currently allowed
         */
        canDraw: {
            get: function() { return this.cooldownRemaining < 0 
                && this.lastDrawTime !== this.nextDrawTime; }
        }
    });
    
    /**
     * @property {String} version - Attach the placebot version
     * @static
     */
    PlaceBot.version = '$$version';
    
    /**
     * @property {Enum} placeMode
     * @static
     */
    PlaceBot.placeMode = { 
        ARRAY    : 0,
        FUNCTION : 1
    };
    
    /**
     * @property {Object} selector - Collection of tile selection functions
     * @static
     */
    PlaceBot.selector = {
        // Top -> Bottom, Left -> Right
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
        
        // Bottom -> Top, Right -> Left
        BottomUp: function(tiles) {
            var index = -1,
                minX = -1,
                minY = -1;
            
            tiles.forEach(function(tile, i) {
                if (tile[1] > minY || (tile[1] === minY && tile[0] > minX)) {
                    index = i;
                    minX = tile[0];
                    minY = tile[1];
                }
            });
            
            return index;
        },
        
        // Left -> Right, Top -> Bottom
        LeftToRight: function(tiles) {
            var index = -1,
                minX = Infinity,
                minY = Infinity;
            
            tiles.forEach(function(tile, i) {
                if (tile[0] < minX || (tile[0] === minX && tile[1] < minY)) {
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
    
    /**
     * @property {object} place - Reference to reddit's place object
     * @static
     */
    PlaceBot.place = global.r.place;
    
    /**
     * @property {object} placeModules - References to any of reddit's place modules we might need
     * @static
     */
    PlaceBot.placeModules = {};
    
    // Import place modules
    var importModules = ['api'];
    global.r.placeModule('', function(require) {
        importModules.forEach(function(name) {
            PlaceBot.placeModules[name] = require(name);
        });
    });
    
    global.PlaceBot = PlaceBot;
    
    // Do this async so we finish loading the prototype
    setTimeout(function() {
        global.placeBot = new PlaceBot();
    }, 0);
})(
    typeof unsafeWindow !== 'undefined' ? unsafeWindow :
    typeof window       !== 'undefined' ? window       :
    {}
);
