// ==UserScript==
// @name         Redmine Friendly Time
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Redmine shows friendly time in tickets
// @author       Massive Friendly Fire
// @match        http://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var metas = document.getElementsByTagName('meta');
    var isRedmine = false;

    //check site is Redmine
    for (var s = 0; s < metas.length; s++) {
        console.log(metas[s].getAttribute("name"));
        if (metas[s].getAttribute("name") ==="description") {
            if (metas[s].getAttribute("content") === "Redmine") {
                isRedmine = true;
                break;
            }
        }
    }

    if (isRedmine) {
        var links = document.getElementsByTagName("a");
        var currentTime = new Date();
        var formatMilliseconds = function(milliseconds) {
            var minutes = parseInt((milliseconds/(1000*60))%60);
            var hours = parseInt((milliseconds/(1000*60*60))%24);
            minutes = (minutes < 10) ? "0" + minutes : minutes;
            return hours + " ч. " + minutes + " мин.";
        };
        for (var i = 0; i < links.length; i++) {
            var matches = links[i].title.match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/);
            if (matches !== null) {
                var year = parseInt(matches[3], 10);
                var month = parseInt(matches[2], 10) - 1; // months are 0-11
                var day = parseInt(matches[1], 10);
                var hour = parseInt(matches[4], 10);
                var minute = parseInt(matches[5], 10);
                var second = 0;
                var parsedDate = new Date(year, month, day, hour, minute, second);
                if (parsedDate.getFullYear() === year || parsedDate.getMonth() == month || parsedDate.getDate() === day || parsedDate.getHours() === hour || parsedDate.getMinutes() === minute) {
                    var millisecondsBetweenDates = Math.abs(currentTime - parsedDate);
                    links[i].innerHTML = formatMilliseconds(millisecondsBetweenDates);
                }
            }
        }
    }
})();