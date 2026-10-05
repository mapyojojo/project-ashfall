# Tauri Windows x64 Portable PoC

Project Ashfall v0.8.0の無変更13ファイルを埋め込む比較用PoC。正式配布版ではありません。

ZIPを読み書き可能なフォルダへ展開し、`Ashfall-Tauri-PoC.exe`を起動します。Microsoft WebView2 Evergreen Runtimeが必要です。EXE横の`data/`へ専用profileを保存します。終了後にフォルダ全体を移す方式を検証します。ブラウザ版・Electronの記録は共有しません。途中ラン保存はありません。同じフォルダの二重起動はprofileのOSファイルロックで拒否します。

WebView2未導入時のネットワーク遮断済み初回起動、別PC・別ユーザー、音と物理入力は別確認が必要です。runtime未同梱のZIPサイズを、runtime込みの容量と混同しないでください。

## Build

既存Windows x64 Rust/MSVC C++ Build Tools/Windows SDK、Node、WebView2を使用します。恒久toolchainの導入をこのPoCから行いません。CLI 2.12.1、Tauri 2.12.1、tauri-build 2.7.1と両lockfileを固定します。ルートpackageは変更しません。

リポジトリルートで実行:

```powershell
npm ci --ignore-scripts --prefix desktop/tauri-poc --cache work/tauri-poc/npm-cache
$env:CARGO_HOME = Join-Path (Get-Location) 'work/tauri-poc/cargo-home'
$env:CARGO_TARGET_DIR = Join-Path (Get-Location) 'work/tauri-poc/target'
cargo fetch --locked --manifest-path desktop/tauri-poc/src-tauri/Cargo.toml
node desktop/tauri-poc/build.cjs
```

依存取得は開発時に通信を使います。ビルドは既存13ファイルを`work/tauri-poc/assets/`へ自動生成し、内容とSHA256を照合します。Windows用PoCアイコンもworkへ生成します。ゲームコピーを手修正しないでください。buildは`--locked`と静的MSVC runtimeを使い、installerを作りません。成果物は`dist/project-ashfall-v0.8.0-tauri-2.12.1-win-x64-poc.zip`です。既存出力は上書きせずエラーにします。取得済みキャッシュのみで試す場合は`$env:CARGO_NET_OFFLINE = 'true'`を設定します。

`assets.json`は埋込み対象のmanifest、`THIRD-PARTY-NOTICES.txt`は解決済みWindows Rust依存のlicense inventoryです。WebView2の再配布物は含みません。正式な再配布ライセンス判断・署名・SmartScreen等は残件です。

## Verify

```powershell
node desktop/tauri-poc/verify.cjs
node desktop/tauri-poc/measure.cjs
powershell -NoProfile -ExecutionPolicy Bypass -File desktop/tauri-poc/verify-regression.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File desktop/tauri-poc/verify-browser.ps1
```

専用`work/tauri-poc/verify-*`へZIPを展開し、配布EXEを検証します。通常EXEにゲームtest APIを有効化する起動引数はありません。自動検証だけはWebView2の外部環境変数で専用CDPポートを開き、必要な場面で`?test`を明示的に読み込みます。テストfixture、ブラウザoffline emulationと実ディスク／物理network条件を分けて記録します。既存profile・元Electron成果物は変更しません。

ブラウザ検証は既存UI/i18nテストをwork内のコピーで使い、150〜400msのnavigation／fullscreen待機だけ1500msへ延長します。元の期待値は変更しません。regressionは既存parity JSONの実行前bytesを復元し、今回の結果はworkへ保存します。measureは既存Electron ZIP・manifestとの一致も確認します。

詳細と結果はリポジトリの`docs/TAURI-PORTABLE-POC-COMPARISON.md`、Sprint 1は基準コミット`5f2a59ae4257c300c58a021380a880d3cce9f069`の`plans/current-sprint.md`で参照します。独立QAとProducer確認は別に必要です。
