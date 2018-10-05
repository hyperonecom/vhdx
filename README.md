## usage
```
    const vhdx = require('@hyperone/vhdx');

    vhdx.info('http://example.com/test.vhdx', console.log);
    vhdx.info('C:\\disk.vhdx', console.log);

    {
        type: 'dynamic'     //dynamic || fixed || differencing
      , size: 1073741824    //bytes
    }
```
