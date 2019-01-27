(function(){
// downlink: 0.4
// effectiveType: "2g"
// onchange: null
// rtt: 1900
// saveData: false
    const DEFAULT_OPTIONS = {
        ping: true,
        pingMaxTimeout: 5000,
        pingFrequency: 6000,
        pingUrl: `${location.protocol}//network-information-api.surge.sh/1b.txt`, // todo detect http
        eventsBeforeChange: 2
    };

    function NetworkInformationApiPolyfill(options) {
        return new Promise((resolve, reject) => {
            navigator.connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

            // if (Boolean(connection)) {
            //     return resolve(connection);
            // }

            const connection = new Connection(options);

            navigator.connection = {
                addEventListener(eventName, fn) {
                    if (eventName !== 'change') {
                        return;
                    }

                    connection.onChange(e => {
                        fn(e);
                    });
                }
            };
            
            resolve(navigator.connection);
        });
    }

    class Connection {
        constructor(options) {
            this.options = Object.assign({}, DEFAULT_OPTIONS, options);

            if (this.options.pingFrequency - this.options.pingMaxTimeout < 300) {
                throw new Error('Too little difference between pingFrequency and pingMaxTimeout.' +
                    'Difference must be more than 300ms.');
            }

            this.updateStatus();

            this.bindEvents();
        }

        onChange(fn) {
            this.onChangeFn = fn;
        }

        async updateStatus() {
            let latency = null;
            try {
                latency = await this.makeRequest();
            } catch(err) {
                latency = this.options.pingMaxTimeout;
            }

            console.log(latency);

            let statusObj = null;

            if (latency <= 1400) {
                statusObj = {
                    effectiveType: '4g',
                    downlink: 1.55
                };
            } else if (latency <= 1400) {
                statusObj = {
                    effectiveType: '3g',
                    downlink: 1
                };
            } else if (latency <= this.options.pingMaxTimeout) {
                statusObj = {
                    effectiveType: '2g',
                    downlink: 0.45
                };
            }

            console.log(statusObj);
        }

        addEventListener() {

        }

        bindEvents() {

        }

        makeRequest() {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                const abortTimeout = setTimeout(() => {
                    xhr.abort();

                    reject();
                }, this.options.pingMaxTimeout);

                xhr.open('GET', `${this.options.pingUrl}?v=${Math.random()}`, true);
                xhr.send();
                
                const time = new Date();
                xhr.onreadystatechange = () => {
                    if (xhr.readyState !== 4) {
                        return;
                    }

                    clearTimeout(abortTimeout);

                    if (xhr.status >= 200 && xhr.status <= 299) {
                        const latency = new Date() - time;
                        resolve(latency);
                    } else {
                        reject();
                    }
                };
            });
        }
    }

    if (typeof window !== 'undefined') {
        window.NetworkInformationApiPolyfill = NetworkInformationApiPolyfill;
    }

    if (typeof exports === 'object') {
        module.exports = NetworkInformationApiPolyfill;
    }
})();
