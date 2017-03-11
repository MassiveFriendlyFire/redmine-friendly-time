// ==UserScript==
// @name         Redmine Friendly Time
// @namespace    http://tampermonkey.net/
// @version      0.6.1
// @description  Redmine shows friendly time in tickets
// @author       Massive Friendly Fire
// @include      http://redmine.m-games-ltd.com/*
// @compatible   firefox
// @compatible   chrome
// @grant        none
// @homepageURL  https://github.com/MassiveFriendlyFire/redmine-friendly-time#readme
// @supportURL   https://github.com/MassiveFriendlyFire/redmine-friendly-time/issues
// ==/UserScript==

//Description:
//This script replaces time of update in redmine tickets
//from inaccurate values e.g. "last updated about 2 hours"
//to accurate values e.g "last updated 2 hours 13 minutes"

//replace this regex if script is not working, it must match A title tags
var mainRegex = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/;
//define locale strings
var ruStrings = ["дн.", "ч.", "мин.", "только что"];
var engStrings = ["days", "hour","min", "right now"];
//default locale is russian
var scriptStrings = ruStrings;

var optionChanged = false;

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

function toggleTaskStatus() {
    optionChanged = true;
    var findValue;
    var toggleFrom = 'Приостановлена';
    var toggleTo = 'В работе';
    if (document.getElementsByClassName('status attribute')[0].childNodes[1].innerHTML === toggleTo) {
        var temp = toggleFrom;
        toggleFrom = toggleTo;
        toggleTo = temp;
    }

    var issueStatusSelect = document.getElementById('issue_status_id');
    for (var i = 0; i < issueStatusSelect.length; i++) {
        if (issueStatusSelect[i].innerHTML === toggleTo) {
            findValue = issueStatusSelect[i].value;
            break;
        }
    }
    issueStatusSelect.value = findValue;
    issueStatusSelect.style.background = 'lightgreen';
    console.log('toggleStatus');
}

//Run stage
//iterate links and replace inner html if link matches date time
var links = document.getElementsByTagName("a");
var currentTime = new Date();
for (var i = 0; i < links.length; i++) {
    var milliseconds = getMillisecondsIfStringIsDate(links[i].title);
    if (milliseconds !== null) {
        links[i].innerHTML = formatMilliseconds(milliseconds);
    }
}

//autochange options values for edit mode
var changeOptionIntervalId = setInterval(function() {
    if (optionChanged) {
        clearInterval(changeOptionIntervalId);
        return;
    } 

    toggleTaskStatus();
}, 200); 