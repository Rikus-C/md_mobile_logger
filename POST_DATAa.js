const fs = require('fs');
const path = require('path');
const config = require('./config');

function MoveFile(){}

function POSTlinOfData(token, line){}

function ExstractDataFromFile(token, file){
  console.log(file);
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
