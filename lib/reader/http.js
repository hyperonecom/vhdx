'use strict';

const superagent = require('superagent');

module.exports = (url, callback) => {
    superagent
        .head(url)
        .set('range', 'bytes=1-1')
        .timeout(3000)
        .end((err, res) => {
            if (res && res.redirect) {
                url = res.header.location;
            }

            if (res && res.status !== 206) {
                return callback(new Error('HTTP Range is not supported'));
            }

            if (err) { return callback(err); }

            callback(err, (length, offset, callback) => {
                superagent
                    .get(url)
                    .set('range', `bytes=${offset}-${offset+length}`)
                    .buffer(true)
                    .end((err, res) => {

                        if (res && res.status !== 206) {
                            return callback(new Error('HTTP Range is not supported'));
                        }
                        callback(err, res.body);
                    });
            });
        });
};
