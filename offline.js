const DEFAULT_OPTIONS = {
    ping: true,
    pingFailTimeout: 800,
    pingFrequency: 4000,
    pingUrl: '/games/connection-test',
    eventsBeforeChange: 2
};

const EVENTS = {
    online: 'online',
    offline: 'offline'
};

export default class {
    constructor(options) {
        this._options = Object.assign({}, DEFAULT_OPTIONS, options);

        if (this._options.pingFrequency - this._options.pingFailTimeout < 300) {
            throw new Error('Too little difference between pingFrequency and pingFailTimeout.' +
                'Difference must be more than 300ms.');
        }

        this._online = navigator.onLine;
        this._eventsCount = 0;

        this._events = {
            [EVENTS.offline]: () => {},
            [EVENTS.online]: () => {}
        };

        this._bindEvents();
    }

    on(event, func) {
        this._events[event] = func;

        return this;
    }
    // eslint-disable-next-line complexity
    setOption(option, value) {
        if (typeof DEFAULT_OPTIONS[option] === 'undefined') {
            throw new Error(`offline.js: Invalid option ${option}`);
        }

        this._options[option] = value;

        if (option === 'ping') {
            if (value === true && this._options.ping === false) {
                this._addNavigatorListeners();
            } else if (value === false && this._options.ping === true) {
                this._removeNavigatorListeners();
            }
        }
    }

    triggerStatusEvent() {
        const event = this._online === true ? EVENTS.online : EVENTS.offline;

        this._events[event]();

        return this;
    }

    destroy() {
        this._removeNavigatorListeners();
        this._destroyed = true;
    }

    _bindEvents() {
        if (this._options.ping === true) {
            this._startPinging();
        } else {
            this._addNavigatorListeners();
        }
    }

    _addNavigatorListeners() {
        window.addEventListener('online', this._onNavigatorOnline);
        window.addEventListener('offline', this._onNavigatorOffline);
    }

    _removeNavigatorListeners() {
        window.removeEventListener('online', this._onNavigatorOnline);
        window.removeEventListener('offline', this._onNavigatorOffline);
    }

    _onNavigatorOnline = () => {
        this._makeOnline();
    };

    _onNavigatorOffline =() => {
        this._makeOffline();
    };

    _makeOffline() {
        if (this._online === false || this._destroyed === true) {
            this._eventsCount = 0;

            return;
        } else if (this._options.eventsBeforeChange - this._eventsCount > 1) {
            this._eventsCount += 1;

            return;
        }

        this._eventsCount = 0;
        this._online = false;
        this._events[EVENTS.offline]();
    }

    _makeOnline() {
        if (this._online === true || this._destroyed === true) {
            this._eventsCount = 0;

            return;
        } else if (this._options.eventsBeforeChange - this._eventsCount > 1) {
            this._eventsCount += 1;

            return;
        }

        this._eventsCount = 0;
        this._online = true;
        this._events[EVENTS.online]();
    }

    _startPinging() {
        if (this._destroyed === true) {
            return;
        }

        setTimeout(() => {
            if (this._options.ping === true) {
                this._startPinging();
            }
        }, this._options.pingFrequency);

        this._makeRequest()
            .then(() => {
                this._makeOnline();
            })
            .catch(() => {
                this._makeOffline();
            });
    }

    _makeRequest() {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            const abortTimeout = setTimeout(() => {
                xhr.abort();

                reject();
            }, this._options.pingFailTimeout);

            xhr.open('GET', this._options.pingUrl, true);
            xhr.send();
            xhr.onreadystatechange = () => {
                if (xhr.readyState !== 4) {
                    return;
                }

                clearTimeout(abortTimeout);

                if (xhr.status > 200 && xhr.status < 299) {
                    resolve();
                } else {
                    reject();
                }
            };
        });
    }
}

