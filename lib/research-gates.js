// Dữ liệu khung 25 Gate nghiên cứu khoa học (nguồn: docs/research-roadmap-VI-CN.md).
// Dùng cho UI "hạng mục nghiên cứu" của Bàn làm việc — KHÔNG phải state machine của dữ liệu
// (wb_gate_progress chỉ lưu candidate/done thủ công do người dùng tự đánh dấu, không tự động
// suy luận từ M1-M4). Gate 2 là điểm nối duy nhất với dữ liệu thật (search runs + gap candidates
// của M1-M4) — các Gate khác thuần hướng dẫn.

export const GATES = [
  { no: 0, key: 'grad_requirement',
    title: { vi: 'Điều kiện tốt nghiệp', zh: '明确毕业与学位授予要求', en: 'Graduation requirement' },
    goal: { vi: 'Biết chính xác mình phải đạt những gì trước khi thiết kế nghiên cứu.', zh: '在设计研究之前，准确明确毕业与学位授予要求。', en: 'Know exactly what you must achieve before designing the study.' },
    checklist: {
      vi: ['Yêu cầu luận văn/khai đề/đánh giá giữa kỳ/bảo vệ của trường', 'Yêu cầu công bố: số bài, SCI/Scopus/PubMed, tác giả chính, deadline', 'Tính ngược timeline: ngày bảo vệ ← nộp luận văn ← ... ← proposal defense'],
      zh: ['学位论文/开题/中期考核/答辩要求', '发表要求：篇数、SCI/Scopus/PubMed、第一作者、截止时间', '倒排时间线：答辩日 ← 论文提交 ← … ← 开题答辩'],
      en: ['Thesis/proposal/mid-term/defense requirements from your school', 'Publication requirements: count, SCI/Scopus/PubMed, authorship, deadline', 'Work backward from defense date to proposal defense'],
    },
    deliverable: { vi: 'Graduation Requirement Sheet', zh: 'Graduation Requirement Sheet（毕业要求清单）', en: 'Graduation Requirement Sheet' } },

  { no: 1, key: 'find_field',
    title: { vi: 'Tìm lĩnh vực nghiên cứu', zh: '寻找研究领域', en: 'Find a research field' },
    goal: { vi: 'Tìm hướng nghiên cứu — chưa phải chọn đề tài chính thức.', zh: '寻找研究方向，尚不是确定课题。', en: 'Explore directions — not yet a formal topic.' },
    checklist: {
      vi: ['Xuất phát từ 4 nguồn: clinical problem / scientific problem / evidence gap / feasibility opportunity', 'Chọn giao điểm: ý nghĩa khoa học × tính mới × khả thi × nguồn lực thầy hướng dẫn × tiềm năng công bố'],
      zh: ['从 4 个来源出发：临床问题/科学问题/证据空白/可行性机会', '选取交叉点：科学意义 × 创新性 × 可行性 × 导师资源 × 发表潜力'],
      en: ['Start from 4 sources: clinical problem / scientific problem / evidence gap / feasibility', 'Pick the intersection of significance × novelty × feasibility × supervisor resources × publication potential'],
    },
    deliverable: { vi: '3-5 research directions (chưa cần tên đề tài)', zh: '3-5 个研究方向（尚不需要正式课题名称）', en: '3-5 research directions (no formal title yet)' } },

  { no: 2, key: 'evidence_gap_map',
    title: { vi: 'Bản đồ bằng chứng (Evidence & Gap Map)', zh: '系统性范围检索与证据地图', en: 'Evidence & gap map' },
    goal: { vi: 'Không dựa vào vài bài báo để tuyên bố "có khoảng trống" — phải tìm đủ nguồn rồi mới lập Gap Map.', zh: '不能仅凭几篇文章宣称存在研究空白 — 必须充分检索后才建立 Gap Map。', en: 'Do not claim a gap from a few papers — search broadly first, then map the gap.' },
    checklist: {
      vi: ['Tìm đủ CNKI/万方/维普 + PubMed/Embase/Cochrane', 'Phân loại 9 nhóm thiết kế (guideline, SR/MA, RCT, cohort, case-control, cross-sectional, chẩn đoán/dự đoán, cơ chế...)', 'Ghi mỗi bài: population/design/sample/outcome/finding/limitation/risk of bias', 'Tổng hợp Evidence Matrix + Gap Map (Điều đã biết｜Điều chưa biết｜Vì sao quan trọng｜Có khả thi không)'],
      zh: ['检索 CNKI/万方/维普 + PubMed/Embase/Cochrane', '按 9 类研究设计分类（指南、SR/MA、RCT、队列、病例对照、横断面、诊断/预测、机制…）', '每篇记录：人群/设计/样本/结局/发现/局限/偏倚风险', '汇总 Evidence Matrix + Gap Map（已知｜未知｜重要性｜可行性）'],
      en: ['Search CNKI/Wanfang/VIP + PubMed/Embase/Cochrane', 'Classify into 9 design types (guideline, SR/MA, RCT, cohort, case-control, cross-sectional, diagnostic/prediction, mechanistic…)', 'Record per paper: population/design/sample/outcome/finding/limitation/risk of bias', 'Compile Evidence Matrix + Gap Map (known｜unknown｜why it matters｜feasibility)'],
    },
    deliverable: { vi: 'Evidence Matrix + Gap Map', zh: 'Evidence Matrix + Gap Map', en: 'Evidence Matrix + Gap Map' },
    actions: ['search', 'library', 'gap_analysis'] },

  { no: 3, key: 'research_question',
    title: { vi: 'Câu hỏi nghiên cứu (PICO/PECO)', zh: '将研究方向转化为研究问题', en: 'Turn direction into a research question' },
    goal: { vi: 'Không đặt tên đề tài trước — đặt Research Question trước.', zh: '不要先定课题名称，先提出 Research Question。', en: 'Do not name the topic first — define the research question first.' },
    checklist: {
      vi: ['Intervention study → PICO(T)', 'Observational etiological → PECO', 'Diagnostic study → index test/reference standard/target condition/population', 'Prediction study → predictors/outcome/horizon/clinical use', 'Viết Primary question + hypothesis, Secondary/Exploratory questions tách riêng'],
      zh: ['干预性研究 → PICO(T)', '观察性病因研究 → PECO', '诊断研究 → index test/reference standard/target condition/population', '预测研究 → predictors/outcome/horizon/clinical use', '写出 Primary question + hypothesis，Secondary/Exploratory 单独区分'],
      en: ['Intervention study → PICO(T)', 'Observational etiological → PECO', 'Diagnostic study → index test / reference standard / target condition / population', 'Prediction study → predictors / outcome / horizon / clinical use', 'Write primary question + hypothesis, keep secondary/exploratory separate'],
    },
    deliverable: { vi: 'Research Question Sheet', zh: 'Research Question Sheet（研究问题表）', en: 'Research Question Sheet' },
    actions: ['research_question'] },

  { no: 4, key: 'feasibility',
    title: { vi: 'Đánh giá tính khả thi', zh: '可行性评估', en: 'Feasibility assessment' },
    goal: { vi: 'Nghiên cứu hay trên giấy vẫn có thể là đề tài tệ nếu không hoàn thành được.', zh: '设计再好，若无法完成，也可能是糟糕的课题。', en: 'A design that looks great on paper can still be a bad thesis topic if it cannot be completed.' },
    checklist: {
      vi: ['Patient flow hàng tháng: đủ tiêu chuẩn / từ chối / dropout dự kiến', 'Tính recruitment thực tế (vd 40×30%×70%≈8/tháng) → thời gian cần', 'Kiểm equipment/lab/funding/personnel/follow-up/database/statistician'],
      zh: ['每月患者流量：符合标准/拒绝/预计脱落', '计算真实招募速度（如 40×30%×70%≈8例/月）→ 所需时长', '核查设备/检验/经费/人员/随访能力/数据库/统计人员'],
      en: ['Monthly patient flow: eligible / refusal / expected dropout', 'Compute real recruitment rate (e.g. 40×30%×70%≈8/month) → time needed', 'Check equipment/lab/funding/personnel/follow-up/database/statistician'],
    },
    deliverable: { vi: 'Feasibility Report', zh: 'Feasibility Report（可行性报告）', en: 'Feasibility Report' } },

  { no: 5, key: 'study_design',
    title: { vi: 'Khoá research design', zh: '锁定研究设计', en: 'Lock the study design' },
    goal: { vi: 'Chọn thiết kế dựa trên câu hỏi, không phải vì "dễ làm".', zh: '根据研究问题选择设计，不能只因“容易做”。', en: 'Choose the design based on the question, not because it is easy.' },
    checklist: {
      vi: ['Intervention: RCT/pragmatic/pilot RCT/non-randomized', 'Observational: prospective/retrospective cohort, case-control, cross-sectional', 'Evidence synthesis: systematic review/meta-analysis/network meta-analysis', 'Prediction: development/validation/updating/impact study'],
      zh: ['干预性：RCT/实效性试验/pilot RCT/非随机干预', '观察性：前瞻/回顾性队列、病例对照、横断面', '证据综合：系统综述/Meta 分析/网络 Meta 分析', '预测研究：development/validation/updating/impact study'],
      en: ['Intervention: RCT / pragmatic / pilot RCT / non-randomized', 'Observational: prospective/retrospective cohort, case-control, cross-sectional', 'Evidence synthesis: systematic review / meta-analysis / network meta-analysis', 'Prediction: development / validation / updating / impact study'],
    },
    deliverable: { vi: 'Study Design Specification', zh: 'Study Design Specification（研究设计说明书）', en: 'Study Design Specification' } },

  { no: 6, key: 'outcomes_variables',
    title: { vi: 'Outcome và biến số', zh: '明确结局指标与变量', en: 'Outcomes and variables' },
    goal: { vi: 'Một trong những quyết định quan trọng nhất của thiết kế.', zh: '这是研究设计中最重要的决策之一。', en: 'One of the most important design decisions.' },
    checklist: {
      vi: ['Chỉ 1 primary outcome rõ: biến gì/đo bằng gì/thời điểm/ai đo/đơn vị/ý nghĩa lâm sàng', 'Định nghĩa trước secondary + tách riêng exploratory outcomes', 'Phân biệt exposure/intervention/outcome/confounder/mediator/moderator', 'Lập Data Dictionary: tên biến/định nghĩa/kiểu dữ liệu/đơn vị/mã hoá/giá trị thiếu'],
      zh: ['仅 1 个清晰 primary outcome：变量/测量方法/时间点/测量者/单位/临床意义', '预先定义 secondary，单独区分 exploratory outcomes', '区分 exposure/intervention/outcome/confounder/mediator/moderator', '建立 Data Dictionary：变量名/定义/数据类型/单位/编码/缺失值'],
      en: ['One clear primary outcome: variable/measurement/timepoint/assessor/unit/clinical meaning', 'Pre-define secondary; keep exploratory outcomes separate', 'Distinguish exposure/intervention/outcome/confounder/mediator/moderator', 'Build a Data Dictionary: name/definition/datatype/unit/coding/missing value'],
    },
    deliverable: { vi: 'Outcome Framework + Data Dictionary', zh: 'Outcome Framework + Data Dictionary', en: 'Outcome Framework + Data Dictionary' } },

  { no: 7, key: 'sample_size',
    title: { vi: 'Cỡ mẫu', zh: '样本量', en: 'Sample size' },
    goal: { vi: 'Không dùng "khoảng 60 người vì nghiên cứu trước cũng dùng 60".', zh: '不能用“以前的研究也是 60 人”作为理由。', en: 'Never justify n by "prior studies also used this number".' },
    checklist: {
      vi: ['Dựa trên: study design, primary outcome, expected effect, variance/event rate, alpha, power, allocation ratio, dropout', 'RCT: effect size → α → power → n → điều chỉnh dropout'],
      zh: ['基于：研究设计、primary outcome、预期效应、方差/事件率、alpha、power、分配比例、脱落率', 'RCT：effect size → α → power → n → dropout 调整'],
      en: ['Based on: study design, primary outcome, expected effect, variance/event rate, alpha, power, allocation ratio, dropout', 'RCT: effect size → α → power → n → dropout adjustment'],
    },
    deliverable: { vi: 'Sample Size Justification', zh: 'Sample Size Justification（样本量论证）', en: 'Sample Size Justification' } },

  { no: 8, key: 'sap',
    title: { vi: 'Kế hoạch phân tích thống kê (SAP)', zh: '统计分析计划', en: 'Statistical analysis plan' },
    goal: { vi: 'Statistician phải tham gia TRƯỚC khi thu thập dữ liệu.', zh: '统计人员必须在数据收集之前参与。', en: 'The statistician must be involved before data collection begins.' },
    checklist: {
      vi: ['Descriptive + primary analysis model', 'Effect estimate ưu tiên (mean diff/OR/RR/HR/β) kèm 95% CI, không chỉ P-value', 'Confounder adjustment định trước + xử lý missing data', 'RCT: ITT/per-protocol/safety population; subgroup phải prespecified; sensitivity analysis'],
      zh: ['描述性分析 + 主要分析模型', '效应估计优先（mean diff/OR/RR/HR/β）并报告 95% CI，不只报 P 值', '预先规定混杂调整 + 缺失数据处理', 'RCT：ITT/per-protocol/safety population；亚组分析须预设；敏感性分析'],
      en: ['Descriptive + primary analysis model', 'Prioritize effect estimates (mean diff/OR/RR/HR/β) with 95% CI, not just P-value', 'Pre-specify confounder adjustment + missing-data handling', 'RCT: ITT/per-protocol/safety population; subgroups must be prespecified; sensitivity analysis'],
    },
    deliverable: { vi: 'Statistical Analysis Plan (khoá trước final analysis)', zh: 'Statistical Analysis Plan（须在最终分析前锁定）', en: 'Statistical Analysis Plan (locked before final analysis)' } },

  { no: 9, key: 'protocol',
    title: { vi: 'Viết protocol hoàn chỉnh', zh: '完成研究方案（Protocol）', en: 'Write the full protocol' },
    goal: { vi: 'Protocol là "hiến pháp" của nghiên cứu, không phải giấy tờ cho đủ thủ tục.', zh: 'Protocol 是研究的“宪法”，不是走流程的形式文件。', en: 'The protocol is the study\'s constitution, not a formality.' },
    checklist: {
      vi: ['26 mục: background→publication plan (xem chi tiết trong roadmap)', 'Dùng đúng chuẩn tham chiếu: RCT protocol=SPIRIT, RCT report=CONSORT, châm cứu=STRICTA, observational=STROBE, systematic review=PRISMA, prediction=TRIPOD/TRIPOD+AI'],
      zh: ['26 个部分：background→publication plan（详见 roadmap）', '使用正确参考规范：RCT protocol=SPIRIT，RCT report=CONSORT，针灸=STRICTA，观察性=STROBE，系统综述=PRISMA，预测=TRIPOD/TRIPOD+AI'],
      en: ['26 sections: background → publication plan (see roadmap for full list)', 'Use the right reporting standard: RCT protocol=SPIRIT, RCT report=CONSORT, acupuncture=STRICTA, observational=STROBE, systematic review=PRISMA, prediction=TRIPOD/TRIPOD+AI'],
    },
    deliverable: { vi: 'Protocol hoàn chỉnh theo đúng chuẩn', zh: '符合规范的完整 Protocol', en: 'Complete protocol per the relevant standard' } },

  { no: 10, key: 'crf',
    title: { vi: 'CRF/eCRF và quản lý dữ liệu', zh: 'CRF/eCRF 与数据管理', en: 'CRF/eCRF and data management' },
    goal: { vi: 'CRF chỉ chứa đúng biến cần trả lời câu hỏi — không thu "càng nhiều càng tốt".', zh: 'CRF 只收集回答问题所需变量，不是越多越好。', en: 'The CRF should capture only the variables needed to answer the question — not "as much as possible".' },
    checklist: {
      vi: ['Xây CRF: participant ID/screening/eligibility/baseline/intervention/follow-up/outcome/AE-SAE/withdrawal/deviation', 'Data management plan: ai nhập/kiểm, single/double entry, edit checks, quyền truy cập, backup, audit trail, ẩn danh, khoá DB'],
      zh: ['构建 CRF：受试者编号/筛选/资格/基线/干预/随访/结局/AE-SAE/退出/方案偏离', '数据管理计划：录入/核查人、single/double entry、edit checks、访问权限、备份、审计轨迹、匿名化、数据库锁定'],
      en: ['Build the CRF: participant ID / screening / eligibility / baseline / intervention / follow-up / outcome / AE-SAE / withdrawal / deviation', 'Data management plan: who enters/checks, single/double entry, edit checks, access, backup, audit trail, anonymization, DB locking'],
    },
    deliverable: { vi: 'CRF/eCRF + Data Management Plan', zh: 'CRF/eCRF + Data Management Plan', en: 'CRF/eCRF + Data Management Plan' } },

  { no: 11, key: 'ethics_registration',
    title: { vi: 'Khoa học/Đạo đức/Đăng ký', zh: '科学审查 + 伦理审查 + 注册', en: 'Scientific review, ethics & registration' },
    goal: { vi: 'Protocol hoàn chỉnh → scientific review → ethics → phê duyệt cơ sở → đăng ký → mới tuyển bệnh nhân.', zh: '完整 protocol → 科学审查 → 伦理 → 机构批准 → 注册 → 才能招募。', en: 'Complete protocol → scientific review → ethics → institutional approval → registration → only then recruit.' },
    checklist: {
      vi: ['Ethics package: protocol, informed consent, patient info sheet, CRF, tài liệu tuyển, an toàn, bảo mật, xung đột lợi ích', 'Clinical trial: kiểm tra yêu cầu prospective registration — không tuyển người đầu tiên rồi mới đăng ký'],
      zh: ['伦理资料包：protocol、知情同意书、受试者说明书、CRF、招募材料、安全流程、隐私、利益冲突', '临床试验：核查 prospective registration 要求，不得先入组再注册'],
      en: ['Ethics package: protocol, informed consent, patient info sheet, CRF, recruitment material, safety, privacy, conflict of interest', 'Clinical trial: verify prospective registration — do not enroll before registering'],
    },
    deliverable: { vi: 'Ethics approval + institutional approval + mã đăng ký', zh: '伦理批准 + 机构批准 + 注册号', en: 'Ethics approval + institutional approval + registration ID' } },

  { no: 12, key: 'pilot',
    title: { vi: 'Pilot (thử nghiệm nhỏ)', zh: '预试验', en: 'Pilot' },
    goal: { vi: 'Câu hỏi lớn nhất: nghiên cứu chính có thực sự chạy được không?', zh: '最重要的问题：正式研究能否实际运行？', en: 'The core question: can the main study actually work?' },
    checklist: {
      vi: ['Kiểm tra: recruitment, CRF, questionnaire, quy trình can thiệp, nhập liệu, follow-up, gánh nặng thời gian, biến thiếu, thiết bị', 'Không nhất thiết chứng minh efficacy'],
      zh: ['检查：招募、CRF、问卷、干预流程、数据录入、随访、时间负担、遗漏变量、设备', '不一定需要证明疗效'],
      en: ['Check: recruitment, CRF, questionnaire, intervention workflow, data entry, follow-up, time burden, missing variables, equipment', 'Not necessarily meant to prove efficacy'],
    },
    deliverable: { vi: 'Pilot Report (+ amendment protocol nếu cần)', zh: 'Pilot Report（如需要则修订 protocol）', en: 'Pilot Report (plus protocol amendment if needed)' } },

  { no: 13, key: 'recruitment_execution',
    title: { vi: 'Tuyển bệnh nhân & thực hiện nghiên cứu', zh: '招募与研究实施', en: 'Recruitment and study execution' },
    goal: { vi: 'Mỗi participant phải có traceability đầy đủ.', zh: '每位受试者都必须具备可追溯性。', en: 'Every participant must be fully traceable.' },
    checklist: {
      vi: ['Theo dõi hàng tuần/tháng: screened/eligible/enrolled/randomized/completed/withdrawn', 'Ghi đầy đủ protocol deviation, phát hiện sớm missing data, ghi nhận AE ngay (không đợi cuối), kiểm tra chất lượng liên tục'],
      zh: ['每周/每月监测：screened/eligible/enrolled/randomized/completed/withdrawn', '完整记录方案偏离，尽早发现缺失数据，及时处理不良事件，持续检查数据质量'],
      en: ['Track weekly/monthly: screened/eligible/enrolled/randomized/completed/withdrawn', 'Log deviations fully, catch missing data early, record AEs immediately, check data quality continuously'],
    },
    deliverable: { vi: 'Recruitment & execution log liên tục', zh: '持续更新的招募与实施记录', en: 'Ongoing recruitment & execution log' } },

  { no: 14, key: 'quality_control',
    title: { vi: 'Kiểm soát chất lượng / Giám sát', zh: '质量控制与监查', en: 'Quality control / monitoring' },
    goal: { vi: 'Dữ liệu phải chứng minh: thật, chính xác, đầy đủ, nhất quán, truy xuất được.', zh: '数据必须证明：真实、准确、完整、一致、可追溯。', en: 'Data must be shown to be true, accurate, complete, consistent, traceable.' },
    checklist: {
      vi: ['Source data verification, kiểm tra tiêu chuẩn chọn, rà soát missing, phát hiện outlier/trùng lặp', 'Kiểm tra range, logic ngày tháng, deviation, audit informed consent'],
      zh: ['源数据核查、入排标准核查、缺失审查、异常值/重复检测', '范围检查、日期逻辑、方案偏离、知情同意审计'],
      en: ['Source data verification, eligibility checks, missing-data review, outlier/duplicate detection', 'Range checks, date logic, deviations, consent audit'],
    },
    deliverable: { vi: 'QC Log + Query Log', zh: 'QC Log + Query Log', en: 'QC Log + Query Log' } },

  { no: 15, key: 'database_lock',
    title: { vi: 'Khoá cơ sở dữ liệu', zh: '数据库锁定', en: 'Database lock' },
    goal: { vi: 'Thời điểm rất quan trọng — sau khi khoá, không được tự ý sửa dữ liệu.', zh: '关键节点 — 锁定后不得擅自修改数据。', en: 'A critical milestone — no unauthorized edits after locking.' },
    checklist: {
      vi: ['Hoàn thành trước khi khoá: missing/inconsistent queries, kiểm trùng, review outlier, kiểm mã hoá, đối chiếu AE và trạng thái participant', 'Nếu sửa sau khoá phải có audit trail'],
      zh: ['锁定前完成：缺失/不一致质疑、重复检查、异常值复核、编码检查、AE 与受试者状态核对', '锁定后如需修改必须保留审计轨迹'],
      en: ['Complete before locking: missing/inconsistent queries, duplicate check, outlier review, coding check, AE and participant status reconciliation', 'Any post-lock edit requires an audit trail'],
    },
    deliverable: { vi: 'Database Lock Certificate/Record', zh: 'Database Lock Certificate/Record', en: 'Database Lock Certificate / Record' } },

  { no: 16, key: 'final_analysis',
    title: { vi: 'Phân tích thống kê cuối cùng', zh: '最终统计分析', en: 'Final statistical analysis' },
    goal: { vi: 'protocol → SAP → locked database → analysis — không phải "thử nhiều cách đến khi P<0,05".', zh: 'protocol → SAP → locked database → analysis，而非“试到 P<0.05”。', en: 'protocol → SAP → locked database → analysis — not "try methods until P<0.05".' },
    checklist: {
      vi: ['Trình bày effect estimate + 95% CI + P-value khi phù hợp + clinical relevance', 'Không biến statistical significance thành clinical significance'],
      zh: ['报告 effect estimate + 95% CI + 适当情况下的 P 值 + 临床相关性', '不能把统计学显著性等同于临床意义'],
      en: ['Report effect estimate + 95% CI + P-value where appropriate + clinical relevance', 'Do not equate statistical significance with clinical significance'],
    },
    deliverable: { vi: 'Final Analysis Output theo đúng SAP đã khoá', zh: '按已锁定 SAP 输出的最终分析结果', en: 'Final analysis output per the locked SAP' } },

  { no: 17, key: 'interpretation',
    title: { vi: 'Diễn giải kết quả', zh: '结果解释', en: 'Interpretation' },
    goal: { vi: 'Research hypothesis có quyền bị bác bỏ — không được ép kết quả khớp lý luận ban đầu.', zh: 'Research hypothesis 完全可以被否定，不能强行迎合最初理论。', en: 'The hypothesis may be rejected — do not force results to fit the original idea.' },
    checklist: {
      vi: ['Tách rõ: data / statistical inference / interpretation / biological-clinical plausibility / limitation / generalizability'],
      zh: ['清晰区分：数据 / 统计推断 / 解释 / 生物学-临床合理性 / 局限性 / 外推性'],
      en: ['Clearly separate: data / statistical inference / interpretation / biological-clinical plausibility / limitation / generalizability'],
    },
    deliverable: { vi: 'Interpretation Notes', zh: 'Interpretation Notes（结果解释笔记）', en: 'Interpretation Notes' } },

  { no: 18, key: 'paper',
    title: { vi: 'Bài báo khoa học', zh: '科学论文', en: 'Scientific paper' },
    goal: { vi: 'Không viết sau khi nghiên cứu xong — publication architecture đã phải có từ protocol.', zh: '不应等研究结束才写，publication architecture 应从 protocol 阶段就规划。', en: 'Do not wait until the study ends — plan the publication architecture from the protocol stage.' },
    checklist: {
      vi: ['Mỗi paper phải có câu hỏi khoa học độc lập, không chia 1 dataset thành nhiều bài chỉ để tăng số lượng', 'IMRaD: Introduction (known/unknown/why/what we asked) → Methods (đủ để tái lập) → Results (không giải thích) → Discussion (findings/so sánh/giải thích/strengths/limitations/implications) → Conclusion (không vượt evidence)'],
      zh: ['每篇论文须有独立科学问题，不能仅为增加篇数拆分同一 dataset', 'IMRaD：Introduction（已知/未知/重要性/问题）→ Methods（足以复现）→ Results（不解释）→ Discussion（发现/文献比较/解释/优势/局限/意义）→ Conclusion（不超出证据）'],
      en: ['Each paper needs an independent scientific question — do not split one dataset just to inflate publication count', 'IMRaD: Introduction (known/unknown/why/question) → Methods (reproducible) → Results (no interpretation) → Discussion (findings/comparison/explanation/strengths/limitations/implications) → Conclusion (stay within evidence)'],
    },
    deliverable: { vi: 'Manuscript draft theo IMRaD', zh: '按 IMRaD 撰写的 Manuscript 初稿', en: 'IMRaD manuscript draft' } },

  { no: 19, key: 'journal_strategy',
    title: { vi: 'Chiến lược chọn tạp chí', zh: '期刊策略', en: 'Journal strategy' },
    goal: { vi: 'Xác định journal target sớm, không đợi xong manuscript mới tìm.', zh: '应尽早确定目标期刊，不应等 manuscript 完成后才寻找。', en: 'Identify target journals early, not after the manuscript is finished.' },
    checklist: {
      vi: ['Đánh giá: scope, loại bài, chỉ mục, độc giả, lịch sử xuất bản, giới hạn từ, yêu cầu phương pháp, APC, đặc điểm bình duyệt', 'Chuẩn bị Journal A (chính) + B/C (dự phòng)'],
      zh: ['评估：范围、文章类型、收录数据库、读者、发表历史、字数限制、方法学要求、APC、审稿特点', '准备 Journal A（首选）+ B/C（备选）'],
      en: ['Evaluate: scope, article type, indexing, audience, publication history, word limit, methodology expectations, APC, peer-review style', 'Prepare Journal A (primary) plus B/C backups'],
    },
    deliverable: { vi: 'Journal Shortlist (A/B/C)', zh: 'Journal Shortlist（A/B/C）', en: 'Journal shortlist (A/B/C)' } },

  { no: 20, key: 'submission_revision',
    title: { vi: 'Nộp bài & sửa bản thảo', zh: '投稿与修回', en: 'Submission and revision' },
    goal: { vi: 'Trả lời reviewer có hệ thống, không phản ứng cảm tính.', zh: '系统性回应 reviewer，不情绪化。', en: 'Respond to reviewers systematically, not emotionally.' },
    checklist: {
      vi: ['Submission package: manuscript, cover letter, title page, supplementary, reporting checklist, ethics statement, registration, data availability, COI, author contribution', 'Bảng phản hồi: Reviewer｜Comment｜Response｜Manuscript change — mỗi comment phải có trả lời'],
      zh: ['投稿材料：manuscript、cover letter、title page、补充材料、reporting checklist、伦理声明、注册、数据可及性、利益冲突、作者贡献', '回复表：Reviewer｜Comment｜Response｜Manuscript change — 每条须回应'],
      en: ['Submission package: manuscript, cover letter, title page, supplementary material, reporting checklist, ethics statement, registration, data availability, COI, author contribution', 'Response table: Reviewer｜Comment｜Response｜Manuscript change — answer every comment'],
    },
    deliverable: { vi: 'Point-by-point response letter', zh: 'Point-by-point response letter（逐条回复信）', en: 'Point-by-point response letter' } },

  { no: 21, key: 'thesis',
    title: { vi: 'Luận văn', zh: '学位论文', en: 'Thesis' },
    goal: { vi: 'Không phải bản kéo dài của paper — phải thể hiện hiểu toàn bộ quá trình nghiên cứu.', zh: '不是把 paper 拉长，须体现真正理解整个研究过程。', en: 'Not just a long paper — must show full understanding of the research process.' },
    checklist: {
      vi: ['第一章 绪论 (Background) → 第二章 文献综述 → 第三章 mục tiêu/giả thuyết → 第四章 phương pháp → 第五章 kết quả → 第六章 bàn luận → 第七章 kết luận → 创新点 → 局限性 → 展望 → References → Appendices'],
      zh: ['第一章 绪论 → 第二章 文献综述 → 第三章 研究目的与假设 → 第四章 研究方法 → 第五章 研究结果 → 第六章 讨论 → 第七章 结论 → 创新点 → 局限性 → 展望 → References → Appendices'],
      en: ['Ch.1 Background → Ch.2 Literature review → Ch.3 Aims/hypotheses → Ch.4 Methods → Ch.5 Results → Ch.6 Discussion → Ch.7 Conclusion → Innovations → Limitations → Outlook → References → Appendices'],
    },
    deliverable: { vi: 'Bản thảo luận văn hoàn chỉnh', zh: '完整学位论文初稿', en: 'Complete thesis draft' } },

  { no: 22, key: 'pre_defense',
    title: { vi: 'Tiền bảo vệ (Pre-defense)', zh: '预答辩', en: 'Pre-defense' },
    goal: { vi: 'Nếu không tự trả lời được các câu hỏi cốt lõi, nghĩa là chưa làm chủ luận văn.', zh: '若无法回答核心问题，说明尚未真正掌握论文。', en: 'If you cannot answer the core questions, you do not yet own your thesis.' },
    checklist: {
      vi: ['Tự trả lời: vì sao câu hỏi này/thiết kế này/cỡ mẫu này/outcome này/mô hình thống kê này', 'Bias nào tồn tại, đã kiểm soát thế nào, kết quả chứng minh được đến đâu và KHÔNG chứng minh được điều gì'],
      zh: ['自问自答：为什么这个问题/设计/样本量/结局/统计模型', '存在哪些偏倚、如何控制、结果能证明到什么程度、不能证明什么'],
      en: ['Answer yourself: why this question / design / sample size / outcome / statistical model', 'What biases exist, how controlled, what the result does and does NOT prove'],
    },
    deliverable: { vi: 'Pre-defense Q&A Prep', zh: 'Pre-defense Q&A Prep（预答辩问答准备）', en: 'Pre-defense Q&A prep' } },

  { no: 23, key: 'final_defense',
    title: { vi: 'Bảo vệ chính thức', zh: '正式答辩', en: 'Final defense' },
    goal: { vi: 'Không chứng minh "hoàn hảo" mà chứng minh hiểu rõ câu hỏi, phương pháp, giới hạn của mình.', zh: '不是证明“完美”，而是证明理解自己的问题、方法与局限。', en: 'Not to prove perfection — to prove you understand your question, methods and limits.' },
    checklist: {
      vi: ['Chuẩn bị trình bày súc tích + sẵn sàng trả lời chất vấn dựa trên Pre-defense Q&A'],
      zh: ['准备简明陈述 + 基于预答辩问答准备好接受质询'],
      en: ['Prepare a concise presentation + be ready to defend based on the pre-defense Q&A prep'],
    },
    deliverable: { vi: 'Buổi bảo vệ hoàn tất', zh: '完成正式答辩', en: 'Completed defense' } },

  { no: 24, key: 'close_out',
    title: { vi: 'Đóng hồ sơ nghiên cứu', zh: '研究结题与关闭', en: 'Study close-out' },
    goal: { vi: 'Nghiên cứu chưa close-out thì về quản trị khoa học vẫn chưa thực sự kết thúc.', zh: '未完成结题，从科研管理角度研究仍未真正结束。', en: 'Administratively, a study is not truly finished until close-out.' },
    checklist: {
      vi: ['Final study report, cập nhật registry, ethics close-out nếu yêu cầu', 'Lưu trữ: archive nghiên cứu, code phân tích, dataset, hồ sơ đồng ý/nguồn, theo dõi công bố'],
      zh: ['Final study report、更新注册信息、如需完成伦理结题', '归档：研究档案、分析代码、数据集、知情同意/源文件、发表情况跟踪'],
      en: ['Final study report, registry update, ethics close-out if required', 'Archive: study files, analysis code, dataset, consent/source records, publication tracking'],
    },
    deliverable: { vi: 'Study Close-out Record', zh: 'Study Close-out Record（研究结题记录）', en: 'Study close-out record' } },
];

export const GATE_BY_NO = Object.fromEntries(GATES.map((g) => [g.no, g]));

// Danh mục "hạng mục nghiên cứu" — CỐ ĐỊNH, thuộc về người làm nghiên cứu (không phải của
// riêng 1 dự án nào, xem [[project_chimedis_literature_discovery]] phần sửa 2026-09-18: user
// chỉ rõ "Hạng mục nghiên cứu vốn là cố định của nhà nghiên cứu khoa học", không do người dùng
// tự tạo/xoá loại — họ chỉ tạo THỰC THỂ (instance, 1 bài cụ thể) bên trong 1 danh mục cố định,
// và có thể tạo NHIỀU thực thể trong cùng 1 danh mục (VD 3 bài RCT khác nhau).
// Phân loại dựa theo chuẩn xuất bản khoa học thật — ICMJE Recommendations (icmje.org) + EQUATOR
// Network (equator-network.org, nơi giữ danh sách chuẩn báo cáo — reporting guideline — chính
// thức cho từng loại nghiên cứu). "standard" ghi ở mỗi loại = tên chuẩn báo cáo tương ứng.
// msc_thesis/phd_thesis dùng đủ 25 Gate. Các loại bài báo dùng subset Gate phù hợp bản chất
// (case report không cần sample-size/randomization; protocol dừng lại trước khi có kết quả).
export const TRACK_TYPES = {
  msc_thesis: {
    label: { vi: 'Luận văn Thạc sĩ', zh: '硕士学位论文', en: 'Master\'s thesis' },
    icon: 'ti-school',
    gates: GATES.map((g) => g.no),
  },
  phd_thesis: {
    label: { vi: 'Luận văn Tiến sĩ', zh: '博士学位论文', en: 'Doctoral thesis' },
    icon: 'ti-certificate',
    gates: GATES.map((g) => g.no),
  },
  // Original research article (ICMJE) — bài báo trình bày nghiên cứu gốc do chính tác giả thực
  // hiện. Không có 1 gate list cố định — mỗi thiết kế nghiên cứu con (study_design) tự chọn.
  original_research: {
    label: { vi: 'Bài báo nghiên cứu gốc (Original Research)', zh: '原创研究论文', en: 'Original research article' },
    icon: 'ti-article',
    gates: null,
    studyDesigns: {
      rct: { label: { vi: 'RCT (thử nghiệm ngẫu nhiên có đối chứng)', zh: 'RCT（随机对照试验）', en: 'RCT (randomized controlled trial)' }, standard: 'SPIRIT/CONSORT', gates: [2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 18, 19, 20] },
      cohort: { label: { vi: 'Nghiên cứu đoàn hệ (cohort)', zh: '队列研究', en: 'Cohort study' }, standard: 'STROBE', gates: [2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 18, 19, 20] },
      case_control: { label: { vi: 'Nghiên cứu bệnh-chứng (case-control)', zh: '病例对照研究', en: 'Case-control study' }, standard: 'STROBE', gates: [2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 18, 19, 20] },
      cross_sectional: { label: { vi: 'Nghiên cứu cắt ngang', zh: '横断面研究', en: 'Cross-sectional study' }, standard: 'STROBE', gates: [2, 3, 5, 6, 7, 8, 9, 16, 17, 18, 19, 20] },
      diagnostic: { label: { vi: 'Nghiên cứu chẩn đoán/dự đoán', zh: '诊断/预测研究', en: 'Diagnostic / prediction study' }, standard: 'STARD/TRIPOD+AI', gates: [2, 3, 5, 6, 7, 8, 9, 16, 17, 18, 19, 20] },
      preclinical_animal: { label: { vi: 'Nghiên cứu tiền lâm sàng/động vật (dược lý)', zh: '临床前/动物药理研究', en: 'Preclinical / animal pharmacology study' }, standard: 'ARRIVE 2.0', gates: [2, 3, 5, 6, 7, 8, 9, 16, 17, 18, 19, 20] },
      qualitative: { label: { vi: 'Nghiên cứu định tính', zh: '定性研究', en: 'Qualitative study' }, standard: 'COREQ/SRQR', gates: [2, 3, 5, 8, 9, 16, 17, 18, 19, 20] },
    },
  },
  // Tách RIÊNG khỏi original_research — theo phân loại thật của các tạp chí (Pediatrics, NEJM,
  // Editage...), Systematic Review/Meta-analysis là 1 THỂ LOẠI BÀI ĐỘC LẬP, không phải 1 "thiết
  // kế nghiên cứu" như RCT/cohort.
  systematic_review: {
    label: { vi: 'Tổng quan hệ thống / Phân tích gộp', zh: '系统综述/Meta 分析', en: 'Systematic review / meta-analysis' },
    icon: 'ti-list-search',
    standard: 'PRISMA 2020',
    gates: [2, 3, 5, 8, 9, 16, 17, 18, 19, 20],
  },
  narrative_review: {
    label: { vi: 'Tổng quan tường thuật (Narrative Review)', zh: '叙述性综述', en: 'Narrative / literature review' },
    icon: 'ti-books',
    standard: 'SANRA',
    gates: [2, 3, 9, 17, 18, 19, 20],
  },
  // Case report/series — tách riêng, không còn là "study design" con của original_research
  // (đúng cách ICMJE và phần lớn tạp chí xếp loại: 1 thể loại bài riêng, cấu trúc khác IMRaD).
  case_report: {
    label: { vi: 'Báo cáo ca bệnh (Case Report/Series)', zh: '病例报告/系列', en: 'Case report / case series' },
    icon: 'ti-file-description',
    standard: 'CARE',
    gates: [2, 3, 9, 17, 18, 19, 20],
  },
  // Protocol paper — công bố ĐỀ CƯƠNG trước khi có kết quả (rất phổ biến ở BMJ Open, Trials...).
  // Khác grant_proposal (nộp xin tài trợ/hội đồng, không xuất bản) — đây LÀ một bài báo thật.
  protocol_paper: {
    label: { vi: 'Bài báo công bố đề cương (Protocol Paper)', zh: '方案论文（Protocol Paper）', en: 'Protocol paper' },
    icon: 'ti-clipboard-text',
    gates: null,
    studyDesigns: {
      trial_protocol: { label: { vi: 'Đề cương thử nghiệm lâm sàng', zh: '临床试验方案', en: 'Clinical trial protocol' }, standard: 'SPIRIT', gates: [2, 3, 4, 5, 6, 7, 8, 9, 11] },
      review_protocol: { label: { vi: 'Đề cương tổng quan hệ thống', zh: '系统综述方案', en: 'Systematic review protocol' }, standard: 'PRISMA-P', gates: [2, 3, 5, 8, 9] },
    },
  },
  short_communication: {
    label: { vi: 'Bài ngắn / Thư gửi toà soạn (Short Communication)', zh: '简报/致编辑信', en: 'Short communication / letter to the editor' },
    icon: 'ti-message-2',
    standard: '—',
    gates: [2, 3, 9, 17, 18, 19, 20],
  },
  conference_abstract: {
    label: { vi: 'Tóm tắt / Áp phích hội nghị', zh: '会议摘要/壁报', en: 'Conference abstract / poster' },
    icon: 'ti-presentation',
    gates: [2, 3, 6, 16, 17, 18],
  },
  grant_proposal: {
    label: { vi: 'Đề cương xin tài trợ / đăng ký nghiên cứu', zh: '基金申请/研究注册', en: 'Grant proposal / study registration' },
    icon: 'ti-file-certificate',
    gates: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11],
  },
  report: {
    label: { vi: 'Báo cáo nghiên cứu (kỹ thuật/nội bộ)', zh: '研究报告（技术/内部）', en: 'Research report (technical/internal)' },
    icon: 'ti-report',
    gates: [2, 3, 4, 16, 17, 18],
  },
};

export function gatesForTrack(trackType, studyDesign) {
  const def = TRACK_TYPES[trackType];
  if (!def) return [];
  if (def.gates) return def.gates;
  if (def.studyDesigns && studyDesign && def.studyDesigns[studyDesign]) {
    return def.studyDesigns[studyDesign].gates;
  }
  return [];
}

// Danh mục nào có sub-type (studyDesigns) bắt buộc phải chọn trước khi tạo thực thể.
export function trackHasSubtypes(trackType) {
  return !!(TRACK_TYPES[trackType] && TRACK_TYPES[trackType].studyDesigns);
}
