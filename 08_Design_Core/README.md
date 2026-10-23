# Universal Design Core — v0.3 DRAFT

**Status:** DRAFT v0.3 / Canonical Home Adopted / NOT OPERATIONAL / Human Review Pending。責任本籍の採用・ローカル配置は承認済み。本文の内容レビュー・制作テスト・運用承認・commit・pushは未完了。  
**目的:** 静的視覚コミュニケーション全般に共通する、デザインの解釈・選択・説明可能性の判断Source。

## 参照順

1. `00_Design_Core.md`：責任境界・原則・判断衝突
2. `01_Intent_Interpretation.md`：Brief、印象・抽象語の翻訳
3. `02_Visual_Hierarchy.md`：重要度と視線
4. `03_Layout_Composition.md`：構図・グリッド・整列
5. `04_Spacing_Rhythm.md`：余白・密度・リズム
6. `05_Color_System.md`：色の役割と選択
7. `06_Typography.md`：書体と日本語組版
8. `07_Visual_Elements.md`：写真・イラスト・図解・装飾
9. `08_Art_Direction.md`：統一感・独自性
10. `09_Design_Decision_Process.md`：Visual Directionの形成・受け渡し
11. `10_Cases_and_Validation.md`：ケース、誤用防止、動作検証

## 読み込み原則

- **最低限:** `00` + `01` + `09` + 当該案件に必要な専門Source。複合的な案件では全専門Sourceを参照する。
- **実装担当:** CoreのVisual Directionと、承認済みの媒体別Source・ブランドSourceを受け取る。Coreを媒体仕様の代替にしない。
- **Sourceの正本判定・承認:** 既存`AI_PRODUCTION_PIPELINE.md`と`04_AI_Work_Environment/Source_Resolution/README.md`に従う。現行Sourceへの正式接続は未実施。
- **画像生成:** 既存`04_AI_Work_Environment/Visual_Production/README.md`の実装範囲を超える機能があると仮定しない。
- **QA:** はるかぜ式45項目は原本・採点規則を無変更で使用し、既存PipelineのOutput QAと混同しない。
- **ブランドの個別条件:** `00_Brand/05_ビジュアル表現原則.md`は特定ブランド用。その色・書体・素材比率を全媒体共通の初期値にしない。
- **PPT:** `01_Education/02_Material_Production/10_PPT制作基準.md`は教育事業用であり、全媒体の規範ではない。

## 初版の受け渡し

Visual DirectionのYAML雛形は`09_Design_Decision_Process.md`にある。これは運用契約の提案であり、実際のSchemaや機械連携は未実装。

## 明確に未完了のもの

- 本文の内容レビュー、正式運用の採否判断およびGit差分承認（責任本籍の採用とローカル配置は承認済み）
- 媒体別Source構築（LP、チラシ、SNS、スライド等）
- 実際に異なる媒体で生成 → 45項目QA → 修正 → 再検証
- 調査候補36件と各デザイン原則との個別エビデンス照合

## 出自

このセットは前回の`Design_Core_v0.2_WORKING.md`（545行）を分野ごとに分割し、各分野に現場用の判断カード・確認事項を加えたもの。新しい制作PipelineやQA項目は創設していない。

## 責任本籍・承認範囲

`08_Design_Core/` を、全媒体共通の視覚制作判断を担う独立した責任本籍とする。このREADMEが正式な参照入口であり、00〜10を構成ファイルとして漏れなく案内する。Brand、Education、AI作業環境、媒体別Sourceの配下へ本文を複製しない。

本Coreの「全媒体共通」は、静的な視覚コミュニケーションにおける解釈・選択・説明可能性の共通判断を指す。動画・モーション・操作設計等の専門仕様や、全媒体への実装対応を保証しない。名称はアクセシビリティ規格への適合認証を意味しない。

2026-10-23のHuman指示で承認されたのは責任本籍、配置方針、既存内容を保持した責任境界・依存・参照整理、およびローカル差分の作成である。専門内容の最終承認、制作効果の実証、運用開始、Pipelineへの参照追加、commit・pushをこの承認から推定しない。全構成ファイルはDRAFT／NOT OPERATIONALのまま保持する。

## ファイルの責任と必読範囲

以下は内容レビューおよび将来の運用採否確認に用いる読込設計であり、現段階でProductionの必読Sourceを追加するものではない。

| ファイル | 担う判断・出力 | 読む条件 |
|---|---|---|
| [README.md](README.md) | 責任本籍、構成一覧、Status、依存、参照方法 | 全参照の最初に読む |
| [00_Design_Core.md](00_Design_Core.md) | 責任境界、優先順位、裁量、判断衝突 | Coreを参照する全案件 |
| [01_Intent_Interpretation.md](01_Intent_Interpretation.md) | Briefの分解、情報の役割、印象・抽象語の解釈 | Coreを参照する全案件 |
| [02_Visual_Hierarchy.md](02_Visual_Hierarchy.md) | 主従、比較、視線、意味の誤示唆の確認 | 情報階層・強調・読む順を判断するとき |
| [03_Layout_Composition.md](03_Layout_Composition.md) | 軸、重心、整列、構図、意図的な破調 | 構図・配置・非対称を判断するとき |
| [04_Spacing_Rhythm.md](04_Spacing_Rhythm.md) | 余白、群内／群間、密度、連続面の緩急 | 余白・情報密度・リズムを判断するとき |
| [05_Color_System.md](05_Color_System.md) | 色の役割、明度・彩度・面積、媒体への接続 | 配色・識別・色による意味を判断するとき |
| [06_Typography.md](06_Typography.md) | 書体の役割、階層、日本語の改行・組版 | 書体・文字階層・文字組を判断するとき |
| [07_Visual_Elements.md](07_Visual_Elements.md) | 写真・イラスト・図解・装飾の採否と役割 | 素材を選定・追加・削除するとき |
| [08_Art_Direction.md](08_Art_Direction.md) | 一貫性、独自性、視覚言語 | 複数面・シリーズ・世界観を判断するとき |
| [09_Design_Decision_Process.md](09_Design_Decision_Process.md) | 判断手順、理由・トレードオフ、Visual Directionの受け渡し | Coreを参照する全案件 |
| [10_Cases_and_Validation.md](10_Cases_and_Validation.md) | 仮想ケース、反例、T01〜T10、未実施の検証計画 | 内容レビュー、誤用確認、検証計画・運用採否の判断時 |
| [CHANGELOG.md](CHANGELOG.md) | 意味のある変更の履歴・出自 | 版・変更経緯を確認するとき。判断Sourceを代替しない |

最低限はREADME → 00 → 01 → 09と、今回判断する02〜08である。複合案件では02〜08をすべて参照する。実装担当はVisual Directionと、その判断を支えるCore本文、承認済みブランド・媒体Sourceを確認する。抜粋やYAMLだけで責任単位全体の解決済みを主張しない。

## 依存Sourceと適用範囲

| 依存先・入口 | 必要になる条件 | 本籍として維持する責任 |
|---|---|---|
| [Repository Rules](../REPOSITORY_RULES.md) | 配置・更新・正本確認 | canonical path、履歴、現行／Archive、Git |
| [Repository横断監査基準](../REPOSITORY_CROSS_AUDIT_STANDARD.md) | 正式採用・構造／参照関係の変更 | 構造・責任・変更波及の横断監査 |
| [AI Production Pipeline](../AI_PRODUCTION_PIPELINE.md) | 制作工程・Source利用条件の確認 | Source Router、Source QA、Phase、Gate、承認、Integration |
| [Source Resolution](../04_AI_Work_Environment/Source_Resolution/README.md) | Current Sourceの探索・検証 | 責任root、候補列挙、依存閉包、同一Taskの実読、fingerprint |
| [Human-in-the-loop](../03_Human_in_the_Loop/HUMAN_IN_THE_LOOP.md) | 人間判断、停止、再承認 | 承認・進行・差し戻しの既存境界 |
| [AI Organization](../AI_ORGANIZATION.md) | 担当・権限・受け渡しの確認 | 既存担当の責任分離。Coreは新部署・承認者を作らない |
| [Brand OS参照ガイド](../00_Brand/00_ブランドOS概要・参照ガイド.md) | フェミニンウェルネス教養サロンの案件 | 入口から必要なBrand Sourceを選択。他ブランドへ自動適用しない |
| [Brand Visual](../00_Brand/05_ビジュアル表現原則.md) | 上記ブランドの視覚制作 | 固有の色・書体・写真等の制約。Coreへ汎用初期値として移植しない |
| [教材制作の入口](../01_Education/02_Material_Production/00_教材制作システム概要・共通原則.md)／[PPT制作基準](../01_Education/02_Material_Production/10_PPT制作基準.md) | 該当教育事業の教材／PPT | 承認済み教育内容、教育機能、提示順序、媒体固有仕様とその依存Source |
| [Visual Production](../04_AI_Work_Environment/Visual_Production/README.md) | 画像生成を伴う案件 | Generation Contract、Tool Request、Runtime binding、Asset QA。全媒体対応と推定しない |
| [Ownership Matrix](../04_AI_Work_Environment/Repository_Governance/ownership-matrix.json) | Repository WRITE | Local Codexの単一owner、未登録pathのdeny |
| 案件に適用される承認済み内容・ブランド・媒体Source | 全案件で適用可否を確認 | 各Sourceの制約。不存在・未承認はCoreで代替しない |
| はるかぜ式Design Eye Auditorの既存原本・採点／運用Source | 当該QAを実施するとき | 既存45項目、採点、対象外の扱い、運用方法 |

はるかぜ式QA原本のRepository内canonical locatorは未登録であり、本Coreへ原本を複製しない。受領ZIPに記載されたキット名だけで、端末上のSkillや別キットと同一と推定しない。利用時は既存の正式配布元・版・実体をSource Routerで解決し、解決不能ならQA実施済みと扱わずHumanへ報告する。

責任rootは `08_Design_Core/`、entry sourceは本README。将来の正式運用時はREADMEの構成一覧から候補の選択・除外、適用箇所と条件付き依存を解決し、外部依存の入口からさらに必要Sourceを探索する。Version／revision、Repository full commit SHA、file SHA-256、同一Taskの実読、Production versionは既存Source Manifestへ記録する。本変更はManifest Schemaやvalidatorを変更せず、DRAFTをCurrentに見せるManifestも作成しない。

## 既存工程への接続境界と未解決の矛盾

- 09の「Production前」は、将来採用時の既存Phase 3内で実装・生成の前に行う視覚判断を指す。G2以前に制作を開始したり、新しいPhase・Gateを作ったりする意味ではない。00の図は責任関係の概念図であり、現行Pipelineを変更しない。
- Visual Directionは判断理由を含む提案であり、Generation Contract、Prompt Assembly QA、Runtime Receipt、Asset QAの代替ではない。画像生成では既存Sourceから解決したMUST／MUST_NOTを維持し、Creative DirectionをMAYの範囲内へ渡す。YAMLと実際のSchemaの自動変換・機械連携は未実装。
- Brand Visualの「空気感優先」と、CoreやPPTの利用上必要な可読性が両立しない案件では、どちらかのSourceを独断で読み替えない。矛盾箇所・閲覧条件・両立案を示し、既存Source責任者／Humanへ戻す。この矛盾の一般解は未決定。
- PPTでは教育機能・提示順序・人物／生活場面のイラスト優先等の固有要件を維持する。Coreの一般的な素材比較から教育要件を解除しない。
- 意図的な非対称、比較、CTA不要等のCore判断は、45項目の採点・運用を免除または変更する権限ではない。既存QAをそのまま実施し、指摘結果を保持する。QAと意図の両立が判断不能ならHumanへ戻し、点数・対象外・判定規則を都合よく変更しない。
- 01・06の文章や文字への判断は視覚上の情報役割・文字組に限る。Voice、Writing Style、教育内容、承認済み文字列の意味を上書きしない。

`AI_PRODUCTION_PIPELINE.md` の参照追加は今回実施していない。Coreの運用接続・必読化は別途確認対象であり、READMEやRepository Rulesへの登録だけでProduction利用可能になったと扱わない。
