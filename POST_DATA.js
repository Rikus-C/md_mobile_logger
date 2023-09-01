const fs = require('fs');
const path = require('path');
const config = require('./config');
const request = require('request');

function MoveFile(file){
  var srcPath = config.ReadFolder + file;
  var desPath = config.WriteFolder + file;
  fs.rename(srcPath, desPath, () => {return});
}

function POSTlineOfData(token, line){
  var formattedLine = '';
  for(var i = 0; i < line.length; i++)
    if(line[i] === ',')
      formattedLine += '|';
    else formattedLine += line[i];
  console.log(formattedLine);
  var req = request.post({
    headers: { 'token': token },
    form: { MachineID: config.RigName,
      //ReadingType: varVals.ReadingType, // wtf is this shit?
      FileData: formattedLine
    },
    url: config.HttpProtocol + '://' + 
    config.CloudServerHost + ':' + 
    config.CloudServerPort + 
    '/Api/Data/Machines/SendData'
  }, function(err, resp, body){
    if (err) {
      console.log(err);
      console.log('Error!');
    } else {
      console.log('Response: ' + body);
      //cachedData[dir + file] = sendData.CurrentLine;
      //var fileDate = varVals['YYYY'] + '-' + varVals['MM'] + '-' + varVals['DD'];
      //var today = new Date();
      //today = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
      //if (fileDate !== today) {
        //deleteFile.Delete(dir + file);
      //}
      //fs.writeFileSync('data.json', JSON.stringify(cachedData), 'utf-8');
    }
  });
}

function ExstractDataFromFile(token, file){
  var file = config.ReadFolder + file;
  const stream = fs.createReadStream(file, 'utf8');
  var remaining = ''; var headerRow = true;
  stream.on('data', chunk => {
    remaining += chunk;
    let lines = remaining.split('\n');
    remaining = lines.pop();
    lines.forEach(line => {
      if(!headerRow)
        POSTlineOfData(token, line);
      else headerRow = false;
    });});stream.on('end', () => {
    if (remaining)
      POSTlineOfData(remaining);
    //MoveFile(file);
  });stream.on('error', () => {return;});
}

function GetFilesToPOST(token){
  fs.readdir(config.ReadFolder, (err, files) => {
    if (err) return;
    const csvFiles = files.filter(file => 
    path.extname(file).toLowerCase() === '.csv');
    csvFiles.forEach(function(file){
      ExstractDataFromFile(token, file);
    });
  });
}

function RequestToken(){
  var token = null;
  var http = ((this.HttpProtocol === 'http')? 
  require('http') : require('https'));
  var dataCall = JSON.stringify({
    'Action': 'RequestToken'
  });var options = {
    host: config.CloudServerHost,
    port: config.CloudServerPort,
    path: '/Api/Token/Provider',
    method: 'POST',
    headers: {
      'username': config.UserName,
      'password': config.Password,
      'version': config.Version,
      'Content-Length': config.ContentLength
    }};var tokenReq = http.request(options, function(tokenRes){
    var msg = ''; tokenRes.setEncoding('utf8');
    tokenRes.on('error', function(err){error(err);});            
    tokenRes.on('data', function(chunk){msg += chunk;});
    tokenRes.on('end', function(){
      token = JSON.parse(msg).Token;
      console.log(token);
      GetFilesToPOST(token);
    });});tokenReq.write(dataCall);
  tokenReq.end();
}

RequestToken();
