var fs = require('fs');
var config = require('./config.js');
var moment = require('moment');
var readline = require('readline');
var request = require('request');
var tokenRequest = require('./TokenRequest.js');
var deleteFile = require('./CSVDeleteFile.js');
var token = '';
var machines = [];

var cachedData = {};

var writeCacheFile = function() {
    fs.writeFile(config.CachingFile, JSON.stringify(cachedData), 'utf8');
};

// Load or write the cache file
if (fs.existsSync(config.CachingFile))
    cachedData = JSON.parse(fs.readFileSync(config.CachingFile, 'utf8'));
else
    writeCacheFile();

var getVariablesValuesFromWritePattern = function(fileName) {
    var variables = [];
    var writePattern = config.WriterPattern.split('/');
    writePattern = writePattern[writePattern.length - 1];

    writePattern.split('%').forEach(function(splitValue, index) {
        var n = (index + 1) / 2;
        var decimal = n - Math.floor(n);

        if (decimal === 0) {
            variables.push({ Name: splitValue });
        }
    });

    var checkFileName = config.WriterPattern.split('/');
    checkFileName = checkFileName[checkFileName.length - 1];
    variables.forEach(function(variable, index) {
        checkFileName = checkFileName.split('%' + variable.Name + '%').join('\r\n[' + variable.Name + ']\r\n')
    });

    var currentVariable = '';
    checkFileName.split('\r\n').forEach(function(split) {
        var isVariable = false;

        variables.forEach(function(variable, index) {
            if (split === '[' + variable.Name + ']') {
                isVariable = true;
                currentVariable = variable;
            }
        });

        if ((!isVariable) && (split !== '')) {
            //console.log('"' + fileName.substring(0, fileName.indexOf(split)) + '"');
            currentVariable.Value = fileName.substring(0, fileName.indexOf(split));

            var fromTo = (fileName.indexOf(split) + split.length);
            fileName = fileName.substring(fromTo, fileName.length);
        }
    });

    var returnValue = {};
    variables.forEach(function(variable) {
        returnValue[variable.Name] = variable.Value;
    });
    return returnValue;
};

var getMachines = function(done) {
    console.log('Getting list of Machines...');

    var req = request.post({
        headers: { 'token': token, 'entity': '[\"MDX.RigNumbers\"]', 'criteria': '[]' },
        url: tokenRequest.HttpProtocol + '://' + tokenRequest.CloudServerHost + ':' + tokenRequest.CloudServerPort + '/Api/Data/EntityProvider'
    }, function(err, resp, body) {
        if (err) {
            console.log(err);
            console.log('Error!');
        } else {
            var response = JSON.parse(body);
            machines = response['MDX.RigNumbers'];

            config.RigID = machines.filter(i => i.Name === config.RigName)[0]._id;
        }
        
        done();
    });
};

var scanRun = function() {
    var scanDirectory = function(dir) {
        fs.readdir(dir, function(err, files) {
            files.forEach(file => {
                var fileInfo = fs.lstatSync(dir + file);

                if (fileInfo.isDirectory()) {
                    scanDirectory(dir + file + '/');
                } else if (file.indexOf('.csv') !== -1) {
                    console.log('Folder: ' + dir);
                    console.log('File: ' + dir + file);

                    var varVals = getVariablesValuesFromWritePattern(file);

                    readLines(dir + file, function(sendData) {
                        console.log('Data to send (' + varVals.ReadingType + '):\r\n' + sendData.Data);

                        var sendRequest = function(rigId) {
                            var req = request.post({
                                headers: { 'token': token },
                                form: {
                                    MachineID: rigId,
                                    ReadingType: varVals.ReadingType,
                                    FileData: sendData.Data
                                },
                                url: tokenRequest.HttpProtocol + '://' + tokenRequest.CloudServerHost + ':' + tokenRequest.CloudServerPort + '/Api/Data/Machines/SendData'
                            }, function(err, resp, body) {
                                if (err) {
                                    console.log(err);
                                    console.log('Error!');
                                } else {
                                    console.log('Response: ' + body);
                                    cachedData[dir + file] = sendData.CurrentLine;

                                    var fileDate = varVals['YYYY'] + '-' + varVals['MM'] + '-' + varVals['DD'];
                                    var today = new Date();
                                    today = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);

                                    if (fileDate !== today) {
                                        deleteFile.Delete(dir + file);
                                    }

                                    fs.writeFileSync('data.json', JSON.stringify(cachedData), 'utf-8');
                                }
                            });
                        }

                        if (varVals.RigName) {
                            var getRig = machines.filter(i => i.Name === varVals.RigName);

                            if (getRig.length > 0) {
                                sendRequest(getRig[0]._id);
                            } else {
                                getMachines(function() {
                                    getRig = machines.filter(i => i.Name === varVals.RigName);

                                    if (getRig.length > 0) {
                                        sendRequest(getRig[0]._id);
                                    } else {
                                        sendRequest(config.RigID);
                                    }
                                });
                            }
                        } else
                            sendRequest(config.RigID);
                    });
                }
            });
        });
    };

    scanDirectory(config.ReadFolder);
    setTimeout(scanRun, config.ReadTimeout);
};

var readLines = function(file, done) {
    var readFrom = 0;
    var sendData = '';

    if (cachedData[file])
        readFrom = cachedData[file];

    var readLine = readline.createInterface({
        input: fs.createReadStream(file)
    });

    var currentLine = 0;
    var linesAdded = 0;
    readLine.on('line', function(line) {
        currentLine++;

        if (currentLine < 3) {
            sendData += ((currentLine === 1) ? '' : '\r\n') + line;
        } else if (currentLine > readFrom) {
            if (line.trim() !== '') {
                sendData += '\r\n' + line;
                linesAdded++;
            }
        }
    });

    readLine.on('close', function() {
        if (linesAdded > 0)
            done({ Data: sendData, CurrentLine: currentLine });
    });
};

// Load the current data
if (fs.existsSync('data.json')) {
    try {
        var database = fs.readFileSync('data.json');
        cachedData = JSON.parse(database);
    } catch (ex) {
        console.log('Error! Resetting database.');
        console.log(ex);
        cachedData = {};
    }
}

var tokenTimer = -1;
// Request token from MD-Mobile
var requestToken = function() {
    console.log("Requesting token for user " + config.UserName);
    tokenRequest.RequestToken(config.UserName, config.Password, function(tokenValue) {
        if (tokenValue.Token) {
            token = tokenValue.Token;
            console.log('Got token!');

            // Start scan run
            //setTimeout(scanRun, config.ReadTimeout);     
            getMachines(function() {
                setTimeout(scanRun, config.ReadTimeout);
            });
        } else {
            console.log('Error: ' + JSON.stringify(tokenValue));
        }
    }, function(err) {
        console.log("Error getting token: " + JSON.stringify(err));

        if (tokenTimer === -1)
            tokenTimer = setTimeout(requestToken, 60000);
    });
}

process.on('uncaughtException', function(err) {
    console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
    console.error(err.stack);

    if (tokenTimer === -1)
        tokenTimer = setTimeout(requestToken, 60000);
});

requestToken();