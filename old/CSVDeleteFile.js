var fs = require('fs');
var SSH = require('simple-ssh');

var deleteFile = {
    Delete: function(filePath) {
        this.DeleteFile(filePath);
        //this.DeleteSSH(filePath);
    },

    DeleteFile: function(filePath) {
        console.log('Delete file: ' + filePath);
        fs.unlinkSync(filePath);
    },

    DeleteSSH: function(filePath) {
        var ssh = new SSH({
            host: 'localhost',
            user: 'username',
            pass: 'password'
        });

		ssh.exec('rm -rf ' + filePath, {
		    out: function(stdout) {
		        console.log(stdout);
		    }
		}).start();        
    }
}

module.exports = deleteFile;