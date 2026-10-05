# Sprint 0 — AI Development Organization Foundation

## Status

done

## Goal

Establish a lightweight repository-based workflow for AI-assisted development.

Producerである人間が方向性と最終判断を持ち、ChatGPTがDirectorとして整理し、CodexがImplementerとして実装する。必要な別視点のAIレビューと人間のプレイテストを経て、次のスプリントを決められる土台をMarkdownで作る。

## Context

- Producer feedback: 毎回巨大な実装プロンプトを用意せず、共通ルールと現在のスプリントを短く指定して作業を始めたい。
- Baseline: main / `f701fe929dfb103192b2bc6efa83e51b71887c80`、Project Ashfall v0.8.0。
- 現状: ブラウザで動く灰縫い中心のアクションローグライト。日本語 / 英語、直接ファイル起動、既存テストとitch.io用ZIP生成を持つ。
- References: [README](../README.md)、[v0.6ビルド分岐](../docs/V0.6-BUILD-DIVERSITY.md)、[v0.8検証文書](../docs/V0.8-I18N-VALIDATION.md)、[TEST-REPORT](../TEST-REPORT.md)。古い版の資料は開発経緯として使う。

## Scope

- 共通ルール、プロダクトの判断基準、5つの役割と責務、軽量な開発フローを明文化する。
- Game DesignとQAのレビュー対象・境界・出力テンプレートを分ける。
- 現在のスプリントと、次回にコピーして使える1枚の雛形を用意する。
- READMEの開発資料に新しい入口へのリンクだけを追加する。
- リンク、文書間の整合、自己完結したSprint 0、雛形の利用手順と変更範囲を確認する。

## Non-goals

- No gameplay changes / ゲームロジックやコアメカニクスを変更しない。
- No balance changes / バランス、敵、強化、成長曲線を変更しない。
- No UI changes / UI・文言・i18n・音・演出を変更しない。
- No save changes / 保存形式や互換性を変更しない。
- No build system migration / 起動方式・配布形式・ビルドシステムを変更しない。
- 外部エージェントフレームワーク、APIサーバー、独自Web UI、DB、自動AI会話、複雑なGitHub Actions、新規MCP、独自オーケストレーターを導入しない。

## Constraints

- 今回のProducer依頼に基づく文書作成。新しいゲーム仕様やプロダクト判断を発明しない。
- [AGENTS.md](../AGENTS.md) の共通ルールを適用し、既存README・docs・コード・テストのv0.8.0状態と整合させる。
- 変更は下記のMarkdown文書とREADMEのリンク追加に限定する。ゲーム実行ファイル、テスト、配布スクリプト、既存検証JSONは変更しない。
- Git: mainから `work/ai-dev-org-foundation` を作成し、完成した文書をコミットする。mainへのmerge・push・公開は行わない。

## Deliverables

- [AGENTS.md](../AGENTS.md)：Codexの共通ルールと読む順番。
- [ROLES.md](../docs/ai/ROLES.md)：Producer / Director / Implementer / Game Design Reviewer / QA Reviewerの責務。
- [PRODUCT.md](../docs/ai/PRODUCT.md)：灰縫い・移動・ビルド分岐・評価方法の判断基準。
- [WORKFLOW.md](../docs/ai/WORKFLOW.md)：基本10工程、変更別の軽量化と手動受け渡し。
- [Game Design Guide](../docs/ai/REVIEW-GUIDE-GAME-DESIGN.md)：設計レビュー基準とテンプレート。
- [QA Guide](../docs/ai/REVIEW-GUIDE-QA.md)：技術レビュー基準・検証候補とテンプレート。
- [plans/README.md](README.md)：次回の開始手順と最短プロンプト。
- [sprint-template.md](sprint-template.md)：次回にコピーする1枚の雛形。
- この`current-sprint.md`：今回の目的・作業・結果。
- [README.md](../README.md)：新しい開発文書への入口リンク。

## Definition of Done

- [x] Producerが雛形1枚のコピー・編集と短い指示で、次のスプリントを始められる。
- [x] AGENTS.mdから必要な文書へ辿れ、リンク先が存在する。
- [x] current-sprint.md単体で今回の目的・範囲・禁止変更が分かる。
- [x] 5つの役割・レビュー境界・最終判断者が文書間で一致し、不要な工程を省略できる。
- [x] 現行v0.8.0と明白な矛盾がなく、ゲーム・テスト・配布ファイルが変わっていない。
- [x] 専用ブランチで文書をコミットし、変更ファイル・検証・最小読込セット・開始例・Git状態を報告する。

## Required Reviews

- Game Design Review: 不要。ゲーム内容・バランス・プロダクト方針を変更しない。
- QA / Engineering Review: 独立AIレビューは今回不要。文書のみのSprint 0として、Implementerがリンク・整合・雛形利用・コード差分を自己確認する。独立レビューの完了とは記録しない。

## Producer Playtest

- Required: ゲームのプレイテストは不要。プレイ内容を変更しないため。
- Scenarios / Observations: ゲームプレイは対象外。次回、この雛形と短い指示で作業を始められるかを運用時に確認する。
- Result / Decision: 人間による運用評価は未実施。今回の文書作成とコミットはProducerの依頼範囲として実行する。

## Open Questions

なし。ゲーム仕様の新しい判断は今回扱わず、将来のスプリント内容はProducerが決める。

## Execution Results

- mainのworktreeがcleanであることを確認し、専用ブランチを作成した。
- 既存README、v0.2〜v0.8の関連設計・検証資料、実行ファイル・保存・テスト・配布構成を調査した。
- 新規文書9ファイルを作成し、READMEへ入口リンク2行を追加した。ゲーム・テスト・配布ファイルに差分はない。
- 文書10ファイルの相対リンク82件と、AGENTS.mdから各文書への到達性を検査してPASS。雛形のコピー、必須11項目、両レビューの出力項目、優先順位の一致もPASS。
- 一時的な検査は `node work/ai-dev-org/verify-docs.cjs` で実行した。検査用ファイルはGit対象外で、継続運用の自動化・新しいテスト基盤には組み込んでいない。
- `git diff --check` はPASS。READMEの差分は2行追加のみ。フルゲームテストはコード変更がないため未実施。
- この完了記録を含む文書一式を `work/ai-dev-org-foundation` のコミットとして保存する。結果コミットはGit履歴を参照し、mainへのmerge・pushは行わない。

## Review Results

Implementerの自己確認：重大な懸念なし。

- 5つの役割、レビュー対象、Producerの最終判断が各文書で一致している。
- current-sprint.mdだけで今回のGoal・Scope・Non-goals・成果物と検証結果を理解できる。
- AGENTS.mdとこのファイルを入口にし、必要な役割・プロダクト・レビュー資料を辿れる。
- 雛形は1枚に必要な項目を持ち、コピー・編集後はplans/README.mdの最短プロンプトで開始できる。完了済みスプリントを新しい要件として再実行しない。
- v0.8.0の灰縫い、移動・ビルド分岐、日英、保存、起動・テスト構成と明白な矛盾はない。過去版の資料は経緯として区別した。

独立AIレビューは今回不要、人間のゲームプレイテストは対象外。人間による運用評価は未実施で、次回使用時の確認として残す。

## Decisions

- Producer: Markdown + Git + Codex + ChatGPT + 人間で始め、役割と責務の明文化を優先する。
- Implementer: スプリント雛形を別ファイルに分け、現在のスプリントを1枚編集すれば引き継げる構成にする。
- Implementer: 新しい自動化や公開フローは実装せず、将来候補だけをWORKFLOW.mdに短く残す。

## Next Sprint

未決定。Producerがこの構成を使って次の目標を選ぶ。AIはゲームの新しい改修を自動で始めない。
