(function(global) {
    'use strict';
    
    var PlaceBot = global.PlaceBot;
    
    PlaceBot.prototype.saveCanvas = function(canvas) {
        var url = canvas.toDataUrl();
    };
    
    PlaceBot.prototype.screenshot = function() {
        var place = PlaceBot.place;
        
        var x = Math.round(500 + place.panX);
        var y = Math.round(500 + place.panY);
        var canvas = document.getElementById('placecanvasse');
        var ctx = canvas.getContext('2d');
        
        ctx.getImageData(x, y, )
    };
    
})(
    typeof unsafeWindow !== 'undefined' ? unsafeWindow :
    typeof window       !== 'undefined' ? window       :
    {}
);
