# Sprint 3 — Developer Debug UI

## Status

done

2026-10-06（Asia/Tokyo）、Producerの「残件がなければ閉じてコミット」の指示に基づき、DirectorがDefinition of Doneと最新の独立QAを照合してSprint 3を終了した。開発用5機能・P2修正・Producerの実プレイ10項目PASSに加え、公開ZIPのdebug／test無効化も独立QAで確認済み（重大な懸念なし、必須修正なし）。公開ZIPのHTTP／file・日英16条件と関連回帰はPASS。強化プルダウンは現状許容。スプリント内の必須残件はなし。実itch.io上の確認は公開時の工程へ残し、未実施のまま保持する。mainへの統合・push・tag・外部公開は行っていない。

終了後の追加依頼：Producerが公開準備として版番号を0.8.1へ更新し、その後にmainへマージ → v0.8.1タグ → ZIP生成 → itch.ioへのアップロードの順で進める方針を指定。今回の作業は版番号更新・関連表記・検証とマージ前のコミットまで。Sprint 3本体のdoneは維持し、公開操作の実施状況は後述の追加作業として区別する。

計画作成時の記録（2026-10-06、Asia/Tokyo）：Producerが開発者向けデバッグUIの5機能を指定し、時間送りは経過時刻だけを進める方式と回答。DirectorがScopeをreadyとして引き継いだ。当時の依頼は計画記載までで実装は未着手だった。現在の実装・レビュー・Producer結果と追加Scopeは以下の最新記録を参照する。

## Goal

ブラウザ版で確認したいビルド・経過時刻・敵との戦闘を短時間で用意できる開発者向けデバッグUIを作り、QAと調整のための実プレイ準備を楽にする。通常プレイの灰縫い・成長・保存・入力を維持し、デバッグによる観察と通常ランの評価を区別できるようにする。

## Context

- Producer feedback（2026-10-06）：ポータブル版は一旦保留し、次はデバッグUI。候補として任意のアップグレード付与、時間送り、ボス呼び出し、敵スポーン、無敵化が挙げられ、これを本スプリントの5機能として整理する。
- Producer feedback（実プレイ後、2026-10-06）：提示した確認10項目はすべてPASS。目的のビルド／戦闘を待たずに用意できた。強化名だけでは内容が分かりにくいプルダウンは、開発者が使う部分なので許容範囲。itch.ioへアップロードした際にデバッグモードを使えないことを採用条件とする。
- Baseline：Project Ashfall v0.8.0、現在のmain `fda91afc6024e3bad677a5874ded6200402530c9`。計画開始時は追跡ファイルclean、登録worktreeはこの1件のみ。前回報告からmainへ統合済みであることを確認したが、本会話ではmerge・pushしていない。
- Sprint 2終了記録：`git show 4b290b95095c6db7ca2328e205368f7244ce411b:plans/current-sprint.md`。Electron／Tauri PoCの成果・独立QA・Producer実プレイと進行保留判断はこの履歴から参照する。currentは今回の指示でSprint 3へ置き換える。
- Existing mechanisms：[game.js](../game.js)の明示的なtestモードにはアップグレード付与・敵生成・状態取得・step等があり、[upgrades.js](../upgrades.js)に安定ID・上限・前提／排他条件がある。これらを活用できるか調査し、ゲームロジックの別コピーは作らない。既存testモードの動作・保存副作用はデバッグUIの仕様として流用しない。
- References：[AGENTS](../AGENTS.md)、[PRODUCT](../docs/ai/PRODUCT.md)、[WORKFLOW](../docs/ai/WORKFLOW.md)、[README](../README.md)、[package.json](../package.json)、[input.js](../input.js)、[ui.js](../ui.js)、[storage.js](../storage.js)、[TEST-REPORT](../TEST-REPORT.md)、[i18n検証](../docs/V0.8-I18N-VALIDATION.md)。必要な範囲だけ参照する。

## Scope

Producerが指定した5機能をDirectorが以下の動作として具体化した。機能追加はこの5機能と、その利用に必要なUI・状態表示・保存分離、および実プレイ後に指定された公開配布物での無効化に限る。

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
- 追加Scope（Producerの採用条件、2026-10-06）：[itch ZIP生成](../scripts/build-itch.ps1)で作る公開配布物は、URLの `?debug`／`?test`／両方の指定に関わらず開発用モードを無効に固定する。デバッグUIの非表示だけでなく、有効化・5操作・デバッグ保存分岐を無効にし、テストAPIを通じた同等操作を残さない。生成物側で確定する仕組みとし、itchのホスト名・親ページ・URLの付け方だけで判定しない。公開ZIPのHTTP／直接fileでも同じ条件を保つ。具体的な生成方法はImplementerが選び、必要な公開用処理が欠落した場合はZIP生成を失敗させる。
- 開発用の正本ソースでは既存の `?debug`／`?test` を維持し、日常のQA・調整を続けられるようにする。公開用変換はビルド時の生成物へ隔離し、手修正のゲームコピーや新しい依存を導入しない。READMEと配布／ブラウザテストを開発用・公開用の期待に合わせて更新する。今回の追加Scopeはアップロード・外部公開自体の許可を含まない。

## Non-goals

- 通常ランの灰縫い、バランス、敵能力・出現スケジュール、アップグレード効果・抽選・前提／排他、レリック、新コンテンツの変更。
- FPS／フレーム時間グラフ、性能プロファイラ、ビルドプリセット・共有／入出力、レリック自由付与、ラン保存／復元、seed固定／リプレイ、時間戻し、全戦闘の高速シミュレーション、上限突破チートの追加。
- 通常プレイ向け設定としてのチート公開、恒久解放の操作、保存形式・保存キー・upgrade ID／relic番号の変更。
- Electron／Tauriのコード・配布物への追従、カーソル／カクつき修正、ポータブル版の追加検証・正式採用。前Sprintの未解決事項を本Sprintの必須修正へ混ぜない。
- 新しい依存・起動基盤、開発toolchain、署名・installer・自動更新・公開・リリース版番号変更（Sprint 3本体の元Scope。終了後のProducer追加指示による0.8.1更新と公開手順は下記の追加作業記録に分ける）。
- 強化プルダウンの一覧／検索／説明表示の作り直し。Producerが現状を許容したため、今回の必須修正に含めない。

## Constraints

- [AGENTS.md](../AGENTS.md)を適用する。ブラウザ版を正本とし、直接file／HTTP起動・Canvas／Web Audio・日英・既存入力・保存互換を維持する。
- デバッグUIを閉じる／非表示にすることだけを通常モードの保護としない。起動条件・操作経路・保存経路でも無効化／分離を確認する。通常起動でデバッグ状態・UI更新・常時イベント処理等が戦闘を変えない設計にする。
- ゲーム数値・カタログ・戦闘ロジックをUI側へ複製しない。責務を分け、既存test APIと自動検証を壊さない。分離のための変更は必要最小限にし、大きなリファクタリングを混ぜない。
- UIの開閉、全画面、blur／visibility、言語切替で時間送り・付与・生成が重複しない。パネル入力中のキー／クリックでゲームを動かさず、再開後に入力が残らないようにする。
- Git：実装時はmain基準 `fda91afc6024e3bad677a5874ded6200402530c9`から `codex/developer-debug-ui` 等の専用branchを使い、今回の計画差分を保持する。開始時にbranch・HEAD・worktreeと基準差分を再確認し、新しい既存変更を上書きしない。
- Implementerは承認済みScopeの実装・検証完了後、明示的に禁止されていない限りレビュー用コミットを自律的に作成してよい。生成物・Git除外対象・無関係な変更は含めない。mainへのmerge・push・tag・外部公開は別途Producerの明示指示が必要。
- ブラウザ検証は専用profile／保存を使い、既存データ・ZIP・証拠を上書きしない。生成物は既存ignoreに従う。未実施レビューや人間確認をPASSにしない。
- 公開用の生成変換で従来の「全runtime fileが正本ソースとbyte一致」という配布テストの前提が変わる場合は、その対象・理由・公開用の期待内容を明記する。通常ゲームのロジック・保存・日英は変えず、開発用と公開用の検証を分ける。既存debugブラウザテストの展開ZIPでdebug可能という期待も、公開ZIPでは無効という独立した検証へ更新する。単にassertを削除してPASSにしない。

## Deliverables

- 本 `plans/current-sprint.md`：計画・進捗・検証・レビュー・Producer判断の正本。
- ブラウザ版のデバッグUIと必要最小限のゲーム／入力／保存連携、日英表示。ファイルの配置・分割はImplementerが調査して決める。
- [README](../README.md)の開発用起動・5操作・保存と通常モードの違い・時間送りの制限。
- 状態・保存分離・入力・5機能の境界を確かめる必要なテストと検証証拠。証拠はwork等のGit対象外へ置き、再利用可能な検証手順のみGit管理する。
- 公開ZIPの開発用モード無効化と、その生成・内容監査・通常プレイ／保存・debug／test指定時の確認手順。修正後の公開ZIPを対象にした独立QA結果。

## Definition of Done

- [x] 開発用ソースのHTTP／直接fileの明示的デバッグ起動でUIを使え、通常起動では入口・操作・副作用が無効。デバッグ中であることがタイトル・ラン・結果から判別できる。独立QA再確認とProducer報告で確認。
- [x] 開発用ソースの5機能が上記Scopeどおりに動き、上限・前提／排他・不正入力・ボス重複・無敵ON／OFF／リトライ・不適切な状態を扱える。
- [x] 経過時刻だけの時間送りで現在時刻・出現判定・ボス状態が整合し、閾値を跨ぐ操作でもボスが重複しない。飛ばした期間を通常プレイの結果や精密シミュレーションと扱わない。
- [x] デバッグ起動の開始・勝利／敗北・リトライ・タイトル復帰・装備関連操作を通して通常metaの保存bytesが変わらない。再読込後の通常ランへデバッグ状態を持ち越さず、保存拒否・未知フィールド・relic番号・独立言語を維持する。
- [x] パネルの入力・開閉・ポーズ／再開・全画面／退出・blur／visibilityで誤操作、入力持越し、重複処理がない。日英切替で操作や抽選を再実行せず、小画面でも必要な項目が使える。実入力の確認はProducerの全項目PASS報告に基づく。
- [x] 既存実装の通常モードの灰縫い・成長・結果・保存・入力・日英に回帰を検出せず、`npm test`と関連検証の結果／制限を記録した。追加の配布変更後は関係する回帰を再確認する。
- [x] 既存実装の必要なブラウザ確認（通常／debug、HTTP／file、日英、入力・保存）、`npm run test:public`、`npm run test:i18n:browser`、`tests/build-itch.ps1` と展開後直接起動を独立QAが実行し記録した。公開用無効化の検証は下記の追加条件へ分離する。
- [x] READMEの手順でProducerが開発用起動し、任意ビルド・敵／ボス・経過時刻・無敵を短時間で設定して戦闘確認できた。
- [x] 新規公開ZIPのHTTP／直接fileで、通常・debug・test・test&debug指定の全条件でデバッグUI／操作とテストAPIが無効で、通常ラン・保存・日英が動く。開発用ソースのdebug／testは引き続き動く。Implementer自己確認と追加Scopeの独立QAで確認済み。
- [x] 公開ZIP生成の無効化処理・欠落時の失敗・生成物内容と挙動を検証し、`npm test`・配布検証・関連ブラウザ回帰を記録。追加差分の独立QAを完了した。最新QAの180項目・配布9項目・公開ブラウザ16条件と開発用回帰はPASS、追加の必須修正なし。原文の190項目という集計は終了後の版番号更新時にログから訂正（下記）。
- [x] Required ReviewsとProducer Playtestの必要な工程が完了、または不要理由を記録済み。実装自己確認と独立QAを区別した。公開向け変更による開発用UIの操作変更はなく、回帰QAもPASSのためProducerの再プレイは不要。
- [x] 変更ファイル・実行環境・検証結果・未確認事項・branch／commit／worktree状態を報告した。終了判断と文書コミットの対象・確認結果はExecution Resultsに記録。

## Required Reviews

- Game Design Review：現Scopeでは原則不要。通常の戦闘・バランス・成長仕様を変更せず、開発用操作だけを追加するため。デバッグ結果を通常ランの面白さ・強弱の評価と混同しない。通常プレイの理解・操作感に変更が必要になった場合は、Scope拡大前に対象を限定して必要性を判断する。
- QA / Engineering Review：必要、実装後に別会話・コンテキストで実施。基準コミット・差分・本計画・検証証拠を手動で渡し、[QA Guide](../docs/ai/REVIEW-GUIDE-QA.md)に沿って有効化条件・保存分離・状態遷移・入力・時間／ボス・上限・日英と通常モードの回帰を確認する。前SprintのQAや実装担当の自己確認で代替しない。
- 現在の結果：5機能・P2修正再確認・追加の公開ZIP無効化の独立QAがすべて完了、重大な懸念なし。公開用の判定には最新の新規ZIPを対象としたQAを使用し、以前の展開ZIPでdebugが動くPASSとは区別した。必須のレビュー・修正待ちはない。

## Producer Playtest

- Required：必要、実装後。開発用UIが実際のQA／調整準備を楽にするか、通常プレイの操作を妨げないかを人間が確認する。
- Scenarios：通常起動でUIが無効なことを確認後、明示的なdebug起動でラン開始。UIを開いて拡散／濃縮／連続の任意ビルドを付与し、敵生成・無敵切替・再開で灰縫いを試す。守護者／最終ボスを呼び出し、重複拒否と撃破・終了を確認。経過時刻を進めて後半の出現を確認。日英・全画面／退出・ポーズ・リトライ・再読込を試し、通常の記録が保持されることを確認する。
- Observations：目的の場面を作るまでの手数、操作／無効理由の分かりやすさ、現在のビルド・時刻・無敵状態、開閉と入力のストレス。デバッグ時に成立した強さや勝利を通常のバランス評価の証拠にしない。
- Result / Decision（2026-10-06）：Producerが提示された確認10項目をすべてPASSと報告。通常／debug起動・初期表示、開閉／入力、強化付与、敵スポーン、無敵、時間送り、ボス、実入力／音、日英／小画面、リトライ／保存を確認したとの報告を記録する。目的のビルドと敵との戦闘を待たずに用意できた：YES。操作や説明で迷った点：YES、強化プルダウンは名前だけで内容が一覧から分かりにくいが、開発者向けなので許容範囲。
- 採否：開発用UIの実用性と現状の操作を受け入れる。条件の公開用無効化は、ホストに依存しない生成物側の固定と新規ZIPの独立QAで確認済み。Directorは本条件を満たしたと判断し、Producerの今回の終了指示に従ってSprintをDoneとする。実itch.ioへのアップロード／iframe確認は未実施であり、外部公開時の確認として残す。Producer実プレイ時のOS・ブラウザ・起動方式の個別情報は未報告で、QAのEdge環境と同一だったとは推測しない。プルダウン改善は今回不要。追加対応は配布物の無効化のみで開発用操作を維持し、回帰QAもPASSのため、Producerの実プレイ全項目の再実施は不要。

## Open Questions

- 本Sprintの未決事項・必須残件はなし。敵生成の上限・配置、UI構成、公開用生成方法は実装結果へ記録済み。前提無視・ランク戻し・戦闘全体の高速化等の追加機能は、必要になった時点でProducerが別Scopeとして判断する。
- ポータブル版の再開時期・方式・容量／環境要件は未決定。前Sprintの不具合・未検証事項はGit履歴の終了記録に保持し、本Sprintでは解決しない。
- 公開ZIPの無効化は完了。実itch.ioのiframe上の起動・無効化確認は、公開作業を別途承認された際に実施する。その他ブラウザ・実保存拒否・公開版の自然な長時間プレイ等の未検証範囲は最新QAのUntested areasに保持し、今回の必須残件には含めない。未実施をPASSへ変えない。

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

### P2修正と自己検証（Implementer、2026-10-06、Asia/Tokyo）

- 着手状態：`codex/developer-debug-ui`、HEAD `19312ea97a45c426bc58d1551355217b2903db99`（独立QA記録コミット）、clean、登録worktreeは元リポジトリ1件。既存QA本文と証拠を保持して作業した。
- 原因と修正：debug UIのcreate後、起動時の表示更新が通常UIだけで、debug UIの初回refreshが言語切替やラン開始まで呼ばれなかった。`game.js` の初期化で `ui.refresh()` の直後に `debugUI?.refresh()` を1回呼ぶ。通常起動ではdebug UIを作成しないため、この追加呼出しは無効。戦闘・保存・言語設定・ラン状態を変更する処理は追加していない。
- 回帰テスト：`tests/debug-browser.cjs` の既存assert／後続操作を維持し、各起動方式でja／enを起動前の保存済み設定として用意してから `?debug` を開く。起動後はクリック・キー・言語変更APIを一切呼ばず、タイトル表示・言語・test API不在・バッジのhiddenと実際の画面内可視性・正確な日英文言・無効な入口・閉じたパネル・通常metaのbytes／言語設定不変を確認。通常再読込時の入口非表示と空の状態説明も追加した。期待値の緩和・assert削除・ケースのskipは行っていない。
- 実行環境：Windows PowerShell、Node.js v22.23.1、専用headless Edge `154.0.4258.53` / CDP 9223、HTTP 4173。今回専用Edgeの起動は権限承認を受けて成功した。既存profileは使わず、今回の専用profileを `work/debug-title-fix-20261006/browser-profile` に作成した。

| 今回の自己検証 | 結果 |
| --- | --- |
| `npm test` | **PASS：179項目**。通常戦闘・状態／保存・日英parity・デバッグ10項目を含む。 |
| `npm run test:debug:browser`（`ASHFALL_DEBUG_PACKAGED_DIR` 指定） | **PASS：全10ケース、例外0**。HTTP／ソース直接file／展開ZIPのJA／EN起動直後6条件、3方式×日英×3サイズの18パネル条件、全5操作・保存・ボス／勝敗／リトライ／通常再読込・native fullscreen退出／blur／visibilityを既存テストの全ケースで確認。fullscreen実行結果もtrue。 |
| `npm run test:public` | **PASS：9項目、例外0**。通常起動、実入力・画面遷移、native fullscreen／退出・ポーズ、HTTP／直接fileの回帰。 |
| `npm run test:i18n:browser` | **PASS：5項目、例外0**。日英切替・保存、全23強化・全画面の1440×900／1024×640、HTTP／fileの回帰。 |
| `tests/build-itch.ps1` と展開ZIP確認 | **PASS：6項目**。修正後ソース14ファイルをSHA-256一致で新しい作業領域へコピーして実行。生成ZIPを新規展開し、展開14ファイルのhash一致と上記debugブラウザテスト全ケースを確認。元のdist／ZIPは保護した。 |
| 構文、`git diff --check`、文書リンク、既存記録保護 | **PASS**。既存の独立QA本文をそのまま保持し、QA証拠・dist・画像・追跡検証JSONの1617ファイルが検証前hashと一致。 |

- 証拠：[今回の修正検証領域](../work/debug-title-fix-20261006/) の `test.txt`、`test-debug-browser.txt`、`test-public.txt`、`test-i18n-browser.txt`、`packaging.txt`、`runtime-hashes.json`、`final-check.txt`。`generated/work/debug-browser/report.json` に起動直後6条件・全ケース・ブラウザ版・例外数、同ディレクトリに起動直後6枚／パネル18枚のPNGを保存した。HTTP起動のJA／ENタイトル画像も目視確認した。既存QAのFAIL記録・画像・比較JSONを新結果で上書きせず、検証の出力先だけを新規領域へ振り向けた。
- 未確認・次の担当：この修正検証はImplementerの自己確認で、独立再レビューの完了ではない。P2修正後の独立QA再確認とProducer Playtestが残る。確認したブラウザは上記Edgeのみ。Chrome／Firefox／Safari、headedの物理Esc／長押し／OSフォーカス移動・実タブ非表示、長時間の自然入力、音の聴感、QA準備の有用性・操作感は未検証。debugブラウザテストは描画ループを止めたfixtureとCDP入力であり、面白さを保証しない。既存QAの未確認事項を消していない。
- 変更対象は `game.js`、`tests/debug-browser.cjs`、本計画の3ファイルのみ。修正と上記自己検証をレビュー用コミットにまとめる。既存独立QA記録コミットは履歴に保持し、mainの基準HEAD・worktree構成は変更しない。merge／push／tag／外部公開は行わない。

### Producer報告の統合と公開ZIPの追加Scope（Director、2026-10-06）

- Producerの全項目PASS・実用性の確認・プルダウン許容・itch.ioでのデバッグ無効化条件を記録し、既存実装の確認済みDoDと追加の未完了条件を分けた。独立QA原文とP2修正再確認は保持する。
- 現状確認：`game.js:9` はURLのdebug指定だけで有効化、末尾のtest指定で `AshfallTest` を公開する。[build-itch.ps1](../scripts/build-itch.ps1)はHTML参照から `debug-ui.js` を含むruntimeを無変更でZIPへ入れ、全ファイルの正本とのhash一致を検証している。既存独立QAはこの展開ZIPでdebugが動くことをPASSとしている。この構成では公開配布物での無効化を担保できない。今回の確認はソース／既存証拠の読取で、itch.io上の実行検証はしていない。
- Directorは実装せず、追加の公開用生成・無効化・テスト／README更新をImplementerへ引き継ぐ。新しい配布物の対応と独立QAが残る。プルダウン改善、ポータブル版再開、アップロード・外部公開は実行しない。
- 今回の変更は本currentのみ。開始branch `codex/developer-debug-ui`、HEAD `3a6c6d9092446fdfa3867155a6ec2504808b3bf2`、開始時は追跡ファイルclean、worktree登録追加なし。ローカルリンク23件、雛形と同じ15節の構成・文書整合、独立QA本文のSHA-256不変、`git diff --check`を確認しPASS。終了時は本currentのみ未ステージ・未コミット。コード変更・ゲームテスト・ZIP生成・commit／merge／push／公開は行っていない。

### 公開ZIPでの開発用モード無効化（Implementer、2026-10-06、Asia/Tokyo）

- 着手状態：`codex/developer-debug-ui`、HEAD `dc8feb1`（追加Scope承認記録）、追跡ファイルclean、登録worktreeは元リポジトリ1件。main基準は `fda91afc6024e3bad677a5874ded6200402530c9`。既存の独立QA原文・Producerの採否・検証証拠は保持した。
- 実装：`game.js` のIIFE内にprivateな `DEVELOPMENT_MODES_ENABLED = true` を置き、debug有効化とtest API公開の両入口で参照する。正本ソースは従来どおり両モードを使える。`scripts/build-itch.ps1` はZIPへ書き込むgame.jsだけを `false` に変換し、ホスト・親ページ・URL・グローバル設定に依存せず公開モードを固定する。debug UIのcreate／イベント接続・5操作・無敵・debug保存抑制は有効にならず、test APIも公開しない。通常のmeta保存・言語設定・戦闘ロジックは維持する。手修正のゲームコピー・追加依存はない。
- 配布の期待内容：同梱14ファイルのうち13ファイルは正本とbyte一致。game.jsだけは上記の `true` → `false` 1か所以外をbyte一致とし、実ZIPの全entryをSHA-256で検証してから置換する。必要な宣言の欠落／重複、debug／test入口ガードの欠落、game.js非同梱は生成FAIL。既存ZIPを保持し、正本ソースも変更しない。
- テスト更新：既存debugブラウザの開発用HTTP／fileの全assert・5操作・保存・ボス・入力／全画面・JA／EN起動直後を維持した。公開ZIPでdebug可能だった3ケースは新しい独立の公開ZIPブラウザ16条件へ置き換え、単なるassert削除にはしていない。旧 `ASHFALL_DEBUG_PACKAGED_DIR` の指定は明示エラーにし、公開確認を `ASHFALL_PUBLIC_DIR` + `test:public:package` へ分けた。公開VM起動11件をnpm testへ追加し、READMEの日英説明と再実行手順を更新した。
- 実行環境：Windows PowerShell、Node.js v22.23.1、専用headless Edge `154.0.4258.53` / CDP 9223、HTTP 4173。専用profileと新規成果物は `work/public-modes-off-20261006/`。元distを上書きせず、変更後のruntime・配布スクリプト／テストをhash一致の新規コピーへ移してZIPを生成・展開した。

| 追加Scopeの自己検証 | 結果 |
| --- | --- |
| `npm test` | **PASS：190項目**。従来179項目を維持し、公開用モード11件を追加。通常戦闘／将来乱数・保存互換／拒否・日英・開発用debug10件を含む。 |
| `tests/build-itch.ps1`（新規コピー上） | **PASS：9項目**。全entry・公開用変換のbytes・依存探索／version／置換、宣言欠落／重複・両入口のガード欠落・game.js非同梱・欠落ファイル／経路逸脱時のFAILと旧ZIP保持、全正本runtimeの不変を確認。 |
| `ASHFALL_PUBLIC_DIR=展開先 node tests/public-modes.cjs` | **PASS：11項目**。実際の展開版を通常／debug／test／両指定×JA／ENで起動し、test APIとdebugハンドラ不在、通常保存／装備補正・開始／ポーズ／タイトル・言語保存を確認。開発用ソースの両モードも確認。 |
| `npm run test:debug:browser` | **PASS：全7ケース、例外0、fullscreen=true**。開発用HTTP／file×JA／ENの起動直後4条件、日英×3サイズ×2方式の12パネル条件、既存の5操作・入力／保存・ボス／結果／リトライ・全画面の全ケース。 |
| `ASHFALL_PUBLIC_DIR=展開先 npm run test:public:package` | **PASS：全16条件、例外0**。展開ZIPのHTTP／file×通常／debug／test／test&debug×JA／EN。操作前のAPI不在と入口／パネル／表示非公開、5操作のハンドラ不在と有効な値でのprogrammatic click無効、通常の装備補正／選択保存・新ラン／時計／ポーズ／再開・言語切替／再読込を確認。両指定4条件ではnative fullscreen／退出、通常戦闘による自然被弾／敗北・成績保存（未知フィールド維持）・リトライも確認。 |
| `npm run test:public` / `npm run test:i18n:browser` | **PASS：9項目／5項目、例外0**。開発用ソースの通常画面／入力／保存／全画面、日英・全23強化・1440×900／1024×640、HTTP／fileの回帰。 |
| 構文・diff・文書リンク・既存記録保護 | **PASS**。既存Review Results本文をそのまま保持し、既存QA／P2自己検証・dist／画像／追跡JSONの3716ファイルが検証前hashと一致。元runtimeと生成コピーの一致、展開13ファイルと変換game.jsの正確な一致を確認。 |

- 証拠：[追加Scopeの検証領域](../work/public-modes-off-20261006/) の `test.txt`、`packaging.txt`、`test-packed-vm.txt`、`test-debug-browser.txt`、`test-public-package.txt`、`test-public.txt`、`test-i18n-browser.txt`、`runtime-hashes.json`、`final-check.txt`。新規ZIPは同領域の `packaging-source/dist/project-ashfall-v0.8.0-itch.zip`、展開先は `packaged/`。`generated/work/debug-browser/report.json`、`generated/work/public-package-browser/report.json` とPNGにブラウザ版・全条件・例外数を記録した。公開版のHTTP日英タイトル画像も目視確認した。
- テスト作成時の失敗も保存：起動ボタンのinnerTextがCSSレイアウトで改行されたため、正確なtextContentを検証するよう修正。時計は181 frameで3秒を確定させる。全画面退出の遅延イベントでfixtureがポーズした件は、既存テストと同じく退出イベント完了を待ってから再開し、予期しないポーズをassertするようにした。ゲーム側の動作や既存assertを弱めて解消していない。最終版で全16条件を完走した。
- 未確認・次の担当：本追加差分はImplementerの自己確認で、独立QAは未実施。新規ZIPと `dc8feb1` 以降の追加差分を独立QAへ渡す。実itch.ioアップロード／iframe上の確認、Chrome／Firefox／Safari、headedの物理入力・実OSフォーカス／タブ切替、音の聴感は未検証。公開テストは既存描画コールバックの捕捉とCDP入力を使い、test API／debugヘルパーを使わず通常戦闘を進めるfixtureで、自然な実時間の人間プレイや面白さの評価とは区別する。Producerの既存全項目PASSを追加配布条件の人間確認へ流用しない。
- 変更対象：`game.js`、`scripts/build-itch.ps1`、`tests/build-itch.ps1`、`tests/harness.cjs`、`tests/public-modes.cjs`、`tests/debug-browser.cjs`、`tests/public-package-browser.cjs`、`package.json`、`README.md`、本計画の10ファイル。レビュー用コミットとして提出する。branchとworktree構成・main基準は維持し、merge／push／tag／外部公開は行わない。今回起動した専用ブラウザとHTTPサーバーは検証後に終了する。

### Sprint 3終了判断（Director、2026-10-06、Asia/Tokyo）

- Producerの終了・コミット指示に基づき、実装・独立QA・Producerの報告と全12項目のDoDを照合。5機能の実用性はProducerの全10項目PASS、P2は修正後QAで解消、追加の公開ZIP無効化は最新独立QAで確認済み。必須修正・レビュー・人間確認の残件はなく、Statusをdoneとした。
- 対象実装：`5b185b92ba8d162805f084efdd07b1e4f9cb4285`、最新QA記録：`1780c8798c6fa0ee220c2ddad20af0dae46dd0ce`。両commit間の差分は本計画のみで、QA後にゲーム・配布スクリプト・テストの変更はない。最新QAは `npm test` 190項目、配布9項目、公開ブラウザ16条件、開発用debug7ケース、通常9項目、i18n5項目をPASSと記録。初回ブラウザ検証のFAILと環境変更後のPASSは独立QA原文・証拠に保持した。
- 公開ZIPではprivateフラグをfalseに固定し、debug／test両入口と同等操作を停止する。開発用ソースは両モードを維持し、通常保存・日英・戦闘の回帰QAもPASS。Producerの条件を満たしたと判断するが、実itch.io上の確認を実施済みとはしない。配布自動化の変更で操作仕様を変えていないため、Producer再プレイとGame Design Reviewは不要。
- 未検証の実itch環境・その他ブラウザ等はOpen Questionsと独立QAの記録に保持。実itch確認は公開時の工程であり、今回の終了指示はmerge／push／tag／外部公開の許可には含めない。強化プルダウン改善・ポータブル版再開・次Sprintの実装は開始しない。
- 今回の変更・コミット対象は本計画のみ。開始branchは `codex/developer-debug-ui`、HEADは上記QA記録commit、作業ツリーはclean、登録worktreeは本リポジトリ1件。ローカルリンク25件、雛形と同じ15節の構成・内容整合、DoD全12項目完了、独立QA本文のSHA-256不変、`git diff --check`、意図しないコード差分がないことを確認しPASS。文書のみのためゲームテスト／ZIP生成は再実行せず、既存証拠を読み取って判断した。Producerの指示どおり終了文書をコミットし、commitと最終Git状態を報告する。

### 終了後の追加作業 — v0.8.1公開準備（2026-10-06、Asia/Tokyo）

- Producerの明示指示で、版番号の正本 `version.js` を0.8.0から0.8.1へ更新し、READMEの現在版を揃えた。QA Guideの現行版表記はv0.8系とした。package.jsonには重複した版番号がなく、タイトル表示・配布ファイル名は正本を参照するため別の固定値を追加していない。過去の基準版・QA本文・画像・検証JSONは当時の記録として保持した。
- 実行環境：Windows PowerShell、Node.js v22.23.1。`work/version-081-20261006/` へ既存出力を変更しない検証領域を作り、14 runtime filesと既存配布スクリプト／テストをhash一致でコピーして検証。元のdist・既存QA成果物は更新していない。公開手順前の検証用ZIPであり、マージ後にタグ対象から正式なZIPを生成する。
- 検証：`npm test` **PASS：180項目、SKIPなし**（今回の展開版game.jsを指定）、`tests/build-itch.ps1` **PASS：9項目**。生成名 `project-ashfall-v0.8.1-itch.zip`、正本／同梱version.jsの0.8.1、日英のタイトル版番号、全URL条件での公開モード無効化をVMで確認。展開14ファイルは、game.jsの既定の公開用変換以外は正本とbyte一致。日英タイトル補助確認の初回は、VMが未参照DOM要素を遅延生成する点を考慮せず例外で停止した。既存テストと同じく要素未生成時もハンドラ不在として確認する形へ修正。その後の集計assertは過去記録の190を期待して停止したため、実ログと各コマンドの集計を確認して180へ訂正し、最終再実行PASS。ゲームや既存テストは修正していない。
- 件数訂正：今回・公開ZIP独立QA・Implementer追加Scopeの各 `test.txt` はいずれもPASS行180件、各コマンド集計の合計も180。過去の190という総数表記は集計誤りであり、今回10項目を削除・未実行にした結果ではない。独立QA本文・過去証拠は原文として保持し、最新統合DoDを180へ訂正した。既存の全11コマンドは今回も正常終了、SKIPなしで、Sprintの完了判断は維持する。
- 証拠：[今回の版番号更新検証](../work/version-081-20261006/) の `test.txt`、`packaging.txt`、`version-check-final.txt` と隔離コピー内のZIP／展開版。npm testの生成JSONは同領域のgeneratedへ振り向け、過去の追跡結果を上書きしていない。
- 未実施：0.8.1での新しい実ブラウザ／人間プレイと独立QA。実行時差分は版番号の1値のみで、ゲーム・入力・保存・配布の実装は独立QA済みの内容を維持しているため、今回の版番号準備ではVMの表示と同梱／名前の検証を選んだ。実itch.ioのiframe起動はアップロード後に確認する。既存のv0.8.0時点の実ブラウザQAを0.8.1での実行記録へ書き換えない。
- 開始状態：`codex/developer-debug-ui`、HEAD `9b9a48f58b280c51ee804086db14f80be400294e`、作業ツリーclean、登録worktree1件。変更対象は `version.js`、`README.md`、`docs/ai/REVIEW-GUIDE-QA.md`、本計画。版番号以外の実行時変更なし、文書リンク49件・整合・15節の構成・QA原文のSHA-256不変・`git diff --check`を確認しPASS。マージ前のコミットにまとめ、commitと最終Git状態を報告する。Producerが続くmainマージ・タグ・正式ZIP生成・itch.ioアップロードを進める。

## Review Results

現在の統合結果：独立QAは5機能・P2修正再確認・公開ZIP無効化の全対象で完了し、必須修正の残件なし。Producerの実プレイも完了。以下の各レビュー本文は実施時点の記録として保持し、初回のFAIL・当時の未確認事項と最新の確認結果を区別する。Implementer自己確認を独立QAへ数えない。

初回レビュー前の引き継ぎ記録：未実施（待ち）。Implementer自己確認を独立QAへ数えない。Reviewerへ元リポジトリ・main基準commit・`codex/developer-debug-ui` のHEADまでの差分・本計画・`work/debug-ui-import` と隔離checkoutの `work/evidence` を渡し、実ブラウザ未確認範囲を補完する。Producer Playtestも未実施。Scope変更や追加要望はDecisionsへ記録する。

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

### P2修正後の独立QA再レビュー（2026-10-06、Asia/Tokyo）

- **Reviewer**：Codex、QA / Engineering Reviewer。Implementerの修正会話・自己検証とは独立して、このレビュー会話で再確認した。実装・テストの修正は行っていない。初回QAのFAIL・指摘・証拠は履歴として保持する。
- **Target**：Sprint 3、初回QA記録 `19312ea97a45c426bc58d1551355217b2903db99` → 修正commit `04f4254a29064d86a73029c3bf0b6b19be5fdd2e` の3ファイル差分（`game.js`、`tests/debug-browser.cjs`、本計画）。main基準は従来の `fda91afc6024e3bad677a5874ded6200402530c9`。開始時は `codex/developer-debug-ui` / HEAD `04f4254`、clean、登録worktreeは元リポジトリ1件。
- **Evidence**：現行AGENTS・本計画・QA Guide・ROLES、初回QA、修正差分、初期化／debug UIの実コード、更新されたブラウザテストとImplementer証拠を確認。修正は `game.js:847` の初期 `ui.refresh()` 直後に `debugUI?.refresh()` を1回追加するもの。通常起動でdebug UIが作られない条件を維持し、戦闘・乱数・保存・言語設定を変更するコードは追加されていない。テストは既存assertと後続ケースを維持し、起動前の保存済みJA／EN設定から、操作を挟まず初期タイトルを確認するassertを強化している。今回の専用headless Edge `154.0.4258.53` / CDP 9223、HTTP 4173、Windows PowerShell、Node.js v22.23.1で以下を独立再実行した。

| 今回の独立再検証 | 結果 |
| --- | --- |
| `npm test` | **PASS：179項目**。通常戦闘／ボス時刻／将来乱数、入力・状態・保存拒否／未知フィールド／relic番号・日英、debug境界10項目を含む。 |
| `npm run test:debug:browser`（今回生成した展開ZIPを指定） | **PASS：全10ケース、ブラウザ例外0、fullscreen=true**。HTTP／ソースfile／展開ZIP × 起動前JA／ENの6条件で、開始・言語切替なしの初期タイトル表示、正確なバッジ文言と画面内可視性、操作入口の無効化、閉じたパネル、test API不在、meta bytes／言語設定の維持を確認。3起動方式×日英×3サイズの18パネル条件、5操作・入力隔離、保存、ボス／勝敗／リトライ／通常再読込、native fullscreen退出・blur／visibilityの後続ケースも完走。今回のHTTP初期JA／EN画像を目視確認した。 |
| `npm run test:public` | **PASS：9項目、ブラウザ例外0**。通常画面・実クリック／キー、native fullscreen／退出／ポーズ、HTTP／file起動の回帰。 |
| `npm run test:i18n:browser` | **PASS：5項目、ブラウザ例外0**。日英切替・再読込・保存、全23強化／各画面、1440×900／1024×640、HTTP／fileの回帰。 |
| `tests/build-itch.ps1`、展開版の直接起動 | **PASS：6項目**。修正後の現ソースとhash一致の新規コピー上で実行し、14 runtime filesの同梱・内容と置換／失敗時保護を確認。新規ZIPを別領域へ展開して上記debugテスト全ケースを実行。元dist／ZIPは変更していない。 |

- **Verdict：重大な懸念なし**。前回P2「デバッグ起動直後のタイトルに開発モード表示がない」は**解消確認済み**。初回に停止したdebugブラウザテストも今回全ケースPASS。修正差分に追加の不具合は見つからなかった。
- **Regression risks**：追加の必須修正なし。初期表示更新だけの変更で、通常起動の無効化条件と既存ロジックを維持している。初回QAで見つかったVMだけでは初期タイトルを検証できない不足は、今回のブラウザ起動回帰ケースが補っている。
- **Bugs found**：なし（前回P2は上記のとおり解消）。
- **Browser/save/i18n concerns**：今回確認済みのEdgeでは、日英6起動条件の初期表示・保存分離と通常画面回帰はPASS。保存キー・format・upgrade ID／relic番号に修正差分はない。通常の保存拒否／未知フィールドはVM検証、debug中のmeta bytes維持と独立言語は実ブラウザ検証で確認した。
- **Untested areas**：Chrome／Firefox／Safari、headedの物理Esc／長押し／OSフォーカス移動、実タブ非表示、長時間の自然入力ラン、ブラウザ設定での実保存拒否、音の聴感、Producerによる操作感・QA準備の有用性は未検証。debugブラウザ検証は描画ループを止めたfixtureとCDP入力で、実プレイや面白さの保証ではない。初回QAの未確認事項を確認済みへ変更していない。
- **Required tests**：本P2修正に対する追加の必須自動検証はなし。残る物理入力・実フォーカス移動と、任意ビルド／時刻／敵／ボス／無敵を短時間に設定できるかは、既定のProducer Playtestで確認する。
- **Release recommendation：技術面でProducer Playtestへ進行可**。独立QAの修正再確認は完了。Producer Playtestと最終採否は未実施のため、Sprint全体のDoneやmainへのmerge／push／tag／外部公開を承認したものではない。
- **証拠・Git状態**：新規証拠は [今回の独立再QA領域](../work/qa-debug-title-recheck-20261006/) の `test.txt`、`test-debug-browser.txt`、`test-public.txt`、`test-i18n-browser.txt`、`packaging.txt`、`generated/work/debug-browser/report.json` と初期6枚／パネル18枚のPNG。検証JSON・画像の出力だけを新規領域へ振り向け、実装／テストのassert・既存記録・ZIPを変更していない。追跡変更は本Review Resultsへの追記のみ、未ステージ・未コミット。branch・HEAD・worktree構成は開始時と同じ。実装・修正・merge・push・tag・公開は行っていない。
- **追記後確認**：`git diff --check`、本計画／READMEのローカルリンク39件、現ソース／展開版14ファイルのhash一致、既存証拠1617ファイルのhash維持、本計画の追記以外の不変を確認しPASS（`final-check.txt`）。今回起動した専用ブラウザとHTTPサーバーは終了した。

### 公開ZIPのモード無効化・独立QAレビュー（2026-10-06、Asia/Tokyo）

- **Reviewer**：Codex、QA / Engineering Reviewer。Implementerの追加Scope実装・自己検証とは独立して実施。実装・テストの修正は行わず、本Review Resultsへ結果を追記する。過去のQA・Producer報告は保持した。
- **Target**：追加Scope承認 `dc8feb1` → 実装HEAD `5b185b92ba8d162805f084efdd07b1e4f9cb4285` の10ファイル差分と、今回そのソースから生成・展開した新規公開ZIP。main基準は `fda91afc6024e3bad677a5874ded6200402530c9`。開始時は `codex/developer-debug-ui`、HEAD `5b185b9`、clean、登録worktreeは元リポジトリ1件。
- **Evidence**：現行AGENTS・本計画の追加Scope／Constraints／DoD・QA Guide、差分、ゲームの両入口と保存／5操作のガード、ZIP生成／内容監査／失敗時保護、新旧テストとREADME、Implementer証拠を確認。公開game.jsではIIFE内のprivate constだけをfalseへ固定し、debug有効化とtest API公開の両方を停止する。debug UIをcreateしないためハンドラを接続せず、無敵・debug保存抑制も無効。ホスト名・親ページ・URLや上書き可能なグローバル設定での判定はない。公開変換は生成物だけに適用され、通常ゲームの数値・保存キー／format・ID／relic番号に変更はない。旧展開ZIPでdebug可能だったテストは、新しい公開用16条件の検証へ分離され、開発用の既存assertは保持されている。

| 今回実行した独立検証 | 結果 |
| --- | --- |
| `npm test`（`ASHFALL_PUBLIC_DIR` に今回の展開版を指定） | **PASS：190項目**。従来179項目と公開用モード11件。公開モード検証は推定の文字列変換ではなく今回の実展開game.jsを読み込み、通常／debug／test／両指定×日英でAPI／操作ハンドラ不在、通常の保存／装備補正・新ラン／ポーズ／タイトル・言語保存を確認。開発用両モード、戦闘／将来乱数・保存互換／拒否・日英の回帰もPASS。 |
| `tests/build-itch.ps1`（現ソースとhash一致の新規コピー上） | **PASS：9項目**。同梱14ファイルと公開変換の正確なbytes、version／参照探索／既存出力置換、宣言欠落／重複・debug／test入口ガード欠落・game.js非同梱で生成FAIL／旧ZIP維持、欠落ファイル／経路逸脱時保護、正本runtime不変を確認。元dist／ZIPを上書きせず、新規ZIPを別領域へ展開した。 |
| `npm run test:public:package`（今回の新規展開版） | **PASS：全16条件、ブラウザ例外0**。HTTP／file×通常／debug／test／test&debug×JA／EN。操作前のAPI不在・バッジ／入口／パネル非表示、全5操作ハンドラ不在と有効な値でのprogrammatic click無効、通常の装備補正／選択保存・開始／時計／ポーズ／再開・言語切替／再読込を確認。両指定4条件ではnative fullscreen／退出、通常戦闘での被弾／敗北・成績保存／未知フィールド維持・リトライも確認。公開HTTPのJA／ENタイトル画像を目視確認した。 |
| `npm run test:debug:browser` | **PASS：全7ケース、ブラウザ例外0、fullscreen=true**。開発用HTTP／fileの日英起動直後4条件、日英×3サイズ×2方式の12パネル条件、既存5操作・入力隔離／保存・ボス／結果／リトライ・全画面／blur／visibilityを確認。公開版をdebug用検証へ混ぜていない。 |
| `npm run test:public` / `npm run test:i18n:browser` | **PASS：9項目／5項目、ブラウザ例外0**。開発用ソースの通常画面・実クリック／キー／全画面／保存、日英・全23強化・1440×900／1024×640、HTTP／fileの回帰。 |

- **実行環境と初回失敗の切り分け**：Windows PowerShell、Node.js v22.23.1、専用headless Edge `154.0.4258.53` / CDP 9223、HTTP 4173。初回の専用profileでは拡張機能インストール用ページ・同期画面が自動で開き、公開ブラウザ検証はHTTPの6条件後にstartup timeout、後続のdebug／通常／i18nも初期化待ち・未定義エラーでFAILとなった。HTTPのHTML取得は200で、後から対象ページのi18n初期化完了も確認した。これらをPASSとして数えず、初回ログを保存した。拡張機能・同期を無効にした別の専用profileへ切り替え、ソース・生成物・テストのassertを変更せずブラウザ4コマンドだけを再実行し、上記すべてPASS。再実行時は対象ページ1件で拡張機能ページがないことも記録した。個々の拡張機能が失敗原因だったとは断定しない。
- **Verdict：重大な懸念なし**。公開ZIPでdebug／testを無効に固定する追加Scopeは、生成物の内容と通常動作を含めて独立確認済み。開発用両モードを維持し、今回の差分に追加の不具合は見つからなかった。
- **Bugs found**：なし。前回P2の初期表示修正も開発用起動回帰で維持されている。
- **Regression risks**：追加の必須修正なし。公開用処理は1か所のフラグ置換へ限定され、guard欠落時は生成を止める。13ファイルはソースとbyte一致、game.jsは指定の1置換以外byte一致を確認するため、公開向け変換の変更を検出できる。初回の失敗から、ブラウザ検証は拡張機能・同期のない専用環境で行い、ページ初期化失敗をゲームの結論と混同しないことが必要。
- **Browser/save/i18n concerns**：上記Edgeで公開版の全URL条件でもdebug保存抑制に入らず、装備補正／選択・成績・未知フィールドと独立言語設定を通常どおり保存することを確認。debug UIのhiddenだけに依存した保護ではなく、API／ハンドラの不在と有効値による実行試行も確認した。保存拒否の確認はVMに限る。初回ブラウザ失敗と再実行PASSは別の記録として残した。
- **Untested areas**：実itch.ioへのアップロード／iframe上の実行、Chrome／Firefox／Safari、headedの物理入力・OSフォーカス／実タブ切替、ブラウザ設定による実保存拒否、公開版の自然な長時間プレイ／勝利、音の聴感は今回未検証。公開ブラウザ検証は既存描画コールバックを捕捉して通常戦闘を進めるfixtureとCDP入力を使い、test APIやdebugヘルパーを使っていないが、人間プレイではない。Producerの既存10項目PASSは開発用UIの報告として保持し、実itch確認へ流用しない。
- **Required tests**：追加Scopeに対する必須ローカル自動検証の不足なし。実itch環境の確認は公開作業が別途承認された際の確認項目として残す。ホスト依存の有効化処理がないことは今回のソース・生成物監査で確認済み。
- **Release recommendation：技術面で進行可**。今回の公開ZIP無効化について独立QAは完了。Producerの最終判断・Sprint全体のDone記録、mainへのmerge／push／tag／外部公開は本レビューの権限で実施・承認しない。
- **証拠・Git状態**：新規証拠は [今回の公開ZIP独立QA領域](../work/qa-public-modes-20261006/) の `test.txt`、`packaging.txt`、今回のZIP（`package-source/dist/`）と展開版（`unpacked/`）、初回の `test-public-package.txt`／`test-debug-browser.txt`／`test-public.txt`／`test-i18n-browser.txt`。再実行PASSは `attempt2/` 内の同名ログ、`generated/work/public-package-browser/report.json`／PNG、`generated/work/debug-browser/report.json`／PNG、`browser-targets.json`。検証JSON・画像の出力だけを新規領域へ振り向け、既存QA／Implementer証拠・ZIPを保護した。追跡変更は本Review Resultsへの追記のみ、未ステージ・未コミット。branch・HEAD・worktree構成は開始時と同じ。コード／テストの修正・merge・push・tag・外部公開は行っていない。
- **追記後確認**：`git diff --check`、本計画／READMEのローカルリンク43件、正本／生成コピー14ファイルのhash不変、展開13ファイルの正本一致とgame.jsの正確な公開変換、既存証拠3716ファイルのhash維持、本計画の追記以外の不変を確認しPASS（`final-check.txt`）。今回起動した専用ブラウザとHTTPサーバーは終了した。

## Decisions

- Producer（Sprint終了後の公開準備、2026-10-06）：追加で0.8.1への版番号更新を行い、その後mainにマージし `v0.8.1` をタグ付け、ZIP化してitch.ioへアップロードする工程を指定。今回の版番号更新は終了後の明示追加依頼として実施し、Sprint 3本体の完了結果や過去QAの対象版は変えない。
- Producer（終了指示、2026-10-06）：QAレビューまで完了したためcurrent-sprintから残件を確認し、残件がなければSprintを閉じてコミットする。
- Director（終了判断、同日）：最新独立QA・Producer全項目PASS・全DoDの充足を確認しSprint 3をdoneとした。追加の採用条件はホストに依存しない公開ZIPの無効化と独立QAで満たしている。実itch環境の確認は公開時の工程へ、その他未検証範囲は既存QAの記録へ保持。公開ZIP対応による開発用操作の変更がないためProducer再プレイは不要。今回の終了文書コミットはProducerの明示指示で実施し、main統合・push・tag・公開とは分ける。
- Producer（実プレイ報告、2026-10-06）：提示された10項目はすべてPASS。目的の場面をすぐ用意できた。強化プルダウンの理解しづらさは開発者向けとして許容。itch.io上でデバッグモードが使えないことを条件に問題なし。
- Director（同日）：上記の条件を公開配布物の無効化として追加ScopeとDone条件へ反映し、Statusをin-progressへ戻した。開発用5機能の実プレイは完了、残作業は公開用無効化・関連検証・独立QA。公開ZIPでのdebugと同等操作が可能なtest APIも無効化する。これはProducer条件を満たすための配布対応で、ゲーム仕様変更や公開の承認ではない。
- Producer（2026-10-06）：次スプリントは開発者向けデバッグUI。任意のアップグレード付与・時間送り・ボス呼び出し・敵スポーン・無敵化を挙げ、current-sprintへの記載を指示した。
- Producer（時間送りの回答、2026-10-06）：経過時刻だけを進める方式を選択。戦闘も含めた早送りは含めない。
- Director：今回は5機能に範囲を絞り、保存・通常プレイ・入力・日英を守る動作と検証条件を具体化し、readyとした。先に候補として挙げたFPS／フレーム時間表示等は今回追加しない。ゲーム内容・バランスの変更は含めない。
- Git：今回の計画作成ではcommit／branch作成／merge／push／tag／公開を行わない。実装時のレビュー用コミットはConstraintsとAGENTSの既定方針に従う。
- Producer（2026-10-06、反映の追加指示）：隔離checkoutにある実装を元のリポジトリへ反映する。Implementerは元リポジトリの専用branchへ反映し、通常のレビュー用コミット方針を適用する。

## Next Sprint

未決定。デバッグUIの利用結果から必要な改善やゲーム本体の調整をProducerが選ぶ。ポータブル版の再開やScope外のデバッグ機能を自動で始めない。
