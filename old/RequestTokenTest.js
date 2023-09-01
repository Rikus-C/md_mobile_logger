var fs = require('fs');
var config = require('./config.js');
var moment = require('moment');
var readline = require('readline');
var request = require('request');
var tokenRequest = require('./TokenRequest.js');
var deleteFile = require('./CSVDeleteFile.js');
var token = '';

var tokenTimer = -1;
var requestToken = function() {
    console.log("Requesting token for user " + config.UserName);
    tokenRequest.RequestToken(config.UserName, config.Password, function(tokenValue) {
        if (tokenValue.Token) {
            token = tokenValue.Token;
            console.log('Got token!');
        } else {
            console.log('Error: ' + JSON.stringify(tokenValue));
        }
    }, function(err) {
        console.log("Error getting token: " + JSON.stringify(err));

        if (tokenTimer === -1)
            tokenTimer = setTimeout(requestToken, 60000);
    });
}

requestToken();
