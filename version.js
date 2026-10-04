/* Single release version, shared by offline startup and Node verification. */
(() => {
  'use strict';
  const release = Object.freeze({ version: '0.8.0' });
  globalThis.AshfallRelease = release;
  if (typeof module === 'object' && module.exports) module.exports = release;
})();
