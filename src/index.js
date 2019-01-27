(function(){
    const DEFAULT_OPTIONS = {
        pingMaxTimeout: 5000,
        pingFrequency: 6000,
        pingUrl: `${location.protocol}//network-information-api.surge.sh/1b.txt`
    };


    function NetworkInformationApiPolyfill(options) {
        return new Promise(async (resolve, reject) => {
            navigator.connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

            if (Boolean(navigator.connection)) {
                return resolve(navigator.connection);
            }

            const connection = new Connection(options, {
                onInit: status => {
                    navigator.connection = Object.assign(status, {
                        addEventListener(eventName, fn) {
                            if (eventName !== 'change') {
                                return;
                            }

                            connection.onChangeAddCb(fn);
                        },

                        removeEventListener(eventName, fn) {
                            if (eventName !== 'change') {
                                return;
                            }

                            connection.onChangeRemoveCb(fn);
                        }
                    });

                    resolve(navigator.connection);
                }
            });
        });
    }

    class Connection {
        constructor(options, events) {
            this.options = Object.assign({}, DEFAULT_OPTIONS, options);
            this.events = events;
            this.onChangeFns = [];

            if (this.options.pingFrequency - this.options.pingMaxTimeout < 300) {
                throw new Error('Too little difference between pingFrequency and pingMaxTimeout.' +
                    'Difference must be more than 300ms.');
            }

            this.prevStatus = {};

            this.ping();
        }

        onChangeAddCb(fn) {
            if (this.onChangeFns.indexOf(fn) === -1) {
                this.onChangeFns.push(fn);
            }
        }

        onChangeRemoveCb(fn) {
            const fnIdx = this.onChangeFns.indexOf(fn);

            if (fnIdx !== -1) {
                this.onChangeFns.splice(fnIdx, 1);
            }
        }

        onChangeExecCbs(status) {
            for (const fn of this.onChangeFns) {
                fn(status);
            }
        }

        async ping() {
            setTimeout(() => {
                this.ping();
            }, this.options.pingFrequency);

            const latency = await this.makeRequest();

            console.log(latency);

            const statusObj = {
                type: 'cellular',
                saveData: false
            };

            let additionalProps = null;

            if (latency <= 1200) {
                additionalProps = {
                    effectiveType: '4g',
                    rtt: 300,
                    downlink: 1.7
                };
            } else if (latency <= 2000) {
                additionalProps = {
                    effectiveType: '3g',
                    rtt: 500,
                    downlink: 0.5
                };
            } else if (latency <= 3000) {
                additionalProps = {
                    effectiveType: '2g',
                    rtt: 1500,
                    downlink: 0.4
                };
            } else if (latency <= this.options.pingMaxTimeout) {
                additionalProps = {
                    effectiveType: 'slow-2g',
                    rtt: 3000,
                    downlink: 0.2
                };
            } else {
                additionalProps = {
                    effectiveType: '4g',
                    rtt: 300,
                    downlink: 1.7,
                    type: 'none'
                };
            }

            const currentStatus = Object.assign(statusObj, additionalProps);

            if (this.prevStatus.effectiveType) {
                if (
                    this.prevStatus.effectiveType !== currentStatus.effectiveType ||
                    this.prevStatus.type !== currentStatus.type
                ) {
                    this.onChangeExecCbs(currentStatus);
                }
            } else {
                if (this.events.onInit) {
                    this.events.onInit(currentStatus);
                }
            }

            this.prevStatus = currentStatus;
        }

        makeRequest() {
            return new Promise(resolve => {
                const xhr = new XMLHttpRequest();

                const abortTimeout = setTimeout(() => {
                    xhr.abort();
                    console.warn('network information api polyfill: max ping timeout exceed');
                    resolve(this.options.pingMaxTimeout + 1);
                }, this.options.pingMaxTimeout);

                let url = this.options.pingUrl;
                url += url.indexOf('?') !== -1 ? `&` : '?';
                url += `v${Math.random()}=${Math.random()}`;

                xhr.open('GET', url, true);
                xhr.send();
                
                const time = new Date();
                xhr.onreadystatechange = () => {
                    if (xhr.readyState !== 4) {
                        return;
                    }

                    clearTimeout(abortTimeout);

                    if (xhr.status >= 200 && xhr.status <= 599) {
                        const latency = new Date() - time;
                        resolve(latency);
                    } else {
                        console.warn(`network information api polyfill: trouble with network. status: ${
                            xhr.status
                            }`);
                        resolve(this.options.pingMaxTimeout + 1);
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
