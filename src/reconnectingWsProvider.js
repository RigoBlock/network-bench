// import { errors } from 'web3-core-helpers'
// import ReconnectingWebSocket from 'reconnecting-websocket/dist/reconnecting-websocket-amd.js'
const ReconnectingWebSocket = require('reconnecting-websocket')
const errors = require('web3-core-helpers')

let Ws
let _btoa = null
let parseURL = null
if (typeof window !== 'undefined' && typeof window.WebSocket !== 'undefined') {
  Ws = function(url, protocols) {
    return new window.WebSocket(url, protocols)
  }
  _btoa = btoa
  parseURL = function(url) {
    return new URL(url)
  }
} else {
  Ws = require('websocket').w3cwebsocket
  _btoa = function(str) {
    return Buffer(str).toString('base64')
  }
  let url = require('url')
  if (url.URL) {
    // Use the new Node 6+ API for parsing URLs that supports username/password
    let newURL = url.URL
    parseURL = function(url) {
      return new newURL(url)
    }
  } else {
    // Web3 supports Node.js 5, so fall back to the legacy URL API if necessary
    parseURL = require('url').parse
  }
}
// Default connection ws://localhost:8546

let WebsocketProvider = function WebsocketProvider(url, options) {
  let _this = this
  this.responseCallbacks = {}
  this.notificationCallbacks = []

  options = options || {}
  this._customTimeout = options.timeout

  // The w3cwebsocket implementation does not support Basic Auth
  // username/password in the URL. So generate the basic auth header, and
  // pass through with any additional headers supplied in constructor
  let parsedURL = parseURL(url)
  let headers = options.headers || {}
  let protocol = options.protocol || undefined
  if (parsedURL.username && parsedURL.password) {
    headers.authorization =
      'Basic ' + _btoa(parsedURL.username + ':' + parsedURL.password)
  }

  // Allow a custom client configuration
  let clientConfig = options.clientConfig || undefined

  // When all node core implementations that do not have the
  // WHATWG compatible URL parser go out of service this line can be removed.
  if (parsedURL.auth) {
    headers.authorization = 'Basic ' + _btoa(parsedURL.auth)
  }

  let recWs = new ReconnectingWebSocket(url, '', { minReconnectionDelay: 1000 })

  this.connection = recWs

  this.addDefaultEvents()

  // LISTEN FOR CONNECTION RESPONSES
  this.connection.onmessage = function(e) {
    /*jshint maxcomplexity: 6 */
    let data = typeof e.data === 'string' ? e.data : ''

    _this._parseResponse(data).forEach(function(result) {
      let id = null

      // get the id which matches the returned id
      if (Array.isArray(result)) {
        result.forEach(function(load) {
          if (_this.responseCallbacks[load.id]) id = load.id
        })
      } else {
        id = result.id
      }

      // notification
      if (
        !id &&
        result &&
        result.method &&
        result.method.indexOf('_subscription') !== -1
      ) {
        _this.notificationCallbacks.forEach(function(callback) {
          if (typeof callback === 'function') callback(result)
        })

        // fire the callback
      } else if (_this.responseCallbacks[id]) {
        _this.responseCallbacks[id](null, result)
        delete _this.responseCallbacks[id]
      }
    })
  }

  // make property `connected` which will return the current connection status
  Object.defineProperty(this, 'connected', {
    get: function() {
      return (
        this.connection && this.connection.readyState === this.connection.OPEN
      )
    },
    enumerable: true
  })
}

/**
 Will add the error and end event to timeout existing calls

 @method addDefaultEvents
 */
WebsocketProvider.prototype.addDefaultEvents = function() {
  let _this = this

  this.connection.onerror = function() {
    _this._timeout()
  }

  this.connection.onclose = function() {
    _this._timeout()

    // reset all requests and callbacks
    _this.reset()
  }

  // this.connection.on('timeout', function(){
  //     _this._timeout();
  // });
}

/**
 Will parse the response and make an array out of it.

 @method _parseResponse
 @param {String} data
 */
WebsocketProvider.prototype._parseResponse = function(data) {
  let _this = this,
    returnValues = []

  // DE-CHUNKER
  let dechunkedData = data
    .replace(/\}[\n\r]?\{/g, '}|--|{') // }{
    .replace(/\}\][\n\r]?\[\{/g, '}]|--|[{') // }][{
    .replace(/\}[\n\r]?\[\{/g, '}|--|[{') // }[{
    .replace(/\}\][\n\r]?\{/g, '}]|--|{') // }]{
    .split('|--|')

  dechunkedData.forEach(function(data) {
    // prepend the last chunk
    if (_this.lastChunk) data = _this.lastChunk + data

    let result = null

    try {
      result = JSON.parse(data)
    } catch (e) {
      _this.lastChunk = data

      // start timeout to cancel all requests
      clearTimeout(_this.lastChunkTimeout)
      _this.lastChunkTimeout = setTimeout(function() {
        _this._timeout()
        throw errors.InvalidResponse(data)
      }, 1000 * 15)

      return
    }

    // cancel timeout and set chunk to null
    clearTimeout(_this.lastChunkTimeout)
    _this.lastChunk = null

    if (result) returnValues.push(result)
  })

  return returnValues
}

/**
 Adds a callback to the responseCallbacks object,
 which will be called if a response matching the response Id will arrive.

 @method _addResponseCallback
 */
WebsocketProvider.prototype._addResponseCallback = function(payload, callback) {
  let id = payload.id || payload[0].id
  let method = payload.method || payload[0].method

  this.responseCallbacks[id] = callback
  this.responseCallbacks[id].method = method

  let _this = this

  // schedule triggering the error response if a custom timeout is set
  if (this._customTimeout) {
    setTimeout(function() {
      if (_this.responseCallbacks[id]) {
        _this.responseCallbacks[id](
          errors.ConnectionTimeout(_this._customTimeout)
        )
        delete _this.responseCallbacks[id]
      }
    }, this._customTimeout)
  }
}

/**
 Timeout all requests when the end/error event is fired

 @method _timeout
 */
WebsocketProvider.prototype._timeout = function() {
  for (let key in this.responseCallbacks) {
    if (this.responseCallbacks.hasOwnProperty(key)) {
      this.responseCallbacks[key](errors.InvalidConnection('on WS'))
      delete this.responseCallbacks[key]
    }
  }
}

WebsocketProvider.prototype.send = function(payload, callback) {
  this.connection.send(JSON.stringify(payload))
  this._addResponseCallback(payload, callback)
}

/**
 Subscribes to provider events.provider

 @method on
 @param {String} type    'notifcation', 'connect', 'error', 'end' or 'data'
 @param {Function} callback   the callback to call
 */
WebsocketProvider.prototype.on = function(type, callback) {
  if (typeof callback !== 'function')
    throw new Error('The second parameter callback must be a function.')

  switch (type) {
    case 'data':
      this.notificationCallbacks.push(callback)
      break

    case 'connect':
      this.connection.onopen = callback
      break

    case 'end':
      this.connection.onclose = callback
      break

    case 'error':
      this.connection.onerror = callback
      break

    // default:
    //   this.connection.on(type, callback)
    //   break
  }
}

// TODO add once

/**
 Removes event listener

 @method removeListener
 @param {String} type    'notifcation', 'connect', 'error', 'end' or 'data'
 @param {Function} callback   the callback to call
 */
WebsocketProvider.prototype.removeListener = function(type, callback) {
  let _this = this

  switch (type) {
    case 'data':
      this.notificationCallbacks.forEach(function(cb, index) {
        if (cb === callback) _this.notificationCallbacks.splice(index, 1)
      })
      break

    // TODO remvoving connect missing

    // default:
    //     this.connection.removeListener(type, callback);
    //     break;
  }
}

/**
 Removes all event listeners

 @method removeAllListeners
 @param {String} type    'notifcation', 'connect', 'error', 'end' or 'data'
 */
WebsocketProvider.prototype.removeAllListeners = function(type) {
  switch (type) {
    case 'data':
      this.notificationCallbacks = []
      break

    // TODO remvoving connect properly missing

    case 'connect':
      this.connection.onopen = null
      break

    case 'end':
      this.connection.onclose = null
      break

    case 'error':
      this.connection.onerror = null
      break

    default:
      // this.connection.removeAllListeners(type)
      break
  }
}

/**
 Resets the providers, clears all callbacks

 @method reset
 */
WebsocketProvider.prototype.reset = function() {
  this._timeout()
  this.notificationCallbacks = []

  // this.connection.removeAllListeners('error')
  // this.connection.removeAllListeners('end')
  // this.connection.removeAllListeners('timeout')

  this.addDefaultEvents()
}

WebsocketProvider.prototype.disconnect = function() {
  if (this.connection) {
    this.connection.close()
  }
}

module.exports = WebsocketProvider

// export default WebsocketProvider
