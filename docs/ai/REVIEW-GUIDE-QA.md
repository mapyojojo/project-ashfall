# QA / Engineering Review Guide

担当と権限は [ROLES.md](ROLES.md)。[現在のスプリント](../../plans/current-sprint.md) のScope・Constraints・Done条件と対象差分を基準に、技術品質と回帰を評価する。不具合起因でないバランス変更は提案しない。問題がなければ「重大な懸念なし」と報告する。

## 入力と観点

基準コミット、変更ファイル、期待する挙動、実装差分、テスト結果、既知の制限を読む。実行したテストと古い検証記録を区別し、読めない・実行していない範囲を未検証として残す。

- **不具合・回帰・edge case**：状態遷移、灰なし・壁際・大きいdt、追加攻撃の新規灰と持ち越し、範囲・多重処理、上限など、変更が触れる境界。
- **save/load**：既存meta・未知のフィールド・装備番号・保存拒否時の起動。現在のv0.8系には途中ランの保存・再開はない。
- **ブラウザ・起動**：HTTPと直接file起動、Canvas / Web Audio、全画面、ポーズ、blur / visibility、画面サイズ。未確認のブラウザを確認済みと書かない。
- **i18n**：日英キーと補間、切替と保存、レイアウト、カード再抽選・結果報酬の二重加算など状態への副作用。
- **入力**：WASD・矢印・照準・クリック・SPACE、repeat、長押し、全画面退出、ポーズと再開。
- **テスト・リリース**：検証の不足、基準比較、実行時依存、配布の同梱・欠落・置き換えと旧成果物の保持。

数値が承認された仕様と違う場合は不具合として扱う。仕様どおりの選択肢が強すぎる・弱すぎるという評価やGame feelはGame Designへ渡す。

## 変更に応じた検証候補

コマンドの正本は [package.json](../../package.json)、準備と制限は [TEST-REPORT.md](../../TEST-REPORT.md) / [v0.8検証文書](../V0.8-I18N-VALIDATION.md)。すべてを毎回実行する要求ではない。

| 影響する変更 | 検証候補 |
| --- | --- |
| ゲーム実行ファイル全般 | `npm test`、関係する既存テストと必要な実ブラウザ確認 |
| 戦闘・バランス・抽選 | 関連する`tests/`の検証、`npm run test:balance`と通し結果の比較 |
| i18n・保存・表示と状態の分離 | `npm run test:i18n`、`npm run test:i18n:browser` |
| 入力・UI・全画面・ポーズ | `npm run test:public`、`npm run test:browser`、関係するVM検証 |
| 演出・音・前線の命中 | `npm run test:feedback`、関係する前線・連鎖・地面攻撃の検証 |
| itch.io配布スクリプト | `powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\build-itch.ps1` と展開後の直接起動 |
| 開発文書のみ | リンク・文書間の整合・テンプレート利用・意図しないコード差分。フルゲームテストは不要 |

既存parity検証には過去版への一致を要求するものがある。意図的な挙動変更では、その一致を機械的なDone条件にせず、期待値・基準の変更理由と保護する挙動を記録する。失敗を隠すためにゲーム数値やテストを合わせない。履歴がなく比較を省略した場合、PASSと区別する。

## 出力テンプレート

```markdown
Reviewer: <担当・会話。独立レビューか自己確認か>
Target: <スプリント名、基準コミット、対象差分>
Evidence: <読んだ差分と、実行したコマンド・結果・環境>

Verdict: 重大な懸念なし / 要修正 / 判断保留
Regression risks: <根拠と影響範囲。なければ「なし」>
Bugs found: <再現手順、期待と実際、重要度。なければ「なし」>
Untested areas: <未実施・実行不能・SKIPと理由。なければ「なし」>
Browser/save/i18n concerns: <該当範囲と環境。対象外は理由を記載>
Required tests: <不足を埋める最小の検証。追加不要なら「なし」>
Release recommendation: <技術面で進行可 / 修正後に再確認 / 判断保留>
```

指摘は再現可能な事実と未検証のリスクを分け、Scope外の改善を必須修正へ混ぜない。重大な懸念なしでも未検証環境を列挙できる。Release recommendationは技術面の提案であり、merge・push・公開の承認ではない。

## 最小の依頼例

> QA / Engineering Reviewerとして、plans/current-sprint.mdと渡した差分・検証結果をこのガイドでレビューしてください。不具合・回帰・未検証範囲を確認し、バランスの好みはGame Designへ分けてください。
