'use strict';

const fs = require('fs').promises;

module.exports = async filePath => {
    const filehandle = await fs.open(filePath, 'r');

    return {
        read: async (length, offset) => {
            const buff = Buffer.alloc(length);
            await filehandle.read(buff, 0, length, offset);
            return buff;
        }
      , close() {
            return filehandle.close();
        }
    };
};
