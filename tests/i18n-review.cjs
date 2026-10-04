// Rebuild the review artifact from the dictionaries; no duplicate translation source.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),sandbox={};
for(const file of ['ja','en'])vm.runInNewContext(fs.readFileSync(path.join(root,'i18n',file+'.js'),'utf8'),sandbox);
const {ja,en}=sandbox.AshfallLocales;
const cell=value=>String(value).replaceAll('|','\\|').replaceAll('\n','<br>');
const rows=Object.keys(ja).map(key=>`| \`${key}\` | ${cell(ja[key])} | ${cell(en[key])} |`);
const preamble=['# v0.8 全翻訳一覧','',rows.length+'組。正本は `i18n/ja.js` / `i18n/en.js`。`npm run i18n:review` で再生成する。','','キーと補間名は両言語で一致させる。HTMLの太字・改行は辞書の管理された固定表示。条件・性能・数値はv0.7.1を維持する。','','| Key | 日本語 | English |','| --- | --- | --- |'];
fs.writeFileSync(path.join(root,'docs/V0.8-I18N-REVIEW.md'),[...preamble,...rows,''].join('\n'));
console.log(`Wrote ${rows.length} translation pairs.`);
