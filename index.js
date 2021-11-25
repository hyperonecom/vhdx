'use strict';

const getReader = require('./lib/reader');
const int53 = require('int53');

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

const load = async ({ read, close }) => {
    const buf = await read(8, 0);

    const signature = buf.toString('ascii', 0, 8);

    if (signature !== 'vhdxfile') {
        throw Error('wrong signature: "vhdxfile" is expected');
    }

    return {
        enumRegions: async() => {
            let buf = await read(16, REGION_TABLE_OFFSET);

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
                throw Error('wrong signature: regi is expected');
            }

            buf = await read(32 * entryCount, REGION_TABLE_OFFSET + 16)

            const regions = [];

            for (let i = 0; i < entryCount; i++) {
                const guid = readGuid(buf, i * 32);
                regions.push({
                    guid: guid
                  , name: knownRegions[guid] || 'unknown'
                  , fileOffset: int53.readInt64LE(buf, i * 32 + 16)
                });
            }

            return regions;
        }

      , loadMetadataRegion: async offset => {
            let buf = await read(16, offset);

            /*
            struct VHDX_METADATA_TABLE_HEADER {
                UINT64 Signature;    ->  8
                UINT16 Reserved;     ->  2
                UINT16 EntryCount;   ->  2
                UINT32 Reserved2[5]; ->  4
            }                           16
            struct VHDX_METADATA_TABLE_ENTRY {
                GUID ItemId;            -> 16
                UINT32 Offset;          ->  4
                UINT32 Length;          ->  4
                UINT32 IsUser:1;        ->  4
                UINT32 IsVirtualDisk:1; ->  .
                UINT32 IsRequired:1;    ->  .
                UINT32 Reserved:29;     ->  .
                UINT32 Reserved2;       ->  4
            }                              32
            */

            const entryCount = buf.readInt32LE(10);
            // console.log(`${entryCount} metadata entries`);

            const metadata = [];

            buf = await read(32 * entryCount, offset);

            const signature = buf.toString('ascii', 0, 8);

            if (signature !== 'metadata') {
                throw Error('wrong signature: metadata is expected');
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

            return metadata;
        }

      , readMetadataFileParameters: async (offset) => {
            const buf = await read(8, offset);

            /*
            struct VHDX_FILE_PARAMETERS {
                UINT32 BlockSize;
                UINT32 LeaveBlocksAllocated:1;
                UINT32 HasParent:1;
                UINT32 Reserved:30;
            }
            */
            const temp = buf.readInt32LE(4);

            return {
                blockSize : buf.readInt32LE()
              , leaveBlocksAllocated: (temp & 0b01) === 0b01
              , hasParent : (temp & 0b10) === 0b10
            };
        }

      , readMetadataSize: async offset => {
            const buf = await read(8, offset);

            /*
            struct VHDX_VIRTUAL_DISK_SIZE {
                UINT64 VirtualDiskSize;
            };
            */
            return int53.readInt64LE(buf);
        }
      , close
    };
};

const getVhdxInfo = async vhdx => {
    const regions = await vhdx.enumRegions();
    const region = regions.find(r => r.name === 'Metadata');

    if (!region) {
        throw Error('region Metadata not found');
    }

    const entries = await vhdx.loadMetadataRegion(region.fileOffset);

    const fileParameters = entries.find(e => e.name === 'File Parameters');
    if (!fileParameters) {
        throw Error('metadata entry File Parameters not found');
    }

    const virtualDiskSize = entries.find(e => e.name === 'Virtual Disk Size');
    if (!virtualDiskSize) {
        throw Error('metadata entry Virtual Disk Size not found');
    }

    const parameters = await vhdx.readMetadataFileParameters(region.fileOffset + fileParameters.offset);

    const type = parameters.hasParent ? 'differencing' : parameters.leaveBlocksAllocated ? 'fixed' : 'dynamic';

    const size = await vhdx.readMetadataSize(region.fileOffset + virtualDiskSize.offset)
    return { type, size };
};

const open = async url => {
    const reader = await getReader(url);
    return load(reader);
};

const info = async url => {
    const vhdx = await open(url);
    const info = await getVhdxInfo(vhdx);
    await vhdx.close();
    return info;
};

module.exports = {
    open
  , info
};
