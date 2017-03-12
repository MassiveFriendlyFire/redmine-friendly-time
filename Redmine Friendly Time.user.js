// ==UserScript==
// @name         Redmine Friendly Time
// @namespace    http://tampermonkey.net/
// @version      0.99
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
var toastrCss = document.createElement('link');
toastrCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css';
toastrCss.rel = 'stylesheet';
var toastrJs = document.createElement('script');
toastrJs.src = 'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js';
document.head.appendChild(toastrCss);
document.head.appendChild(toastrJs);

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
var EDIT_ISSUE_LABOUR_COSTS_ELEMENT = document.getElementById('time_entry_hours');
var EDIT_ISSUE_LABOUR_TYPE_SELECT_OPTIONS_GROUP_ELEMENT = document.getElementById('time_entry_activity_id');
var ISSUE_HISTORY_LIST_ELEMENT = document.getElementById('history');
var ISSUE_HISTORY_LAST_ELEMENT = getHistoryLastElement(ISSUE_HISTORY_LIST_ELEMENT);
var MY_USER_ID = getMyUserId(document.getElementById('loggedas'));

//VARS
var VO_milliseconds;
var VO_days;
var VO_hours;
var VO_minutes;

var VO_statusChanged = false;
var VO_labourCostsChanged = false;
var VO_laboutTypeChanged = false;
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

function getHistoryLastElement() {
    var last;
    if (ISSUE_HISTORY_LIST_ELEMENT.children.length > 0) {
        last = ISSUE_HISTORY_LIST_ELEMENT.children[ISSUE_HISTORY_LIST_ELEMENT.children.length - 1];
    } else {
        MY_LOG('ERROR: Unable to get last history element');
        return;
    }
    if (last.id.indexOf('change') === -1) {
        MY_LOG('ERROR: Last history element is not a change');
        return;
    }
    return last;
}

function getMyUserId(loggedAsDiv) {
    var splitted = loggedAsDiv.children[0].href.split('/');
    if (splitted.length < 1) {
        MY_LOG('ERROR: Something wrong with "LOGGED AS" div. Unable to get current user id');
        return;
    }
    return splitted[splitted.length - 1];
}

function reloadIssueTimeVars() {
    VO_minutes = 1 + parseInt((VO_milliseconds/(1000*60))%60);
    VO_hours = parseInt((VO_milliseconds/(1000*60*60))%24);
    VO_days = parseInt(VO_milliseconds/(1000*60*60*24));
}

function prepareEditIssueStatus() {
    VO_statusChanged = true;
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

function prepareEditIssueLabourCosts() {
    VO_labourCostsChanged = true;
    if (VO_minutes === undefined) {
        reloadIssueTimeVars();
    }
    if (VO_issuePaused) {
        return;
    }
    var hoursValue = VO_days * 24 + VO_hours + VO_minutes / 60;
    EDIT_ISSUE_LABOUR_COSTS_ELEMENT.value = hoursValue;
    EDIT_ISSUE_LABOUR_COSTS_ELEMENT.style.background = 'lightgreen';
}

function prepareEditIssueLabourType() {
    VO_laboutTypeChanged = true;
    if (VO_issuePaused) {
        return;
    }
    EDIT_ISSUE_LABOUR_TYPE_SELECT_OPTIONS_GROUP_ELEMENT.value = 9;
    EDIT_ISSUE_LABOUR_TYPE_SELECT_OPTIONS_GROUP_ELEMENT.style.background = 'lightgreen';
}

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
}

function easyTaskEasyToggleOnclickAction() {
    MY_LOG('submitting form...');
    if (isSimpleSubmitAllowed()) {
        EDIT_ISSUE_FORM_ELEMENT.submit();
    } else {
        thereIsNotAllAreSimpleWithYourIssue();
    }
    
}

function isSimpleSubmitAllowed() {
    var userHrefValue = ISSUE_HISTORY_LAST_ELEMENT.children[0].children[0].children[2].href;
    var splitted = userHrefValue.split('/');
    if (splitted.length < 1) {
        MY_LOG('ERROR: Something wrong with user href value');
        return false;
    }
    var userId = splitted[splitted.length - 1];
    MY_LOG('user id = ' + userId);
    if (userId !== MY_USER_ID) {
        MY_LOG('DEBUG: User Id mismatch');
        return false;
    }
    if (VO_issuePaused) {
        return true;
    }
    var details = ISSUE_HISTORY_LAST_ELEMENT.children[0].children[1];
    MY_LOG('details.children.length ' + details.children.length);
    if (details.children.length < 1) {
        MY_LOG('Details looks not like status changed message.. Check failed.');
        return false;
    }
    for (var i = 0; i < details.children.length; i++) {
        var liElement = details.children[i];
        if (liElement.tagName != 'LI') {
            MY_LOG('Unable to find status change in last history element... Check failed.');
            return false;
        }
        if (liElement.children[0].innerHTML === 'Статус') {
            if (liElement.children[2].innerHTML === 'В работе') {
                MY_LOG('DEBUG: Issue In Work By You and You can Simply Submit');
                return true;
            }
            if (VO_issuePaused) {
                MY_LOG('DEBUG: Issue Paused and You can Simply Submit');
                return true;
            }
        }
    }
    MY_LOG('Unable to find status change in last history element... Check failed.');
    return false;
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

function thereIsNotAllAreSimpleWithYourIssue() {
    MY_LOG('notAllAreSimpleWithYourIssue');
    showNotificationPopup('Не всё так просто с вашей задачей... Проверьте всё еще разок. Может быть длительность трудозатрат нужно изменить?');
    EDIT_ISSUE_LABOUR_COSTS_ELEMENT.value = roundUpto(EDIT_ISSUE_LABOUR_COSTS_ELEMENT.value, 4);
    showAndScrollTo("update", "issue_notes"); //REDMINE FUNCTION.
    return false;
}

function showNotificationPopup(caption) {
    setTimeout(function() {toastr.info(caption)}, 250);
}

function roundUpto(number, upto){
    return new Number(number).toFixed(upto);
}

//Run stage
//iterate links and replace inner html if link matches date time
var links = document.getElementsByTagName("a");
var currentTime = new Date();
for (var i = 0; i < links.length; i++) {
    var milliseconds = getMillisecondsIfStringIsDate(links[i].title);
    if (milliseconds !== null) {
        VO_milliseconds = milliseconds;
        links[i].innerHTML = formatMilliseconds(milliseconds);
    }
}

reloadIssueTimeVars();

//autochange options values for edit mode
var changeFormValuesIntervalId = setInterval(function() {
    if (VO_statusChanged) {
        clearInterval(changeFormValuesIntervalId);
        return;
    } 

    prepareEditIssueStatus();
    prepareEditIssueLabourCosts();
    prepareEditIssueLabourType();
    createTaskEasyToggleHref();
}, 200); 