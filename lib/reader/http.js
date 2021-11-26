'use strict';

module.exports = url => new Promise((resolve, reject) => {

    const http = url.startsWith('https') ? require('https') : require('http');

    const req = http.request(url, { method: 'HEAD', headers: { range: 'bytes=1-1'}, timeout: 3000 });

    req.once('error', reject);
    req.once('response', res => {

        // TODO handle redirects

        if (res.statusCode !== 206) {
            return reject(Error('HTTP Range is not supported'));
        }

        resolve({
            read: (length, offset) => new Promise((resolve, reject) =>
                http.get(url, { headers: { range: `bytes=${offset}-${offset+length}` } }, res => {
                    const data = [];
    
                    if (res.statusCode !== 206) {
                        return reject(Error('HTTP Range is not supported'));
                    }
    
                    res.on('data', chunk => data.push(chunk));
                    res.once('end', () => resolve(Buffer.concat(data)));
                })
            )
          , close() {}
        })
    });

    req.end();
});
