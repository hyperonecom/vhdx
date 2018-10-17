'use strict';

const assert = require('assert');
const path = require('path');

const vhdx = require('..');

vhdx.info(path.join(__dirname, 'dynamic_10G.vhdx'), (err, info) => {

    assert.ifError(err);

    assert.ok(info.type === 'dynamic');
    assert.ok(info.size === 10 * 1024**3);

});

vhdx.info(path.join(__dirname, 'fixed_3M.vhdx'), (err, info) => {

    assert.ifError(err);

    assert.ok(info.type === 'fixed');
    assert.ok(info.size === 3 * 1024**2);

});

vhdx.info(path.join(__dirname, 'differencing.vhdx'), (err, info) => {

    assert.ifError(err);

    assert.ok(info.type === 'differencing');
});

vhdx
    .promises
    .info(path.join(__dirname, 'differencing.vhdx'))
    .then(info => {
        assert.ok(info.type === 'differencing');
    })
;

/*
vhdx.info('http://127.0.0.1:8080/dynamic_10G.vhdx', (err, info) => {

    assert.ifError(err);

    assert.ok(info.type === 'dynamic');
    assert.ok(info.size === 10 * 1024**3);

});
*/
