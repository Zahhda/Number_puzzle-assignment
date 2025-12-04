// Polyfill for setImmediate - must run before any React Native code
// This fixes the "Property 'setImmediate' doesn't exist" error in Expo SDK 52

(function() {
  'use strict';
  
  // Define setImmediate if it doesn't exist
  if (typeof global.setImmediate === 'undefined') {
    global.setImmediate = function setImmediate(callback, ...args) {
      if (typeof callback !== 'function') {
        throw new TypeError('setImmediate must be called with a function');
      }
      return setTimeout(function() {
        callback.apply(null, args);
      }, 0);
    };
  }

  // Define clearImmediate if it doesn't exist
  if (typeof global.clearImmediate === 'undefined') {
    global.clearImmediate = function clearImmediate(id) {
      return clearTimeout(id);
    };
  }

  // Also ensure it's available on window for web compatibility
  if (typeof window !== 'undefined') {
    if (typeof window.setImmediate === 'undefined') {
      window.setImmediate = global.setImmediate;
    }
    if (typeof window.clearImmediate === 'undefined') {
      window.clearImmediate = global.clearImmediate;
    }
  }

  // Ensure it's available on self for worker contexts
  if (typeof self !== 'undefined') {
    if (typeof self.setImmediate === 'undefined') {
      self.setImmediate = global.setImmediate;
    }
    if (typeof self.clearImmediate === 'undefined') {
      self.clearImmediate = global.clearImmediate;
    }
  }
})();

