# Windows Portable Build Feasibility

確認日：2026-10-05（Asia/Tokyo）。Implementerによる調査・自己確認と、独立QA・Producer確認のまとめ。対象はProject Ashfall v0.8.0、基準main `08f6f9665c67a92851324f6bccff5f973c813b85`、作業ブランチ `work/portable-build-feasibility`。Sprint 1の承認済みScopeに従う。Sprint 1のdone記録と独立QA全文は [current-sprint.md](../plans/current-sprint.md) に保持している。Producerのコミット依頼に基づき、Sprint 1成果は同ブランチのGit履歴へ保存する。Sprint 2計画`plans/sprint-2-tauri-portable-poc-comparison.md`はコミット対象外のローカルdraft。正式方式の採用・公開は未決定。

## 結論とProducerの判断材料

**Producer判断：Electronの正式採用は保留、次はTauri PoCとの比較**。HTML/CSS/JSの無変更再利用は実証できた。ProducerはWindows実機でElectron PoCを通常プレイできたと報告し、Electronでデスクトップ化できること自体を確認した。一方、PoCのZIPは150.65 MiB（約151 MiB）、展開後367.14 MiB（約367 MiB、profileなし）で、Project Ashfallには大きいと判断した。Sprint 1はfeasibility評価としてdone、Sprint 2はTauri Portable PoC Comparisonの計画作成までとし、今回は実装しない。

小さい配布物とOS側でのWebView更新を重視し、WebView2導入を許容できる場合はTauri + Evergreenが代替案。Tauri + Fixed Versionは追加ランタイム導入を避けられる候補だが、同梱サイズとWindows 10での権限設定を別途確認する必要があり、今回の第2PoCは作らない。現行ブラウザZIPは配布コストが最も小さい比較基準として維持する。

Producerの決定と残る選択は次の4点。

1. Portableの要件：インストーラー不要／追加ランタイム不要／保存を含むフォルダ移動のどこまで必要か。
2. 約151 MiBのZIP、約367 MiB + profileの展開サイズは大きいとの判断済み。最終的なサイズ許容値とruntime込みでの比較条件は未確定。
3. Windows 10/11 x64に絞るか、arm64等も検証するか。
4. Electron正式採用は保留、Tauri PoCを作成して比較する方針は決定済み。比較後の正式方式の採用はProducerが判断する。

独立QAは完了したが、Verdict / Release recommendationは判断保留。クリーンPC初回オフライン、Alt+F4、二重起動、Electron権限check/request両経路などの残件は未解決。Producerの通常プレイ確認から詳細検証のPASSを推定せず、Sprint 1完了をmerge・正式配布の承認としない。

## 現行構成と再利用範囲（ソース調査）

| 項目 | 現行の根拠 | デスクトップ固有の扱い |
| --- | --- | --- |
| 起動 | [index.html](../index.html)が13個の実行時ファイルをローカル参照。classic scriptsで順序を固定 | モジュール化・bundler導入は不要。起動層が同じHTMLをロード |
| アセット | [game.js](../game.js)がCanvas描画、[audio.js](../audio.js)がWeb Audioで音を生成。fetch/import、外部URL取得なし | 現行参照ファイル全体を同梱し、再現時のハッシュを比較 |
| 入力 | [input.js](../input.js)：WASD・矢印、照準、クリック・SPACE、P/Esc/M、repeat抑制 | ウィンドウのフォーカス、物理Esc、OSとの切替は追加確認 |
| 表示・全画面 | DOM + Canvas、devicePixelRatio上限2、Fullscreen API。全画面解除でpause | ネイティブウィンドウサイズとDPI、全画面解除イベントを確認 |
| ポーズ | blur/visibilitychangeでpause、キー・クリック状態を解除 | 別ウィンドウへ移動した実機挙動は人間に残す |
| 日英 | [i18n.js](../i18n.js)とja/en辞書。選択言語を独立保存 | OS/ブラウザ言語が初期値に影響。辞書・文言は無変更 |
| 保存 | [storage.js](../storage.js)：`ashfall.v1`のmeta、`ashfall.language`。未知フィールドを保持、保存例外を吸収 | 同じキーでもorigin/profileが違えば別記録。途中ラン保存なし |
| 配布 | [build-itch.ps1](../scripts/build-itch.ps1)がHTML/CSS参照を辿り、ZIP内容をハッシュ照合 | PoCは別のビルド・別名成果物。既存スクリプトとZIPを変更しない |

HTML/CSS/JSの実ファイルは変更していない。13ファイル合計145,955 bytes。ブラウザ版の直接file起動・HTTP起動はそのまま残る。

## 候補比較

ここで「公式」は資料に基づく設計上の条件、「実測」は今回の環境で観測した値、「推定」は未実装の工数・効果。対応範囲の公称値とProject Ashfallの動作確認範囲を区別する。

対象バージョン：ブラウザ版v0.8.0、Electron **44.5.1**（公式Stable一覧とnpm照会で一致）、Tauri **2.12.0** / CLI **2.12.0**（公式release一覧。3系alphaは採用対象外）。[Electron releases](https://releases.electronjs.org/)、[Tauri releases](https://v2.tauri.app/release/)。

| 軸 | ブラウザZIP（基準） | Tauri 2.12 + Evergreen | Tauri 2.12 + Fixed Version | Electron 44.5.1 |
| --- | --- | --- | --- | --- |
| ゲーム再利用 | 現行そのまま | 静的frontendを埋込。無変更再利用は設計上可能、未実測 | 同左 | 無変更の13ファイル同梱を実測 |
| 開発依存 | ZIP生成はPowerShell。HTTP検証はNode | Rust/Cargo、MSVC + Windows SDK、Tauri CLI。今回のfrontendにnpm bundlerは不要 | 同左 + 固定WebView2取得・配置 | Node >=22.12.0、npm、PowerShell。直接依存Electron 1件、lockfile内のnpm package 13件 |
| プレイヤー依存 | 対応ブラウザ。HTTP開発サーバーは配布時不要 | WebView2 Runtime。未導入なら導入が必要。MSVC runtime等も成果物構成ごとに確認 | 同梱WebView2 + loader等。MSVC runtime、ACL条件を確認 | Chromium/Nodeを同梱。外部Node/npm/WebView2を使用しない |
| Windows・CPU | ブラウザの対応に従う | x64/i686/arm64のMSVCビルド候補。最新WebView2が使えるOSを別評価 | 同左、同梱runtimeのCPUを一致させる | 公式Windows 10以降、x64/arm64。44系はia32バイナリを提供しない。PoCはx64限定 |
| 起動 | 展開後index.html | 生EXEのZIP配布は候補。公式標準はMSI/NSISで、ZIP経路は今回未検証 | EXE + runtimeフォルダのZIPが候補、未検証 | フォルダ全体を展開しAshfall-PoC.exe。実測で起動 |
| 初回オフライン | ブラウザ導入済みなら可能 | Runtime導入済みなら可能。未導入の標準bootstrapperは通信が必要 | 固定runtime同梱で可能な設計。クリーン環境では未確認 | 設計上可能。インターネット遮断済みのクリーンPCは未確認 |
| 以後オフライン | 現行ファイルだけで動作 | Runtime保持中なら静的ファイルを利用 | 同梱runtimeを利用 | CDPのoffline設定下でreload・開始・ゲーム時間進行を実測 |
| 保存の既定 | ブラウザprofile内、origin単位 | アプリ識別子に対応するWebView profile。標準では配布フォルダ外 | 同左。固定runtime同梱だけでは保存を持ち運べない | 公式既定はAPPDATA配下。PoCは明示的にEXE横dataへ変更 |
| サイズ | ZIP49,015 bytes（既存成果物）、実行時145,955 bytes | 本ゲームのEXE/ZIPは未実測。runtimeを含めない小ささが期待できる | 本ゲームは未実測。runtimeの容量は下記の公式目安を参照 | ZIP157,965,952 bytes、展開384,979,036 bytes（89ファイル、dataなし） |
| ビルド再現 | 現行PS、version.js、ZIP内容照合 | Cargo.lock、CLI、Rust/MSVC、SDKの固定が必要。未ビルド | 同左 + runtime版・CPU・hash固定 | exact dependency + package-lock + runtime checksum検証。assets.jsonのSHA256で内容を再確認 |
| 更新・保守 | ファイル一式更新。file URL移動で保存保証不可 | Rust/Tauriとゲームを再ビルド。Evergreenの更新はOS側で進むためUI回帰を継続 | 上記 + runtimeのセキュリティ更新・再配布を開発者が担当 | 同梱Electronのセキュリティ更新・ZIP再配布・profile互換検証を担当 |

Windows/CPUの根拠：[Electron公式README](https://github.com/electron/electron/blob/main/README.md)、[Electron 44 release notes](https://www.electronjs.org/blog/electron-44-0)、[Tauri Windows配布](https://v2.tauri.app/distribute/windows-installer/)。TauriのWindows 7互換記述だけで、最新WebView2付きのWindows 7対応を保証しない。今回の動作検証をWindows 10/arm64/i686へ一般化しない。

### Runtimeとサイズに関する公式資料の注意

TauriのInstaller資料の概算は、追加installerサイズがbootstrapper約1.8 MB、offline installer約127 MB、Fixed Version約180 MB。これはProject Ashfallの実測値でも、展開後サイズでもない。[Tauri WebView2 installation options](https://v2.tauri.app/distribute/windows-installer/#webview2-installation-options)。

MicrosoftのFixed Version資料は、固定runtimeのバイナリ容量を250 MB超としている。圧縮・版・CPU・測定対象が違うため、上の180 MBと同一の尺度で比べない。最新runtimeのZIP／展開サイズは、選定版を取得して測る必要がある。Windows 10のunpackaged Win32 + Fixed Version 120以降にはrenderer用ACL設定の条件があり、UNC/network pathにも制限がある。小さいTauri EXEだけを見て「追加導入なしのPortableも小さい」と判断しない。[Microsoft WebView2 distribution](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)。

同資料ではWindows 10の一部端末にEvergreen未導入の可能性を明記している。OS名だけで存在を断定せず、Runtime検出と未導入時の導入／オフライン方針が必要。PoC検証機にはWebView2 154.0.4258.53が存在するが、Electronの起動層はこれを参照していない。

## Portableの3条件と保存

| 条件 | ブラウザZIP | Tauri | Electron PoC |
| --- | --- | --- | --- |
| ZIP展開後、アプリinstallerなしで起動 | 対応ブラウザがあれば可 | 生EXE配布は候補、未実測 | 展開・起動を確認。EXE以外のDLL/資源も必要 |
| 追加runtime導入なし | ブラウザ導入済みを前提 | Evergreenは存在確認が必要。Fixed同梱は候補、未実測 | 外部runtimeを要しない構成。runtime未導入PCでの実測は未実施 |
| 保存を含めフォルダを持ち運ぶ | 標準では不可 | 標準では不可。2.12の配置override等で候補化可能、未実測 | 終了後dataを含めコピーし、同一PCの日本語・空白付きパスでmetaと言語を保持 |

Electronの公式既定`userData`は`%APPDATA%/<app name>`で、`sessionData`がlocalStorage等を含む。PoCはready前に両者をEXE横`data/`へ設定した。独自save形式やmigrationは追加していない。アプリ名は`Ashfall Portable PoC`、保存originは`ashfall://game`。standard/secureの独自schemeで相対パスとlocalStorageを利用するため、展開フォルダ名をoriginにしない。[Electron app paths](https://www.electronjs.org/docs/latest/api/app#appgetpathname)、[Electron protocol](https://www.electronjs.org/docs/latest/api/protocol)。

Tauriのアプリ`identifier`はWebViewデータパスに関わる。Windows側のoriginは既定で`http://tauri.localhost`、HTTPS設定なら`https://tauri.localhost`となるため、識別子・scheme設定の変更は保存へ影響し得る。2.12にはEXE相対`appDirectoriesOverride`があり、`dataDirectory`の個別指定との関係も公式資料に記載されている。採用時は専用profileを指定して移動・更新を実機検証する。[Tauri configuration](https://v2.tauri.app/reference/config/)、[Tauri 2.12 notes](https://v2.tauri.app/release/tauri/#2120)。WebView2の一般的な既定UDFパスを、そのままTauriの保存先と混同しない。

現行ブラウザ版のHTTP originとfile URL、Tauri origin、Electron profileはそれぞれ別記録になる。ブラウザprofileを探索・読取・書換するコードは追加していない。ブラウザからの自動引継ぎ・共有・クラウド同期は対象外。file URLのlocalStorageは仕様上動作保証がないため、ブラウザ版のフォルダ移動による保存保持も保証しない。[MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)。

保存に関する検証・制限：

- 言語切替でmetaのJSON bytesが変わらず、未知フィールドもラン終了・再起動後に保持された。
- プロセスを終了してからフォルダ全体をコピーする。生きたprofileのコピー・複数同時起動・強制終了時の耐久性は未検証。
- 更新は新しい成果物へ終了済みの`data/`を引き継ぐ案。別Electron版・別PC・別ユーザーのprofile互換、downgradeは未検証。meta形式が同じでもprofile全体の互換を保証しない。
- rendererのlocalStorageアクセスを拒否するfixtureでも開始・結果遷移は成功。実際の容量枯渇、ACL拒否、profile破損は未検証。
- EXE横のprofileを作れない場所ではこのPoCは起動できない。ゲームの保存拒否例外を吸収する挙動と、native profile初期化失敗は別問題。読取専用媒体・Program Filesは対象にしない。

## PoCの実装・ビルド・同梱

低リスク判定は実装前にSprintのExecution Resultsへ記録済み。追加ファイルは[desktop/portable-poc](../desktop/portable-poc/README.md)へ隔離した。

- `main.cjs`：BrowserWindowと静的独自schemeのみ。preload/IPCなし。rendererのNodeを無効にし、contextIsolation/sandboxを有効化。外部navigationと新規windowを拒否。
- `package.json` / `package-lock.json`：PoCだけのElectron 44.5.1を固定。ルートpackageは無変更。
- `build.cjs`：HTML/CSS参照を辿り、現行ゲームを生成時にコピーしてSHA256を記録。remote assetがあれば停止。公式prebuilt runtimeに`resources/app`を配置する。[Electron manual packaging](https://www.electronjs.org/docs/latest/tutorial/application-distribution)。
- `verify.cjs`：ZIPから新しいworkフォルダへ展開し、実パッケージをCDP検証。通常起動はtest/CDPを有効にしない。
- `verify-browser.ps1`：現行ソースと既存ブラウザテストをworkへコピーして専用Edgeで検証し、過去の証拠を保護。

リポジトリルートからのビルド手順：

```powershell
cd desktop/portable-poc
npm ci
npm run runtime
npm run build
```

Electron 44のnpm packageは初回使用時にbinaryを取得する方式なので、`npm ci`の後に`runtime`を明示実行する。[Electron installation](https://www.electronjs.org/docs/latest/tutorial/installation#binary-download-step)。今回のnpm cache / Electron cacheは`work/portable-build-feasibility/`へ指定した。npm registry/GitHub接続が必要。OSへのElectron/Rust/MSVCの新規インストールは行っていない。

成果物：`dist/project-ashfall-v0.8.0-electron-44.5.1-win-x64-poc.zip`。展開フォルダ内の`Ashfall-PoC.exe`を起動する。既存の`project-ashfall-v0.8.0-itch.zip`とは別名。再ビルドで同名成果物が存在すると停止し、保存を含む以前の出力を保護する。クリーンな別checkoutで再生成する。

再現性は固定ソース・lockfile・公式runtime checksum・同梱asset hashを対象にしている。ZIP内timestampを固定しておらず、ZIP bytesの完全一致は保証しない。完全なクリーンcheckoutからの2回目ビルドは未実施。

### ライセンスと保守負荷

ElectronはMIT、同梱Chromium/Node等は第三者noticeを含む。PoCは公式配布の`LICENSE`と`LICENSES.chromium.html`を保持しており、展開後にも存在を検証した。開発用npm依存はゲーム配布には同梱しない。TauriはMIT/Apache-2.0の条件を確認できるが、採用時はCargo依存とWebView2再配布条件・noticeも確認する。[Electron license](https://github.com/electron/electron/blob/main/LICENSE)、[Tauri license](https://github.com/tauri-apps/tauri#licenses)。ゲーム本体の公開ライセンスはリポジトリで未指定。正式公開前の扱いはProducerが決める。

保守の推定順序は、現行ZIP継続 < Electronの薄い起動層 < Tauri + Evergreenのnative toolchain < Fixed runtimeを管理するTauri。これは実測工数ではない。Electronは同梱Chromium/Nodeの更新を開発者が引き受け、公式サポートは最新3 stable major系列。古いruntimeを固定し続ける運用は製品化時に見直す。[Electron support policy](https://www.electronjs.org/docs/latest/tutorial/electron-timelines)。

未署名PoC。アイコン・EXE製品情報・コード署名取得・SmartScreen対策・自動更新・installer・CI/CDは実装していない。署名／Windows Defender等の警告、企業policyによる起動拒否は実測していない。

## 実行環境と検証

環境：Windows NT build **26200.9457**、25H2、x64。Node **22.23.1**、npm **10.2.1**、Windows PowerShell **5.1**。Electron **44.5.1** / Chromium **152.0.7977.130**。ブラウザ回帰は専用の非表示Edge。Rust/Cargo **1.98.1**は既存導入済みだが、`vswhere -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64`は候補を返さず、MSVC C++ workloadは確認できなかった。Tauriはビルドしていない。

Implementerの動作検証は自動操作とfixture。人間の実プレイ、自然なフルラン、音の聞こえ方、操作感の同等性を証明しない。その後、ProducerからWindows実機での通常プレイ成立の確認を得た。個別シナリオや実機のOS詳細は未報告であり、自動検証・独立QA・Producer報告を分けて記録する。

| コマンド／確認 | 結果 | 証拠と限界 |
| --- | --- | --- |
| `npm test` | PASS | 159 PASS、FAIL/SKIPなし。既存戦闘・入力・保存・日英・v0.7.1 parityを含む |
| `powershell -NoProfile -ExecutionPolicy Bypass -File ./tests/build-itch.ps1` | PASS | 配布回帰6件。実際の既存itch ZIPは上書きせずfixtureで検証 |
| `npm run build`（PoC dir） | PASS | 13ゲームファイルのコピー一致、別名ZIP生成、実測サイズを確認 |
| `node desktop/portable-poc/verify.cjs` | PASS | ZIP展開、isolated renderer、origin、日英、1024×640、live Canvas/Web Audio |
| 同コマンドの入力 | PASS | 実CDPのWASD/矢印/照準/SPACE/click、native全画面・pause/P/再開。灰紋付き敵とupdateは明示fixture |
| 同コマンドの永続化 | PASS | ラン結果meta・独立言語・未知フィールドをプロセス再起動後に照合 |
| 同コマンドの移動 | PASS | 終了済みprofileを含むフォルダコピー後、日本語・空白付き別パスで起動・保存照合。同一PC限定 |
| 同コマンドのoffline | PASS（限定） | CDP offline下でローカル資源のreload/startを確認。物理ネットワーク遮断・runtime未導入PCは未実施 |
| 同コマンドの保存拒否 | PASS（fixture） | localStorage getter拒否でも開始・結果遷移。native profile作成拒否は対象外 |
| `powershell -NoProfile -ExecutionPolicy Bypass -File desktop/portable-poc/verify-browser.ps1` | PASS（待機調整） | UI 9件 + 日英5件。HTTP/file、保存、全23カード、1440×900/1024×640。読込待機だけを検証用コピーで延長 |
| ProducerのWindows実機通常プレイ | 確認済み（Producer報告） | Electronでのデスクトップ化成立を確認。物理Esc・Alt+Tab・音・保存照合等の個別結果は未報告 |
| クリーンWindows 10/11、arm64、別PC移動、runtime更新 | 未実施 | 許容範囲を確定して次回実機検証 |
| 独立QA / Engineering Review | 完了、判断保留 | 159件・配布6件を独立PASS。PoC起動はsandbox ACL条件でFAIL、ブラウザ接続はtimeoutでFAIL、後続GUI検証は未到達。権限check側不足（P2）を指摘 |

ローカル証拠はGit除外済み`work/portable-build-feasibility/`へ保存：`npm-test.log`、parity実行前後のJSON、`verify-1791192491564/verification.json`と画像・app.log、`browser-1791193069096/`のブラウザ検証JSON・ログ・画像。ブラウザはEdge/154.0.4258.53。ZIPにはasset manifestが含まれる。必要なレビュー時はこれらも渡す。過去のルート検証JSONは実行前のbytesへ戻した。

検証中の失敗も保持する。最初のPoCチェックは導入中の灰縫い制限をfixtureが反映しておらず失敗し、fixtureを明示して再実行した。次にNode 22.23.1の`fs.cpSync`がprofileコピー時にexit **-1073741819**で終了したため、同じコピーをPowerShellで行い全項目を再実行してPASS。ゲーム・起動層の動作不具合と断定せず、検証用コピー処理の問題として記録する。

ブラウザ検証の初回は`public-browser.cjs`の400ms待機後にversionLabelが空で失敗。repository側のテスト・ゲーム・期待値は変更せず、work内のテストコピーだけ300/350/400ms待機を1500msへ延長した。この環境の初期化時間を考慮した検証であり、元の固定待機版の成功とは区別する。

Implementerの最終自己確認（レビュー引き継ぎ時点）：相対リンク24件、現行ソースと同梱13ファイルのSHA256、旧検証JSON 2件のbytes復元、package/lockの固定依存、追加JSの構文、`git diff --check`がPASS。PoCの1024×640英語タイトルとCanvas画面の画像も確認した。変更は本調査文書、Sprint記録、`desktop/portable-poc/`の7ファイルのみ。HEADは基準のまま、worktreeは未コミット変更あり。ゲーム・既存テスト・ブラウザ配布ソースに差分なし。その後の完了整理では本調査文書・Sprint記録・PoC READMEのみを編集し、ZIPは再生成していない。実測値とhash・GUI証拠は元のZIPについての結果であり、更新したREADMEを含む再ビルドの証拠ではない。Sprint 1成果はProducer指示に基づき同ブランチでコミットする。

## レビューと次回の最小作業

独立ReviewerはSprint 1、基準コミット、本調査文書、`desktop/portable-poc/`の差分とローカル証拠を[QA Guide](ai/REVIEW-GUIDE-QA.md)で確認済み。レビュー全文・証拠パス・Required testsは現在の `plans/current-sprint.md` に保持し、Sprint 1成果のコミット後はそのGit履歴へ保存する。レビュー後のProducer通常プレイ確認と、当時の独立GUI検証FAILを混同しない。

採用の判断を妨げる残条件は、配布サイズの大きさ、Windows/CPU・profile持ち運び範囲の未決定、clean machine検証等の未完了。ProducerはElectron正式採用を保留し、次スプリントでTauri最小PoCとの比較を行う方針を選んだ。Tauriの開発環境・WebView2方式・対象バージョンは実装着手時に公式資料と環境を再確認する。今回は計画作成までで、toolchain導入・Tauriビルドは行わない。

QA残件（未解決）：

- クリーンPCで物理ネットワーク遮断済みの初回オフライン起動。既存CDP offline PASSはreload/startに限定され、runtime全体の無通信を保証しない。
- Alt+F4／×での終了、全親子プロセス終了、直後の再起動・保存保持。二重起動時のprofileロック・保存衝突・破損。通常プレイ確認だけでは解消しない。
- Electron権限check/request両経路。現在は`setPermissionRequestHandler`のみでcheck handlerがない（P2）。fullscreen許可・不要権限拒否の両経路、外部navigation／popup、通常起動でのtest/CDP無効、通信を実行検証する必要がある。設定やソースは今回変更していない。
- sandbox ACLによるPoC起動FAIL、独立ブラウザ接続timeoutと未到達範囲。書込可能であることに加えrendererから読取可能な展開先が必要で、原因と対応の確認を残す。
- 個別の物理入力・DPI・音、native profile拒否・容量枯渇・破損、別PC／別ユーザー移動、同一版更新・runtime更新／downgrade、クリーンcheckout再ビルド、対象OS/CPU、署名・SmartScreen／Defender・企業policy、CSP・fuse等の正式配布前評価。

元レビューがmerge前に要求した確認も未解決のまま。Sprint 1のdoneは調査・PoC・レビューとProducerの比較方針決定の完了で、Electronの正式採用、mainへの取り込み、push、公開を承認しない。

Electron製品化を選んだ場合の最小追加検証は、クリーンなWindowsで初回オフライン起動、実キー/マウス・物理Esc・Alt+Tab・DPI/音、人間の短いラン、終了後の保存、同一版の更新配置、別PCのprofile保持。runtimeの版を変える場合は保存の前後照合とbackup手順も確認する。途中ラン保存・ブラウザからのmigration・ゲーム仕様変更は新たな承認なしに追加しない。
