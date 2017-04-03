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
    PlaceBot.version = '0.0.9';
    
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

(function(global) {
    'use strict';
    
    var PlaceBot = global.PlaceBot;
    
    var localStorage = global.hasOwnProperty('localStorage') 
        ? global.localStorage
        : { 
            getItem: function() { return null; }, 
            setItem: function() { } 
        };
    
    /**
     * Takes either JSON or an object, and returns an object
     * 
     * @method _importObject
     * @property {Mixed} data - JSON or an object
     */
    PlaceBot.prototype._importObject = function(data) {
        if ('string' === typeof data) {
            try {
                data = JSON.parse(data);
            } catch(e) {
                return {
                    success: false,
                    error: e.message
                };
            }
        }
        
        return {
            success: true,
            data: data
        };
    };
    
    /**
     * Takes either string or function, and returns function
     * 
     * @method _importFunction
     */
    PlaceBot.prototype._importFunction = function(data) {
        if ('string' === typeof data) {
            try {
                data = eval('(' + data + ')');
            } catch(e) {
                return {
                    success: false,
                    error: e.message
                };
            }
        }
        
        if ('function' !== typeof data) {
            return {
                success: false,
                error: 'Invalid data type'
            };
        }
        
        return {
            success: true,
            data: data
        };
    };
    
    /**
     * Collects saveable tile info into one object
     * 
     * @method _tilesObject
     */
    PlaceBot.prototype._tilesObject = function() {
        var obj = {
            mode: this.placeMode,
            tiles: this.tiles
        };
        
        if (this.placeMode === PlaceBot.placeMode.ARRAY) {
            var name = this.tileSelector.name;
            
            if (PlaceBot.selector.hasOwnProperty(this.tileSelector.name)) {
                obj.fn = name;
            } else {
                obj.fn = this.tileSelector.toString();
            }
        }
        else if (this.placeMode === PlaceBot.placeMode.FUNCTION) {
            obj.fn = this._tileGeneratorFactory.toString();
        }
        
        return obj;
    };
    
    /**
     * Collects saveable settings into one object
     * 
     * @method _settingsObject
     */
    PlaceBot.prototype._settingsObject = function() {
        return {
            minTimer: this.minTimer
        };
    };
    
    /**
     * Returns JSON of the current tiles
     * 
     * @method exportTiles
     */
    PlaceBot.prototype.exportTiles = function() {
        return JSON.stringify(this._tilesObject());
    };
    
    /**
     * Returns JSON of the current settings
     * 
     * @method exportSettings
     */
    PlaceBot.prototype.exportSettings = function() {
        return JSON.stringify(this._settingsObject());
    };
    
    /**
     * Returns JSON of the current settings and tiles
     * 
     * @method exportBot
     */
    PlaceBot.prototype.exportBot = function() {
        return JSON.stringify({
            settings: this._settingsObject(),
            tiles: this.tiles
        });
    };
    
    /**
     * Imports tiles as JSON or object
     * 
     * @method importTiles
     */
    PlaceBot.prototype.importTiles = function(tilesJSON) {
        var imported = this._importObject(tilesJSON);
        
        if (!imported.success) {
            console.log('Failed to import tiles: %s', imported.error);
            return false;
        }
        
        var tiledata = Object.assign(this._tilesObject(), imported.data);
        
        this.tiles = tiledata.tiles || [];
        this.setTileFunction(tiledata.mode, tiledata.fn);
    };
    
    /**
     * Imports settings as JSON or object
     * 
     * @method importSettings
     */
    PlaceBot.prototype.importSettings = function(settingsJSON) {
        var imported = this._importObject(settingsJSON);
        
        if (!imported.success) {
            console.log('Failed to import settings: %s', imported.error);
            return false;
        }
        
        var settings = Object.assign(this._settingsObject(), imported.data);
        
        this.minTimer = settings.minTimer;
    };
    
    /**
     * Imports settings and tiles as JSON or object
     * 
     * @method importBot
     */
    PlaceBot.prototype.importBot = function(botJSON) {
        var imported = this._importObject(botJSON);
        
        if (!imported.success) {
            console.log('Failed to import bot: %s', imported.error);
            return false;
        }
        
        this.importSettings(imported.data.settings);
        this.importTiles(imported.data.tiles);
    };
    
    /**
     * Persist settings and tiles to localStorage
     * 
     * @method save
     */
    PlaceBot.prototype.save = function() {
        localStorage.setItem('placebot_settings', this.exportSettings());
        localStorage.setItem('placebot_tiles', this.exportTiles());
    };
    
    /**
     * Load settings and tiles from localStorage
     * 
     * @method load
     */
    PlaceBot.prototype.load = function() {
        this.importSettings(localStorage.getItem('placebot_settings'));
        this.importTiles(localStorage.getItem('placebot_tiles'));
    };
    
    /**
     * 
     */
    PlaceBot.prototype.setTileFunction = function(mode, fn) {
        var imported;
        
        switch (mode) {
            case PlaceBot.placeMode.ARRAY:
                this.placeMode = PlaceBot.placeMode.ARRAY;
                this.tileGenerator = undefined;
                
                if ('string' === typeof fn && PlaceBot.selector.hasOwnProperty(fn)) {
                    this.tileSelector = PlaceBot.selector[fn];
                }
                else {
                    imported = this._importFunction(fn);
                    
                    if (imported.success) {
                        this.tileSelector = imported.data;
                    }
                    else {
                        this.tileSelector = PlaceBot.selector.TopDown;
                    }
                }
                
                break;
                
            case PlaceBot.placeMode.FUNCTION:
                this.placeMode = PlaceBot.placeMode.FUNCTION;
                this.tileSelector = undefined;
                
                imported = this._importFunction(fn);
                
                if (imported.success) {
                    this._tileGeneratorFactory = imported.data;
                    this.tileGenerator = imported.data(this);
                    break;
                }
                
                console.log('Function import failed: %s', imported.error);
                // fall through to default
            
            default:
                this.tiles = [];
                this.setTileFunction(PlaceBot.placeMode.ARRAY, 'TopDown');
        }
    };
})(
    typeof unsafeWindow !== 'undefined' ? unsafeWindow :
    typeof window       !== 'undefined' ? window       :
    {}
);

(function(global) {
    'use strict';
    
    var PlaceBot = global.PlaceBot;
    
    /**
     * Sets the timer for the next available draw
     * 
     * @method _setTimer
     */
    PlaceBot.prototype._setTimer = function() {
        clearTimeout(this.drawTimer); // Ensure we only have one timer running
        
        var time = Math.round(Math.max(this.minTimer, this.cooldownRemaining));
        this.drawTimer = setTimeout(this.drawNext.bind(this), time);
        
        console.log('Scheduled draw in %sms', time);
    };
    
    /**
     * Draws the next tile (as chosen by this.tileSelector) if allowed, then sets
     * a timer for the next available draw. Also performs a check to make sure
     * the tile is not already the desired color.
     * 
     * @method drawNext
     */
    PlaceBot.prototype.drawNext = function() {
        if (this.canDraw) {
            var tile;
            
            if (this.placeMode === PlaceBot.placeMode.ARRAY) {
                if (this.tiles.length) {
                    var tileIndex = this.tileSelector(this.tiles);
                    tile = this.tiles.splice(tileIndex, 1)[0];
                }
            }
            else if (this.placeMode === PlaceBot.placeMode.FUNCTION) {
                tile = this.tileGenerator();
            }
            
            if (tile) {
                PlaceBot.placeModules.api.getPixelInfo(tile[0], tile[1]).then(function(data) {
                    if (data.color !== tile[2]) {
                        this.drawTile.apply(this, tile);
                    } else {
                        console.log('Redundant draw. Skipping.');
                    }
                    
                    this._setTimer();
                }.bind(this),function(reason) {
                    console.log("API failure.");
                    this._setTimer();
                }.bind(this));
                
                this.save();
                
                return;
            } else {
                console.log('No tile provided.');
            }
        } else {
            console.log('Drawing not allowed. Rescheduling.');
        }
        
        this._setTimer();
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
            
            PlaceBot.place.setColor(color);
            PlaceBot.place.drawTile(x, y);
            
            console.log('Drawing %s at (%s, %s)', PlaceBot.place.palette[color], x, y);
        }
    };
})(
    typeof unsafeWindow !== 'undefined' ? unsafeWindow :
    typeof window       !== 'undefined' ? window       :
    {}
);
