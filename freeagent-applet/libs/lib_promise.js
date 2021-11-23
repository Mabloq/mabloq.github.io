let iframeQueryParams = getIframeQueryParams();

var FAAppletClient = (function () {
    function FAAppletClient({ appletId } = {}) {
        this.registeredEvents = {};
        this.appletId = appletId;
        this.params = {};
        this.eventKey = `fa_applet[${appletId}]`;
        this.queryCallbacks = {};

        const urlParams = new URLSearchParams(window.location.search);
        for (const [key, value] of urlParams.entries()) {
            this.params[key] = value;
        }

        this._postMessageTop = (eventName, payload = {}, callback) => {
            const requestId = btoa(Date.now() * Math.random()).slice(9);
            if (typeof callback === "function") {
                this.queryCallbacks[requestId] = callback;
            }
            const type = `${this.eventKey}.${eventName}`;
            window.top.postMessage({ type, payload, requestId }, "*");
        };

        function _eventHandlerMatches(eventName, eventType) {
            const splitType = eventType.split(".")[1];
            return splitType === eventName;
        }

        function _parentListener(eventKey, event, queryCallbacks) {
            const { data } = event;
            if (!data) {
                return console.log("Wrong type of event sent");
            }
            switch (data.type) {
                case `${eventKey}.getTeamMembers_response`:
                    queryCallbacks[data.requestId](data.response);
                    break;
                case `${eventKey}.createEntity_response`:
                    queryCallbacks[data.requestId](data.response);
                    break;
                case `${eventKey}.updateEntity_response`:
                    queryCallbacks[data.requestId](data.response);
                    break;
                case `${eventKey}.upsertEntity_response`:
                    queryCallbacks[data.requestId](data.response);
                    break;
                case `${eventKey}.upsertCompositeEntity_response`:
                    queryCallbacks[data.requestId](data.response);
                    break;
                case `${eventKey}.listEntityValues_response`:
                    queryCallbacks[data.requestId](data.response);
                    break;
                case `${eventKey}.globalSearch_response`:
                    queryCallbacks[data.requestId](data.response);
                    break;
                case `${eventKey}.getUserInfo_response`:
                    queryCallbacks[data.requestId](data.response);
                    break;
                default:
                    break;
            }
        }

        const _eventHandler = (event) => {
            if (event.origin && !event.origin.includes('freeagent.network')) {
                return;
            }

            const data = event.data;
            if (!data) {
                return console.error("Wrong type of event sent");
            }
            Object.keys(this.registeredEvents).map((eventName) => {
                const eventHandler = this.registeredEvents[eventName];
                if (_eventHandlerMatches(eventName, data.type)) {
                    return eventHandler(data.payload);
                }
            });
            _parentListener(`fa_applet[${appletId}]`, event, this.queryCallbacks);
        };

        window.addEventListener("message", _eventHandler);

        if (appletId) {
            this._postMessageTop("loaded", { appletId });
        }
    }

    FAAppletClient.prototype.getTeamMembers = function (payload, callback) {
        return new Promise((resolve) => {
            this._postMessageTop("getTeamMembers", payload, resolve);
        });
    };

    FAAppletClient.prototype.createEntity = function (payload, callback) {
        return new Promise((resolve) => {
            this._postMessageTop("createEntity", payload, resolve);
        });
    };

    FAAppletClient.prototype.updateEntity = function (payload, callback) {
        return new Promise((resolve) => {
            this._postMessageTop("updateEntity", payload, resolve);
        });
    };

    FAAppletClient.prototype.upsertEntity = function (payload, callback) {
        return new Promise((resolve) => {
            this._postMessageTop("upsertEntity", payload, resolve);
        });
    };

    FAAppletClient.prototype.upsertCompositeEntity = function (
        payload,
        callback
    ) {
        return new Promise((resolve) => {
            this._postMessageTop("upsertCompositeEntity", payload, resolve);
        });
    };

    FAAppletClient.prototype.listEntityValues = function (payload, callback) {
        return new Promise((resolve) => {
            this._postMessageTop("listEntityValues", payload, resolve);
        });
    };

    FAAppletClient.prototype.getUserInfo = function (payload, callback) {
        return new Promise((resolve) => {
            this._postMessageTop("getUserInfo", payload, resolve);
        });
    };

    FAAppletClient.prototype.open = function () {
        this._postMessageTop("open");
    };

    FAAppletClient.prototype.close = function () {
        this._postMessageTop("close");
    };

    FAAppletClient.prototype.showSuccessMessage = function (message) {
        this._postMessageTop("showSuccessMessage", { message });
    };

    FAAppletClient.prototype.showErrorMessage = function (message) {
        this._postMessageTop("showErrorMessage", { message });
    };

    FAAppletClient.prototype.globalSearch = function (search, callback) {
        return new Promise((resolve) => {
            this._postMessageTop("globalSearch", { search }, resolve);
        });
    };

    FAAppletClient.prototype.logActivity = function (payload, callback) {
        return new Promise((resolve) => {
            this._postMessageTop("logActivity", payload, resolve);
        });
    };

    FAAppletClient.prototype.navigateTo = function (url) {
        this._postMessageTop("navigateTo", { url });
    };

    FAAppletClient.prototype.on = function (eventName, callback) {
        this.registeredEvents[eventName] = callback;
    };

    FAAppletClient.prototype.showModal = function (modalName, modalProps) {
        this._postMessageTop("showModal", { modalName, modalProps });
    };

    FAAppletClient.prototype.hideModal = function (modalName) {
        this._postMessageTop("hideModal", { modalName });
    };

    return FAAppletClient;
})();

function getIframeQueryParams() {
    let qs = document.location.search;
    qs = qs.replace(/\?/g, "");
    qs = qs.split("+").join(" ");

    var params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;

    while ((tokens = re.exec(qs))) {
        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }

    return params;
}