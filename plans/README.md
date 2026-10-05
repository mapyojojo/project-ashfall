# Sprint files

[AGENTS.md](../AGENTS.md) が共通ルール、[current-sprint.md](current-sprint.md) が今回の範囲と進捗の正本。[sprint-template.md](sprint-template.md) はコピーして使う1枚の雛形。役割と進め方は [ROLES.md](../docs/ai/ROLES.md) / [WORKFLOW.md](../docs/ai/WORKFLOW.md)。

## 次のスプリントを始める

1. 前の`current-sprint.md`をGit履歴から辿れる状態で残す。ファイルを並べて残したければ`plans/archive/`へコピーし、相対リンクを保存先に合わせる。未完了のスプリントを黙って置き換えない。
2. `sprint-template.md`を`current-sprint.md`へコピーし、その1枚のGoal・Context・Scope・Non-goals・Constraints・Deliverables・Definition of Doneを編集する。
3. Required ReviewsとProducer Playtestを変更内容に合わせて決める。不要なら理由を1行書く。基準コミット、Gitで許可する操作、未解決のプロダクト判断も明記する。
4. ProducerがScopeを確定するか、下記の実行指示を渡す。Directorの整理が必要な場合も、同じファイルを使う。

前のスプリントを保存した後のコピー例（リポジトリのルートで実行）：

```powershell
Copy-Item -LiteralPath plans/sprint-template.md -Destination plans/current-sprint.md
```

## 最短プロンプト

```text
AGENTS.md と plans/current-sprint.md を読んで、このスプリントを進めてください。
```

実装担当は現在のScopeだけを実行する。すでに`done`なら新しい要件を推測して始めず、結果を報告する。Scopeが未確定でも安全な調査・文書整理は進められるが、新しいプロダクト判断はProducerへ戻す。

## 記録を小さく保つ

- Statusは [WORKFLOW.md](../docs/ai/WORKFLOW.md) の`draft / ready / in-progress / review / playtest / done`から必要なものを使う。
- Execution Resultsには変更と実行した検証を残す。Review Resultsには独立レビューと自己確認を区別して記録する。
- Producer Playtestには必要な場面、観察項目、実施結果と採否を書く。自動入力の結果を人間の実プレイ結果へ置き換えない。
- Open Questionsは未解決の判断だけを残し、解決した理由はDecisionsへ移す。Next Sprintの候補は承認済みScopeに含めない。
- 初めは同じ1枚へ追記する。長い証拠・画像・レビューだけを別ファイルへリンクする。履歴、数値仕様、用語表を毎回複製しない。

レビュー結果のフォーマットは [Game Design Guide](../docs/ai/REVIEW-GUIDE-GAME-DESIGN.md) と [QA Guide](../docs/ai/REVIEW-GUIDE-QA.md) にある。毎回大きな実装プロンプトや外部管理システムを用意する必要はない。
