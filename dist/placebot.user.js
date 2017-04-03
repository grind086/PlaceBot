// ==UserScript==
// @name        PlaceBot
// @version     0.0.9
// @namespace   https://github.com/grind086/PlaceBot
// @description A bot that automates drawing on reddit.com/r/place
// @grant       unsafeWindow
// @match       http://www.reddit.com/place/
// @match       http://www.reddit.com/r/place/
// @match       https://www.reddit.com/place/
// @match       https://www.reddit.com/r/place/
// ==/UserScript==

(function() {
var s = document.createElement('script');
s.setAttribute('type', 'text/javascript');
s.setAttribute('src', 'https://grind086.github.io/PlaceBot/dist/placebot.min.js');
document.head.appendChild(s);
})();