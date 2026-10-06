# Sprint 3 — Developer Debug UI

## Status

review

Implementer実装と実行可能な自己検証を完了。Producerの追加指示により、隔離checkoutの実装commit `703d2981455a953ffa443eeb4a4eb342a6958124` を元リポジトリ `D:/develop/project-ashfall` の専用branch `codex/developer-debug-ui` へ反映した。現在の実装と起動手順はこのリポジトリのコード・READMEを参照する。実ブラウザ確認・独立QA・Producer Playtestは未完了。mainへは統合していない。

2026-10-06（Asia/Tokyo）、Producerが次スプリントを開発者向けデバッグUIとし、任意のアップグレード付与・時間送り・ボス呼び出し・敵スポーン・無敵化の5機能を指定。時間送りは経過時刻だけを進める方式と回答した。Directorが操作・保存・検証条件を整理し、Implementerへ引き継ぐScopeを本計画に確定した。readyは下記Scopeの実装承認として扱う。今回のDirectorへの依頼は計画記載までで、実装は未着手。

## Goal

ブラウザ版で確認したいビルド・経過時刻・敵との戦闘を短時間で用意できる開発者向けデバッグUIを作り、QAと調整のための実プレイ準備を楽にする。通常プレイの灰縫い・成長・保存・入力を維持し、デバッグによる観察と通常ランの評価を区別できるようにする。

## Context

- Producer feedback（2026-10-06）：ポータブル版は一旦保留し、次はデバッグUI。候補として任意のアップグレード付与、時間送り、ボス呼び出し、敵スポーン、無敵化が挙げられ、これを本スプリントの5機能として整理する。
- Baseline：Project Ashfall v0.8.0、現在のmain `fda91afc6024e3bad677a5874ded6200402530c9`。計画開始時は追跡ファイルclean、登録worktreeはこの1件のみ。前回報告からmainへ統合済みであることを確認したが、本会話ではmerge・pushしていない。
- Sprint 2終了記録：`git show 4b290b95095c6db7ca2328e205368f7244ce411b:plans/current-sprint.md`。Electron／Tauri PoCの成果・独立QA・Producer実プレイと進行保留判断はこの履歴から参照する。currentは今回の指示でSprint 3へ置き換える。
- Existing mechanisms：[game.js](../game.js)の明示的なtestモードにはアップグレード付与・敵生成・状態取得・step等があり、[upgrades.js](../upgrades.js)に安定ID・上限・前提／排他条件がある。これらを活用できるか調査し、ゲームロジックの別コピーは作らない。既存testモードの動作・保存副作用はデバッグUIの仕様として流用しない。
- References：[AGENTS](../AGENTS.md)、[PRODUCT](../docs/ai/PRODUCT.md)、[WORKFLOW](../docs/ai/WORKFLOW.md)、[README](../README.md)、[package.json](../package.json)、[input.js](../input.js)、[ui.js](../ui.js)、[storage.js](../storage.js)、[TEST-REPORT](../TEST-REPORT.md)、[i18n検証](../docs/V0.8-I18N-VALIDATION.md)。必要な範囲だけ参照する。

## Scope

Producerが指定した5機能をDirectorが以下の動作として具体化した。機能追加はこの5機能と、その利用に必要なUI・状態表示・保存分離に限る。

- 明示的な開発用起動で有効になるデバッグUIをブラウザ版へ追加する。HTTP／直接fileのURLに `?debug` を付ける方式とする。通常起動ではパネル・入口・操作を無効にし、有効時はタイトル・ラン・結果でデバッグ中と分かる表示を出す。既存 `?test` の自動検証用公開APIと役割を区別する。
- パネルは開発用起動中のランで開閉でき、開いたら戦闘をポーズする。閉じた後はポーズを維持し、既存の再開操作から戻る。入力欄・選択・ボタン操作を移動・灰縫い・カード選択等へ伝播させない。ランなし・結果・アップグレード選択等の不適切な状態では変更操作を無効にし、理由を表示する。

| 機能 | 動作と境界 |
| --- | --- |
| 任意のアップグレード付与 | 現行の全アップグレードから選んで1ランクずつ付与し、現在ランク・効果・HUD／ビルド表示へ反映する。通常の効果・上限・前提・排他条件を守り、付与できない場合は理由を表示する。必要な前提は同じUIから順に付与できる。XP・レベル・保留カードを勝手に消費せず、実際の取得数との整合を保つ。解除・ランク戻し・上限突破・前提無視は含めない |
| 時間送り | 経過時刻だけを指定した正の秒数だけ進め、HUDへ即反映する。飛ばした期間の移動・被弾・射撃・XP獲得・回復・クールダウンをシミュレートしない。戻し操作は作らず、負値・非数・不正値を拒否し、既存の最終ボス出現時刻を上限とする。再開後は現在時刻に対する通常の難易度・出現判定を使い、最終時刻へ進めた場合も通常の最終ボス移行を通す。中間のwaveを全部再演したり、時刻変更だけで勝利・報酬を確定したりしない。戦闘全体の早送りとは表示・説明を分ける |
| ボス呼び出し | 現行の守護者／最終ボスを選んで呼び出す。新しい敵は作らず、既存のHP・攻撃・報酬／終了判定を利用する。生存中の守護者／ボスがいる場合は重複呼出しを拒否する。手動呼出しと時間経過による出現が重ならず、ボスHUD・最終ボスフラグ・撃破後遷移が整合するようにする。呼出しだけで経過時刻を変えない |
| 敵スポーン | ボス類を除く現行敵種と生成数を選んで追加する。既存の生成ロジックと現在時刻に応じた能力を使い、プレイヤー周辺の確認しやすい位置に、アリーナ内で生成する。敵種・個数を検証し、無制限生成や一括操作によるUI停止を防ぐ上限を設ける。具体的な個数上限と配置はImplementerが根拠とともに記録する |
| 無敵化 | ON／OFFを切り替え、ON中は敵接触・敵弾・地面攻撃等によるHP減少を防ぐ。プレイヤーの通常の移動・射撃・灰縫い・衝突・回復は維持する。既存の短時間無敵とは別に管理し、OFFで通常の被弾へ戻る。新ラン・リトライではOFFへ戻し、状態を常時確認できるようにする |

- デバッグ起動中はmetaをセッション内で扱い、通常の成績・灰貨・解放・装備等へ書き戻さない。開始・結果・リトライ・タイトル復帰・装備選択／補正を含む全meta書込経路を確認する。既存meta・未知フィールド・relic番号と保存拒否時の起動を保ち、独立した言語設定は通常の切替仕様を維持する。デバッグ設定を保存したり、デバッグランを通常ランへ昇格させたりしない。
- デバッグ操作・理由・状態表示を日本語／英語で揃える。現在時刻・ランク・無敵状態等、操作に必要な情報だけを表示する。機能実装と起動手順・制限のREADME記載を同じ範囲に含める。

## Non-goals

- 通常ランの灰縫い、バランス、敵能力・出現スケジュール、アップグレード効果・抽選・前提／排他、レリック、新コンテンツの変更。
- FPS／フレーム時間グラフ、性能プロファイラ、ビルドプリセット・共有／入出力、レリック自由付与、ラン保存／復元、seed固定／リプレイ、時間戻し、全戦闘の高速シミュレーション、上限突破チートの追加。
- 通常プレイ向け設定としてのチート公開、恒久解放の操作、保存形式・保存キー・upgrade ID／relic番号の変更。
- Electron／Tauriのコード・配布物への追従、カーソル／カクつき修正、ポータブル版の追加検証・正式採用。前Sprintの未解決事項を本Sprintの必須修正へ混ぜない。
- 新しい依存・起動基盤、開発toolchain、署名・installer・自動更新・公開・リリース版番号変更。

## Constraints

- [AGENTS.md](../AGENTS.md)を適用する。ブラウザ版を正本とし、直接file／HTTP起動・Canvas／Web Audio・日英・既存入力・保存互換を維持する。
- デバッグUIを閉じる／非表示にすることだけを通常モードの保護としない。起動条件・操作経路・保存経路でも無効化／分離を確認する。通常起動でデバッグ状態・UI更新・常時イベント処理等が戦闘を変えない設計にする。
- ゲーム数値・カタログ・戦闘ロジックをUI側へ複製しない。責務を分け、既存test APIと自動検証を壊さない。分離のための変更は必要最小限にし、大きなリファクタリングを混ぜない。
- UIの開閉、全画面、blur／visibility、言語切替で時間送り・付与・生成が重複しない。パネル入力中のキー／クリックでゲームを動かさず、再開後に入力が残らないようにする。
- Git：実装時はmain基準 `fda91afc6024e3bad677a5874ded6200402530c9`から `codex/developer-debug-ui` 等の専用branchを使い、今回の計画差分を保持する。開始時にbranch・HEAD・worktreeと基準差分を再確認し、新しい既存変更を上書きしない。
- Implementerは承認済みScopeの実装・検証完了後、明示的に禁止されていない限りレビュー用コミットを自律的に作成してよい。生成物・Git除外対象・無関係な変更は含めない。mainへのmerge・push・tag・外部公開は別途Producerの明示指示が必要。
- ブラウザ検証は専用profile／保存を使い、既存データ・ZIP・証拠を上書きしない。生成物は既存ignoreに従う。未実施レビューや人間確認をPASSにしない。

## Deliverables

- 本 `plans/current-sprint.md`：計画・進捗・検証・レビュー・Producer判断の正本。
- ブラウザ版のデバッグUIと必要最小限のゲーム／入力／保存連携、日英表示。ファイルの配置・分割はImplementerが調査して決める。
- [README](../README.md)の開発用起動・5操作・保存と通常モードの違い・時間送りの制限。
- 状態・保存分離・入力・5機能の境界を確かめる必要なテストと検証証拠。証拠はwork等のGit対象外へ置き、再利用可能な検証手順のみGit管理する。

## Definition of Done

- [ ] HTTP／直接fileの明示的デバッグ起動でUIを使え、通常起動では入口・操作・副作用が無効。デバッグ中であることがタイトル・ラン・結果から判別できる。
- [ ] 5機能が上記Scopeどおりに動き、上限・前提／排他・不正入力・ボス重複・無敵ON／OFF／リトライ・不適切な状態を扱える。
- [ ] 経過時刻だけの時間送りで現在時刻・出現判定・ボス状態が整合し、閾値を跨ぐ操作でもボスが重複しない。飛ばした期間を通常プレイの結果や精密シミュレーションと扱わない。
- [ ] デバッグ起動の開始・勝利／敗北・リトライ・タイトル復帰・装備関連操作を通して通常metaの保存bytesが変わらない。再読込後の通常ランへデバッグ状態を持ち越さず、保存拒否・未知フィールド・relic番号・独立言語を維持する。
- [ ] パネルの入力・開閉・ポーズ／再開・全画面／退出・blur／visibilityで誤操作、入力持越し、重複処理がない。日英切替で操作や抽選を再実行せず、小画面でも必要な項目が使える。
- [ ] 通常モードの灰縫い・成長・結果・保存・入力・日英の回帰がなく、`npm test`と関連検証の結果／制限を記録した。
- [ ] 必要なブラウザ確認（通常／debug、HTTP／file、日英、入力・保存）、`npm run test:public`、`npm run test:i18n:browser`、変更が配布へ影響する場合の `tests/build-itch.ps1` と展開後直接起動を実行。実行不能は理由と影響を記録した。
- [ ] READMEの手順でProducerが開発用起動し、任意ビルド・敵／ボス・経過時刻・無敵を短時間で設定して戦闘確認できる。
- [ ] Required ReviewsとProducer Playtestの必要な工程が完了、または不要理由を記録済み。実装自己確認と独立QAを区別した。
- [ ] 変更ファイル・実行環境・検証結果・未確認事項・branch／commit／worktree状態を報告した。

## Required Reviews

- Game Design Review：現Scopeでは原則不要。通常の戦闘・バランス・成長仕様を変更せず、開発用操作だけを追加するため。デバッグ結果を通常ランの面白さ・強弱の評価と混同しない。通常プレイの理解・操作感に変更が必要になった場合は、Scope拡大前に対象を限定して必要性を判断する。
- QA / Engineering Review：必要、実装後に別会話・コンテキストで実施。基準コミット・差分・本計画・検証証拠を手動で渡し、[QA Guide](../docs/ai/REVIEW-GUIDE-QA.md)に沿って有効化条件・保存分離・状態遷移・入力・時間／ボス・上限・日英と通常モードの回帰を確認する。前SprintのQAや実装担当の自己確認で代替しない。

## Producer Playtest

- Required：必要、実装後。開発用UIが実際のQA／調整準備を楽にするか、通常プレイの操作を妨げないかを人間が確認する。
- Scenarios：通常起動でUIが無効なことを確認後、明示的なdebug起動でラン開始。UIを開いて拡散／濃縮／連続の任意ビルドを付与し、敵生成・無敵切替・再開で灰縫いを試す。守護者／最終ボスを呼び出し、重複拒否と撃破・終了を確認。経過時刻を進めて後半の出現を確認。日英・全画面／退出・ポーズ・リトライ・再読込を試し、通常の記録が保持されることを確認する。
- Observations：目的の場面を作るまでの手数、操作／無効理由の分かりやすさ、現在のビルド・時刻・無敵状態、開閉と入力のストレス。デバッグ時に成立した強さや勝利を通常のバランス評価の証拠にしない。
- Result / Decision：未実施。Producerの実プレイ結果と採否をここへ記録する。

## Open Questions

- 現Scopeの実装を止める未決事項はなし。敵の生成数上限・配置とUIの具体的な構成・責務分割は、Scope内の実装方法としてImplementerが調査・記録する。前提無視・ランク戻し・戦闘全体の高速化等が必要になった場合は、理由と追加範囲をProducerへ戻す。
- ポータブル版の再開時期・方式・容量／環境要件は未決定。前Sprintの不具合・未検証事項はGit履歴の終了記録に保持し、本Sprintでは解決しない。

## Execution Results

- 計画作成（Director、2026-10-06）：AGENTS・Sprint 2終了記録・雛形・役割／工程・QA Guide・現行ゲームの生成／時間／保存／テストAPIを確認し、本計画を15セクションで作成。Sprint 2終了記録を `4b290b9` から参照できることを確認した。
- 計画開始状態：main、HEAD `fda91afc6024e3bad677a5874ded6200402530c9`、追跡ファイルclean、worktree登録追加なし。変更は本currentのみ。ゲームコード・既存検証記録・PoC・成果物は変更していない。
- 計画の確認：ローカルリンク15件、雛形15セクションと順序、ready／5機能／Non-goals／保存分離／レビューの整合、`git diff --check`はPASS。差分は本currentのみでコード変更なし。時間送りへのProducer回答をScopeとDecisionsへ反映した。文書のみのためゲームテストは再実行しない。今回の計画は未ステージ・未コミット、実装・自動検証・独立レビュー・人間確認は未着手。

- Implementer引き継ぎ（2026-10-06）：元.gitのread-only制限でbranch作成不可のため、`work/developer-debug-ui` に隔離cloneし、main基準 `fda91afc6024e3bad677a5874ded6200402530c9` と本計画を保持して実装。5機能、保存分離、日英、README、関連テストの17ファイルを `codex/developer-debug-ui` の `703d298` にコミット済み。隔離checkoutはclean、元mainのHEADとゲームコードは変更なし。merge／push／tag／公開なし。
- 自己検証：Node.js v22.23.1／Windows PowerShell。`npm test` 179項目（追加デバッグ10項目含む）、`tests/build-itch.ps1` 6項目、ローカルリンク33件、構文とdiff検査はPASS。通常の全ボス時刻閾値と将来乱数をmain基準に一致確認。敵追加は1回25体・生存合計100体、アリーナ内の自機周辺160〜230へ配置。
- 未確認：専用Edge起動が自動承認レビューで拒否（理由は `blocked by policy`）。専用CDPへ接続できず、`test:public`／`test:i18n:browser`／新規 `test:debug:browser` は `ECONNREFUSED 127.0.0.1:9223` で実行不能。HTTP／fileの実起動、実入力・Canvas／Web Audio・native fullscreen／物理Esc、日英／小画面レイアウト、展開ZIP起動は未検証。独立QAとProducer実プレイは未実施。
- 詳細な変更ファイル・設計根拠・検証制限と再実行方法は [実装checkoutのスプリント記録](../work/developer-debug-ui/plans/current-sprint.md#execution-results)、起動と5操作は [実装checkoutのREADME](../work/developer-debug-ui/README.md#開発者向けデバッグ--developer-debug)。新規証拠は隔離checkoutの `work/evidence/`、ブラウザ検証手順は `tests/debug-browser.cjs`。元の計画差分を保持し、本workspaceでは本計画へ結果のみ追記した。

- 元リポジトリへの反映（Implementer、2026-10-06）：Producerが「元のリポジトリに実装を反映」と指示。開始時はmain、HEAD `fda91afc6024e3bad677a5874ded6200402530c9`、既存変更は本計画のみ、追加worktreeなし。隔離checkoutのHEAD `703d298` とclean状態を確認し、元リポジトリに `codex/developer-debug-ui` を作成。計画は退避して既存記録を保持し、その他の実装16ファイルを反映した。持込元とのSHA-256一致は全16ファイルで確認済み。mainのref・隔離checkoutは変更せず、merge／push／tag／外部公開は行っていない。
- 反映ファイル：`README.md`、`debug-ui.js`、`game.js`、`i18n/ja.js`、`i18n/en.js`、`index.html`、`input.js`、`package.json`、`style.css`、`tests/build-itch.ps1`、`tests/combat-source.cjs`、`tests/debug-browser.cjs`、`tests/debug.cjs`、`tests/harness.cjs`、`tests/i18n.cjs`、`tests/public-readiness.cjs`。これらに本計画の反映先・検証結果追記を加えた17ファイルをレビュー用コミットにまとめる。
- 元リポジトリでの再検証：`npm test` は179項目PASS（デバッグ10項目を含む）。`git diff --check`、元リポジトリのREADME／本計画のローカルリンク、変更ファイルの一致を確認。新規証拠は `work/debug-ui-import/npm-test.txt`、`source-parity.json` と今回生成した比較JSON。既存の追跡検証JSONは検証前のbytesへ戻し、元のZIP・画像・検証記録を上書きしていない。配布テストは同一ソースでの隔離checkoutの6項目PASSを引き継ぎ、この反映作業では再実行していない。
- 反映後の確認先：起動と5操作は本リポジトリの [README](../README.md#開発者向けデバッグ--developer-debug)。HTTPは `http://localhost:4173/?debug`、直接fileは本リポジトリの `index.html?debug`。Reviewerへ渡す対象は元リポジトリの基準commitから `codex/developer-debug-ui` のHEADまで。実ブラウザ検証は今回追加実施しておらず、前回の未確認事項と独立QA／Producer Playtest待ちは継続する。

## Review Results

未実施（待ち）。Implementer自己確認を独立QAへ数えない。Reviewerへ元リポジトリ・main基準commit・`codex/developer-debug-ui` のHEADまでの差分・本計画・`work/debug-ui-import` と隔離checkoutの `work/evidence` を渡し、実ブラウザ未確認範囲を補完する。Producer Playtestも未実施。Scope変更や追加要望はDecisionsへ記録する。

### 独立QAレビュー（2026-10-06、Asia/Tokyo）

- **Reviewer**：Codex、今回の別会話でQA / Engineering Reviewerとして実施。実装担当の自己確認とは独立したレビュー。実装・修正は行わず、本Review Resultsのみ追記した。上記の「未実施」は本レビュー前の引き継ぎ記録。
- **Target**：Sprint 3。main基準 `fda91afc6024e3bad677a5874ded6200402530c9` → `codex/developer-debug-ui` / HEAD `77fca439eb6ec3e00dc5c7c1f334b13cbde9e3c5` の17ファイル差分。開始時はclean、登録worktreeは元リポジトリ1件。
- **Evidence**：AGENTS・本計画・ROLES・WORKFLOW・QA Guide、実装差分、ゲーム／UI／入力／保存／カタログ連携、既存テストと引き継ぎ証拠を確認。Windows PowerShell、Node.js v22.23.1、npm 10.2.1、専用のheadless Edge `154.0.4258.53` / CDP 9223とローカルHTTP 4173を使用。今回は専用ブラウザの起動・接続に成功し、実装時の接続不能を引き継いだままにはしていない。

| 今回実行した検証 | 結果と範囲 |
| --- | --- |
| `npm test` | **PASS：179項目**。デバッグ境界10件、通常戦闘・ボス時刻閾値／将来乱数、保存拒否・未知フィールド／relic番号、日英と状態の回帰を含む。 |
| `npm run test:public` | **PASS：9項目**。実クリック／キー、通常画面、native fullscreen／退出・自動ポーズ、直接file起動、ブラウザ例外0。 |
| `npm run test:i18n:browser` | **PASS：5項目**。日英切替・再読込・保存、全23強化と各画面の1440×900／1024×640、HTTP／file、ブラウザ例外0。 |
| `npm run test:debug:browser` | **FAIL**。`tests/debug-browser.cjs:30` の起動直後のバッジ表示assertで停止（実際 `hidden=true`、期待 `false`）。後続ケースはこのコマンドでは未実行。下記P2として記録し、assertを変更してPASSにはしていない。 |
| 独立の追加ブラウザプローブ | HTTP／ソース直接fileで**5項目PASS**、同じ初期タイトル不具合を両方で確認。`?debug`単独でtest APIなしの操作・入力隔離、日英1440×900／1024×640／640×480、縦スクロールで全操作項目へ到達・横溢れなし、強化／時間／敵／無敵の実ボタン操作を確認。`?test&debug`の明示fixtureで守護者の手動／時刻出現重複拒否、最終ボス撃破／勝利、敗北・リトライ・タイトル復帰、無敵リセット、通常再読込時の分離を確認。native fullscreen退出・blur／visibilityイベント・言語変更でdebug状態とラン内容を維持。通常metaの保存bytes一致、ブラウザ例外0。 |
| `tests/build-itch.ps1`、展開後直接file | **PASS：6項目**。現ソースとSHA-256一致のコピー上で実行し、14 runtime files・内容・既存出力置換・失敗時保護を確認。元のdist／ZIPを上書きせず、新規ZIPを別領域へ展開。展開版にも追加プローブを実行し、日英3画面サイズ・操作／保存／ボス／リトライ／通常再読込を確認（3項目PASS）。初期タイトル不具合は展開版でも再現。 |

- **Verdict：要修正**。確認できた不具合はP2の1件。確認済みの保存分離・通常モード・5操作のロジックに、これ以外の重大な懸念は見つからなかった。
- **Bugs found — [P2] デバッグ起動直後のタイトルに開発モード表示がない**：専用プロファイルで `http://localhost:4173/?debug` または `file:///D:/develop/project-ashfall/index.html?debug` を開き、開始・言語切替等を操作せずタイトルを見る。期待はタイトル時点から「開発デバッグ」と通常保存へ反映しないセッションだと判別できること。実際は `debugBadge.hidden=true`、`debugOpen.hidden=true`、`debugAvailability.textContent=''` のまま、通常タイトルと見分けられない。開始または言語切替後は表示される。原因は `game.js:836` でdebug UIを作成した後、`game.js:847` の初期更新が `ui.refresh()` のみで、`debug-ui.js:61` のcreateもrefreshを実行しないこと。`index.html:45` の初期hiddenが解除されない。Scope／DoDの「タイトル・ラン・結果でデバッグ中と分かる表示」に違反し、保存されない起動を通常起動と誤認させる。HTTP／ソースfile／展開ZIPで再現済み。提案は初期タイトルのdebug表示更新を保証すること。修正は未実施。
- **Regression risks**：今回の通常モードparity・入力／画面／保存／日英回帰はPASS。VM harnessは生成直後に `start()` を呼ぶため、起動直後のタイトル表示漏れを検出できない。実ブラウザ検証を省略すると本件が残ることが今回確認された。追加プローブの成功は既存debugブラウザテスト全体のPASSを意味しない。
- **Browser/save/i18n concerns**：保存呼出はgameの `saveMeta()` でdebug時に遮断され、言語保存は独立経路。VMで装備選択／補正・保存拒否・未知フィールド／装備番号を、実ブラウザで開始・勝敗・リトライ・タイトル・再読込のbytes維持を確認した。日英キー／補間と実レイアウトはPASS。ブラウザの確認済み環境は上記Edgeのみ。
- **Untested areas**：Chrome／Firefox／Safari、headedブラウザの物理Esc・長押し／OSフォーカス移動、実ウィンドウ切替に伴うvisibility、長時間の自然入力ラン、音の聴感、Producerによる操作感・QA準備の有用性は未検証。デバッグ専用の追加プローブは描画ループを止めたfixtureとCDP入力であり、ゲームの面白さや実プレイ品質の保証ではない。保存拒否はVM確認に限り、ブラウザ設定で実際に拒否する確認は未実施。
- **Required tests**：ImplementerがP2を修正後、初期タイトルが言語切替なしでJA／EN双方に表示されることをHTTP／file／展開ZIPで再確認し、停止した `npm run test:debug:browser` を全ケース再実行する。コード修正時の `npm test` と関連回帰確認も必要。物理Esc／長押し・実フォーカス移動、UIで場面を短時間に用意できるかはProducer Playtestへ残す。
- **Release recommendation：修正後に再確認**。独立QAレビュー自体は実施済みだが、P2修正・debugブラウザテストの完走・Producer Playtestが残る。スプリント完了、mainへの統合／push／tag／公開の承認とはしない。
- **証拠・保存状態**：新規証拠は [今回のQA領域](../work/qa-debug-ui-20261006/) 内の `test.txt`、`test-debug-browser.txt`、`test-public.txt`、`test-i18n-browser.txt`、`probe-report.json`／`probe.txt`／PNG、`packaging.txt`、`packaged-probe/probe-report.json`。テストの検証JSON・画像出力だけを同領域の `generated/` へ振り向け、既存の追跡JSON・画像・実装側証拠を保護した（ゲーム・テストのassertは変更なし）。追跡変更は本計画のみ、未ステージ・未コミット。branch・HEAD・worktree構成は開始時と同じ。実装・修正・merge・push・tag・外部公開は行っていない。
- **追記後確認**：`git diff --check`、本計画のローカルリンク19件、持込実装16ファイルのSHA-256不変を確認しPASS（`final-check.txt`）。今回起動した専用ブラウザとHTTPサーバーは終了した。既存の作業ツリーへコード差分は追加していない。

## Decisions

- Producer（2026-10-06）：次スプリントは開発者向けデバッグUI。任意のアップグレード付与・時間送り・ボス呼び出し・敵スポーン・無敵化を挙げ、current-sprintへの記載を指示した。
- Producer（時間送りの回答、2026-10-06）：経過時刻だけを進める方式を選択。戦闘も含めた早送りは含めない。
- Director：今回は5機能に範囲を絞り、保存・通常プレイ・入力・日英を守る動作と検証条件を具体化し、readyとした。先に候補として挙げたFPS／フレーム時間表示等は今回追加しない。ゲーム内容・バランスの変更は含めない。
- Git：今回の計画作成ではcommit／branch作成／merge／push／tag／公開を行わない。実装時のレビュー用コミットはConstraintsとAGENTSの既定方針に従う。
- Producer（2026-10-06、反映の追加指示）：隔離checkoutにある実装を元のリポジトリへ反映する。Implementerは元リポジトリの専用branchへ反映し、通常のレビュー用コミット方針を適用する。

## Next Sprint

未決定。デバッグUIの利用結果から必要な改善やゲーム本体の調整をProducerが選ぶ。ポータブル版の再開やScope外のデバッグ機能を自動で始めない。
