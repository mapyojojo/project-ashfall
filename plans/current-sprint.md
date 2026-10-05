# Sprint 2 — Tauri Portable PoC Comparison

## Status

review

2026-10-05〜06（Asia/Tokyo）、Producerの実行指示に基づきTauri PoC・配布ZIP・比較文書とImplementer検証を作成。独立QA／Engineering Review、Producerの実機比較・正式方式判断待ち。未確認のクリーンPCoffline・別PC・native disk拒否・commit後clean checkoutは記録済み。スプリント全体のdoneにはしない。

## Goal

既存ブラウザ版を維持してTauriのWindows向け最小PoCを作り、Sprint 1のElectron PoCとサイズ・起動条件・保存・再利用度・ビルド・保守・セキュリティを比較する。実測と未確認を分けた判断材料を揃え、正式方式の採用はProducerが判断する。

## Context

- Producer feedback（2026-10-05、Asia/Tokyo）：Electron PoCはWindows実機で通常プレイ可能だった。デスクトップ化の成立は確認できたが、約151 MiB ZIP / 約367 MiB展開後はProject Ashfallには大きい。Electron正式採用を保留し、Tauri PoCと比較して採用方式を判断する。
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
- 生成ZIP・展開物・profileは `dist/`、キャッシュ・ログ・検証画像等は `work/`へ置き、既存ignoreに従う。PoCのソース・設定・lockfile・再利用可能なbuild／検証手順のみGit管理する。

## Deliverables

- この計画・進捗の正本：`plans/current-sprint.md`。Sprint 1は上記完了コミットの履歴で参照する。
- 実行時に作成する `desktop/tauri-poc/`：最小起動層、固定依存・lockfile、設定、アセット生成・ビルド手順、検証手順。配置の詳細は実装時に決める。
- 実行時に作成する `docs/TAURI-PORTABLE-POC-COMPARISON.md`：公式資料、Tauri／Electron比較、測定条件・サイズ、WebView2／offline／保存、再利用・build・保守・セキュリティ、QA残件、推奨・制限・Producer判断。
- 実行時のみ、既存Electron／itchとは別名のTauri Windows x64成果物と `work/`内の検証証拠。生成物はGit対象外。

## Definition of Done

- [x] Tauri最小PoCが既存ゲームソースの無変更再利用でビルド・展開・起動でき、同梱hashと対象環境を記録している。
- [ ] Electronとの配布サイズ比較が同じゲーム版・CPU・測定対象で揃い、EXE／ZIP／展開／profileとWebView2追加容量を区別している。EXE／ZIP／展開は測定済み。Tauri初回profileは4.68 MiB、Electronは今回の容量測定でタイトルwindowへ未到達のため初回未測定。未導入時download／installer／Fixed容量も未実測と記録。
- [x] WebView2依存とPortableの3条件、導入済み／未導入、初回／以後offlineを実測・公式根拠・推定・未確認に分けて説明できる。
- [x] origin・識別子・保存先・ブラウザ／Electronとの分離、meta／未知フィールド／独立言語、再起動・移動・更新・拒否の確認と限界を記録している。
- [x] HTML/CSS/JS再利用度、開発／実行依存、build再現手順・notice、更新と保守負荷、セキュリティ設定・実行検証を比較できる。最終commitのclean checkout確認は残件。
- [x] `npm test`、関係する入力・保存・i18n・file／HTTP確認、`powershell -NoProfile -ExecutionPolicy Bypass -File ./tests/build-itch.ps1`、Tauri通常起動・終了／再起動・二重起動・offline等をPASS／FAIL／SKIP／未実施と環境付きで記録する。必要な既存parity生成物は検証前のbytesへ戻し、新しい証拠はworkへ分離する。
- [x] 実行不能・未検証の理由と採用判断への影響を記録し、ElectronのQA残件を解決済みとせずに引き継いでいる。必要な追加検証が残る場合は待ち状態を明記する。
- [ ] Required ReviewsとProducer Playtestの必要な工程が完了、または不要理由を記録済み。独立レビューと自己確認、人間の確認を区別している。
- [ ] 比較材料と制限をProducerへ提示し、採用／保留／追加調査のProducer判断を記録している。AIが正式方式を決定しない。
- [x] 変更ファイル・検証結果・未検証事項・残るレビュー／人間確認・branch／commit／worktree状態を本記録と比較文書へ記録。

## Required Reviews

- Game Design Review：原則不要。ゲーム・バランス・文言を変更しないため。入力・表示・音・テンポに体験上の懸念が出た場合は [Game Design Guide](../docs/ai/REVIEW-GUIDE-GAME-DESIGN.md)に沿って対象を限定して依頼する。
- QA / Engineering Review：必要、未実施。別会話・コンテキストのReviewerへ [QA Guide](../docs/ai/REVIEW-GUIDE-QA.md)、Sprint 1基準、Tauri差分・[比較文書](../docs/TAURI-PORTABLE-POC-COMPARISON.md)・証拠・Electron残件を手動で渡す。依存・保存・offline・サイズ測定・capabilities／permissions・起動／終了／多重起動を確認する。以下のImplementer検証を独立レビューと数えない。

## Producer Playtest

- Required：実装後、Windows実機のTauri通常起動とElectronとの比較、最終方式の判断が必要。Implementerの自動操作とは区別する。
- Scenarios：Tauri ZIPを別フォルダへ展開し、test/debugなしで起動。日英切替、開始・移動・照準・灰縫い、全画面／Esc・ポーズ、Alt+Tab、音、短いラン終了、×／Alt+F4・再起動、meta／言語保持、終了後の移動を確認。offline条件はruntime導入状態とネットワーク状態を記録する。元ブラウザの記録と起動が維持されることも確認する。
- Observations：起動手順と追加導入の負担、サイズ差、入力・表示・音の差、保存と持ち運び、警告・セキュリティ上の制限。個別確認と利用環境を記録し、通常プレイだけで全QA項目をPASSにしない。
- Result / Decision：未実施。Tauri PoC・比較材料は作成済み、実機での比較と正式方式の採用判断はProducer待ち。Electron通常プレイの既確認はSprint 1の結果として扱う。

## Open Questions

- Portable最終要件：インストーラー不要、追加runtime不要、保存を含むフォルダ持ち運びのどこまで必須か。
- WebView2未導入の端末をどこまで支えるか。Evergreen導入の許容、offline導入物／Fixed Versionの必要性は比較後にProducerが判断する。
- Windows対象版・CPU、許容ZIP／展開サイズ・runtime込みサイズ、クリーンPCと別PC検証環境は未指定。
- 最終commitのclean checkout確認はcommit未承認のため未実施。今回はfresh-source snapshotに候補を重ね、新規targetとoffline cacheで再ビルド成功。
- ElectronのP2権限設定・終了／二重起動等の残件を解消する工程は未決定。Tauri比較とは別に正式配布・merge前の条件として残る。

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

## Review Results


独立QA / Engineering Reviewは未実施。Implementerの自己確認は最終ZIPで16項目PASS、既存ゲーム159件・配布6件・ブラウザ14件PASS、fresh-source再ビルドとbuild input一致PASS。独立レビューとして扱わない。Game Design Reviewは現Scopeでは不要。Sprint 1の独立QAとProducer確認は、本スプリントのTauri検証結果に流用しない。

## Decisions

- Producer：Electronのデスクトップ化成立は確認できたが配布サイズは大きく、正式採用を保留する。次はTauri PoCとElectronを比較する。
- Implementer（2026-10-06）：Evergreenを利用できるWindows環境ならTauriの実機比較へ条件付き進行可。WebView2未導入PCを追加runtimeなしで支える要件は現構成で満たさない。正式方式の採用／保留／追加調査はProducer待ち。
- Producer（計画作成時）：Sprint 2の計画作成まで。正式方式の採用判断はProducerに残す。
- Producer（実行指示、2026-10-05）：Sprint 2の実装・比較検証まで進める。計画作成時の実装停止を解除する。恒久toolchain導入・commit・merge・push・公開の追加承認は含まない。
- 計画上の比較方法：Evergreen構成のTauri最小PoCを出発点に、runtimeを含まないサイズと未導入端末で必要な追加物を分ける。Fixed Version／offline導入物の値は実測の有無を明記し、Tauriが小さいとの結論を先取りしない。
- Implementer（計画作成時）：Sprint 1コミットが書込制限で止まったためcurrentをdoneのまま保持し、本計画を別ファイルへ保存した。実行開始時にはSprint 1コミット完了とcurrentへの切替を確認し、基準hash・履歴参照を更新した。

## Next Sprint

未決定。Tauri／Electron比較後、Producerが採用方式の製品化、追加検証、またはブラウザ版継続を選ぶ。正式配布前のQA残件を持ったまま製品化・公開を自動で始めない。
