'use strict';

const fs = require('fs');

module.exports = (filePath, callback) => {
    fs.open(filePath, 'r', (err, fd) => {
        if (err) { return callback(err); }
        callback(err, (length, offset, callback) => {
            const buff = new Buffer(length);
            fs.read(fd, buff, 0, length, offset, err => callback(err, buff));
        });
    });
};
