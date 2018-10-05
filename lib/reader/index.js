'use strict';

const readers = {
    fs: require('./fs')
  , http: require('./http')
};

module.exports = function(url, callback) {
    let reader = readers.fs;
    if (url.startsWith('http')) {
        reader = readers.http;
    }
    reader(url, callback);
};
