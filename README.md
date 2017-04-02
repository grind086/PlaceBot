# PlaceBot

A bot that aims to automate [place](//www.reddit.com/r/place).

## Install

The recommended way to use the bot is via a userscript. Alternatively, you can
use a bookmarklet by copy-pasting the linked code into a bookmark.

* [Userscript](https://github.com/grind086/PlaceBot/raw/master/dist/placebot.user.js)
* [Bookmarklet](https://github.com/grind086/PlaceBot/raw/master/dist/bookmarklet.js)

## Features

* Automatically draws tiles as the cooldown expires
* Configurable draw order
    * Top down
    * Input order
    * Random
* Draw tiles based on a function
* Allow export/import of drawings, so that multiple people can work on each one
* Persist to local storage

### Planned

* Allow drawing at any time, and queue tile placements

## Guide

### Quick Start

The simplest way to use PlaceBot is by providing it with a list of tiles, and (optionally)
an order to draw them in. Currently this is accomplished by opening the javascript console
and entering something like the following:

```javascript
placeBot.tiles = [[0, 0, 4], [0, 1, 4]];
```

which will draw pink (color index 4) tiles at (0,0) and (0,1). You can also set a draw order
using one of the following:

```javascript
placeBot.tileSelector = PlaceBot.selector.TopDown;   // Top down, Left to right
placeBot.tileSelector = PlaceBot.selector.BottomUp;  // Bottom up, Right to left
placeBot.tileSelector = PlaceBot.selector.Random;    // Chooses a random tile to draw each time
placeBot.tileSelector = PlaceBot.selector.DrawOrder; // Progress through the tiles in order
```

So if you wanted people to use a bot that simply draws a pink line from (0,0) to (0,5) you
could give them the following code:

```javascript
placeBot.tiles = [[0, 0, 4], [0, 1, 4], [0, 2, 4], [0, 3, 4], [0, 4, 4], [0, 5, 4]];
placeBot.tileSelector = PlaceBot.selector.TopDown;
placeBot.save(); // Makes sure our bot keeps running after a refresh
```

If you want to use your own selection function, that works too. Just provide a function
that takes an array of tiles (ie `placeBot.tiles`), and returns an index from that array.
For examples see `PlaceBot.selector` in `placebot.js`.

### Tile Generators

It is also possible to generate tiles as you go, rather than using a list. In this case
you need to write the function in the following form:

```javascript
function myGeneratorFactory(placeBot) {

    // Setup...
    
    return function myGenerator() {
        return [x, y, color];
    }
}
```

then apply it using

```javascript
placeBot.setTileFunction(PlaceBot.placeMode.FUNCTION, myGeneratorFactory);
```

The function I've been using for testing is the following:

```javascript
// Draws a pink line vertically at x = 456, starting from y = 849 and continuing
// down. Redraws as necessary.

function pinkLine(placeBot) {
    var lastDraw;
    var lastTile = [456, 849, 4];

    return function() {
        if (pb.lastDrawTime !== lastDraw) {
            pb.lastDrawTime = lastDraw;
            lastTile = [456, 849, 4];
        } else {
            lastTile[1] = (lastTile[1] + 1) % 1000;
        }

        return lastTile;
    };
}

placeBot.setTileFunction(PlaceBot.placeMode.FUNCTION, pinkLine);
```

Basically this function sets up an initial state, then reverts to that state after
every successful draw. Note that this function is called repeatedly (on `minTimer`)
if drawing isn't successful - usually due to a redundant draw. You can see its
progress [place/#x=456&y=852](https://www.reddit.com/r/place/#x=456&y=852).

## Common Issues

#### My bot is redrawing the same things!

If your bot is designed to redraw over edits that other people have made, then it's
entirely possible it was configured incorrectly. However, it is also important to
note that the bot pings reddit directly when checking pixel colors - this means that
it is using information that is more up to date than what you see on your screen.
In testing I've also noticed that changes can be missed entirely by my computer (but
the bot still notices, and acts accordingly). The best way to determine if this is 
your issue is to simply refresh the page.

## API

##### Globals

The bot instance is exported to `window.placeBot` while the constructor is at
`window.PlaceBot`.

#### Static Properties

```
PlaceBot.version

PlaceBot.placeMode.ARRAY
PlaceBot.placeMode.FUNCTION

PlaceBot.selector.TopDown
PlaceBot.selector.BottomUp
PlaceBot.selector.Random
PlaceBot.selector.DrawOrder
```

#### new placeBot()

Creates an instance of placeBot, which automatically loads data from localStorage
and begins the draw timer.

__Properties__

| Property              | Type     | Default                      | Description                                                                                               |
|-----------------------|----------|------------------------------|-----------------------------------------------------------------------------------------------------------|
| placeMode             | number   | `PlaceBot.placeMode.ARRAY`   | The mode we use to place tiles, either using an array or a generator function.                            |
| tiles                 | array    | `[]`                         | (Array mode) The list of tiles we have yet to place in the form `[[x, y, color], [x2, y2, color2], ... ]` |
| tileSelector          | function | `PlaceBot.selectors.TopDown` | (Array mode) Returns the index of the next tile to place.                                                 |
| tileGenerator         | function | `undefined`                  | (Function mode) Returns the next tile to place in the form `[x, y, color]`                                |
| drawTimer             | number   | `undefined`                  | Reference to the current draw timer (returned by setTimer).                                               |
| minTimer              | number   | `100`                        | The minimum time (in ms) to wait between draw attempts.                                                   |
| lastDrawTime          | number   | `undefined`                  | The last time there was a successful draw.                                                                |
| get cooldownRemaining | number   | n/a                          | The time (in ms) remaining in the draw cooldown.                                                          |
| get nextDrawTime      | number   | n/a                          | The time that the next draw is allowed.                                                                   |
| get canDraw           | boolean  | n/a                          | Whether or not drawing is currently allowed.                                                              |

##### .exportTiles() → string

Returns JSON containing the current tiles and placement type.

##### .importTiles(string | array)

Takes either JSON (as in .exportTiles) or an object to use as the current tiles
list. Accepts options for `tiles → tiles`, `mode → placeMode`, `fn → tileSelector | tileGenerator`.

##### .exportSettings() → string

Returns the current settings as JSON.

##### .importSettings(string | object)

Takes either JSON or an object containing the new settings. Currently the only
things considered a 'setting' for this purpose is `minTimer`.

##### .exportBot() → string

Returns a combination of the tiles and settings.

##### .importBot(string | object)

Takes either JSON or an object, and directs the `settings` property to `this.importSettings`
and the `tiles` property to `this.importTiles`.

##### .save()

Persists settings and tiles to `localStorage`.

##### .load()

Loads settings and tiles from `localStorage`.

##### .setTileFunction(mode {number}, fn {function | string })

Sets the placement mode according to `mode`, then sets either `this.tileGenerator` or
`this.tileSelector` using the provided function. The following steps are taken to 
coerce `fn` it into a function:

1. If `fn` is a function, use it.
2. (If `ARRAY` mode) Check if `PlaceBot.selectors` has a property named `fn`, if so use that.
3. Attempt to use `eval(fn)`.
4. Default back to `ARRAY` mode with `fn = 'TopDown'`

##### .drawNext()

Attempts to draw the next tile (source depends on mode). If no tile is provided, or drawing
is not allowed, nothing happens. If a tile is provided, then a reddit api is checked to
see if that tile is already desired color (to avoid wasting our draw cooldown). A timer is 
then set for the next draw.

##### .drawTile(x {number}, y {number}, color {number})

If drawing is allowed, draws the given tile. If not, does nothing. Note that bypassing
the check can result in your cooldown resetting.















