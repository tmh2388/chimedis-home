# P0 Synthetic Shadow Validation — RAW v1

> Raw-first artifact. Sinh bằng `scripts/shadow-p0-report.mjs`. Commit TRƯỚC mọi scoring/patch.
> Tài liệu điều hành: `docs/translation-engine-production-rollout-v1.md` §3 + `docs/translation-shadow-p0-automation-v1.md`.
> Generated: 2026-09-10T03:38:17.790Z

## Nguồn artifact

| Cohort | File | Rows |
|---|---|---|
| A — Production synthetic Discovery | `docs/translation-shadow-p0-synthetic-run-v1.jsonl` | 517 case (+2 _meta) |
| B — Local deterministic Evidence + local prediction | `docs/translation-shadow-p0-local-engine-run-v1.jsonl` | 620 case |
| Pack generator | `scripts/generate-shadow-traffic-pack-v1.mjs` @5ee9dd1 | 620 unique, md5 ca9f0fa64040254434f33e1c49043ff0 |
| Runtime logs (translate_shadow_diff) | **CHƯA CÓ — chờ chủ dự án export** | n/a |

## Cohort A — cửa sổ chạy

- `started_at`: **2026-09-10T02:30:52.455Z**
- `ended_at`: **2026-09-10T03:34:02.795Z**
- base: https://chimedis.vn · commit: 13983e53d8806e3f698039e99240782f5c7b48d4 · UA: `chimedis-p0-synthetic-v1`
- planned 517 · completed 517 · infra_failures 5 · aborted false

### Kết quả thô Cohort A

| Chỉ số | Giá trị |
|---|---|
| Request gửi | 517 |
| HTTP 200 / success | 512 (99.0%) |
| Infra fail (5xx/timeout/network) | 5 (1.0%) |
| Response `cached:true` | 48 |
| Latency p50 / p90 / p99 (ms) | 2122 / 6610 / 11125 |
| Latency min / max (ms) | 195 / 13472 |
| HTTP status distribution | {"200":512,"502":5} |

Theo category (n / ok / cached):

- VI-herb: 26 / 26 / 0
- VI-long: 115 / 115 / 37
- VI-toneless: 42 / 42 / 3
- VI-pattern: 36 / 36 / 1
- NEGATIVE: 35 / 35 / 1
- MIXED: 61 / 61 / 0
- VI-clinical: 86 / 84 / 0
- VI-formula: 30 / 29 / 1
- NOISY: 35 / 34 / 3
- ZH-simplified: 25 / 24 / 2
- ZH-traditional: 26 / 26 / 0

### Infra failures

- P0-0164 [VI-formula] http=502 err=Không kết nối được nguồn dữ liệu. Thử lại sau.
- P0-0167 [ZH-simplified] http=502 err=Không kết nối được nguồn dữ liệu. Thử lại sau.
- P0-0283 [NOISY] http=502 err=Không kết nối được nguồn dữ liệu. Thử lại sau.
- P0-0532 [VI-clinical] http=502 err=Không kết nối được nguồn dữ liệu. Thử lại sau.
- P0-0566 [VI-clinical] http=502 err=Không kết nối được nguồn dữ liệu. Thử lại sau.


## Cohort B — Local deterministic Evidence (raw)

- engine: `te-v2-d1` · started 2026-09-10T02:32:29.516Z → ended 2026-09-10T02:32:29.917Z
- Evidence cases: **103**
- `needs_resolution=true` (Evidence gate engaged): **103** / 103 (100.0%)
- Evidence có uncertainty NHƯNG không gated (BẮT BUỘC = 0): **0** 
- Boolean structure fail (ops/parens mất): **0** 
- NEGATIVE category có mapping `high`: **2**
  - P0-0008 "Đại học Y Hà Nội nghiên cứu đột quỵ" → đột quỵ→stroke
  - P0-0483 "Hoàng Kỳ Anh luận văn thạc sĩ" → hoàng kỳ→Astragalus membranaceus

## Cohort A — local prediction join (v2 side PENDING Runtime logs)

> `legacy_prod` = `query.effective` THẬT từ response production (nhánh legacy).
> `v2_pred` = engine v2 CỤC BỘ tại commit — **DỰ ĐOÁN**, chờ `translate_shadow_diff` xác nhận.

| Chỉ số | Giá trị |
|---|---|
| Case so khớp được | 512 |
| local legacy == production legacy (sanity) | 512 (100.0%) |
| predicted agree (legacy_prod == v2_pred) | 43 (8.4%) |
| predicted disagree | 469 (91.6%) |

Phân loại disagreement (HEURISTIC — chỉ để triage, KHÔNG phải kết luận; verdict thật cần Runtime logs + G4):

- UNCERTAIN — needs G4: 219 (42.8%)
- EQUIVALENT (synonym-set wording): 135 (26.4%)
- v2 WORSE (leaks raw tokens): 62 (12.1%)
- EQUIVALENT (exact): 43 (8.4%)
- v2 BETTER (adds valid concept group): 31 (6.1%)
- v2 WORSE (known R4/R5 wrong mapping): 14 (2.7%)
- v2 BETTER (fewer stray fragments): 8 (1.6%)

Ví dụ mỗi lớp (tối đa 6 case, cắt chuỗi 110 ký tự):

**UNCERTAIN — needs G4** (219)
  - P0-0002 [VI-long] "hiệu quả của châm cứu ở bệnh nhân mất ngủ"
    L: ("acupuncture" OR "electroacupuncture" OR "manual acupuncture" OR "needling") ("insomnia" OR "sleep disorder" 
    V: ("efficacy" OR "effectiveness" OR "clinical efficacy" OR "therapeutic effect") ("acupuncture" OR "needle acupu
  - P0-0006 [VI-pattern] "thận dương hư trong mệt mỏi mạn tính"
    L: ("chronic fatigue syndrome" OR "chronic fatigue") ("kidney yang deficiency" OR "Shen yang xu")
    V: ("kidney yang deficiency" OR "kidney yang vacuity") mệt "chronic"
  - P0-0009 [VI-long] "hiệu quả của châm cứu ở người đau lưng mạn"
    L: ("acupuncture" OR "electroacupuncture" OR "manual acupuncture" OR "needling") ("back pain" OR "low back pain")
    V: ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") người ("low back pain" O
  - P0-0010 [VI-toneless] "co dau vai gay"
    L: ("neck and shoulder pain" OR "cervical pain")
    V: ("neck pain" OR "cervicalgia")
  - P0-0011 [MIXED] "Hà Nội 中医 针灸 stroke"
    L: ("traditional Chinese medicine" OR "TCM") ("acupuncture" OR "electroacupuncture" OR "manual acupuncture" OR "n
    V: hà nội 医 ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") stroke
  - P0-0012 [VI-clinical] "mai hoa châm điều trị đau khớp gối"
    L: "Prunus mume Sieb. et" "arthralgia" ("eczema" OR "dermatitis")
    V: "Prunus mume Sieb. et" ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") "

**EQUIVALENT (synonym-set wording)** (135)
  - P0-0001 [VI-herb] "xuyên khung hỗ trợ điều trị đái tháo đường"
    L: ("diabetes mellitus" OR "diabetes" OR "diabetic") ("Ligusticum chuanxiong" OR "Chuanxiong" OR "Rhizoma Chuanxi
    V: ("Ligusticum chuanxiong" OR "Chuanxiong" OR "Rhizoma Chuanxiong") hỗ trợ ("diabetes mellitus" OR "diabetes" OR
  - P0-0013 [VI-formula] "ôn đởm thang điều trị chóng mặt"
    L: ("vertigo" OR "dizziness") ("treatment" OR "therapy" OR "therapeutic" OR "management") thang
    V: ôn đởm thang ("treatment" OR "therapy" OR "therapeutic" OR "management") ("vertigo" OR "dizziness")
  - P0-0024 [NOISY] "túc tam lí mất ngủ"
    L: ("insomnia" OR "sleep disorder" OR "sleeplessness") tam
    V: túc tam lí ("insomnia" OR "sleeplessness" OR "sleep disorder")
  - P0-0029 [VI-clinical] "giác hơi điều trị đột quỵ"
    L: ("cupping therapy" OR "cupping") ("stroke" OR "cerebrovascular accident" OR "brain infarction") ("treatment" O
    V: ("cupping therapy" OR "cupping") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("stroke" OR "cer
  - P0-0033 [VI-pattern] "tỳ khí hư trong mất ngủ"
    L: ("spleen qi deficiency" OR "spleen deficiency" OR "Pi qi xu") ("insomnia" OR "sleep disorder" OR "sleeplessnes
    V: ("spleen qi deficiency" OR "spleen deficiency" OR "spleen qi vacuity") ("insomnia" OR "sleeplessness" OR "slee
  - P0-0049 [VI-herb] "bạch truật hỗ trợ điều trị đái tháo đường"
    L: ("diabetes mellitus" OR "diabetes" OR "diabetic") ("Atractylodes macrocephala" OR "Baizhu" OR "Rhizoma Atracty
    V: ("Atractylodes macrocephala" OR "Baizhu" OR "Rhizoma Atractylodis Macrocephalae") hỗ trợ ("diabetes mellitus" 

**v2 WORSE (leaks raw tokens)** (62)
  - P0-0004 [VI-long] "chức năng vận động của điện châm ở phụ nữ mãn kinh"
    L: ("electroacupuncture" OR "electro-acupuncture") ("menopause" OR "climacteric")
    V: chức năng vận động ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("postmenopausa
  - P0-0005 [VI-long] "biến thiên nhịp tim của điện châm ở phụ nữ mãn kinh"
    L: ("electroacupuncture" OR "electro-acupuncture") ("menopause" OR "climacteric") tim
    V: biến thiên nhịp tim ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("postmenopaus
  - P0-0008 [NEGATIVE] "Đại học Y Hà Nội nghiên cứu đột quỵ"
    L: ("stroke" OR "cerebrovascular accident" OR "brain infarction")
    V: đại học y hà nội cứu ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
  - P0-0016 [VI-long] "mức độ đau của điện châm ở người cao tuổi"
    L: ("electroacupuncture" OR "electro-acupuncture") cao
    V: mức đau ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") người cao tuổi
  - P0-0017 [VI-long] "biến thiên nhịp tim của châm cứu ở người cao tuổi"
    L: ("acupuncture" OR "electroacupuncture" OR "manual acupuncture" OR "needling") tim cao
    V: biến thiên nhịp tim ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ngườ
  - P0-0035 [VI-long] "mức độ đau của điện châm ở người tăng huyết áp"
    L: ("hypertension" OR "high blood pressure" OR "elevated blood pressure") ("electroacupuncture" OR "electro-acupu
    V: mức đau ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") người ("hypertension" OR "

**EQUIVALENT (exact)** (43)
  - P0-0007 [NEGATIVE] "smartwatch heart rate variability"
    L: smartwatch heart rate variability
    V: smartwatch heart rate variability
  - P0-0018 [NEGATIVE] "2026 acupuncture conference"
    L: 2026 acupuncture conference
    V: 2026 acupuncture conference
  - P0-0020 [MIXED] "spasticity 痉挛 post stroke acupuncture"
    L: spasticity 痉挛 post stroke acupuncture
    V: spasticity 痉挛 post stroke acupuncture
  - P0-0025 [NEGATIVE] "Anna Tran clinical trial"
    L: Anna Tran clinical trial
    V: anna tran clinical trial
  - P0-0026 [MIXED] "ôn đởm thang 温胆汤 insomnia"
    L: ôn đởm thang 温胆汤 insomnia
    V: ôn đởm thang 温胆汤 insomnia
  - P0-0030 [NEGATIVE] "abc xyz lorem ipsum"
    L: abc xyz lorem ipsum
    V: abc xyz lorem ipsum

**v2 BETTER (adds valid concept group)** (31)
  - P0-0041 [NOISY] "dian zhen nao zu zhong"
    L: dian zhen nao zu zhong
    V: ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") zu zhong
  - P0-0064 [ZH-traditional] "頭針改善腦卒中運動功能"
    L: 頭針改善腦卒中運動功能
    V: 頭針改善腦 ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") 運動功能
  - P0-0067 [VI-long] "chất lượng cuộc sống của điện châm ở bệnh nhân mất ngủ"
    L: ("electroacupuncture" OR "electro-acupuncture") ("insomnia" OR "sleep disorder" OR "sleeplessness")
    V: ("quality of life" OR "QoL" OR "health-related quality of life") ("electroacupuncture" OR "electro-acupuncture
  - P0-0075 [MIXED] "bổ dương hoàn ngũ thang 补阳还五汤 stroke"
    L: bổ dương hoàn ngũ thang 补阳还五汤 stroke
    V: ("Buyang Huanwu Tang" OR "Bu Yang Huan Wu Tang" OR "Supplement Yang to Restore Five Tenths Decoction") ("Buyan
  - P0-0080 [VI-toneless] "dien cham phuc hoi sau dot quy"
    L: ("electroacupuncture" OR "electro-acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction")
    V: ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("rehabilitation" OR "recovery" OR
  - P0-0097 [ZH-traditional] "針灸治療腦卒中"
    L: 針灸治療腦卒中
    V: 針灸腦 ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")

**v2 WORSE (known R4/R5 wrong mapping)** (14)
  - P0-0003 [VI-toneless] "dau than kinh toa cham cuu"
    L: ("sciatica" OR "sciatic neuralgia") ("acupuncture" OR "electroacupuncture" OR "manual acupuncture" OR "needlin
    V: "nephralgia" kinh toa ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")
  - P0-0032 [ZH-simplified] "气血两虚脑卒中恢复"
    L: ("stroke" OR "cerebrovascular accident" OR "brain infarction")
    V: ("qi and blood deficiency" OR "dual deficiency of qi and blood") "part of the brain" ("stroke" OR "cerebrovasc
  - P0-0053 [ZH-simplified] "针灸预防脑卒中复发"
    L: ("acupuncture" OR "electroacupuncture" OR "manual acupuncture" OR "needling") ("stroke" OR "cerebrovascular ac
    V: ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("prevention" OR "prophy
  - P0-0121 [ZH-simplified] "黄芪治疗脑卒中后疲劳"
    L: "Astragalus membranaceus" ("stroke" OR "cerebrovascular accident" OR "brain infarction") ("treatment" OR "ther
    V: ("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") "part of the brain" ("stroke" OR
  - P0-0133 [ZH-simplified] "针刺联合康复训练治疗脑卒中"
    L: ("rehabilitation training" OR "rehabilitation") ("stroke" OR "cerebrovascular accident" OR "brain infarction")
    V: ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("rehabilitation" OR "re
  - P0-0156 [VI-clinical] "giác hơi điều trị đau thần kinh tọa"
    L: ("sciatica" OR "sciatic neuralgia") ("cupping therapy" OR "cupping") ("treatment" OR "therapy" OR "therapeutic
    V: ("cupping therapy" OR "cupping") "nephralgia" kinh tọa

**v2 BETTER (fewer stray fragments)** (8)
  - P0-0083 [VI-formula] "tiêu dao tán điều trị đột quỵ"
    L: ("stroke" OR "cerebrovascular accident" OR "brain infarction") "incontinence" ("treatment" OR "therapy" OR "th
    V: ("Xiaoyao San" OR "Xiao Yao San" OR "Free and Easy Wanderer Powder" OR "Rambling Powder") ("treatment" OR "the
  - P0-0277 [VI-clinical] "cấy chỉ điều trị đau đầu migraine"
    L: "headache" ("treatment" OR "therapy" OR "therapeutic" OR "management") migraine
    V: ("acupoint catgut embedding" OR "catgut embedding" OR "thread embedding acupuncture") ("treatment" OR "therapy
  - P0-0282 [VI-formula] "tiêu dao tán điều trị chóng mặt"
    L: ("vertigo" OR "dizziness") "incontinence" ("treatment" OR "therapy" OR "therapeutic" OR "management") dao
    V: ("Xiaoyao San" OR "Xiao Yao San" OR "Free and Easy Wanderer Powder" OR "Rambling Powder") ("treatment" OR "the
  - P0-0362 [VI-formula] "bổ dương hoàn ngũ thang điều trị tăng huyết áp"
    L: ("hypertension" OR "high blood pressure" OR "elevated blood pressure") ("treatment" OR "therapy" OR "therapeut
    V: ("Buyang Huanwu Tang" OR "Bu Yang Huan Wu Tang" OR "Supplement Yang to Restore Five Tenths Decoction") ("treat
  - P0-0375 [VI-clinical] "châm cứu điều trị đau đầu migraine"
    L: ("acupuncture" OR "electroacupuncture" OR "manual acupuncture" OR "needling") "headache" ("treatment" OR "ther
    V: ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("treatment" OR "therapy
  - P0-0430 [VI-formula] "huyết phủ trục ứ thang điều trị tăng huyết áp"
    L: ("hypertension" OR "high blood pressure" OR "elevated blood pressure") ("treatment" OR "therapy" OR "therapeut
    V: ("Xuefu Zhuyu Tang" OR "Xue Fu Zhu Yu Tang" OR "Drive Out Stasis in the Mansion of Blood Decoction") ("treatme

> ⚠️ Chưa có Runtime logs → KHÔNG tính production `agree %` / `v2_outcome` / `confidence` / `ambiguous_count` thật. Trạng thái: **P0 SYNTHETIC EXECUTION COMPLETE — ANALYSIS WAITING FOR RUNTIME LOG EXPORT**.
