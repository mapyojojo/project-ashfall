# Windows Portable PoC

Sprint 1の検証用。正式配布物ではありません。ゲームはv0.8.0のブラウザ版と同じファイルをビルド時に同梱します。

Windows x64、Node.js 22.12.0以上、npm、PowerShell 5.1以上で、リポジトリのルートから実行します。

```powershell
cd desktop/portable-poc
npm ci
npm run runtime
npm run build
```

初回の依存取得にはnpmとGitHubへの通信が必要です。Electron 44.5.1と推移依存をlockfileで固定します。システムへのElectron、Rust、MSVCの追加インストールは不要です。ルートpackage.jsonと既存itch配布スクリプトは使いません。

成果物は `dist/project-ashfall-v0.8.0-electron-44.5.1-win-x64-poc.zip`。ZIPを**フォルダ全体**として書き込み可能で、sandbox内のrendererからも読み取れる場所へ展開し、`Ashfall-PoC.exe`を起動します。独立QAでは展開先のsandbox ACL条件により起動が停止しました。EXEだけの持ち運びはできません。既存成果物や保存を保護するため、ビルドは同名の出力が存在すると停止します。再ビルドは別checkoutで行うか、以前の成果物を自分で保管してください。

Node.js、npm、WebView2の追加導入はプレイヤー側では不要です。ネットワークを使う機能・自動更新は追加していません。Windows 10/11 x64が対象候補で、このPoCの検証結果を他のOS/CPUへ一般化しません。未署名であり、Windowsが警告・実行拒否する環境は未検証です。ElectronのアイコンとEXEの製品情報は検証用のままです。

保存はEXE横の`data/`内のChromium profileで、既存の`ashfall.v1`と`ashfall.language`をそのまま使います。originは`ashfall://game`で、フォルダ位置に依存しません。ブラウザ版の記録は読み取りません。全ウィンドウを閉じてから`data/`を含めフォルダ全体を移動・バックアップしてください。更新は新しいフォルダへ展開後、終了済みの旧版の`data/`をコピーする方式が候補で、製品化は未決定です。別PC間・異なるElectron版間のprofile互換は未検証です。profileを作れない場所では起動できません。既存ゲームの保存拒否例外は吸収しますが、保存の成功は保証できません。

同梱の`LICENSE`と`LICENSES.chromium.html`を保持してください。Electron本体はMITで、Chromium等の第三者noticeを含みます。ゲーム本体の公開ライセンスは本リポジトリで未指定のため、このPoCを再配布しないでください。

自動検証時のみ`--ashfall-test`と専用のCDPポートを使います。通常起動時はテストAPI/CDPを有効にしません。比較・制限・検証証拠はリポジトリの`docs/PORTABLE-BUILD-FEASIBILITY.md`と`plans/current-sprint.md`を参照してください。

2026-10-05のProducer確認ではWindows実機で通常プレイ可能でした。約151 MiB ZIP / 約367 MiB展開後はProject Ashfallには大きいとの判断で、Electron正式採用は保留です。次はTauri PoCとの比較を計画しています。

正式配布・取り込み前のQA残件は未解決です。クリーンPC初回オフライン、Alt+F4／×での完全終了・再起動、二重起動の保存衝突、権限check/request両経路、別PC移動・更新等は確認済みと扱いません。権限設定はrequest handlerのみでcheck handlerがないP2指摘を残しており、今回コードは修正していません。通常プレイ成立とこれらの詳細検証を区別してください。Sprint 1のdone記録と独立QA全文は現在の`plans/current-sprint.md`に保持しています。Sprint 1成果のコミット後はそのGit履歴から参照できます。
