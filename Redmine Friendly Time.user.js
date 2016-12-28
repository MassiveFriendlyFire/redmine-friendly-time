// ==UserScript==
// @name         Redmine Friendly Time
// @namespace    http://tampermonkey.net/
// @version      0.5.3
// @description  Redmine shows friendly time in tickets
// @author       Massive Friendly Fire
// @match        http://*/*
// @grant        none
// @homepageURL  https://github.com/MassiveFriendlyFire/redmine-friendly-time#readme
// @supportURL   https://github.com/MassiveFriendlyFire/redmine-friendly-time/issues
// ==/UserScript==

//Description:
//This script replaces time of update in redmine tickets
//from inaccurate values e.g. "last updated about 2 hours"
//to accurate values e.g "last updated 2 hours 13 minutes"

(function() {
    'use strict';


    //replace this regex if script is not working, it must match A title tags
    var mainRegex = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/;
    //define locale strings
    var ruStrings = ["дн.", "ч.", "мин.", "только что"];
    var engStrings = ["days", "hour","min", "right now"];
    //default locale is russian
    var scriptStrings = ruStrings;
    //detect locale part
    if (navigator.language !== "ru") {
        scriptStrings = engStrings;
    }

    //check site is Redmine
    var metas = document.getElementsByTagName('meta');
    var isRedmine = false;
    for (var s = 0; s < metas.length; s++) {
        if (metas[s].getAttribute("name") ==="description") {
            if (metas[s].getAttribute("content") === "Redmine") {
                isRedmine = true;
                break;
            }
        }
    }

    //define methods
    var formatMilliseconds = function(milliseconds) {
        var minutes = 1 + parseInt((milliseconds/(1000*60))%60);
        var hours = parseInt((milliseconds/(1000*60*60))%24);
        var days = parseInt(milliseconds/(1000*60*60*24));
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        var result = "";
        if (days === 0 && hours === 0 && minutes === 0) {
            result = scriptStrings[3];
        } else {
            if (days > 0) {
                result = days + " " + scriptStrings[0] + " ";
            }
            if (days === 0 && hours === 0) {
                result = minutes + " " + scriptStrings[2];
            } else {
                result = result + hours + " " + scriptStrings[1] + " " + minutes + " " + scriptStrings[2];
            }
        }
        return result;
    };
    var getMillisecondsIfStringIsDate = function(string) {
        var matches = string.match(mainRegex);
        if (matches !== null) {
            var year = parseInt(matches[3], 10);
            var month = parseInt(matches[2], 10) - 1; // months are 0-11
            var day = parseInt(matches[1], 10);
            var hour = parseInt(matches[4], 10);
            var minute = parseInt(matches[5], 10);
            var second = 0;
            //check first format: dd.mm.yyyy hh:mm
            var parsedDate = new Date(year, month, day, hour, minute, second);
            if (parsedDate.getFullYear() === year || parsedDate.getMonth() == month || parsedDate.getDate() === day || parsedDate.getHours() === hour || parsedDate.getMinutes() === minute) {
                return Math.abs(currentTime - parsedDate);
            }
            //check second format: mm.dd.yyyy hh:mm
            parsedDate = new Date(year, day - 1, month + 1, hour, minute, second);
            if (parsedDate.getFullYear() === year || parsedDate.getMonth() == day - 1 || parsedDate.getDate() === month + 1 || parsedDate.getHours() === hour || parsedDate.getMinutes() === minute) {
                return Math.abs(currentTime - parsedDate);
            }
            //not found
        }
        return null;
    };

    //Run stage
    //iterate links and replace inner html if link matches date time
    if (isRedmine) {
        var links = document.getElementsByTagName("a");
        var currentTime = new Date();
        for (var i = 0; i < links.length; i++) {
            var milliseconds = getMillisecondsIfStringIsDate(links[i].title);
            if (milliseconds !== null) {
                links[i].innerHTML = formatMilliseconds(milliseconds);
            }
        }
    }
})();