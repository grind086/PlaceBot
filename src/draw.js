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
                }.bind(this));
                
                this.save();
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
