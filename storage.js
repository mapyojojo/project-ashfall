/* Keep v1 progress intact; preferences use a separate key. Storage may be unavailable. */
(() => {
  'use strict';
  const META_KEY = 'ashfall.v1', LANGUAGE_KEY = 'ashfall.language';
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  function loadMeta() {
    const meta = { marks: 0, best: 0, wins: 0, runs: 0, relic: 0 };
    try { Object.assign(meta, JSON.parse(read(META_KEY)) || {}); } catch {}
    return meta;
  }
  globalThis.AshfallStorage = { loadMeta, saveMeta: meta => write(META_KEY, JSON.stringify(meta)),
    loadLanguage: () => read(LANGUAGE_KEY), saveLanguage: language => write(LANGUAGE_KEY, language) };
})();
