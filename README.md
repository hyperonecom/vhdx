## usage
```javascript
const vhdx = require('@hyperone/vhdx');

const info = await vhdx.info('C:\\disk.vhdx');

{
    type: 'dynamic'     //dynamic || fixed || differencing
  , size: 1073741824    //bytes
  , ...
}

const info = await vhdx.info('http://example.com/test.vhdx');

{
    type: 'dynamic'     //dynamic || fixed || differencing
  , size: 1073741824    //bytes
  , ...
}

```
