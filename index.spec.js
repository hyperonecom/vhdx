'use strict';

const assert = require('assert');
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

/*
vhdx.info('http://127.0.0.1:8080/dynamic_10G.vhdx', (err, info) => {

    assert.ifError(err);

    expect(info.type).toBe('dynamic');
    expect(info.size).toBe(10 * 1024**3);

});
*/
