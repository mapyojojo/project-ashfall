# Sprint <number> — <title>

## Status

draft

## Goal

<このスプリントで達成する結果を1〜2文。何が改善されたら成功か>

## Context

- Producer feedback: <観察した場面・感想。仮説と分ける>
- Baseline: <版番号・基準branch / commit>
- References: <関係する仕様・記録へのリンク>

## Scope

- <実装する挙動・変更範囲。Producerの実行指示を受けた内容>

## Non-goals

- <今回含めない変更>

## Constraints

- [AGENTS.md](../AGENTS.md) の共通ルールを適用する。
- <保護する挙動・保存互換・日英・性能など、今回固有の制約>
- Git: <作業branch。レビュー用コミットを禁止する場合や、その他の今回固有の例外はここへ明記>
- Implementerは承認済みScopeの実装と検証が完了したら、明示的に禁止されていない限りレビュー用コミットを自律的に作成してよい。生成物・Git除外対象・無関係な既存変更は含めない。
- mainへのmerge・push・tag・外部公開は、レビュー用コミットとは別にProducerの明示指示が必要。

## Deliverables

- <作成・変更する成果物>

## Definition of Done

- [ ] <成果物から確認できる成功条件>
- [ ] <関係する検証と、結果・未検証範囲の記録>
- [ ] Required ReviewsとProducer Playtestの必要な工程が完了、または不要理由を記録済み。
- [ ] 変更ファイル・検証結果・branch / commit / worktree状態を報告。

## Required Reviews

- Game Design Review: <必要 / 不要と理由。対象と実施タイミング>
- QA / Engineering Review: <必要 / 不要と理由。独立レビューとImplementerの自己確認を区別>

## Producer Playtest

- Required: <必要 / 不要と理由>
- Scenarios: <確認する場面。不要なら対象外>
- Observations: <手応え・理解・選択・支配的戦略など今回の観察項目>
- Result / Decision: <未実施 / 実施した事実・Producerの採否。AIが人間の判断を代筆しない>

## Open Questions

- <未解決のプロダクト判断・必要な情報。なければ「なし」>

## Execution Results

未着手。Implementerが基準Git状態、実装計画、変更、検証コマンドと結果、未確認事項を短く追記する。

## Review Results

未実施。必要な担当のレビューを貼るかリンクする。自己確認だけの場合はその旨を書く。

## Decisions

<Scopeの確定と変更理由、レビュー採否を判断者とともに記録。未決定ならその旨>

## Next Sprint

未決定。候補だけを残し、Producerが選ぶまで実装しない。
