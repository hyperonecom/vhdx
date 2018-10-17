'use strict';

const http = require('http');

module.exports = (url, callback) => {

    const req = http.request(url, { method: 'HEAD', headers: { range: 'bytes=1-1'}, timeout: 3000 });

    req.once('error', callback);
    req.once('response', res => {

        // TODO handle redirects

        if (res.statusCode !== 206) {
            return callback(new Error('HTTP Range is not supported'));
        }

        callback(undefined, (length, offset, callback) => {
            http.get(url, { headers: { range: `bytes=${offset}-${offset+length}` } }, res => {
                const data = [];

                if (res.statusCode !== 206) {
                    return callback(new Error('HTTP Range is not supported'));
                }

                res.on('data', chunk => data.push(chunk));

                res.once('end', () => callback(undefined, Buffer.concat(data)));

            }).once('error', callback);

        });
    });

    req.end();
};
