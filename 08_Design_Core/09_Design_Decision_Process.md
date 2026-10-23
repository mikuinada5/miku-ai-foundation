# 09 Design Decision Process

> **Status:** DRAFT v0.3 / Canonical Home Adopted / NOT OPERATIONAL / Human Review Pending  
> **Scope:** 全媒体共通の視覚制作判断。媒体固有の実装値、ブランドの個別指定、既存QAの採点規則は定義しない。  
> **Source note:** `Design_Core_v0.2_WORKING.md` を責任別に再編集した草案。本文の設計判断は提案であり、効果検証済みの法則ではない。


> **参照入口:** [README](README.md)。責任本籍の採用とローカル配置のみ承認済み。本文の内容レビュー、制作テスト、運用承認、Pipeline参照追加およびcommit・pushは未完了。Current／Operationalな制作Sourceとして扱わない。依存・必読範囲はREADMEから案件単位で解決する。

## 11. 実行プロトコル：Production前の7つの判断

**Step 1 — Source・制約の確定**  
既存Pipelineで正本と必読Sourceを解決。案件ごとの目的、媒体、ブランド、必須・禁止、未確認を抽出。CoreはSource QAを代行しない。

**Step 2 — 伝達構造の設計**  
Primary / Secondary / Evidence / Action / Mandatoryへ情報を分解。主役、同時比較、読む順、不要な重複を判定。

**Step 3 — 印象解釈**  
望む印象と避けたい印象を対にして、関係する印象軸を選ぶ。複数の意味がありうる語を一つに固定しない。

**Step 4 — 方向案の組立て**  
少なくとも構図・余白・色・書体・素材の**組合せ**として案を考える。選択肢を複数出す必要があるときのみ比較。バリエーション数を義務化しない。

**Step 5 — トレードオフと採否**  
目的、受け手、ブランド、意味の保持、利用状況に対して案を評価。何を優先し、何を捨てたかを書き残す。

**Step 6 — Productionへ渡す**  
後掲Visual Direction Contractへ、具体的な位置関係、主役・強調、書体の役割、色の役割、素材方針、意図的に残す表現を記す。実装寸法や技術設定は媒体担当へ。

**Step 7 — 出力の観察と修正方針**  
制作物を実際に観察し、意図と実物の差を特定。45項目のQA結果も独立に受け、目的への影響順に修正提案を検討する。Coreが45項目の採点や承認を代行しない。

**戻り条件:** 修正で意味・ブランド・制作条件が変わる場合は、勝手な再解釈で続行せず、適切なSource／Human確認へ戻す。

---

---

## 12. Visual Direction Contract（制作AIへ渡す定型）

```yaml
visual_direction:
  status: PROPOSED  # 承認状態を偽装しない
  source_scope:
    current_sources: []
    applicable_brand_or_medium_sources: []
    unresolved: []
  brief:
    purpose: ""
    audience: ""
    viewing_context: ""
    primary_message: ""
    supporting_information: []
    mandatory_information: []
    desired_action: null  # 行動目標がない場合は作らない
  constraints:
    must: []
    must_not: []
    unknown: []
  impression:
    desired: []
    avoided: []
    selected_axes: []
    interpretation_hypothesis: ""
  hierarchy:
    first_notice: ""
    reading_or_comparison_sequence: []
    grouping: []
    priority_conflicts: []
  visual_choices:
    composition: "基準軸、主役の位置、重心、意図的なズレ"
    whitespace_and_density: "群内・群間、密度の緩急"
    color_roles: "背景・文字・主役・補助・意味の区別"
    typography: "見出し・本文・数字の役割、改行方針"
    imagery: "写真・イラスト・図解の採否と目的"
    decoration_and_identity: "世界観に必要な造形と不要な造形"
    consistency: "複数面をつなぐ視覚言語"
  alternatives_considered: []
  rationale_and_tradeoffs: []
  intentional_keep: []
  production_questions: []
  evaluation_hypotheses: []
  human_decisions_required: []
```

- `""` は入力待ちの欄であり、空のまま確定と扱わない。
- 短い案件ではすべてのフィールドを長文に埋める必要はないが、採用した判断の根拠は残す。
- `production_questions` は媒体側が決める実装要件（サイズ、印刷、操作、環境等）を記す場所であり、Coreが無根拠に指定を作る場所ではない。
- `evaluation_hypotheses` は見た人への効果の予測であり、テスト結果とは区別する。

---

## 制作担当に渡すときの最低限の具体性

- **弱い指示:** 「上品に」「いい感じの余白」「先進的に」。
- **実行可能な指示:** 「主見出しを最初の注視点にし、説明は別グループへ。文字の重みの差で階層を作り、アクセントはサービスの価値を示す語に限定。実際の数値・色指定は媒体要件とブランド指定を先に確認」。
- **選択理由:** 目的・対象・想定閲覧・守る制約・避けたい印象を一つ以上具体的に接続する。
- **重要な不明点:** 必須のロゴ規定や法定表示など、裁量で埋めない項目はHuman Decision Requiredとして別記。

### 変更管理
制作後の気づきを即座にCoreの規範へ昇格しない。観察、原因仮説、提案、Human判断を分け、後続の正式な更新手順へ渡す。

