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

### Planned

* Allow drawing at any time, and queue tile placements
* Allow export/import of drawings, so that multiple people can work on each one
* Persist to local storage or cookies

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
is not allowed, nothing happens. A timer is then set for the next draw.

##### .drawTile(x {number}, y {number}, color {number})

If drawing is allowed, draws the given tile. If not, does nothing. Note that bypassing
the check can result in your cooldown resetting.















