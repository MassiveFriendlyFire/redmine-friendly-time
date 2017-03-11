// ==UserScript==
// @name         Redmine Friendly Time
// @namespace    http://tampermonkey.net/
// @version      0.6.2
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

//CORE
var LOGGING_ENABLED = true;
var MY_LOG = function(value) {
    if (LOGGING_ENABLED) {
        console.log(value);
    }
};

//replace this regex if script is not working, it must match A title tags
var mainRegex = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/;
//define locale strings
var ruStrings = ["дн.", "ч.", "мин.", "только что"];
var engStrings = ["days", "hour","min", "right now"];
//default locale is russian
var scriptStrings = ruStrings;

//define CONSTS 
var ISSUE_PAUSED_STR = 'Приостановлена';
var ISSUE_IN_WORK_STR = 'В работе';

//DOCUMENT CONSTS
var REDMINE_FORM_SUMBIT_ELEMENTS = document.getElementsByName('commit');
var ISSUE_STATUS_SELECT_OPTIONS_GROUP_ELEMENT = document.getElementById('issue_status_id');
var ISSUE_STATUS_STR_ELEMENT = document.getElementsByClassName('status attribute')[0].childNodes[1];
var EDIT_ISSUE_LINKS_PANEL_ELEMENT = document.getElementsByClassName('contextual')[1];
var EDIT_ISSUE_FORM_ELEMENT = document.getElementById('issue-form');
// i don't need this //var FORM_ISSUE_EDIT_SUBMIT_BUTTON_ELEMENT = loadSubmitElement(EDIT_ISSUE_FORM_ELEMENT);

//VARS
var VO_optionChanged = false;
var VO_issuePaused = true;

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

function preparedEditIssueStatus() {
    VO_optionChanged = true;
    var findValue;
    var toggleFrom = ISSUE_PAUSED_STR;
    var toggleTo = ISSUE_IN_WORK_STR;

    reloadIssueStatus();

    if (!VO_issuePaused) {
        var temp = toggleFrom;
        toggleFrom = toggleTo;
        toggleTo = temp;
    }

    for (var i = 0; i < ISSUE_STATUS_SELECT_OPTIONS_GROUP_ELEMENT.length; i++) {
        if (ISSUE_STATUS_SELECT_OPTIONS_GROUP_ELEMENT[i].innerHTML === toggleTo) {
            findValue = ISSUE_STATUS_SELECT_OPTIONS_GROUP_ELEMENT[i].value;
            break;
        }
    }
    ISSUE_STATUS_SELECT_OPTIONS_GROUP_ELEMENT.value = findValue;
    ISSUE_STATUS_SELECT_OPTIONS_GROUP_ELEMENT.style.background = 'lightgreen';
    MY_LOG('toggleStatus');
}

// I don't need this
// function loadSubmitElement(parentToFind) {
//     for (var i = 0; i < REDMINE_FORM_SUMBIT_ELEMENTS.length; i++) {
//         MY_LOG('REDMINE_FORM_SUMBIT_ELEMENTS[i].parentNode ' + REDMINE_FORM_SUMBIT_ELEMENTS[i].parentNode);
//         MY_LOG('parentToFind' + parentToFind);
//         if (REDMINE_FORM_SUMBIT_ELEMENTS[i].parentNode === parentToFind) {
//             MY_LOG('element exist');
//             return REDMINE_FORM_SUMBIT_ELEMENTS[i];
//         }
//     }
//     MY_LOG('element not exist');
// }

function createTaskEasyToggleHref() {
    var LINK = document.createElement('a');
    LINK.id = 'easy-toggle-link';
    LINK.classList.add('icon');
    LINK.classList.add('icon-edit');
    LINK.href = '#';

    var title1 = 'Взять в работу';
    var title2 = 'Приостановить';
    reloadIssueStatus();
    if (VO_issuePaused) {
        LINK.innerHTML = title1;
    } else {
        LINK.innerHTML = title2;
    }
    EDIT_ISSUE_LINKS_PANEL_ELEMENT.prepend(LINK);

    LINK.onclick = function() { easyTaskEasyToggleOnclickAction() };
    // MY_LOG('Sumbit element is ' + FORM_ISSUE_EDIT_SUBMIT_BUTTON_ELEMENT);
}

function easyTaskEasyToggleOnclickAction() {
    MY_LOG('submitting form...');
    EDIT_ISSUE_FORM_ELEMENT.submit();
}

function reloadIssueStatus() {
    MY_LOG('ISSUE_STATUS_STR_ELEMENT.innerHTML ' + ISSUE_STATUS_STR_ELEMENT.innerHTML);
    MY_LOG('ISSUE_PAUSED_STR ' + ISSUE_PAUSED_STR);
    MY_LOG('ISSUE_IN_WORK_STR ' + ISSUE_IN_WORK_STR);
    if (ISSUE_STATUS_STR_ELEMENT.innerHTML === ISSUE_PAUSED_STR) {
        MY_LOG('reloadIssueStatus ' + true);
        VO_issuePaused = true;
    } else if (ISSUE_STATUS_STR_ELEMENT.innerHTML === ISSUE_IN_WORK_STR) {
        MY_LOG('reloadIssueStatus ' + false);
        VO_issuePaused = false;
    }
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
    if (VO_optionChanged) {
        clearInterval(changeOptionIntervalId);
        return;
    } 

    preparedEditIssueStatus();
    createTaskEasyToggleHref();
}, 200); 