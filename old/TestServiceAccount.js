var fs = require('fs');
var config = require('./config.js');
var moment = require('moment');
var readline = require('readline');
var request = require('request');
var tokenRequest = require('./TokenRequest.js');
var token = '';

var tokenTimer = -1;

var doQuery = function (done) {
    console.log('Do query.');

    var req = request.post({
        headers: { 'token': token, 'entity': '[\"Docs.DocumentData\"]', 'criteria': '[{ \"Name\": \"DailyShift\" }]' },
        url: tokenRequest.HttpProtocol + '://' + tokenRequest.CloudServerHost + ':' + tokenRequest.CloudServerPort + '/Api/Data/EntityProvider'
    }, function (err, resp, body) {
        if (err) {
            console.log(err);
            console.log('Error!');
        } else {
            var response = JSON.parse(body);
            for (var prop in response) {
                console.log(prop + ' - ' + response[prop].length);
            }
            //console.log(response);
        }

        done();
    });
};

var doPost = function (done) {
    var postUrl = "/Api/Data/ProcessEvents";

    var objArray = JSON.parse(fs.readFileSync('/home/stephan/Downloads/data_audits_fix.json', 'utf8'));

    console.log('Total lines : ' + objArray.length);

    var events = [];
    objArray.forEach((obj, index) => {
        if (obj.Entity !== 'App.UserLocalStorage') {
            var event = {
                Event: obj.Action,
                EntityName: obj.Entity,
                Data: obj.Data
            };

            events.push(event);
        }
    });

    console.log('Posting events...');

    var postData = { Events: events, Version: '0.6.1.7' };
    var req = request.post({
        headers: { 'token': token, 'content-type': 'application/json' },
        body: postData,
        url: tokenRequest.HttpProtocol + '://' + tokenRequest.CloudServerHost + ':' + tokenRequest.CloudServerPort + postUrl,
        json: true
    }, function (err, resp, body) {
        if (err) {
            console.log(err);
            console.log('Error!');
        } else {
            console.log(body);
        }

        done();
    });

    console.log('Events: ' + events.length);
};

// Request token from MD-Mobile
var requestToken = function () {
    console.log("Requesting token for user " + config.UserName);
    tokenRequest.RequestToken(config.UserName, config.Password, function (tokenValue) {
        if (tokenValue.Token) {
            token = tokenValue.Token;
            console.log('Got token!');

            // Start scan run
            //setTimeout(scanRun, config.ReadTimeout);     
            doPost(function () {
            });
        } else {
            console.log('Error: ' + JSON.stringify(tokenValue));
        }
    }, function (err) {
        console.log("Error getting token: " + JSON.stringify(err));

        if (tokenTimer === -1)
            tokenTimer = setTimeout(requestToken, 60000);
    });
};

requestToken();
//doPost();