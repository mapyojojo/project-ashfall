# Sprint 1 — Portable Build Feasibility

## Status

done

2026-10-05（Asia/Tokyo）、調査・Electron最小PoC・独立QA / Engineering Reviewと、ProducerによるWindows実機での通常プレイ確認・次回方針の判断をもって完了。Producerは約151 MiB ZIP / 約367 MiB展開後をProject Ashfallには大きいと判断し、Electronの正式採用を保留した。クリーンPC初回オフライン、Alt+F4、二重起動、Electron権限check/request両経路などのQA残件は未解決のまま引き継ぐ。完了はfeasibility評価の完了であり、正式配布・mainへのmerge・pushの承認ではない。

## Goal

Project AshfallをWindows向けにポータブル／デスクトップ配布できるか、現行HTML/CSS/JSの再利用、保存、ビルド・配布、依存・サイズ・保守負荷から評価する。既存ブラウザ版を維持したまま、採用候補・制限・未確認事項を揃え、Producerが次の実装スプリントへ進むか判断できる状態にする。

## Context

- Producer feedback: AI開発組織の土台をmainへmerge・push済み。最初の題材としてWindows向けPortable版の実現可能性を調べたい。配布方式や導入容易性はまだ実プレイ・利用者観察で評価していない。
- Baseline: Project Ashfall v0.8.0、`main` / `08f6f9665c67a92851324f6bccff5f973c813b85`。計画作成前のworktreeはclean。Sprint 0の完了記録はこのコミットの `plans/current-sprint.md` をGit履歴から参照する。
- 現状: Classic scriptsによるHTML/CSS/JS、Canvas、Web Audio。ブラウザの直接file起動とHTTP起動、日英対応、itch.io用ZIP生成を持つ。現在の保存はlocalStorageのmeta（`ashfall.v1`）と言語設定（`ashfall.language`）で、途中ラン保存・ブラウザ間の引き継ぎ機能はない。
- 仮説: デスクトップ用の薄い起動層で現行ファイルを再利用できる可能性がある。Tauri等の適合性、保存先、ランタイム要件、配布サイズは未調査で、採用を前提としない。
- References: [README](../README.md)、[package.json](../package.json)、[storage.js](../storage.js)、[配布スクリプト](../scripts/build-itch.ps1)、[TEST-REPORT](../TEST-REPORT.md)、[PRODUCT](../docs/ai/PRODUCT.md)、[WORKFLOW](../docs/ai/WORKFLOW.md)。

## Scope

- 現行の起動・アセット参照・入力・Canvas / Web Audio・全画面・ポーズ・保存・配布構成を調べ、再利用できる部分とデスクトップ固有の差分を整理する。
- Tauri、Electron、現行ブラウザZIP方式を比較する。必要なら別候補を短く追加し、現行方式は比較基準として扱う。各候補の最新の公式資料を確認し、URL・確認日・対象バージョンを調査記録へ残す。
- 比較軸は、HTML/CSS/JSの再利用度、開発用／実行時依存、Windows・CPUの対応範囲、ビルド再現性、起動方法、初回／以後のオフライン起動、配布サイズ、ライセンス・同梱物、更新時の作業と保守負荷。実測値・公式資料の値・推定・未確認を区別する。
- 「ZIP展開後にインストーラーなしで起動できる」「追加ランタイムの導入なしで起動できる」「保存を含めフォルダごと持ち運べる」を別々に評価する。EXEの存在だけでPortableと判定しない。
- save/localStorageについて、origin・アプリ識別子・ユーザーデータ保存先、再起動時の永続化、フォルダ移動・更新時の扱い、保存拒否時の起動、ブラウザ版との分離を評価する。既存ブラウザ記録を自動で引き継げるとは仮定しない。
- 推奨候補と代替案、採用を阻む問題、未検証事項をまとめる。結論は「次の実装へ進行可 / 条件付き / 見送り」とし、方式の正式採用はProducerが判断する。
- 最小PoCは候補1方式に限定し、次の条件をすべて満たす場合に実施する：既存ゲーム・保存・i18n・ブラウザ配布を変更せず追加ファイルで隔離できる、依存と作業量が把握できる、環境の恒久的変更や大規模なビルド移行を要しない。根拠をExecution Resultsへ先に記録する。満たさない場合は調査のみで終了でき、PoCを行わない理由と次回の条件を残す。
- PoCを作る場合は現行アセットの同梱、Windowsでの起動、短いプレイ、再起動後のmeta・言語設定保持までを確認する。製品版ランチャーや独自保存機構は作らない。

## Non-goals

- ゲーム内容、灰縫い、敵・強化・遺物、バランス、成長曲線、操作仕様を変更しない。
- UI・i18n文言、日英辞書、音・演出、既存ブラウザ版の挙動を変更しない。
- save format・保存キー・安定したIDを変更しない。途中ラン保存、セーブ移行・共有・クラウド同期は実装しない。
- macOS / Linux対応、インストーラーの製品化、ストア対応、自動更新、コード署名取得、CI/CDの本格整備は行わない。Windows配布に必要な課題としての整理は含める。
- 正式配布、itch.ioへのアップロード、リリース版番号変更、タグ付けは行わない。

## Constraints

- [AGENTS.md](../AGENTS.md) の共通ルールを適用する。プロダクトの優先順位とProducerの最終判断を維持する。
- ブラウザ版を正本として保ち、既存の直接file起動・HTTP起動・itch ZIP生成を維持する。PoCは別ディレクトリ・別成果物へ隔離し、既存配布ZIPを上書きしない。
- 現行ゲーム・i18n・保存コードと既存配布スクリプトは変更しない。アセットの複製が必要ならビルド時に生成し、ゲームの手修正コピーを別系統で保守しない。
- metaと独立した言語設定、未知のmetaフィールド、既存ブラウザの記録を保護する。保存先と持ち運び条件が不明なまま、互換・移行・完全Portableを保証しない。
- 新規依存はPoCに必要な最小限にし、開発環境で必要なものとプレイヤー環境で必要なものを分けて記録する。未導入ランタイムを前提とする場合は初回起動・オフライン制約を明示する。
- 調査だけで終了する場合はゲームのフルテストを必須にしない。PoCを作る場合は既存テストと対象環境の確認を行い、自動検証と人間の実プレイを区別する。
- Git: 計画更新はmain上の文書変更として開始し、調査・PoCには基準mainから `work/portable-build-feasibility` を使用。Producerの完了整理依頼に基づき、Sprint 1の文書・PoCソース・固定依存・関連検証スクリプトをこのブランチでコミットする。`dist/`・`work/`・`node_modules/`の生成物は含めず、mainへのmerge・push・公開は行わない。

## Deliverables

- この `current-sprint.md`：確定Scope、実行結果、レビュー、Producer判断、次回への引き継ぎ。
- `docs/PORTABLE-BUILD-FEASIBILITY.md`：現行構成の調査、候補比較、公式資料、保存・起動条件、依存・サイズ・保守負荷、推奨と代替案、未確認事項。調査実行時に作成する。
- PoCを実施した場合のみ：隔離した最小起動層・設定・再現可能なビルド手順、別名のWindows用成果物、実行環境・同梱内容・サイズ・制限・検証結果。配置と命名は調査後に決め、生成物は既存のGit除外方針に従う。
- PoCを実施しない場合：低リスク条件を満たさなかった根拠、残る検証、次スプリントで必要な作業・判断。

## Definition of Done

- [x] 現行構成と候補比較が揃い、公式資料の根拠・対象バージョンと、実測／推定／未確認が区別されている。
- [x] インストール・ランタイム・オフライン・保存先・フォルダ移動／更新・ブラウザ保存との分離を評価し、Portableとして満たす条件と制限を説明できる。
- [x] 開発用／実行時依存、配布サイズ、同梱・ライセンス、ビルド手順、Windows対応範囲、保守負荷を比較できる。測れなかった値は理由と次の確認方法を残す。
- [x] 低リスク判定を記録し、PoC実施時は下記の検証結果を残す。非実施時は理由・実行を阻む条件・次回の最小検証を記録する。
- [x] PoC実施時：`npm test`、関係する入力・保存・i18n・ブラウザ確認、展開後のデスクトップ起動・再起動・オフライン確認を実施する。既存配布スクリプトの回帰検証は `powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\build-itch.ps1`。既存ブラウザ版のfile / HTTP起動を確認し、同梱ゲームアセットと基準ソースの一致を確認する。各結果をPASS / FAIL / SKIP / 未実施と環境付きで記録する。
- [x] 未実施・実行不能の検証について理由と結論への影響を残し、証拠が不足する候補を無条件の「進行可」としない。ゲーム・バランス・i18n・既存保存・ブラウザ配布の意図しない差分がない。
- [x] Required ReviewsとProducer Playtestの必要な工程が完了、または不要理由を記録済み。独立QAは完了（技術的な配布判断は保留）、ProducerはWindows実機の通常プレイを確認。QA残件と詳細シナリオの未確認は、Producer判断により正式配布・取り込み前の条件として引き継ぎ、未実施の検証をPASSにはしない。
- [x] 推奨・代替案・制限をProducerへ提示し、次の実装へ進むか／追加調査か／見送るかの判断を記録する。Electron正式採用は保留、次はTauri PoCとの比較。今回のSprint 2作業は計画作成まで。
- [x] 変更ファイル・検証結果・未検証事項・残るレビュー／人間確認・branch / commit / worktree状態を報告。

## Required Reviews

- Game Design Review: 原則不要。ゲーム内容・バランス・表示文言を変更せず、配布方式のfeasibilityを扱うため。PoCで操作感・視認性・テンポへの懸念が出た場合は、[Game Design Guide](../docs/ai/REVIEW-GUIDE-GAME-DESIGN.md) に沿って影響する体験を確認する。新しいゲーム仕様の変更はScope外とする。
- QA / Engineering Review: 必要、2026-10-05の別会話Reviewerによるレビューを実施済み。詳細はReview Results。Verdict / Release recommendationは判断保留のまま保持し、check/request設定の不足、環境起因のGUI検証FAILと未到達範囲を解消済みと扱わない。Implementerの自己確認とProducer実機確認は別の証拠とする。

## Producer Playtest

- Required: 調査のみならゲームプレイは不要。比較結果と次回方針のProducer判断は必要。PoCを作る場合はWindowsでの起動・操作感・保存の人間確認を必要とし、新しいバランス評価は求めない。
- Scenarios: PoC実施時はZIPを別フォルダへ展開して起動し、オフラインでの利用条件を確認。日本語／英語の切替、開始、WASD・矢印移動、照準・クリック・SPACEによる灰縫い、ポーズ／再開、全画面／解除、別ウィンドウへの移動を確認する。短いラン終了後、アプリを終了・再起動してmetaと選択言語の保持を確認し、別フォルダへの移動・更新時の保存挙動を調査結論と照合する。元のブラウザ版でも記録・起動・操作が維持されているか確認する。
- Observations: 起動手順の分かりやすさ、必要なインストール・通信・警告、入力・音・ポーズ・表示の不自然さ、ブラウザ版との体感差、保存先・持ち運び条件の説明と実際の一致。利用環境と結果を記録し、未知の環境へ一般化しない。
- Result / Decision（Producer確認、2026-10-05）：Electron PoCはWindows実機で通常プレイ可能だった。Electronでデスクトップ化できること自体は確認できた。一方、約151 MiB ZIP / 約367 MiB展開後はProject Ashfallには大きく、Electron正式採用は保留。次スプリントでTauri PoCを作成し、Electronと比較して採用方式を判断する。今回はSprint 2の計画作成までで、実装は未着手とする。
- 確認範囲の限界：Producer報告は通常プレイの成立についての確認であり、上記シナリオ全項目のPASSではない。実機のOS詳細・各キー・音・保存照合の個別結果は未報告。クリーンPCの物理ネットワーク遮断下の初回オフライン、Alt+F4／×からの完全終了と再起動、二重起動、Electron権限check/request両経路、別PC移動・更新、実ディスクの保存拒否等は未解決。QAの独立GUI検証FAILはそのまま残す。

## Open Questions

- Portableの最終要件は、インストーラー不要でよいか、追加ランタイム不要や保存データの持ち運びまで必須か。今回は条件ごとに評価し、製品要件は結果を受けてProducerが決める。
- Windowsの対象バージョン・CPU範囲と配布サイズの許容値は未指定。実際に検証できた環境を明示し、未指定の範囲を対応済みとしない。
- ブラウザ版からの記録引き継ぎが将来必要か。今回は可否・課題の整理までで、移行機能は実装しない。
- 正式配布時の署名・警告への対応と配布経路は、調査後に判断する。Sprint 1では未署名PoCの制限を記録し、公開しない。
- QA残件：クリーンPC初回オフライン、Alt+F4／×・全プロセス終了・直後の再起動、二重起動時のprofile／保存衝突、権限check/request両経路（P2、check handler未設定）、外部navigation／popup拒否・通常起動でのtest/CDP無効、runtime通信、native profile拒否・破損、別PC／更新、クリーンcheckout再ビルド等は未解決。元レビューでmerge前とされた条件も正式配布前の条件も残り、Sprint 1完了を取り込み・公開の許可としない。

## Execution Results

- 計画作成時：`main` / `08f6f9665c67a92851324f6bccff5f973c813b85`、worktree cleanを確認。完了済みSprint 0はGit履歴に残り、雛形・役割・工程・QA基準・現行の起動／保存／配布構成を読んでSprint 1を準備した。
- 計画書の自己確認：雛形と全15セクションの順序が一致し、実リポジトリ基準の相対リンク10件が存在することを確認。未置換の雛形項目や実行完了のチェックはない。ゲーム・テスト・配布ファイルは変更しておらず、文書のみの準備としてフルゲームテストは未実施。
- 調査着手（2026-10-05、Asia/Tokyo）：`main` / `08f6f9665c67a92851324f6bccff5f973c813b85`。既存変更はProducerのSprint 1計画書のみ。内容を保持して `work/portable-build-feasibility` を作成した。コミットは行わない。
- 実行計画：現行ソースと公式資料を比較し、Portableの3条件を分離評価。低リスクな1方式だけをPoC化し、同梱一致・入力・保存・i18n・ブラウザ起動を検証して独立Reviewerへ引き継ぐ。
- PoC前の低リスク判定：Electron 44.5.1を採用候補として最小PoCを実施する。現行classic scriptsは無変更で同梱可能。`desktop/portable-poc/`に起動層・固定依存・ビルドを隔離し、成果物はGit除外済みの`dist/`、キャッシュと検証用展開は`work/`へ置く。新しい直接依存はElectron開発用1件で、公式prebuilt binaryを使い、Rust/MSVC導入・ルートpackage変更・ビルド移行は不要。ゲームファイルはビルド時にコピーし、既存itch ZIPと別名にする。保存はChromiumのlocalStorageのまま、PoC専用profileの配置設定だけを起動層で行う。公式最新版とnpm照会の両方で44.5.1を確認。依存ダウンロード／GUI検証には実行環境のsandbox権限確認が必要だが、システムへの恒久的インストールは行わない。
- 成果物：[Portable調査](../docs/PORTABLE-BUILD-FEASIBILITY.md)へ現行構成、Tauri 2.12.0 / Electron 44.5.1 / ブラウザZIP比較、公式URL・確認日、Portableの3条件、保存・サイズ・保守・未確認事項を記録。[PoC](../desktop/portable-poc/README.md)にmain/build、package/lockfile、検証スクリプトを追加。ゲーム・保存・i18n・既存テスト・ルートpackage・既存配布スクリプトは無変更。
- ビルド：PoC dirで`npm install`、`npm run runtime`、`npm run build`。PASS。固定binaryの取得はnpm依存と別工程。Windows x64 / Node 22.23.1 / npm 10.2.1 / PowerShell 5.1。13ゲームファイル145,955 bytesを無変更同梱。成果物`dist/project-ashfall-v0.8.0-electron-44.5.1-win-x64-poc.zip`は157,965,952 bytes（150.65 MiB）、展開89ファイル384,979,036 bytes（367.14 MiB、profileなし）。既存itch ZIPは保持。
- 既存検証：`npm test` PASS（159 PASS、FAIL/SKIPなし）、`powershell -NoProfile -ExecutionPolicy Bypass -File ./tests/build-itch.ps1` PASS（6件）。今回のログ・parity結果をworkへ保存し、ルートの過去検証JSONは実行前のbytesへ復元した。
- PoC検証：`node desktop/portable-poc/verify.cjs` PASS（12項目）。ZIP展開後の起動、13アセット一致、日英切替、meta bytesと未知フィールド、1024×640、live Canvas / Web Audio、WASD・矢印・照準・SPACE灰回収／炸裂・クリック要求、native全画面・pause/P/再開、プロセス再起動でのmeta/言語保持、日本語・空白付きフォルダへの終了後コピー、保存拒否fixture、例外0を確認。操作の一部は明示fixture。offlineはCDPのreload/start確認に限定し、物理ネットワーク遮断済みの初回起動は未実施。証拠：`work/portable-build-feasibility/verify-1791192491564/`。
- ブラウザ検証：`powershell -NoProfile -ExecutionPolicy Bypass -File desktop/portable-poc/verify-browser.ps1` PASS（UI 9件 + 日英5件）、Edge 154.0.4258.53。HTTP/file起動、日英保存・全23カード、1440×900/1024×640、全画面・ポーズ、例外0。ソース・既存テストをworkへコピーし、初回の固定400ms待機失敗に対してコピー内の300/350/400ms待機のみ1500msへ調整。元テストの固定待機版PASSとは区別する。証拠：`work/portable-build-feasibility/browser-1791193069096/`。
- 検証中の問題：初回PoC fixtureが導入中の灰縫い制限を考慮しておらず修正。Node 22.23.1のprofileコピーでnative crash（-1073741819）が発生したため検証用コピーをPowerShellへ変更し、全項目を再実行してPASS。ゲーム／起動層の不具合と断定しない。ブラウザhelperもVolta proxyの子サーバー残留を修正し、検証用プロセスを終了。失敗記録はworkへ保持。
- 未確認：人間の操作感・物理Esc/Alt+Tab・音、クリーンPCの初回オフライン、Windows 10/arm64/別PC、native profile拒否・容量枯渇・破損・runtime更新、Tauriの実ビルドとサイズ。結論は条件付きとし、正式採用は未決定。
- 自己確認：相対リンク24件、同梱13ファイルSHA256、過去検証JSON 2件の復元、固定依存とlockの整合、追加JS構文、`git diff --check`はPASS。PoC英語タイトル1024×640とCanvas画像も確認。Git状態は`work/portable-build-feasibility` / `08f6f9665c67a92851324f6bccff5f973c813b85`、既存Sprint計画を引き継いだ変更と追加成果物が未コミット。main merge・push・外部公開なし。
- 完了整理（2026-10-05）：ProducerのWindows実機通常プレイ確認、サイズ評価、Electron正式採用保留、次回Tauri比較の判断を反映。独立QAの判断保留と未解決事項を保持し、Status・Producer Playtest・Decisions・DoDを整合させた。調査文書とPoC READMEも現判断・sandbox ACL条件・権限設定の不足に合わせて更新した。
- 完了整理の自己確認：文書2件のローカルリンク28件、雛形15セクション、DoDの完了表記、PoC JavaScript 3件とPowerShellの構文、`git diff --check`がPASS。`dist/`・`work/`・PoCの`node_modules/`は既存ignoreに一致。今回は文書のみを編集し、PoC実行コード・ゲーム・既存テスト・配布スクリプトは変更していないため、記録済みのゲーム検証は再実行していない。既存ZIPは再ビルドせず、サイズ・hash・GUI証拠は完了整理前の検証対象として保持する。更新したREADMEはそのZIP内の旧READMEとは区別する。
- 保存方針：このdone記録を含むSprint 1成果9ファイルを `work/portable-build-feasibility` でコミットし、完了コミットはGit履歴から参照する。Producerの最新の依頼はSprint 1のコミットのみであり、currentはこのdone記録を保持する。Sprint 2の計画は本コミットに含めず、実装・main merge・pushは行わない。
- コミット準備結果（Work実行時）：指定したSprint 1成果9ファイルへの `git add` は `.git/index.lock` 作成の `Permission denied` で失敗。当時はステージ・コミット未実施で、HEADは `08f6f9665c67a92851324f6bccff5f973c813b85` のままだった。Sprint 1のdone記録をこのファイルに保持し、Sprint 2計画はコミット対象外のローカルdraft `plans/sprint-2-tauri-portable-poc-comparison.md` に保存した。
- コミット整理（Codex、2026-10-05）：Producerの今回の指示に基づき、Sprint 1の文書2件とPoCの7ファイルをコミット対象とする。`dist/`・`work/`・`node_modules/`・Sprint 2 draftは含めない。WorkのQA結果・Producer判断・未解決事項と、PoC実行コードを保持する。成果コミットのhashと含めたファイルはGit履歴から確認する。

## Review Results

独立QA / Engineering Reviewは2026-10-05に実施済み。詳細な結果と判断保留の理由を以下に保持する。Game Design Reviewはゲーム内容・バランスを変更しない現Scopeでは不要。計画書の自己確認やProducerの通常プレイ確認から、QA残件の解消を推定しない。

Implementerの自己確認（レビュー引き継ぎ時点）：ゲームソースと既存配布に差分なし。起動・保存・入力・日英の自動検証は上記の条件でPASS。人間の操作感・クリーン環境・異なるruntimeの証拠不足は残る。独立Reviewerへ、基準コミット、当時のスプリント、調査文書、`desktop/portable-poc/`とwork内証拠を渡した。以下の独立レビューはROLESの手動受け渡し方針に沿った別会話の結果で、Implementerの自己確認とは区別する。

### QA / Engineering Review — 2026-10-05（Asia/Tokyo）

以下は独立レビュー時点の結果で、自己確認・Producer Playtestとは区別する。ReviewerはStatus・Done・採用判断を変更しておらず、その後のProducerによる完了判断はDecisionsに記録する。

Reviewer: Codex、このQA専用の別会話。QA / Engineering Reviewerとして独立レビュー。実装・設定変更・ゲームバランス／面白さの評価は行っていない。

Target: Sprint 1 — Portable Build Feasibility。`work/portable-build-feasibility` / HEAD・mainともに `08f6f9665c67a92851324f6bccff5f973c813b85`。コミット間の差分はなく、未コミットのSprint記録、調査文書、`desktop/portable-poc/`の7ファイルと実際のZIP・ローカル証拠を対象にした。既存ゲーム・テスト・ルートpackage・itch配布スクリプトにGit差分なし。

Evidence:

- AGENTS、現Sprint、QA Guide、ROLES、WORKFLOW、現行package・保存・言語・入力、TEST-REPORTとv0.8検証文書、調査文書、PoCの全7ファイルを確認。過去版の記録を今回のPASSへ算入していない。
- Reviewer環境：Windows `10.0.26200` / x64、Node 22.23.1、npm 10.2.1、制限付きWindows sandbox。Gitのownershipチェックはコマンド単位の`safe.directory`指定で読み取り、global設定は変更していない。
- `npm test`を独立再実行：PASS、159 PASS / FAIL・SKIPなし。生成される既存parity JSON 2件は実行前のbytesへ復元し、今回の結果を[QA証拠](../work/portable-build-feasibility/qa-review-20261005/)へ保存。
- `tests/build-itch.ps1`をソースとスクリプト無変更のwork内コピーで独立再実行：PASS、6件。元のitch ZIPは上書きしていない。
- ZIP内容の独立確認：89ファイル、展開384,979,036 bytes。13ゲームファイルは現worktreeのbytes・SHA256と一致し、基準Git内容とも改行正規化後に一致（GitはLF、worktreeはCRLF）。同梱main・READMEもレビュー対象と一致。Electron版44.5.1、lockfile、manifest、runtime版が整合。ZIP SHA256は`83c826853340097db22c4b0bd64217db2ecdb50207e4c285a1785f53df7a0e5c`。詳細は[static-audit.json](../work/portable-build-feasibility/qa-review-20261005/static-audit.json)。
- Implementerの[PoC検証JSON](../work/portable-build-feasibility/verify-1791192491564/verification.json)、app.log・英語1024×640タイトル／Canvas画像、[ブラウザ検証ログ](../work/portable-build-feasibility/browser-1791193069096/)を確認。PoC 12項目、Edge 154.0.4258.53のUI 9件＋日英5件のPASSは自己確認の証拠として妥当。ただしfixture・待機延長・offline範囲の制限がある。
- `node desktop/portable-poc/verify.cjs`を独立再実行：ZIP展開・同梱照合はPASS、起動はFAIL（終了コード2147483651）。[app.log](../work/portable-build-feasibility/verify-1791194045643/app.log)にsandbox tokenから展開先を読めないACL条件のFATALと、OS暗号化エラー0x2を記録。画面接続前に停止したため、今回の終了・再起動・保存・移動・offlineの独立実行は未到達。ACL変更・sandbox無効化で回避していない。通常PC全般の起動不具合とは断定しない。
- `verify-browser.ps1`を独立再実行：FAIL、最初の`Runtime.enable`が15秒でタイムアウト。[今回のブラウザ証拠](../work/portable-build-feasibility/browser-1791194098867/)に保存。ゲームのassertionへ未到達で、原因未確定。今回のHTTP/file実画面確認をPASSへ算入しない。helperは終了処理を実行し、終了後の対象Electron親プロセスと4173/9225/9226のlistenは検出されなかった。全子プロセスの照合はOSの一覧取得拒否で未確認。

Verdict: 判断保留。ブラウザ版維持と現行ソース再利用には重大な懸念なし。Electronの権限設定の不足、今回の起動制約、通常起動の人間確認を解消／明示する前に、無条件のmerge・製品化進行可とはしない。

Regression risks:

- ブラウザ実行ファイルは無変更で、VM回帰・配布回帰も独立PASS。ブラウザ版への新しい回帰は検出していない。ただし今回の実画面再検証は失敗しており、証拠はImplementerのEdge確認まで。
- 二重起動に対する明示的なsingle-instance制御がなく、同じEXE横dataを複数プロセスが使う可能性がある。profileロック・保存衝突・旧metaでの上書きは未再現のリスク。強制終了直後の再起動も未検証で、通常終了後の保存保持と混同しない。
- 書き込み可能なフォルダだけで起動条件を満たすとは限らない。今回のsandbox ACLで実際に起動が止まったため、READMEの展開先条件にはrendererが読める権限も関係する。profile書き込み拒否とは別の制限として扱う。

Bugs found:

- 実ゲーム・save・i18nの新規不具合は再現なし。今回のnative起動FAILとブラウザ接続FAILは上記の環境／未到達の事実として記録する。
- **[P2] 権限拒否の設定がcheck側をカバーしない**：`desktop/portable-poc/main.cjs:26`は`setPermissionRequestHandler`のみで、`setPermissionCheckHandler`がない。[Electron 44.5.1の公式session API](https://github.com/electron/electron/blob/v44.5.1/docs/api/session.md#sessetpermissionrequesthandlerhandler)は完全な権限制御に両者を必要としている。期待は必要なfullscreen以外の権限を明示的に拒否することだが、実際はrequest経路しか指定していない。現行ゲームはカメラ等を使わず、今回の実機で権限取得／悪用は未再現。設定上の不足と、実証済みの脆弱性を区別する。merge前にcheck/request両経路の確認と対処、またはPoCに残す制限としての明示判断が必要。

Untested areas:

- 通常フラグなしのEXE起動、Windowsの×／Alt+F4による終了、再起動直後の状態、親子プロセスの完全終了。PoC verifierは全起動に`--ashfall-test --ashfall-hidden --remote-debugging-port`を付け、`window.close()`で親の終了を確認するため、通常の配布経路を直接検証していない。
- 物理Esc・Alt+Tab・長押し／repeat・実visibility・DPI・音の聞こえ方・自然な短いラン終了。blurは合成イベント、敵と更新／結果はfixtureを含み、人間確認の代用にならない。
- クリーンPCでネットワーク遮断済みの初回起動、Windows 10／arm64／別PC・別ユーザー、native profile拒否・容量枯渇・破損、同時起動・強制終了、同一版更新・Electron更新／downgrade。今回のprofileコピーは終了後・同一PCに限る。
- runtime全体の通信・権限API・外部navigation／popup拒否の実行検証、クリーンcheckoutでの再ビルド、署名・SmartScreen／Defender・企業policy。Tauri実ビルドはScope内の比較候補だが未実施のまま。

Browser/save/i18n concerns:

- EXE横dataにuserData/sessionDataをready前に設定し、standard/secureの`ashfall://game`を使う設計はフォルダ移動時のorigin維持に整合。ブラウザprofileを探索／書換するコード、独自save形式、保存キー・upgrade ID／relic番号変更はない。
- Implementer証拠ではja→en切替時のmeta bytes不変、未知フィールド、ラン終了後のmetaと言語の再起動保持、終了後の日本語・空白パスへのコピーがPASS。保存拒否はlocalStorage getterのfixtureであり、実ディスクへの書き込み失敗やnative profile初期化を証明しない。途中ラン保存はない。
- Node無効・contextIsolation/sandbox有効、preload/IPCなし、外部navigationとpopup拒否、manifestの静的ファイル許可リストは確認済み。webSecurityを無効化する設定やCSP bypassはない。一方、CSPの定義、check側の権限handlerはない。runtime fuseを読み取り、RunAsNode／NodeOptions／NodeCliInspectは有効、ASARの整合性強制はないことを確認。CSP・fuse・署名等の製品向け対策は正式配布前の論点で、今回のPoCへ一括導入する要求ではない。[Electron security](https://www.electronjs.org/docs/latest/tutorial/security)、[Fuses](https://www.electronjs.org/docs/latest/tutorial/fuses)（確認日2026-10-05）。
- offline PASSはCDP設定後のreload/startに限定。`protocol.handle`の資源読取はmain側の`net.fetch(file:)`で、renderer CDPのHTTP要求0件だけからruntime全体の無通信や初回offlineを保証できない。
- 同梱不足・明白な不要開発物は検出なし。LICENSE／Chromium notices、runtime DLL・pak・localesとゲーム13ファイルが存在し、data、node_modules、default_app、テスト／ビルド／サーバー、lockfile、ログ、Git情報はZIPにない。runtimeのlocales等は公式配布物として保持しており、未検証の削減は要求しない。公開ライセンス・署名等の正式配布判断は未完了。

Required tests:

1. **mainへPoC／調査をmergeする前**：通常の書き込み・読み取り可能なWindowsフォルダへ同じZIPを新規展開し、test/CDPなしで初回起動→日英切替→短いラン終了→×／Alt+F4→全プロセス終了→再起動し、meta・未知フィールド・言語保持を照合する。元ブラウザのHTTP/file・既存記録も確認する。Producer Playtestとして物理Esc・Alt+Tab・音・入力を記録し、今回の独立GUI検証FAILと区別する。
2. **merge前のEngineering確認**：fullscreenの許可と不要権限のcheck/request両経路の拒否を、既存データを使わない専用profileで確認。外部navigation・popup、通常起動でAshfallTest／CDPが無効なことも確認し、P2への対処またはPoC限定の扱いを記録する。二重起動→終了→再起動時に保存やprofileが壊れないかを最小1ケースで確認する。
3. **merge前の記録確認**：sandbox ACL起動制限と今回の未到達範囲を起動条件へ反映し、独立QA待ちという旧記述と今回結果を整理する。本レビューはReview Resultsへの追記のみで、他の記録や設定は修正していない。ZIP・証拠がGit除外であることを踏まえ、取り込むPoCソース／lockと検証対象ZIPの対応を保持する。
4. **正式なPortable保証／製品化前**：対象OS/CPU・Portable要件・サイズ許容を決め、クリーンPCで物理ネットワーク遮断済みの初回起動、別PCへの終了済みdata引き継ぎ、更新前後のsave照合、クリーンcheckout再ビルドを実施。これらは今回のmergeのために第2PoCや未指定OS対応を追加する要求ではなく、未確認の範囲を保証しないための次回条件。

Release recommendation: 判断保留。ブラウザ版を保った調査・隔離PoCとしての根拠は揃っているが、上記merge前確認と権限設定の扱いを記録後に再確認する。正式方式の採用・配布はProducer判断と次回の実機検証待ち。技術レビューは完了したが、人間確認・スプリント全体のDone・merge／push／公開の承認を代筆していない。今回の追記対象はこのReview Resultsのみ。branch／HEADは開始時のまま、既存の未コミット変更は保持し、commit・merge・pushは行っていない。

## Decisions

- Producer（今回の依頼）: Sprint 1はWindows向けPortable Build Feasibilityとし、ブラウザ版を維持して現行HTML/CSS/JSの再利用・候補方式・保存・ビルド／配布・依存・サイズ・保守負荷を評価する。低リスクなら最小PoCまでをScopeに含める。
- Producer（今回の依頼）: ゲーム内容・バランス・i18n文言・既存ブラウザ版の挙動を変更しない。
- 計画上の工程選択: QA / Engineeringの独立レビューを必須とし、PoC実施時に人間の起動・操作・保存確認を行う。正式方式の採用、製品版の実装・公開は未決定。
- Implementer提案（当初、正式採用は未承認）：追加runtime導入を避けるならElectronを第一候補とする「条件付き進行」。サイズ重視でWebView2導入を許容するならTauri + Evergreenを追加調査する。この提案へのProducer判断は以下のとおり。
- Producer（完了整理、2026-10-05）：Windows実機でElectron PoCを通常プレイでき、Electronでデスクトップ化できること自体は確認できた。
- Producer（完了整理）：約151 MiB ZIP / 約367 MiB展開後はProject Ashfallには大きい。Electronの正式採用は保留とする。
- Producer（完了整理）：次スプリントはTauri Portable PoC Comparison。Tauri PoCを作成してElectronと比較し、正式方式の採用はProducerが判断する。今回の依頼では計画作成までとし、実装は開始しない。
- Producer（完了整理）：Sprint 1をfeasibility評価としてdoneにする。クリーンPC初回オフライン、Alt+F4、二重起動、権限check/request両経路を含むQA残件は未解決のまま引き継ぐ。元QAの判断保留を保持し、正式配布・merge・pushは行わない。
- Producer（Git）：Sprint 1の成果を現在の `work/portable-build-feasibility` でコミットする。対象は本計画、調査文書、PoCの7ソース／設定／検証ファイル。生成物・ローカル証拠は除外する。

## Next Sprint

Sprint 2 — Tauri Portable PoC Comparison。Tauri最小PoC、Electronとの配布サイズ、WebView2依存、offline条件、localStorage／保存、HTML/CSS/JS再利用度、build手順、保守負荷、セキュリティを比較する。Electron正式採用は保留、最終判断はProducer。draft計画はコミット対象外のローカルファイル `plans/sprint-2-tauri-portable-poc-comparison.md` に保持する。currentはSprint 1のdone記録のままにし、Sprint 2への切替・基準hash更新は次回の準備で行う。今回はSprint 1成果のコミットのみで、Sprint 2実装には着手しない。
