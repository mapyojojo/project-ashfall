# Sprint 2 — Tauri Portable PoC Comparison

## Status

done

2026-10-06（Asia/Tokyo）、Producerの明示指示でPoC比較スプリントを終了。Sprint 1のElectronとSprint 2のTauriのPoC作成・検証・実プレイ比較を今回までの成果として区切り、ポータブル版の正式採用・製品化と追加調査／修正は一旦保留する。独立QA／Engineering Reviewとcommit後clean checkoutビルドは完了。Electronの時折のカクつき、Tauriのフルスクリーン時のカーソル問題、未測定・未検証事項は未解決のまま繰り越す。doneはProducerが受け入れたPoC比較の終了を表し、製品品質・完全Portable・公開承認を意味しない。次スプリントの方針は開発者向けデバッグUI。

## Goal

既存ブラウザ版を維持してTauriのWindows向け最小PoCを作り、Sprint 1のElectron PoCとサイズ・起動条件・保存・再利用度・ビルド・保守・セキュリティを比較する。実測と未確認を分けた判断材料を揃え、正式方式の採用はProducerが判断する。

## Context

- Producer feedback（2026-10-05、Asia/Tokyo）：Electron PoCはWindows実機で通常プレイ可能だった。デスクトップ化の成立は確認できたが、約151 MiB ZIP / 約367 MiB展開後はProject Ashfallには大きい。Electron正式採用を保留し、Tauri PoCと比較して採用方式を判断する。
- Producer feedback（2026-10-06、Asia/Tokyo）：両PoCを実プレイ比較。ElectronはZIPが大きく、概ねよく動くが時折カクつく。TauriはZIPが小さいが、フルスクリーン中はポーズ時のカーソルがガクガクし、プレイ時には動かないカーソルが画面に残って邪魔になる。現状のストレスはElectronのほうが少なく、両方式とも完成版として難があるとの評価。原因・頻度・端末条件は未確定。
- Producer終了指示（2026-10-06、Asia/Tokyo）：今回までの両PoC作成・検証を区切りとしてスプリントを閉じ、次スプリントはデバッグUIとする。まず本currentへ状況を記録し、可能ならコミットする。次スプリントの計画への置換・実装は今回の終了作業に含めない。
- Baseline：Project Ashfall v0.8.0。Sprint 1完了コミットは `5f2a59ae4257c300c58a021380a880d3cce9f069`（`work/portable-build-feasibility`）。mainは `08f6f9665c67a92851324f6bccff5f973c813b85`。Sprint 2は完了コミットから `codex/tauri-portable-poc-comparison` を作成。開始時の既存変更はcurrentのSprint 2への切替のみで、内容を引き継ぐ。
- Electron実測基準：44.5.1 / Windows x64、ZIP 157,965,952 bytes（150.65 MiB）、展開384,979,036 bytes（367.14 MiB、89ファイル、profileなし）。ゲーム13ファイル145,955 bytes。ZIP SHA256は `83c826853340097db22c4b0bd64217db2ecdb50207e4c285a1785f53df7a0e5c`。再測定時に版・内容・圧縮条件を照合する。
- 現状：HTML/CSS/JSのclassic scripts、Canvas、Web Audio、日英。保存はlocalStorageのmeta `ashfall.v1`と独立言語 `ashfall.language`で、途中ラン保存はない。Sprint 1ではTauriをビルドしていない。
- 開発環境：前回はMSVC workload未確認だったが、今回は既存Rust/Cargo 1.98.1、MSVC 14.51.36231、Windows SDK 10.0.26100.0、WebView2 Evergreen 154.0.4258.53を確認。恒久toolchainの追加導入なし。Node 22.23.1／npm 10.2.1、Windows 11 10.0.26200／x64で実行。
- References：Sprint 1完了記録・独立QAは `git show 5f2a59ae4257c300c58a021380a880d3cce9f069:plans/current-sprint.md` で参照。[Portable調査](../docs/PORTABLE-BUILD-FEASIBILITY.md)、[Electron PoC](../desktop/portable-poc/README.md)、[雛形](sprint-template.md)、[README](../README.md)、[package.json](../package.json)、[storage.js](../storage.js)、[TEST-REPORT](../TEST-REPORT.md)、[WORKFLOW](../docs/ai/WORKFLOW.md)。

## Scope

- Tauriの公式資料と採用するstable版・CLI・Rust依存を実行時に確認し、URL・確認日・対象版を記録する。HTML/CSS/JSをビルド時に無変更で取り込む薄いWindows x64起動層を `desktop/tauri-poc/`へ隔離する。追加native commandや製品版ランチャーは作らない。
- Tauri最小PoCはWebView2 Evergreenを利用する構成を比較の出発点とし、ZIP展開後の起動を検証する。runtime同梱なしのEXE／ZIPだけで追加ランタイム不要とは判定しない。Fixed Version同梱・offline installerは比較上の代替として条件・ライセンス・サイズを調べ、未実測ならそう記録する。第2のruntime同梱PoCが必要になった場合は追加作業量と判断をProducerへ戻す。
- サイズ：TauriとElectronのEXE、配布ZIP、展開一式、初回起動後profileを別々に記録する。同じゲーム版・CPU・profileを除いた測定対象で比較し、runtimeの有無、圧縮条件、noticeを明示する。WebView2既存導入分・未導入時の追加ダウンロード／offline導入物も別欄にし、実測bytesとMiB（2^20 bytes）で示す。未測定のruntime込み合計を推定と区別する。
- WebView2依存・offline：runtime版・存在確認・未導入時の挙動、開発時とプレイヤー時の通信を分ける。導入済みPCの初回／以後offlineと、未導入クリーンPCの物理ネットワーク遮断済み初回起動を区別する。実測環境がない場合は未確認と必要な導入手順を残す。インストーラー不要・追加runtime不要・保存を含む持ち運びの3条件を別々に判定する。
- localStorage／保存：origin・アプリ識別子・WebView profile／データ保存先を記録する。ブラウザ版・Electronから分離し、既存キー・meta・未知フィールド・独立言語を保持する。再起動、終了後の日本語／空白パスへの移動、同一版更新配置、保存拒否を確認し、実ディスク条件とfixtureを区別する。持ち運びのためのprofile配置設定は起動層で検討し、成立しなければ制限として残す。
- HTML/CSS/JS再利用度・操作：同梱13ファイルと基準ソースのhash、直接file／HTTP起動の維持、日英、Canvas/Web Audio、WASD・矢印・照準・クリック・SPACE、ポーズ・全画面・フォーカスを確認する。×／Alt+F4からの終了・全プロセス終了・再起動、二重起動時のprofile／保存挙動もTauri側で検証する。Tauri側のPASSをElectron残件の解消とは扱わない。
- build手順・保守負荷：開発依存と実行時依存、Rust/MSVC/SDK/CLIの準備、lockfile・版固定、アセット生成、ZIP同梱物・ライセンス・再現手順を記録する。クリーンcheckoutでのビルドを確認し、環境を用意できなければ理由を残す。実作業・詰まった点と、将来のruntime／framework更新・保存互換・再配布の推定負荷を分けてElectronと比較する。
- セキュリティ：Tauriのcapabilities／permissions、IPC／native command、CSP、origin、外部navigation／popup、リモート資源、通常起動のdevtools／debug接続、profile ACLを確認する。不要なnative権限・pluginを加えず、sandboxやセキュリティ設定を無効化して検証を通さない。ElectronのNode無効・contextIsolation／sandbox、権限check/request不足、CSP／fuse等のQA指摘と比較し、設定確認と実行検証を分ける。
- 比較結果は進行可／条件付き／見送りの技術提案、両方式の利点・制限・未確認・次の最小確認をまとめる。Electron残件は独立して追跡し、正式採用はProducerへ提示する。

## Non-goals

- ゲーム内容・灰縫い・バランス・入力仕様・UI／日英文言・音／演出を変更しない。
- 保存形式・保存キー・upgrade ID／relic番号を変更しない。途中ラン保存、ブラウザ／Electronからの移行・共有・クラウド同期を実装しない。
- 既存ブラウザ版、itch配布スクリプト、Electron PoCの実行コードを変更しない。ElectronのQA残件の修正・再検証は今回のTauri比較Scopeに混ぜない。
- macOS／Linux／追加CPU対応、製品installer、自動更新、署名取得、CI/CD整備、正式配布・公開・リリース版番号変更を行わない。
- 正式方式の採用決定はProducerに残す。不足toolchainの恒久導入は別途承認が必要。

## Constraints

- [AGENTS.md](../AGENTS.md)を適用し、ブラウザ版を正本として直接file／HTTP起動・itch ZIP生成を維持する。
- ゲームアセットはビルド時に参照・生成し、手修正のゲームコピーや新しいfrontendビルド基盤を導入しない。ルートpackageを変更せず、PoCの依存・ソース・成果物を隔離する。
- 新規依存は最小限、版とlockfileを固定する。不足toolchainの恒久導入は今回承認されていない。実装着手時に隔離環境の可否と必要な準備を確認し、環境条件が満たせなければ理由・影響・次の選択を記録する。
- ブラウザ／Electronの既存profile・検証証拠・成果物を上書きしない。保存試験は専用profileで行い、Tauriの実測だけから完全Portable・別PC互換・初回offlineを保証しない。
- ElectronのクリーンPC初回offline、Alt+F4、二重起動、権限check/request両経路（P2）、独立GUI検証FAILその他のQA残件は未解決。比較や通常プレイ確認を解消の代替にせず、正式配布・merge前の条件として保持する。
- Git：Sprint 1完了コミットから `codex/tauri-portable-poc-comparison` を作成して実装する。Sprint 2計画・実装のコミットは別途指示がない限り行わない。mainへのmerge・push・公開は行わない。
- Gitの終了時例外（Producer、2026-10-06）：本終了記録、既存の独立QA追記・実プレイ結果、および比較文書の整合更新を含む文書2件のコミットを許可。先行の実装コミットと区別し、生成物・無関係な変更を含めない。mainへのmerge・push・tag・公開は行わない。
- 生成ZIP・展開物・profileは `dist/`、キャッシュ・ログ・検証画像等は `work/`へ置き、既存ignoreに従う。PoCのソース・設定・lockfile・再利用可能なbuild／検証手順のみGit管理する。

## Deliverables

- この計画・進捗の正本：`plans/current-sprint.md`。Sprint 1は上記完了コミットの履歴で参照する。
- 実行時に作成する `desktop/tauri-poc/`：最小起動層、固定依存・lockfile、設定、アセット生成・ビルド手順、検証手順。配置の詳細は実装時に決める。
- 実行時に作成する `docs/TAURI-PORTABLE-POC-COMPARISON.md`：公式資料、Tauri／Electron比較、測定条件・サイズ、WebView2／offline／保存、再利用・build・保守・セキュリティ、QA残件、推奨・制限・Producer判断。
- 実行時のみ、既存Electron／itchとは別名のTauri Windows x64成果物と `work/`内の検証証拠。生成物はGit対象外。

## Definition of Done

終了条件の扱い（Producer、2026-10-06）：PoC作成・検証・実プレイ比較と保留判断を受け入れて終了する。下記の元の条件のうち、同条件容量比較の不足と製品化に向けた個別プレイ／環境確認は終了条件から外して繰り越す。未達をPASSや不要として書き換えず、未完了の項目と理由を保持する。

- [x] Tauri最小PoCが既存ゲームソースの無変更再利用でビルド・展開・起動でき、同梱hashと対象環境を記録している。
- [ ] 【繰越】Electronとの配布サイズ比較が同じゲーム版・CPU・測定対象で揃い、EXE／ZIP／展開／profileとWebView2追加容量を区別している。EXE／ZIP／展開は測定済み。Tauri初回profileは4.68 MiB、Electronは今回の容量測定でタイトルwindowへ未到達のため初回未測定。未導入時download／installer／Fixed容量も未実測。Producerがポータブル版の進行を保留したため、今回の終了条件から外す。
- [x] WebView2依存とPortableの3条件、導入済み／未導入、初回／以後offlineを実測・公式根拠・推定・未確認に分けて説明できる。
- [x] origin・識別子・保存先・ブラウザ／Electronとの分離、meta／未知フィールド／独立言語、再起動・移動・更新・拒否の確認と限界を記録している。
- [x] HTML/CSS/JS再利用度、開発／実行依存、build再現手順・notice、更新と保守負荷、セキュリティ設定・実行検証を比較できる。commit後clean checkoutビルドは2026-10-06の独立QAでPASS。byte単位の再現性は保証しない。
- [x] `npm test`、関係する入力・保存・i18n・file／HTTP確認、`powershell -NoProfile -ExecutionPolicy Bypass -File ./tests/build-itch.ps1`、Tauri通常起動・終了／再起動・二重起動・offline等をPASS／FAIL／SKIP／未実施と環境付きで記録する。必要な既存parity生成物は検証前のbytesへ戻し、新しい証拠はworkへ分離する。
- [x] 実行不能・未検証の理由と採用判断への影響を記録し、ElectronのQA残件を解決済みとせずに引き継いでいる。必要な追加検証が残る場合は待ち状態を明記する。
- [x] PoC比較に必要な独立QAとProducerの実プレイ比較を完了し、結果・制限・終了判断を記録した。元のProducer Playtestの全個別シナリオは未確認部分を残すが、Producerの明示した終了判断により製品化再開時へ繰り越す。自己確認・独立レビュー・人間の観察は区別する。
- [x] 比較材料と制限をProducerへ提示し、ポータブル版の進行を一旦保留して本スプリントを閉じるProducer判断を記録した。正式方式は採用していない。
- [x] 変更ファイル・検証結果・未検証事項・残るレビュー／人間確認・branch／commit／worktree状態を本記録と比較文書へ記録。
- [x] Producerが残課題の繰越を受け入れ、次スプリントの方針を開発者向けデバッグUIと決定した。

## Required Reviews

- Game Design Review：原則不要。ゲーム・バランス・文言を変更しないため。入力・表示・音・テンポに体験上の懸念が出た場合は [Game Design Guide](../docs/ai/REVIEW-GUIDE-GAME-DESIGN.md)に沿って対象を限定して依頼する。
- 終了時の扱い：実プレイで操作感の懸念は出たが、今回はPoC比較の受け入れと保留で終了し、ゲーム仕様・入力・バランスの変更は行わない。追加のGame Design Reviewは今回不要。問題修正を再開する際に対象・必要性を改めて決める。文書の終了整理はDirectorの自己確認で扱い、独立レビュー済みとは記録しない。
- QA / Engineering Review：必要、2026-10-06の独立レビュー完了。[Review Results](#review-results)参照。対象環境のPoC比較は条件付き進行可、正式採用・配布は判断保留。後続のProducer実プレイで報告されたカーソル問題・カクつきは、このレビューで再現・解決済みとは扱わない。修正した場合は関係する回帰と独立QAを行う。

## Producer Playtest

- Required：PoCの実プレイ比較とProducer判断が必要。比較報告と進行保留・スプリント終了判断は得られた。以下の元の個別シナリオは実施状況を保持し、未報告部分は製品化再開時へ繰り越す。Implementerの自動操作とは区別する。
- Scenarios：Tauri ZIPを別フォルダへ展開し、test/debugなしで起動。日英切替、開始・移動・照準・灰縫い、全画面／Esc・ポーズ、Alt+Tab、音、短いラン終了、×／Alt+F4・再起動、meta／言語保持、終了後の移動を確認。offline条件はruntime導入状態とネットワーク状態を記録する。元ブラウザの記録と起動が維持されることも確認する。
- Observations：起動手順と追加導入の負担、サイズ差、入力・表示・音の差、保存と持ち運び、警告・セキュリティ上の制限。個別確認と利用環境を記録し、通常プレイだけで全QA項目をPASSにしない。
- Result / Decision：2026-10-06、Producerが両PoCを実プレイ比較。正式採用せず、ポータブル版の進行を一旦保留し、PoC比較としてスプリントを閉じると決定。以下に報告された観察を記録する。
  - Electron：ZIP容量が大きい。概ねよく動く印象だが、たまにカクつく。
  - Tauri：ZIP容量が小さい。フルスクリーン時、ポーズ中のカーソルがガクガクする。プレイ中はカーソルが画面に残り、動かないため邪魔になる。
  - 比較評価：一長一短あるが、ストレスが少ないのはElectron。完成版として出すにはどちらも難がある。
  - 確認範囲：端末・OS／Runtime・配布ZIPの特定、各シナリオの実施状況、カクつきの頻度・場面、Tauriのウィンドウ表示時との違い、照準自体への影響は未報告。音・保存・終了・offline等の個別項目を、この報告だけでPASSにしない。

## Open Questions

以下はポータブル版の再開時に扱う繰越事項。今回の終了や次スプリントのデバッグUI作成を待たせる条件にはしない。解決・確認済みとは扱わない。

- Portable最終要件：インストーラー不要、追加runtime不要、保存を含むフォルダ持ち運びのどこまで必須か。
- WebView2未導入の端末をどこまで支えるか。Evergreen導入の許容、offline導入物／Fixed Versionの必要性は比較後にProducerが判断する。
- Windows対象版・CPU、許容ZIP／展開サイズ・runtime込みサイズ、クリーンPCと別PC検証環境は未指定。
- 実プレイ問題の再現条件：Tauriはウィンドウ／フルスクリーン、プレイ／ポーズ／復帰でどう変わるか。Electronのカクつきはどの場面・頻度で起きるか。同じ場面のブラウザ版との比較は未実施。
- ElectronのP2権限設定・終了／二重起動等の残件を解消する工程は未決定。Tauri比較とは別に正式配布・merge前の条件として残る。
- 未測定・未検証：Electronの同条件初回profile、WebView2未導入時の追加容量、物理ネットワーク遮断済み起動、未導入クリーンPC、別PC／別ユーザーの保存、native disk拒否・容量枯渇・破損、Runtime更新、物理入力・音・終了等の未報告シナリオ、署名・正式再配布審査。詳細は独立QAのUntested areasと比較文書を参照。
- デバッグUI：次スプリントのテーマは決定済み。具体的な機能・有効化方法・保存との分離・Scope・Done条件は次スプリントの計画で確定する。これまでの任意ビルド・敵／ボス呼出し・負荷表示は候補であり、今回の終了作業では実装しない。

## Execution Results

### 計画作成時の記録

- 2026-10-05：Producer依頼に基づき、このdraft計画を雛形の15セクションに沿って作成。Sprint 1完了記録・比較調査・独立QAと残件を参照した。
- Sprint 1のコミット準備は`.git/index.lock`作成のPermission deniedで停止。currentはSprint 1のdone記録を維持し、Sprint 2計画を別ファイルに保存した。既存ゲーム・Electron実行コードは変更していない。
- 計画作成時点ではTauriの公式資料再調査、toolchain準備、PoC実装、依存取得、ビルド、サイズ実測、セキュリティ／offline／保存検証は未着手だった。以下の実行結果と区別する。
- 計画の自己確認（計画作成時）：Sprint 1・Sprint 2とも雛形15セクションと順序が一致。計画・完了記録・調査文書のローカルリンク42件、Sprint 1 done／Sprint 2 draftと未完了チェック、Electron package／lockの版44.5.1一致、対象10ソース／文書の末尾空白と `git diff --check` はPASS。PoC JavaScript 3件・PowerShellの構文もPASS。生成物のignore、ステージなし、Tauriディレクトリ未作成を確認。当時の変更は文書のみで、ゲームテストは記録済み結果を保持し再実行していない。

### 実行結果（2026-10-05〜06、Asia/Tokyo）

- Producerの明示した実装・比較検証Scopeを実行。開始branchは `work/portable-build-feasibility`、HEAD `5f2a59ae4257c300c58a021380a880d3cce9f069`。既存変更はcurrentのSprint 2切替のみ。`.git/index.lock`の書込制限にはツールの承認経路を使い、専用branch `codex/tauri-portable-poc-comparison` を作成した。HEADは同じ、commit／merge／push／公開は行っていない。
- 変更ファイル：`desktop/tauri-poc/`の起動層・設定・固定依存／lockfile・生成／build・検証／測定／再現スクリプト・README、[比較文書](../docs/TAURI-PORTABLE-POC-COMPARISON.md)、本current。ゲーム本体・保存／言語・ルートpackage・itch・Electronの実行コードは無変更。生成物・cache・profile・証拠はdist／work、依存とgen schemasもignore対象。
- Tauri 2.12.1／CLI 2.12.1／tauri-build 2.7.1を固定。既存toolchainを使い、恒久導入なし。npm／Cargo取得時はsandboxのnetwork制限に対して承認経路で取得した。最終fresh-source再ビルドは新規target、offline npm ciと専用Cargo cacheでPASS（約123秒）。最終commitのclean checkoutは未実施で区別する。
- `npm test`：PASS、159件、FAIL／SKIPなし。[回帰証拠](../work/tauri-poc/regression-1791208249668/)。public／v08 parity JSONは実行前bytesへ復元。`tests/build-itch.ps1`：PASS、6件、既存itch ZIPを保持。
- `verify-browser.ps1`：最初の150ms fullscreen待機でFAIL、検証コピーの150〜400ms待機だけ1500msへ延長した再実行はPASS（public 9件＋i18n 5件）。Edge 154.0.4258.53、HTTP／file、日英・全23カード・保存・全画面を確認。[再実行証拠](../work/tauri-poc/browser-1791213616197/)。元ゲーム・テスト期待値は変更していない。
- 最終配布ZIPの `verify.cjs`：PASS、16項目。[JSON証拠](../work/tauri-poc/verify-1791214057957/verification.json)。debug環境変数なし通常起動、WM_CLOSEと捕捉全子プロセス終了、12埋込みJS／CSS hash、日英、live Canvas／Web Audio、入力・灰縫い、全画面・ポーズ、保存・未知フィールド、再起動・二重起動拒否、日本語／空白パス移動、同一版EXE置換、外部／別port navigation・popup・通知・未付与native権限拒否、CSPを確認。敵／結果／保存拒否とblurはfixture、offlineはrenderer emulation。
- Tauri ZIP 1,401,175 bytes（1.34 MiB）、展開5,304,789 bytes（5.06 MiB）、EXE3,158,528 bytes（3.01 MiB）。同梱対象13ファイル145,955 bytesは既存Electronと完全一致。ZIP SHA256は `655610be3132c5b075cb9bcf946326d8f6b3bd4b06fe7f01c199c595e71b7745`。[build input／成果物一致](../work/tauri-poc/final-build-source-audit.json)もPASS。
- [初回profile測定](../work/tauri-poc/profiles-1791214721499/measurements.json)：Tauriは新規タイトル2秒後4,909,281 bytes（4.68 MiB）。Electronは20秒以内にMainWindowHandleが得られず全体FAIL、初回profile未測定。stdout／stderrは空で原因未確定。旧Electron fixture 6.88 MiBは別条件と区別する。[容量比較](../work/tauri-poc/size-comparison.json)に測定・未実測を記録。
- アイコン不足、Cargo metadata buffer上限、verifierのfullscreen待機・通知検証式・profileコピーの中断と、容量測定helperのJSON配列処理は修正し旧証拠を保持。native起動層／最終ZIPの成功と、Electron容量測定の未到達を混同しない。
- 未実施：実ネットワーク遮断済みの初回／以後offline、WebView2未導入クリーンPC、別PC／別ユーザー、実ディスクACL拒否・容量枯渇・破損、物理Alt+F4／Esc／Alt+Tab・聞こえる音・自然なラン終了、Runtime更新／downgrade、正式再配布審査・署名等。独立QA／Engineering ReviewとProducer実機比較／採用判断待ち。ElectronのP2等は未解決のまま継続。
- 最終文書／構文確認：ローカルリンク30件、雛形15セクションと順序、PoC CJS 4件とPowerShell 5件の構文、CLI／lockの版一致、`git diff --check`はPASS。通常タイトルとlive Canvasの画像も自己確認。ゲーム本体・既存tests／parity記録へのGit差分なし。独立レビューや人間の音／体感判断として数えない。
- 終了Git状態：branch `codex/tauri-portable-poc-comparison`、HEADは基準 `5f2a59a`、worktreeはcurrent変更と新規Tauri PoC／比較文書、ステージなし。Git worktree追加なし。生成ZIP・profile・cacheはGit対象外。

### スプリント終了整理（2026-10-06、Asia/Tokyo）

- 担当：Director。Producerの終了指示に従い、Statusをdoneへ更新。Sprint 1のElectron PoCと本SprintのTauri PoCの作成・検証・実プレイ比較を成果として受け入れ、正式採用／製品化を保留する判断、元の終了条件の未達部分の繰越、デバッグUIを次スプリントとする方針を記録した。先行の実装／レビュー記録は当時の状態として保持する。
- 検証済み成果の要約：ブラウザ正本・13ゲームファイル・保存形式・日英は無変更。独立QAでゲーム159件、itch配布6件、ブラウザ再実行14件、元Tauri ZIPとclean checkout生成ZIPの各16項目、clean checkoutビルドがPASS。ブラウザ初回FAILとElectron容量測定FAILを消さず、実プレイのカーソル問題・カクつきとも区別する。
- 変更対象：本currentと[比較文書](../docs/TAURI-PORTABLE-POC-COMPARISON.md)。開始時の既存文書2件の差分（独立QA追記・Directorの実プレイ整理）を保持して終了記録へ含める。コード・生成ZIP・profile・証拠への変更なし。新しいスプリントへの置換やデバッグUI実装は未着手。
- 終了整理の確認：ローカルリンク42件、雛形15セクションと順序、done／Producer判断／繰越／次スプリントの文書間整合、既存独立QA本文のhash一致、`git diff --check`はPASS。コード差分なし。文書のみのためゲームテスト・ビルドは再実行せず、先行の検証証拠を参照する。
- Git：branch `codex/tauri-portable-poc-comparison`、終了作業開始HEAD `9f6808961eb768bf04b2d09d0f0eab70ef6c62cd`。開始時は文書2件が未ステージ。Producerが終了記録のコミットを許可。コミットの成否・最終HEAD／worktree状態は終了報告で示し、この終了記録を含むコミットはGit履歴から参照する。mainへのmerge・push・tag・公開、worktree登録追加は行わない。

## Review Results


レビュー前の引き継ぎ時点：独立QA / Engineering Reviewは未実施だった。Implementerの自己確認は最終ZIPで16項目PASS、既存ゲーム159件・配布6件・ブラウザ14件PASS、fresh-source再ビルドとbuild input一致PASS。独立レビューとして扱わない。Game Design Reviewは現Scopeでは不要。Sprint 1の独立QAとProducer確認は、本スプリントのTauri検証結果に流用しない。現在の独立QA結果は以下、後続の実プレイ結果はProducer PlaytestとDirector統合を参照。

### QA / Engineering Review — 2026-10-06（Asia/Tokyo）

Reviewer: Codex、このQA専用の別会話。実装会話から独立したQA / Engineering Reviewer。実装・修正・仕様変更・採用判断は行わず、本節のみ追記した。上段の「独立レビュー未実施」や実行結果の「commit後clean checkout未実施」はレビュー前の引き継ぎ時点の記録として保持する。今回の独立QAは完了したが、Status・Doneチェック・Producer判断は変更しない。

Target: Sprint 2 — Tauri Portable PoC Comparison。基準 `5f2a59ae4257c300c58a021380a880d3cce9f069`、実装コミット `c9cc7c4`、レビュー時HEAD `9f6808961eb768bf04b2d09d0f0eab70ef6c62cd`、branch `codex/tauri-portable-poc-comparison`。主対象は `desktop/tauri-poc/`、比較文書、Sprint記録、配布ZIPとwork内証拠。後続HEADのAGENTS／WORKFLOW／雛形変更は運用指示として確認し、Tauri実装と区別した。開始時worktreeはclean、ステージなし。

Evidence:

- AGENTS、現Sprint、ROLES、QA Guide、WORKFLOW、Sprint 1の独立QA、比較文書、PoCのソース・設定・lockfile・build／検証手順、現行package・保存・入力、TEST-REPORTとi18n検証文書を確認。Implementerの証拠と今回の独立実行結果を区別した。
- Reviewer環境：Windows 11 `10.0.26200` / x64、Node 22.23.1、npm 10.2.1、Rust／Cargo 1.98.1、既存MSVC／SDK、Edge／WebView2 Evergreen 154.0.4258.53。通常の実行環境で検証し、toolchain導入、ACL変更、sandbox無効化は行っていない。
- `verify-regression.ps1`から `npm test` と `tests/build-itch.ps1` を独立再実行：**PASS、159件（FAIL／SKIPなし）＋配布6件**。[回帰証拠](../work/tauri-poc/regression-1791217529041/)。既存parity JSONは実行前bytesへ復元、既存itch ZIPは保持。
- 元の配布ZIPで `node desktop/tauri-poc/verify.cjs` を独立再実行：**PASS、16項目、runtime exception 0**。[今回のTauri検証JSON](../work/tauri-poc/verify-1791217528748/verification.json)。引数・CDP環境変数なし通常起動、native WM_CLOSEと捕捉子プロセスの終了、埋込み12 JS／CSSのhash、日英・meta不変・未知フィールド・relic番号、Canvas／Web Audio、WASD／矢印／照準／クリック／SPACE、全画面・ポーズ、終了／再起動、二重起動拒否、日本語／空白パスへの終了後コピー、同一版EXE置換、外部／別port navigation・popup・通知・未付与native command拒否、CSP、renderer offline emulation、保存拒否fixtureを確認。今回の英語1024タイトルとlive Canvas画像も目視確認した。
- `verify-browser.ps1`の初回独立実行は**FAIL**：publicテスト冒頭の版番号表示が `''`、期待値 `v0.8.0`。その時点で後続public／i18nは未到達。[失敗ログ](../work/tauri-poc/browser-1791217596286/public-browser.cjs.log)。clean build完了後、**ソース・helper・期待値・待機時間を変更せず**同じコマンドを再実行し、**PASS、public 9件＋i18n 5件、例外0**。[再実行証拠](../work/tauri-poc/browser-1791217749366/)。EdgeのHTTP／直接file、日英・全23カード・保存・小画面・全画面／ポーズを確認。helper既定のwork内コピーと1500ms待機を使用し、元testsは無変更。
- ZIPを独立に読み取り、Tauri **1,401,175 bytes ZIP／5,304,789 bytes展開／4ファイル**、Electron **157,965,952 bytes ZIP／384,979,036 bytes展開／89ファイル**と両SHA256が比較文書に一致することを確認。[ZIP監査](../work/tauri-poc/qa-review-20261006/zip-audit.json)。profileがZIPに含まれないこと、Tauri EXE 3,158,528 bytes、runtime未同梱を確認。両manifest・Electron同梱13ファイル・現ソースは145,955 bytesとhashが一致し、Git基準ともCRLF／LFを除いて同一。ゲーム・tests・ルートpackage・Electron実行コードへの基準差分なし。[静的監査](../work/tauri-poc/qa-review-20261006/static-audit.json)。
- **commit後のclean checkoutビルドは今回独立PASS**。work内へローカルcloneし、HEAD `9f6808961eb768bf04b2d09d0f0eab70ef6c62cd`をdetached checkout。ソースoverlayなし、新規target、既存専用cacheのoffline npm ci、Cargo offline／locked、無変更の `build.cjs` で約150.4秒。[ビルド証拠](../work/tauri-poc/qa-review-20261006/clean-build.json)、[buildログ](../work/tauri-poc/qa-review-20261006/build.log)。QA集計コマンドは空のgit status出力がログファイルを生成しないためbuild成功後に一度終了1となったが、集計を再取得しbuild自体の終了0と成果物を確認した。PoC修正やbuild再実行はしていない。
- クリーンcheckoutで生成した別ZIPも同じ `verify.cjs` で**PASS、16項目、例外0**。[再ビルド成果物の検証](../work/tauri-poc/qa-review-20261006/checkout/work/tauri-poc/verify-1791217772982/verification.json)。13ゲームファイルとnotice bytesは元ZIPに一致。READMEはLF／CRLFのみの40 bytes差、EXEサイズは同じだがEXE／ZIP hashは異なる（新ZIP `5f2e8320e8f6f4cb6b8e3a28e27aec910bc73307d34bcb5048c240ebf79ea3e6`）。ビルド手順と動作の再現成功として扱い、byte単位の再現性は保証しない。checkoutの追跡ファイルは検証後もclean。
- capabilities設定に加えて新規buildの生成 `capabilities.json` が `{}`であること、追加command／pluginなし、正確なorigin制限、popup／permission／download拒否、devtools無効、CSPを確認。解決済みtauri-utils 2.10.1では空capabilities指定だけで将来追加したcapabilityファイルを除外するわけではないため、現状ファイル不在と生成結果も照合した。[Tauri公式Capabilities](https://v2.tauri.app/security/capabilities/)と[Microsoft公式WebView2配布説明](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)を再確認。版固定のdocs.rs APIページは今回取得できず、権限拒否・devtools設定の経路はローカルの解決済みwry 0.57.0／Tauriソースと実行結果で確認した。

Verdict: **判断保留（正式採用・配布に対して）**。Evergreen導入済みのこのWindows PCでPoC比較を進める範囲では、重大な懸念なし。新規の必須修正事項は検出していない。独立QA成功を、未導入PC・別PC・実offline・人間の操作感確認やSprint全体のDoneへ拡張しない。

Regression risks:

- ブラウザ正本・保存形式・言語・入力仕様は無変更で、回帰・file／HTTP・両Tauri成果物の独立検証もPASS。今回の対象差分に起因するゲーム回帰は検出していない。
- ブラウザhelperの固定待機は今回一度失敗した。初回はRustビルドと並行していたため負荷・起動完了待ちの不足が候補だが、原因は未確定。再実行PASSで初回FAILを消さず、将来の検証手順ではゲーム初期化完了を条件で待つ方法を検討する。
- profileの移動は終了後・同一PCのコピーまで。OS暗号化／別ユーザー、Runtime更新・downgrade、強制終了後に子プロセスが残る場合の即再起動は未検証。Evergreenの更新で動作条件が変わるため、固定Tauri版だけで将来の保存・入力互換を保証しない。

Bugs found: 新規のゲーム・保存・i18n・Tauri起動層の不具合は再現なし。上記のブラウザテスト初回FAILは検証の不安定さ／原因未確定として残す。Electronの既知P2（権限check/request両経路の不足）は未解決・今回の修正対象外。

Untested areas:

- 物理ネットワーク遮断済みの導入済みPC初回／以後起動、WebView2未導入クリーンPCの初回起動、未導入時追加download／offline installer／Fixed Version容量。今回の環境にはEvergreenがあり、物理遮断・未導入の別環境を用意していない。
- 別PC／別ユーザー／Windows 10／arm64、実ディスクACL拒否・容量枯渇・profile破損、強制終了、異なるゲーム版／Runtime更新・downgrade。既存profileやACLを変更して代替していない。
- 物理Alt+F4／Esc／Alt+Tab、repeat／長押し・実visibility、DPI、聞こえる音・自然な短いラン・操作感。WM_CLOSE、CDP入力、合成blur、敵／結果fixtureはこれらの人間確認とは別。
- download拒否・devtoolsショートカット・全権限API・CSP違反ケース・Runtime全体の通信の網羅的な実行検証、署名／SmartScreen／Defender／企業policy、正式な再配布ライセンス審査。設定確認と実行PASSしたケースを区別する。
- Electron初回profileはImplementerの容量測定FAILのまま、今回再測定しない。旧fixture容量を同条件測定の代用にしない。Sprint 1の独立GUI FAIL・offline・Alt+F4・二重起動・権限P2等も今回のTauri PASSでは解消しない。

Browser/save/i18n concerns: 日英の表示／操作、切替時meta bytes不変、未知フィールド・relic番号・独立言語保持、再起動・移動・同一版置換を独立確認。origin `http://tauri.localhost`、識別子 `local.ashfall.tauri-poc`、EXE横 `data/EBWebView/`はブラウザ／Electronから分離する設計に整合。途中ラン保存なし。localStorage getter拒否fixtureのPASSはnative profile作成失敗・disk書込失敗時の起動保証ではない。追加runtime不要はEvergreen既存導入時に限り、保存持ち運びは別PC未確認。[Microsoftの配布条件](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)とも整合する。

Required tests: Producerの通常起動・音・入力・短いラン・終了／再起動の実機比較。Portableの必須条件を決めた上で、必要対象PCの物理offline／未導入時起動と別PC・別ユーザー保存を最小追加確認する。初回profile比較を完了するならElectron未到達の原因確認と同条件再測定、runtime同梱方式を比較するなら対象版の追加容量実測が必要。ElectronのQA残件は別工程で再確認する。commit後clean checkoutについては今回のHEADで補完済みで、修正がなければ同じビルドの追加再実行は不要。

Release recommendation: **Evergreen導入済みWindowsでのProducer比較へ条件付き進行可。正式採用・製品化・配布は判断保留**。サイズ比較はruntime未同梱のTauriとruntime同梱のElectronであることを保ち、未完了の同条件profile／追加runtime容量・環境検証とProducer判断を残す。mainへのmerge・push・tag・公開の承認ではない。

終了状態: Git管理対象の変更は本 `plans/current-sprint.md` のReview Results追記のみ。証拠・clone・生成物はignore対象のwork内、既存ZIP・profile・証拠は保持。branch `codex/tauri-portable-poc-comparison`、HEAD `9f6808961eb768bf04b2d09d0f0eab70ef6c62cd`、未ステージ、commit／merge／pushなし。Git worktree登録の追加なし。検証対象Tauri親プロセスと専用4173／9226／9237 listenは終了後に検出されなかった。

### Director統合 — 2026-10-06（Asia/Tokyo）

以下はProducerの終了判断前の整理。問題の最小調査を提案したが、Producerはポータブル版を一旦保留し、次はデバッグUIに進むと決定した。調査・修正は将来の再開候補として保持する。

- 独立QAの対象環境での成立確認と、Producerの操作感評価を併記する。QAのPASSは物理カーソルの滑らかさ・非表示やフレームの安定を保証していない。今回の実プレイ報告で、Tauriのカーソル表示・移動とElectronの時折のカクつきが新しい採用判断上の懸念になった。
- プロダクト優先順位に照らし、Tauriの小さいZIPだけで操作感の問題を受容しない。Electronのストレスが少ないという評価も、カクつき・配布容量・既存QA残件の解消や正式採用を意味しない。
- 原因は未確定。Tauriのフルスクリーン／カーソル制御、Electronの描画負荷や起動層などは調査対象の仮説であり、framework固有の限界や修正の容易さを断定しない。
- 次の候補：まずTauriのカーソル問題をプレイ／ポーズ／復帰・ウィンドウ／フルスクリーンで再現し、操作仕様を保った修正が可能かを調べる。Electronはカクつきの発生場面とフレーム時間を確認する。両方とも同じ場面・条件をブラウザ版と比較し、ゲーム側と起動層の問題を切り分ける。第三の方式のPoCより、この最小調査を先にすることを提案する。
- 次回の成功条件案：Tauriはフルスクリーン中もメニューのカーソルが滑らかに動き、プレイ中の停止したカーソルが邪魔をせず、照準とポーズ復帰が正常。Electronはカクつきの条件・原因候補・対処可能性と費用が説明できる。最終的な改善判定はProducerの再プレイで行う。
- これはDirectorの候補整理であり、実装・調査スプリントの承認ではない。現SprintのScope／Non-goalsを拡大せず、Electron側の調査・修正とTauri側の修正を次回の承認範囲で明示する。入力仕様・ゲーム内容・保存・日英を変更する提案は含めない。
- 今回は本記録と[比較文書](../docs/TAURI-PORTABLE-POC-COMPARISON.md)のみ更新。既存の独立QA追記を保持。ローカルリンク40件、雛形15セクションと順序、Statusの整合、`git diff --check`はPASS。コード差分なし。ゲームテストは再実行しない。branch `codex/tauri-portable-poc-comparison`、HEAD `9f68089`、両文書は未ステージ。commit／merge／pushなし、worktree登録の追加なし。再現・原因調査・修正・Producer再確認は未実施。

## Decisions

- Producer（終了指示、2026-10-06）：今回までのElectron／TauriのPoC作成・検証・実プレイ比較を区切りとして本スプリントを閉じる。ポータブル版の進行と正式方式の採用を一旦保留し、次スプリントは開発者向けデバッグUIとする。残る不具合・未測定・未検証と元のDone条件の未達部分は再開時へ繰り越す。終了記録のGitコミットを許可する。
- Director（終了整理、2026-10-06）：上記のProducer判断を受け、比較スプリントをdoneとした。下記の実行・レビュー・playtest移行判断は当時の履歴として保持する。製品化・公開の承認や未実施検証のPASSへは拡張しない。
- Producer：Electronのデスクトップ化成立は確認できたが配布サイズは大きく、正式採用を保留する。次はTauri PoCとElectronを比較する。
- Producer（実プレイ報告、2026-10-06）：現状の操作ストレスはElectronのほうが少ないが、Electronは容量・時折のカクつき、Tauriはフルスクリーン時のカーソルに難があり、どちらも完成版として出すには難がある。正式方式は選択されていない。
- Director（2026-10-06）：独立QA完了と実プレイ比較の報告を受け、Statusをplaytestへ更新。正式採用を急がず、操作感の問題の最小調査を次回候補とする。原因調査・修正のScope確定はProducerに残す。
- Implementer（2026-10-06）：Evergreenを利用できるWindows環境ならTauriの実機比較へ条件付き進行可。WebView2未導入PCを追加runtimeなしで支える要件は現構成で満たさない。正式方式の採用／保留／追加調査はProducer待ち。
- Producer（計画作成時）：Sprint 2の計画作成まで。正式方式の採用判断はProducerに残す。
- Producer（実行指示、2026-10-05）：Sprint 2の実装・比較検証まで進める。計画作成時の実装停止を解除する。恒久toolchain導入・commit・merge・push・公開の追加承認は含まない。
- 計画上の比較方法：Evergreen構成のTauri最小PoCを出発点に、runtimeを含まないサイズと未導入端末で必要な追加物を分ける。Fixed Version／offline導入物の値は実測の有無を明記し、Tauriが小さいとの結論を先取りしない。
- Implementer（計画作成時）：Sprint 1コミットが書込制限で止まったためcurrentをdoneのまま保持し、本計画を別ファイルへ保存した。実行開始時にはSprint 1コミット完了とcurrentへの切替を確認し、基準hash・履歴参照を更新した。

## Next Sprint

Producer決定（2026-10-06）：Sprint 3のテーマは開発者向けデバッグUI。ビルドや戦闘場面の確認を速くすることを目標候補とし、具体的な機能・Scope・制約・Done条件は次の計画で確定する。本ファイルはSprint 2の終了記録として保持し、今回の作業では次スプリントへ置き換えない。次回開始時はこの終了記録をGit履歴から辿れる状態にしてから雛形を使う。

ポータブル版は一旦保留。Electronのカクつき・容量・既存QA残件、Tauriのフルスクリーン時カーソル、容量比較と環境検証の不足を引き継ぎ、Producerが再開を選ぶまで追加調査・修正・正式配布を始めない。
