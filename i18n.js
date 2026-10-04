/* Classic scripts support file:// startup without fetch, imports or a server. */
(() => {
  'use strict';
  const dictionaries = globalThis.AshfallLocales, storage = globalThis.AshfallStorage;
  const valid = language => language === 'ja' || language === 'en';
  const saved = storage.loadLanguage();
  let language = valid(saved) ? saved : /^ja(?:-|$)/i.test(globalThis.navigator?.language || 'ja') ? 'ja' : 'en';
  const listeners = new Set();
  function t(key, values = {}) {
    const template = dictionaries[language][key] ?? dictionaries.ja[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
  }
  function setLanguage(next) {
    if (!valid(next)) return false;
    storage.saveLanguage(next);
    if (next !== language) { language = next; for (const listener of listeners) listener(language); }
    return true;
  }
  globalThis.AshfallI18n = { t, setLanguage, getLanguage: () => language,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
})();
