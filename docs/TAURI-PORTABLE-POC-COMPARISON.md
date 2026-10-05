# Tauri / Electron Portable PoC Comparison

Sprint 2、Project Ashfall v0.8.0、実施2026-10-05〜06（Asia/Tokyo）。基準はSprint 1完了コミット `5f2a59ae4257c300c58a021380a880d3cce9f069`。現在の範囲・残件は[スプリント](../plans/current-sprint.md)、再現方法は[Tauri PoC README](../desktop/tauri-poc/README.md)。Sprint 1の独立QAは基準コミットの `plans/current-sprint.md` をGit履歴から参照する。

## 技術提案と判断の条件

**WebView2 Evergreenを利用できるWindows環境なら、Tauriの実機比較へ条件付き進行可。** 現行ゲーム13ファイルを変更せず利用でき、runtimeを含まないZIPは約1.34 MiB、展開は約5.06 MiB。Electronの約150.65 MiB／367.14 MiBより小さい。WebView2を追加導入できない未導入PCを必須対象にするなら、この構成のまま採用できない。正式採用はProducer判断待ち。

これはImplementerの技術提案。独立QA・人間の操作感・音・実ネットワーク遮断・別PCでの保存互換は未完了。ElectronのQA指摘をTauriの成功で解消したとは扱わない。

## 版・環境・再利用

| 項目 | 今回確認したもの |
| --- | --- |
| OS / CPU | Windows 11 `10.0.26200` / x64。Windows 10、arm64、別PCは未確認 |
| Rust / Cargo | 1.98.1 / 1.98.1、既存MSVC target |
| C++ / SDK | VS Build Tools 18.10.12201.205、MSVC 14.51.36231、Windows SDK 10.0.26100.0、既存導入 |
| Node / npm | 22.23.1 / 10.2.1 |
| Tauri | Rust / npm CLI 2.12.1、tauri-build 2.7.1、wry 0.57.0。package-lock / Cargo.lockで固定 |
| WebView2 | Evergreen 154.0.4258.53、既存Runtimeの登録・ディレクトリを確認 |
| Electron基準 | 44.5.1 / Windows x64、Sprint 1配布ZIPを保持 |

HTMLとその参照から13ファイルを列挙し、ビルド時にworkへ生成する。アセット145,955 bytesとSHA256はElectron manifest・同梱ファイル、現在のブラウザソース、Tauriの埋込み対象で一致。配布EXEが返すJS／CSSの12ファイルもCDPで取得してSHA256を照合する。TauriがCSPとframework用スクリプトをHTMLへ挿入するため、配信HTMLは元ファイルのbyte一致とは区別する。ゲームソースの手修正コピー、新しいfrontend基盤、追加native command・pluginはない。

直接file／HTTP起動、ルートpackage、itch配布スクリプト、保存キー・meta形式・upgrade ID・relic番号・日英文言は変更していない。

## 容量と測定対象

MiBは2^20 bytes。両ZIPは.NET `ZipFile.CreateFromDirectory`の既定Optimal圧縮。v0.8.0／x64／profile除外で比較する。Electronはruntime・Chromium notices等を含む89ファイル。Tauriはゲーム埋込みEXE、manifest、README、Rust依存license inventoryの4ファイルでWebView2を含まない。

| 対象 | Tauri 2.12.1 | Electron 44.5.1 |
| --- | --- | --- |
| EXE | 3,158,528 bytes / 3.01 MiB | 245,726,208 bytes / 234.34 MiB |
| 配布ZIP | 1,401,175 bytes / 1.34 MiB | 157,965,952 bytes / 150.65 MiB |
| 展開、profileなし | 5,304,789 bytes / 5.06 MiB | 384,979,036 bytes / 367.14 MiB |
| 初回profile | 4,909,281 bytes / 4.68 MiB（新規タイトル2秒） | 未測定。今回の容量測定はタイトルwindowへ未到達 |
| runtime同梱 | なし。既存Evergreenを使う | Chromium / Nodeを含む |

Tauri ZIP SHA256: `655610be3132c5b075cb9bcf946326d8f6b3bd4b06fe7f01c199c595e71b7745`。Electron ZIP SHA256: `83c826853340097db22c4b0bd64217db2ecdb50207e4c285a1785f53df7a0e5c`。

初回profileは専用フォルダへ新規展開、debug環境変数・test引数なし、タイトルwindow出現後2秒でnative closeする条件で測る。Tauriは測定成功。Electronは20秒待ってもMainWindowHandleが得られず、測定全体はFAILとして保存。stdout／stderrは空で原因は確定していない。初回profile比較の完了とはしない。これは容量測定で、Electron QAの再レビューではない。

Tauriの保存fixture実行後は8,984,445 bytes / 8.57 MiB。Sprint 1のElectron旧fixture profileは7,215,183 bytes / 6.88 MiBだが、実行条件が違うため初回容量の代用にしない。キャッシュ・ログ・runtime挙動で容量は変動する。

WebView2の既存共有インストールディレクトリは903,021,261 bytes / 861.19 MiB（917ファイル）。これは既存PC上の占有量であり、未導入時の追加download量・offline installer・Fixed Versionの同梱量ではない。ゲーム専用のruntime容量として足し算しない。未導入端末向けの3つの容量は未実測で、runtime込み配布合計を推定しない。[容量測定JSON](../work/tauri-poc/size-comparison.json)で測定時刻・条件・bytesを確認できる。

## WebView2・offline・Portableの3条件

| 条件 | Tauri Evergreen PoC | Electron PoC |
| --- | --- | --- |
| ゲームinstallerなし、ZIP展開後に起動 | この既存Runtime導入済みPCで確認 | Sprint 1の成立確認 |
| 追加runtime導入なし | 既存Runtimeがある場合。未導入PCは対象外 | runtime同梱。クリーンPCの実起動は未確認 |
| 保存を含むフォルダ持ち運び | 終了後、同一PCの日本語／空白パスへのコピーで保持 | Sprint 1の同一PCコピー確認。別PCは未確認 |

今回Tauriの通常起動は引数なし・WebView2 debug環境変数なしで確認。renderer offline emulationで再読込・開始も確認するが、Runtime導入済みの物理ネットワーク遮断済み初回／以後起動、未導入クリーンPCの遮断済み初回起動は未実施。開発時のnpm／Cargo取得は通信を使った。最終再ビルドは取得済み専用cacheからofflineで行った。ゲームの資源がローカルでもRuntime更新・background通信がないとは保証しない。

[Microsoftの配布説明](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)では、Evergreenは共有され自動更新される。未導入時はonline bootstrapperまたはoffline Standalone Installerを別途用意する。Fixed Versionはruntime一式を同梱し、更新を配布側で管理する方式。いずれもこのPoCには同梱していない。再配布する版のMicrosoft提供条件・noticeを確認する工程も未実施で、同梱可能性だけからライセンス判断をしない。

[Tauri Windows配布資料](https://v2.tauri.app/distribute/windows-installer/)のoffline installer約127MB、Fixed Version約180MBはinstaller増分の目安。MicrosoftはFixed Version binariesを250MB超と説明している。対象版・圧縮・測定対象が異なる参考値を今回の実測MiBとして使わない。第2のruntime同梱PoCは作成せず、必要ならProducerが次のScopeを決める。

## 保存・起動・セキュリティ

識別子は `local.ashfall.tauri-poc`、Windows originは `http://tauri.localhost`。EXE横の `data/`を絶対パスとしてWebView2へ指定し、内部profileは `data/EBWebView/`に生成される。既存の `ashfall.v1`と独立した `ashfall.language`を利用する。ブラウザ版／Electronのprofileを探索せず、共有・移行は実装しない。

保存fixtureには既存meta、relic番号3、未知の `future`フィールドを含める。言語切替でmeta bytesが変わらないこと、結果fixture後のmetaと言語がnative close／再起動、終了済みフォルダのコピー、同一版EXE置換後も保持されることを確認する。OSファイルロックを保持して同一フォルダの二重起動を拒否し、元プロセスの保存を維持する。ラン途中保存はない。localStorage getter拒否はfixtureで、実ディスクのACL拒否・容量枯渇・profile破損とは区別する。

| 対策 | Tauriの設定・実行確認 | Electronの既存条件／残件 |
| --- | --- | --- |
| native権限 | capabilitiesは空、追加plugin／commandなし。未付与のwindow commandを実行拒否 | Node無効、contextIsolation／sandbox有効、preload／IPCなし |
| 外部資源 | CSP、正確なoriginでnavigationを制限。別port・外部navigation、popup、通知権限を拒否。downloadも設定で拒否 | 外部navigation／popup拒否。権限request handlerのみでcheck不足（P2） |
| debug | releaseでdevtools無効、通常起動にtest/debug引数なし。検証だけ外部WebView2環境変数で専用CDPを開く | 通常／test起動を分離。runtime fuse等の製品向け評価は未完了 |
| profile保護 | 親フォルダの既存ACLを継承。ACLを変更して検証を通していない | 同様に既存権限条件。Sprint 1独立GUIのACL起動制限が残る |

空capabilitiesの設定確認、CSPが埋め込まれること、拒否ケースの実行確認と、未確認の全権限API／downloads／devtoolsショートカット／runtime全体の通信は区別する。Tauri framework内部のIPCは存在し、global APIを公開しないことだけでIPC不在とはしない。OS／WebView2のsandboxを無効化していない。署名、SmartScreen、Defender、企業policy、別ユーザー・別PCは未検証。

## build・ライセンス・保守

最初の試行はWindows resource用アイコン不足で失敗し、コードから生成するPoCアイコンで解消した。package工程はCargo metadataの出力がNodeの既定buffer上限を超えて失敗し、上限を明示して解消した。出力をwork内で完成させてからdistへ移すため、失敗途中のものを完成ZIPとして扱わない。旧試行の成果物はworkへ保持した。

最終候補はSprint 1のGit archiveを新規フォルダへ展開し、現在の13ファイルとPoCソースをhash照合して重ねたsource snapshotでビルドした。新しいtargetディレクトリ、offline npm ci、固定Cargo.lockと専用cacheで成功。Rust releaseは約1分56秒、package込み約123秒。これは未コミット候補のfresh-source再現であり、最終コミットのclean checkoutでの再現とは区別する。再現手順はREADMEと `rebuild-source.ps1`。commit後のclean checkout確認は残件。

EXEはMSVC runtimeを静的リンクする設定。dumpbinで別途VCRUNTIME DLLのimportはないことを確認し、OSのUCRT／system DLLを含む依存は残る。開発時のRust／MSVC／SDK／Node／CLIはプレイヤー向けZIPには含めない。最低OSの保証をこの実機1台から拡張しない。

Rust Windows依存graphのlicense表記・同梱LICENSE／NOTICE本文を `THIRD-PARTY-NOTICES.txt`へ収録する。約2.04 MiBの展開容量を含めて測る。build時だけの依存も含む保守的なinventoryで、最小化や正式な再配布審査完了とはしない。独自ソースのライセンスを新たに決定していない。Electronは既存LICENSE／Chromium noticesを保持する。

| 将来の保守（推定） | Tauri Evergreen | Electron |
| --- | --- | --- |
| framework更新 | npm CLIとRust crate／lock、MSVC／SDKの組合せを再確認 | npm runtime／lockと同梱物を更新 |
| web runtime更新 | OS側Evergreenの更新でWebViewが変わるため保存・入力・音・全画面を再確認 | 配布側がElectron／Chromium版と再配布時期を管理 |
| 配布 | 小さいゲームZIP、Runtime有無と導入手順の案内が必要 | runtime込みで大きい。追加Runtime導入を避けやすい |
| 保存 | stable originとdata配置を維持。別PC・更新前後のprofile互換を再検証 | 既存data方式を維持。二重起動と権限handlerの未解決事項あり |

## 検証・残件・受け渡し

| 検証 | 結果と制限 |
| --- | --- |
| `npm test` | PASS、159件、FAIL／SKIPなし。既存parity JSON 2件は実行前bytesへ復元 |
| `tests/build-itch.ps1` | PASS、6件。既存itch ZIPを上書きしない |
| 既存public／i18nブラウザ | PASS、9＋5件。Edge 154.0.4258.53、専用profile／snapshot、HTTP／file、日英・全23カード・保存・全画面。150〜400ms待機をコピーで1500msに延長 |
| Tauri配布ZIP | PASS、16項目。通常起動、埋込みhash、日英、Canvas／Web Audio、WASD／矢印／照準／SPACE／クリック、ポーズ、保存、native close、二重起動、移動、同一版置換、拒否を確認 |
| 初回profile容量比較 | Tauri測定成功、Electronタイトルwindow未到達により全体FAIL。Electronは初回profile未測定、旧fixture容量と区別 |
| 実ネットワーク遮断・別PC・native disk拒否 | 未実施。適切なクリーンPC／別PCを用意していない。現在の環境やprofile ACLを変更して代替しない |
| 独立QA／Producer実機比較 | 未実施、必要。自己確認を独立レビュー・人間プレイの代わりにしない |

最初のブラウザ実行は150ms fullscreen待機でFAIL。待機をコピーで延長した再実行がPASS。Tauri verifierの最初のfullscreen直後クリック、通知API検証式、profileコピーによる中断も旧証拠に保持し、待機・検証式・コピー処理を修正した。ゲームコードを期待値へ合わせていない。最終ZIPのSHA256に対応する実行結果を判断に使う。

- [ゲーム／配布回帰証拠](../work/tauri-poc/regression-1791208249668/)
- [ブラウザ再検証証拠](../work/tauri-poc/browser-1791213616197/)
- [fresh-source再ビルド証拠](../work/tauri-poc/rebuild-1791213823651/)
- [最終ZIPのTauri実行証拠](../work/tauri-poc/verify-1791214057957/verification.json)
- [初回profile容量測定とElectron未到達](../work/tauri-poc/profiles-1791214721499/measurements.json)
- [最終build input／成果物一致](../work/tauri-poc/final-build-source-audit.json)
- [容量比較JSON](../work/tauri-poc/size-comparison.json)

独立Reviewerには現Sprint、基準コミット、`desktop/tauri-poc/`と本比較、最終ZIPのhash、work内の証拠、[QA Guide](ai/REVIEW-GUIDE-QA.md)を手動で渡す。特にnative権限、profileロック・移動、CSP、Runtime条件、容量測定の範囲を確認する。Producerはtest／CDPなしでZIPを新規展開し、入力・音・Esc／Alt+Tab・短いラン・×／Alt+F4・再起動・移動を実プレイで比較する。

ElectronのP2 check/request両経路、独立GUI起動FAILの範囲、クリーンPC初回offline、Alt+F4、二重起動その他のQA残件はSprint 1から未解決で引き継ぐ。容量測定のための起動やTauriの結果で、それらをPASSへ変更しない。正式配布・mainへのmerge・pushは未承認。

## 公式資料（確認2026-10-05〜06）

- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)、[Windows配布](https://v2.tauri.app/distribute/windows-installer/)
- [Tauri 2.12.1 Rust API](https://docs.rs/tauri/2.12.1/tauri/)、[tauri-build 2.7.1](https://docs.rs/tauri-build/2.7.1/tauri_build/)
- [WebviewWindowBuilder](https://docs.rs/tauri/2.12.1/tauri/webview/struct.WebviewWindowBuilder.html)、[Capabilities](https://v2.tauri.app/security/capabilities/)、[CSP](https://v2.tauri.app/security/csp/)
- [Microsoft WebView2配布と導入確認](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)、[Evergreen／Fixed](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/evergreen-vs-fixed-version)
