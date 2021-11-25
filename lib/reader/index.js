'use strict';

const readers = {
    fs: require('./fs')
  , http: require('./http')
};

module.exports = function(url) {
    let reader = readers.fs;
    if (url.startsWith('http')) {
        reader = readers.http;
    }
    return reader(url);
};
