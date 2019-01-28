# Network Information Api polyfill

An attempt to create polyfill for this [specification](https://wicg.github.io/netinfo/). Polyfill is based on pinging
some url and latency analysis. These are pretty rough measurements. But better than nothing.

## Usage
```bash
npm i -S network-information-api-polyfill
```

or just

```html
<script src="dist/main.js"></script>
```

Then you need to initialize it

```js
new NetworkInformationApiPolyfill().then(connection => {
    console.log(connection); // or navigator.connection

    connection.addEventListener('change', e => {
        console.log('change', e);
    });
});
```

Polyfill must do the first request, to get information about network. So you can't use it synchronously, only using
promise. 

### Configuring

You can pass options during initialization:
```js
new NetworkInformationApiPolyfill({
    // here
});
```

##### pingMaxTimeout
Type: `number`  
Default: 5000

Timeout of request. After this time, the network will be considered unavailable (navigator.connection.type === 'none).
  
##### pingFrequency
Type: `number`  
Default: 6000

A frequency of pinging.  

##### pingUrl
Type: `string`
Default: `${location.protocol}//network-information-api.surge.sh/1b.txt` 

An url, that will be pinged. It is strongly recommended to have your own address.
It improves the accuracy of measurements in relation to the user of your service.

### CSP rules
If you have CSP rules, and you don't want own `pingUrl`, you must add url
network-information-api.surge.sh to rule `connect-src`.
