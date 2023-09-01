const fs = require('fs');
const config = require('./config.js');
const moment = require('moment');

console.log(config);

// Extract config variables from config settings
let extractVariables = function(configString) {
    var returnValue = [];
    let tmpString = configString;

    let testCount = ((tmpString.split('%').length - 1) / 2);
    if ((testCount - Math.floor(testCount)) > 0) {
        throw (new Error('Config string ' + configString + '. Incorrect syntax.'));
    } else {
        while (tmpString.indexOf('%') !== -1) {
            let startString = tmpString.substring(tmpString.indexOf('%') + 1, tmpString.length);
            let variable = startString.substring(0, startString.indexOf('%'));
            tmpString = tmpString.split('%' + variable + '%').join('');

            returnValue.push(variable);
        }
    }

    return returnValue;
}

let populateVariableString = function(configString, readingType) {
    let variables = extractVariables(configString);
    var returnValue = configString;

    variables.forEach(function(variable) {
        let answer = '';

        if (variable === 'ReadingType')
            answer = readingType;
        else
            answer = moment(new Date()).format(variable).toString();

        returnValue = returnValue.split('%' + variable + '%').join(answer);
    });

    return returnValue;
}

let createFolderIfNotExist = function(containerFolder, subFolders) {
	let inFolder = containerFolder;
	let splitFolder = subFolders.substring(0, subFolders.lastIndexOf('/')).split('/');

	splitFolder.forEach(function(subFolder) {
		inFolder = inFolder + '/' + subFolder;

        if (!fs.existsSync(inFolder)) {
            fs.mkdirSync(inFolder);
        }
	});
};

config.WriterPattern = populateVariableString(config.WriterPattern, 'Drilling');

let writeRandomCsv = function() {
    setTimeout(function() {
    	let momentDate = moment(new Date());

    	createFolderIfNotExist(config.WriteFolder, config.WriterPattern);

    	if (!fs.existsSync(config.WriteFolder + config.WriterPattern))
    		fs.writeFileSync(config.WriteFolder + config.WriterPattern, 'sep=|\r\nDate|Time|Status_Process|Status_Mode|ThrustToHead|ThrustPerCutter|ChuckSpeed|Torque|Penetration\r\n');

    	fs.appendFileSync(config.WriteFolder + config.WriterPattern,
    		momentDate.format('DD/MM/YYYY') + '|' + momentDate.format('HH:mm:ss') + '|Not Selected|RF|' + Math.floor((Math.random() * 400) + 1) + '|' + Math.floor((Math.random() * 2) + 1) + '|' + Math.floor((Math.random() * 2) + 1) + '|' + Math.floor((Math.random() * 400) + 1) + '|0\r\n');
        writeRandomCsv();
    }, 1000);
}

writeRandomCsv();