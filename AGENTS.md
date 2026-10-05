# Project Ashfall — Agent Instructions

## Start here

作業開始時にこのファイルと [plans/current-sprint.md](plans/current-sprint.md) を読む。現在のユーザー指示で役割の指定がなければ、CodexはImplementerとして作業する。スプリントのGoal・Scope・Non-goals・Constraints・Definition of Doneを実行範囲として使い、必要な資料だけを辿る。

- 役割と判断権限：[ROLES.md](docs/ai/ROLES.md)
- プロダクトの判断基準：[PRODUCT.md](docs/ai/PRODUCT.md)
- 進め方と工程の省略条件：[WORKFLOW.md](docs/ai/WORKFLOW.md)
- レビュー時：[Game Design Guide](docs/ai/REVIEW-GUIDE-GAME-DESIGN.md) / [QA Guide](docs/ai/REVIEW-GUIDE-QA.md)
- 次のスプリントを準備するとき：[plans/README.md](plans/README.md) / [雛形](plans/sprint-template.md)

## Project

Project Ashfallはブラウザで動くトップダウン・アクションローグライト。現在の基準はv0.8.0、Japanese / English対応。版番号の正本は [version.js](version.js)、現行の遊び方と起動方法は [README.md](README.md)。

コアメカニクスは **Ash Stitch / 灰縫い**：auto-fireで敵にAsh Marks / 灰紋を仕込み、プレイヤーが移動・位置取りしてMarked enemiesを縫い、灰を回収して経路に沿って炸裂させる。このコアを明示的な要求なしに変更しない。

## Product priorities

現時点の優先順位は以下。Producerが変更した場合は、その決定を [PRODUCT.md](docs/ai/PRODUCT.md) と対象スプリントへ記録し、この一覧も揃える。

1. Game feel
2. Readability
3. Build diversity
4. Maintainability
5. Additional content

## Development rules

- Producerが実行を指示したScopeは作業の承認として扱う。承認済み範囲で再確認を繰り返さず、調査・計画・実装・検証・報告まで進める。
- 明示されていないプロダクト要件・ゲームバランス変更を追加しない。新しい要件が必要なら理由と選択肢を記録し、依存しない作業を続ける。プロダクト判断はProducerへ戻す。
- save format、安定したupgrade ID・relic番号、既存記録の互換性を黙って変えない。現在は途中ラン保存がなく、既存metaと独立した言語設定を保存する。
- 日本語 / 英語のi18n parityを維持する。キー、補間、表示と挙動の対応、言語切替時の状態・保存への影響を確認する。
- オフラインの直接ファイル起動を維持する。起動方式・配布形式・新しい依存の導入は、要求された範囲に含まれる場合に扱う。
- 着手前にGitのbranch・HEAD・worktree状態を確認し、ユーザーの既存変更を上書きしない。大きな変更には作業ブランチを使い、main基準の要求があればその基準コミットを記録する。
- 明示されていないmainへのmerge・push・外部公開を行わない。コミットの要否と範囲はユーザー指示またはスプリントに従う。
- 実装担当の自己確認と、別視点のReviewerによるレビューを区別する。未実施レビューや人間プレイテストを完了と記録しない。
- 自動テストPASSを「ゲームとして面白い証明」と扱わない。Game feel・面白さ・AI提案の採否は、Producer / Playtesterの実プレイ判断を最終判断とする。
- 終了時に変更ファイル、実行した検証と結果、未検証事項、残るレビュー・人間確認、branch・commit・worktree状態を報告する。

## Validation

ゲーム実行ファイルを変更した場合は `npm test` と変更に関係する検証を実行する。ブラウザ・保存・i18n・バランス・配布への影響は [QA Guide](docs/ai/REVIEW-GUIDE-QA.md) で選ぶ。実行できない検証は理由と影響を記録する。

ドキュメントだけの変更ではフルゲームテストを必須にせず、リンク、文書間の整合、雛形の利用手順、意図しないコード差分を確認する。必要以上の自動化や形式だけのテストを追加しない。

コマンドの正本は [package.json](package.json)、実行環境・基準比較・ブラウザ準備は [TEST-REPORT.md](TEST-REPORT.md) と [v0.8検証文書](docs/V0.8-I18N-VALIDATION.md)。過去版の文書は当時の記録として読み、現行仕様と混同しない。
