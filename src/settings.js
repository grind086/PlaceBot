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
