'use strict';

const path = require('path');

const vhdx = require('.');

describe('type', () => {

    test('dynamic', async() => {
        const info = await vhdx.info(path.join(__dirname, 'test', 'dynamic_10G.vhdx'));
    
        expect(info.type).toBe('dynamic');
        expect(info.size).toBe(10 * 1024**3);
    })

    test('fixed', async() => {
        const info = await vhdx.info(path.join(__dirname, 'test', 'fixed_3M.vhdx'));
    
        expect(info.type).toBe('fixed');
        expect(info.size).toBe(3 * 1024**2);
    })

    test('differencing', async() => {
        const info = await vhdx.info(path.join(__dirname, 'test', 'differencing.vhdx'));
    
        expect(info.type).toBe('differencing');
    })
});

test('identifier', async() => {
    const info = await vhdx.info(path.join(__dirname, 'test', '619fac0faa0fefe11033bbd5.vhdx'));
    
    expect(info.type).toBe('dynamic');
    expect(info.size).toBe(1 * 1024**3);
    expect(info.metadata.id).toBe('619fac0faa0fefe11033bbd5');
    expect(info.identifier).toBe('00000000-619F-AC0F-AA0F-EFE11033BBD5');
});

test('http', async() => {

    const server = require('http-server').createServer({
        root: path.join(__dirname, 'test')
    });

    await new Promise(resolve => server.listen(44444, resolve));

    const info = await vhdx.info('http://127.0.0.1:44444/dynamic_10G.vhdx');
    expect(info.type).toBe('dynamic');
    expect(info.size).toBe(10 * 1024**3);
    server.close()
});
