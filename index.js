'use strict';

const getReader = require('./lib/reader');
const int53 = require('int53');
const util = require('util');

const REGION_TABLE_OFFSET = 192 * 1024;
// const REGION_TABLE_OFFSET = 256 * 1024;

const knownRegions = {
    '2DC27766-F623-4200-9D64-115E9BFD4A08' : 'BAT'
  , '8B7CA206-4790-4B9A-B8FE-575F050F886E' : 'Metadata'
};

const knownMetadataItems = {
    'CAA16737-FA36-4D43-B3B6-33F0AA44E76B' : 'File Parameters'
  , '2FA54224-CD1B-4876-B211-5DBED83BF4B8' : 'Virtual Disk Size'
  , 'BECA12AB-B2E6-4523-93EF-C309E000C746' : 'Page 83 Data'
  , '8141BF1D-A96F-4709-BA47-F233A8FAAB5F' : 'Logical Sector Size'
  , 'CDA348C7-445D-4471-9CC9-E9885251C556' : 'Physical Sector Size'
  , 'A8D35F2D-B30B-454D-ABF7-D3D84834AB0C' : 'Parent Locator'
};

const readGuid = (buffer, pos) => {
    const t = buffer.toString('hex', pos, pos + 16).toUpperCase();
    return [
        [t.substr(6, 2), t.substr(4, 2), t.substr(2, 2), t.substr(0, 2) ].join('')
      , [t.substr(10, 2), t.substr(8, 2) ].join('')
      , [t.substr(14, 2), t.substr(12, 2) ].join('')
      , [t.substr(16, 2), t.substr(18, 2) ].join('')
      , t.substr(20)
    ].join('-');
};

const load = (read, callback) => read(8, 0, (err, buf) => {
    if (err) { return callback(err); }

    const signature = buf.toString('ascii', 0, 8);

    if (signature !== 'vhdxfile') {
        return callback(new Error('wrong signature: vhdxfile is expected'));
    }

    callback(undefined, {

        enumRegions: callback => read(16, REGION_TABLE_OFFSET, (err, buf) => {
            if (err) { return callback(err); }

            /*
            struct VHDX_REGION_TABLE_HEADER {
                UINT32 Signature;  ->  4
                UINT32 Checksum;   ->  4
                UINT32 EntryCount; ->  4
                UINT32 Reserved;   ->  4
            }                         16
            struct VHDX_REGION_TABLE_ENTRY {
                GUID Guid;          128bits -> 16
                UINT64 FileOffset;          ->  8
                UINT32 Length;              ->  4
                UINT32 Required:1;          ->  4
                UINT32 Reserved:31;         ->  4
            }                                  32
            */

            const entryCount = buf.readInt32LE(8);

            const signature = buf.toString('ascii', 0, 4);

            if (signature !== 'regi') {
                return callback(new Error('wrong signature: regi is expected'));
            }

            read(32 * entryCount, REGION_TABLE_OFFSET + 16, (err, buf) => {
                if (err) { return callback(err); }

                const regions = [];

                for (let i = 0; i < entryCount; i++) {
                    const guid = readGuid(buf, i * 32);
                    regions.push({
                        guid: guid
                      , name: knownRegions[guid] || 'unknown'
                      , fileOffset: int53.readInt64LE(buf, i * 32 + 16)
                    });
                }

                callback(err, regions);
            });
        })

      , loadMetadataRegion: (offset, callback) => read(16, offset, (err, buf) => {
            if (err) { return callback(err); }

            /*
            struct ​VHDX_METADATA_TABLE_HEADER​ {
                UINT64 Signature;    ->  8
                UINT16 Reserved;     ->  2
                UINT16 EntryCoun​t​;   ->  2
                UINT32 Reserved2[5]; ->  4
            }                           16
            struct ​VHDX_METADATA_TABLE_ENTRY​ {
                GUID ItemId​;            -> 16
                UINT32 Offset;          ->  4
                UINT32 Length;          ->  4
                UINT32 IsUser​:1;        ->  4
                UINT32 IsVirtualDisk​:1; ->  .
                UINT32 IsRequired​:1;    ->  .
                UINT32 Reserved:29;     ->  .
                UINT32 Reserved2;       ->  4
            }                              32
            */

            const entryCount = buf.readInt32LE(10);
            // console.log(`${entryCount} metadata entries`);

            const metadata = [];

            read(32 * entryCount, offset, (err, buf) => {
                if (err) { return callback(err); }


                const signature = buf.toString('ascii', 0, 8);

                if (signature !== 'metadata') {
                    return callback(new Error('wrong signature: metadata is expected'));
                }

                for (let i = 0; i < entryCount; i++) {
                    const guid = readGuid(buf, i * 32);

                    metadata.push({
                        guid: guid
                      , name: knownMetadataItems[guid] || 'unknown'
                      , offset: buf.readInt32LE(i * 32 + 16)
                      , length: buf.readInt32LE(i * 32 + 20)
                    });
                }

                callback(err, metadata);
            });
        })

      , readMetadataFileParameters: (offset, callback) => read(8, offset, (err, buf) => {
            if (err) { return callback(err); }

            /*
            struct ​VHDX_FILE_PARAMETERS​ {
                UINT32 BlockSiz​e​;
                UINT32 LeaveBlocksAllocated:1;
                UINT32 HasParent​:1;
                UINT32 Reserved:30;
            }
            */
            const temp = buf.readInt32LE(4);

            callback(err, {
                blockSize : buf.readInt32LE()
              , leaveBlocksAllocated: (temp & 0b01) === 0b01
              , hasParent : (temp & 0b10) === 0b10
            });
        })

      , readMetadataSize: (offset, callback) => read(8, offset, (err, buf) => {
            if (err) { return callback(err); }

            /*
            struct ​VHDX_VIRTUAL_DISK_SIZE​ {
                UINT64 VirtualDiskSize​;
            };
            */
            callback(err, int53.readInt64LE(buf));
        })
    });
});

const getVhdxInfo = (vhdx, callback) => vhdx.enumRegions((err, regions) => {
    if (err) { return callback(err); }

    const region = regions.find(r => r.name === 'Metadata');

    if (!region) {
        return callback(new Error('region Metadata not found'));
    }

    vhdx.loadMetadataRegion(region.fileOffset, (err, entries) => {
        if (err) { return callback(err); }

        const fileParameters = entries.find(e => e.name === 'File Parameters');
        if (!fileParameters) {
            return callback(new Error('metadata entry File Parameters not found'));
        }

        const virtualDiskSize = entries.find(e => e.name === 'Virtual Disk Size');
        if (!virtualDiskSize) {
            return callback(new Error('metadata entry Virtual Disk Size not found'));
        }

        vhdx.readMetadataFileParameters(region.fileOffset + fileParameters.offset, (err, parameters) => {
            if (err) { return callback(err); }

            const type = parameters.hasParent ? 'differencing' : parameters.leaveBlocksAllocated ? 'fixed' : 'dynamic';

            vhdx.readMetadataSize(region.fileOffset + virtualDiskSize.offset, (err, size) => {
                callback(err, err || { type: type, size: size });
            });
        });
    });
});

const open = (url, callback) => getReader(url, (err, reader) => {
    if (err) { return callback(err); }
    load(reader, callback);
});

const info = (url, callback) => open(url, (err, vhdx) => {
    if (err) { return callback(err); }
    getVhdxInfo(vhdx, callback);
});

module.exports = {
    open
  , info
  , promises: {
        open: util.promisify(open)
      , info: util.promisify(info)
    }
};
