// ==UserScript==
// @name        PlaceBot
// @version     0.0.5
// @namespace   https://github.com/grind086/PlaceBot
// @description A bot that automates drawing on reddit.com/r/place
// @include     http://www.reddit.com/r/place/
// @include     https://www.reddit.com/r/place/
// ==/UserScript==

(function() {
    'use strict';
    
    /* global r, localStorage */
    
    var place = r.place;
    var api;
    
    r.placeModule('', function(require) {
        api = require('api');
    });
    
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
            get: function() { return r.place.cooldownEndTime; }
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
     * Collects saveable settings into one object
     * 
     * @method _settingsObject
     */
    PlaceBot.prototype._settingsObject = function() {
        return {
            tileSelector: this.tileSelector.name,
            minTimer: this.minTimer
        };
    };
    
    /**
     * Returns JSON of the current tiles
     * 
     * @method exportTiles
     */
    PlaceBot.prototype.exportTiles = function() {
        return JSON.stringify(this.toPlace);
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
        
        this.toPlace = imported.data || [];
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
        
        var settings = Object.assign(this._settingsObject(), settings);
        
        this.tileSelector = PlaceBot.selector[settings.tileSelector] || PlaceBot.selector.TopDown;
        this.minTimer = settings.minTimer;
    };
    
    /**
     * Returns JSON of the current settings and tiles
     * 
     * @method exportBot
     */
    PlaceBot.prototype.exportBot = function() {
        return JSON.stringify({
            settings: this._settingsObject(),
            tiles: this.toPlace
        });
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
     * Sets the timer for the next available draw
     * 
     * @method _setTimer
     */
    PlaceBot.prototype._setTimer = function() {
        clearTimeout(this.drawTimer); // Ensure we only have one timer running
        
        var time = Math.max(this.minTimer, this.cooldownRemaining);
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
        if (this.canDraw && this.toPlace.length) {
            var tileIndex = this.tileSelector(this.toPlace);
            var tile = this.toPlace.splice(tileIndex, 1)[0];
            
            api.getPixelInfo(tile[0], tile[1]).then(function(data) {
                if (data.color !== tile[2]) {
                    this.drawTile.apply(this, tile);
                }
                
                this._setTimer();
            }.bind(this));
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
            
            place.setColor(color);
            place.drawTile(x, y);
            
            console.log('Drawing %s at (%s, %s)', place.palette[color], x, y);
        }
    };
    
    /**
     * @property {String} version - Attach the placebot version
     * @static
     */
    PlaceBot.version = '0.0.5';
    
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
        
        // Chooses any random tile
        Random: function(tiles) {
            return Math.floor(Math.random() * tiles.length);
        },
        
        // Keeps the order that tiles were added
        DrawOrder: function(tiles) {
            return 0;
        }
    };
    
    window.placeBot = new PlaceBot();
})();
