# Sprint Workflow

Markdown + Git + Codex + ChatGPT + 人間で回す。役割の正本は [ROLES.md](ROLES.md)、作業範囲と進捗の正本は [plans/current-sprint.md](../../plans/current-sprint.md)。全工程を全スプリントへ強制しない。

## 基本フロー

| 工程 | 担当 | 残す内容 |
| --- | --- | --- |
| 1. Producer feedback / idea | Producer | 体験した場面、感想、困りごと、改善したい方向 |
| 2. Director整理 | Director | 観察と仮説を分け、Goal・Context・Scope案・Non-goalsへ変換 |
| 3. Game Design Review | Game Design Reviewer | [設計ガイド](REVIEW-GUIDE-GAME-DESIGN.md) で方向・リスク・観察項目を確認 |
| 4. Sprint scope確定 | Producer、Directorが整理 | 実装範囲、制約、成果物、Done条件、必要なレビュー・プレイテスト |
| 5. Implementer実装 | Implementer | 基準Git状態、計画、承認済みScopeの差分、判断理由 |
| 6. Automated tests | Implementer | 実行コマンド、PASS / FAIL / SKIP / 未実施、証拠と制限 |
| 7. QA Review | QA / Engineering Reviewer | [QAガイド](REVIEW-GUIDE-QA.md) で不具合・回帰・未検証範囲を確認 |
| 8. Director統合 | Director | 指摘の重複を整理し、採用候補・見送り理由・人間確認をまとめる |
| 9. Producer playtest | Producer / Playtester | 必要な場面を実プレイし、面白さと方向性を判断 |
| 10. 次スプリント決定 | Producer、Directorが整理 | 今回の結果と残課題を受け、次のScopeを選ぶ |

すでにProducerが目標と実行範囲を指定している依頼は、工程1〜4の成果として扱える。承認済みScopeを実行するための再承認は不要。変更中に見つけたScope外の案はOpen Questionsや次回候補へ残し、勝手に実装しない。

## 変更に応じた軽量化

| 変更 | Game Design Review | QA / Engineering Review・検証 | Producer Playtest |
| --- | --- | --- | --- |
| 開発文書のみ | 原則不要。方針変更なら確認 | リンク・整合・使い方・コード差分の自己確認。独立レビューは必要時のみ | ゲームプレイ不要。運用して得た感想を次へ |
| 配布自動化 | 原則不要 | ビルド、同梱、直接起動、既存成果物の保持を確認。独立QAを重視 | 面白さの評価は不要。必要な起動・配布確認は残す |
| 技術的な不具合修正 | 遊び方が変わる場合に必要 | 再現・修正・回帰と関係する環境を確認。独立QAを重視 | 症状や体感に影響する場合に実施 |
| UI・文言・演出・入力 | 理解やGame feelに関わる範囲を確認 | UI・入力・日英・ブラウザの影響を確認 | 理解・視認性・操作感に関わる範囲を実施 |
| バランス・戦闘・ビルド | Scope確定前を重視し、実装後の新しい懸念も確認 | 成立条件・数値・回帰・通し検証。独立QAを実施 | 面白さ・選択・支配的戦略の判断を重視 |

スプリントのRequired Reviews・Producer Playtestに「必要 / 不要 / 未実施 / 完了」と理由を書く。不要と未実施を区別する。必要な工程を終えていないときは、その工程待ちとして報告する。実装完了をスプリント全体や公開の承認と混同しない。

## ファイルで受け渡す

[雛形](../../plans/sprint-template.md) をコピーして1枚のスプリントを作る。レビュー結果・Producerの判断は同じファイルへ短く追記し、長い記録だけを別ファイルへリンクする。チャットの履歴がなくてもGoal・Scope・Done条件と次の担当が分かるように保つ。

Implementerは着手・変更・検証の進捗をExecution Resultsへ残す。独立レビューはReview Resultsへ、実プレイと採否はProducer Playtestへ記録する。Directorは意見の違いを消さず、事実・仮説・提案と最終判断を分けて統合する。

レビュー指摘が実装漏れや不具合ならScope内で修正し、関係する検証を再実行する。新しい仕様・バランス方針が必要ならProducerへ戻す。現在の実装と新しい要件を混ぜてDone条件を書き換えない。

## 状態と終了

- `draft`：GoalやScopeを整理中。安全な調査は進められる。
- `ready`：Producerの実行指示またはScope確定があり、実装を始められる。
- `in-progress`：調査・実装・検証中。
- `review`：実装結果があり、Required Reviewsに必要なレビュー待ち。
- `playtest`：必要なレビューを終え、Producerのプレイ判断待ち。
- `done`：Definition of Doneと必要なレビュー・プレイテストを満たした。不要な工程は理由を記録済み。

軽い変更では途中状態を省略できる。誰が何を確認してDoneにしたかを結果欄に残す。ゲームとしての最終判断はProducerにあり、レビューの「進行可」はmerge・push・公開の許可ではない。

終了したファイルは次回開始前にGit履歴から参照できる状態を保つ。`plans/archive/`へ保存する場合は、相対リンクを保存先に合わせる。[plans/README.md](../../plans/README.md) の手順で次の1枚を作る。Next Sprintは候補の記録であり、Producerが選ぶまで次の実装を始めない。

## Future Improvements

運用で繰り返し困った場合に、Markdownリンク検査、レビュー結果の記録補助、関連テストの選択補助を検討する。Sprint 0では実装しない。外部エージェントフレームワーク、APIサーバー、独自Web UI、データベース、自動AI会話、複雑なGitHub Actions、新規MCP、独自オーケストレーターは導入しない。
