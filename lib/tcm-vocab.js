// Từ vựng YHCT/y khoa — ánh xạ thuật ngữ tiếng Việt / chữ Hán / pinyin sang từ khoá tiếng Anh
// / Latin dùng cho tìm kiếm y văn quốc tế (OpenAlex, Europe PMC...). Đây là điểm khác biệt của
// Chimedis so với SciSpace/Elicit: người dùng gõ "Hoàng kỳ" / "黄芪" / "针灸 中风" vẫn ra đúng
// bài PubMed (vốn chỉ index tiếng Anh / Latin).
//
// 3 lớp, nạp chồng lên nhau:
//   1. lib/tcm-dictionary.json  — ~8k khoá sinh TỰ ĐỘNG từ CoreDB (dict.chimedis.vn) — xem
//      scripts/build-tcm-dictionary.mjs. Phủ Dược liệu / Huyệt vị / Giải phẫu / Sinh lý / Từ ghép.
//   2. GENERAL (dưới) — tên bệnh Tây y phổ thông soạn tay (CoreDB chưa có module Bệnh lý).
//   3. RAW (dưới)     — thuật ngữ YHCT soạn tay kỹ (chứng/pháp/cổ phương) + đồng nghĩa tốt nhất.
// Lớp sau đè lớp trước khi trùng khoá.

import { readFileSync } from 'node:fs';

/**
 * Mỗi mục: khoá là 1 biến thể người dùng có thể gõ (đã hạ chữ thường, bỏ dấu ở bước tra),
 * giá trị là { en: "cụm từ tiếng Anh chuẩn", syn: [đồng nghĩa/tên khác] }.
 */
const RAW = {
  // ===== Dược liệu thường gặp =====
  'hoang ky':        { en: 'Astragalus membranaceus', syn: ['Huangqi', 'Astragalus propinquus', 'Radix Astragali'] },
  'dang quy':        { en: 'Angelica sinensis', syn: ['Danggui', 'Dong quai', 'Radix Angelicae Sinensis'] },
  'nhan sam':        { en: 'Panax ginseng', syn: ['Renshen', 'Korean ginseng', 'Radix Ginseng'] },
  'cam thao':        { en: 'Glycyrrhiza uralensis', syn: ['Gancao', 'Licorice', 'Radix Glycyrrhizae'] },
  'bach truat':      { en: 'Atractylodes macrocephala', syn: ['Baizhu', 'Rhizoma Atractylodis Macrocephalae'] },
  'phuc linh':       { en: 'Poria cocos', syn: ['Fuling', 'Wolfiporia extensa', 'Poria'] },
  'xuyen khung':     { en: 'Ligusticum chuanxiong', syn: ['Chuanxiong', 'Rhizoma Chuanxiong'] },
  'bach thuoc':      { en: 'Paeonia lactiflora', syn: ['Baishao', 'white peony', 'Radix Paeoniae Alba'] },
  'thuc dia':        { en: 'Rehmannia glutinosa', syn: ['Dihuang', 'Shudihuang', 'Radix Rehmanniae Preparata'] },
  'hoang lien':      { en: 'Coptis chinensis', syn: ['Huanglian', 'berberine', 'Rhizoma Coptidis'] },
  'hoang cam':       { en: 'Scutellaria baicalensis', syn: ['Huangqin', 'baicalin', 'Radix Scutellariae'] },
  'sai ho':          { en: 'Bupleurum chinense', syn: ['Chaihu', 'saikosaponin', 'Radix Bupleuri'] },
  'que chi':         { en: 'Cinnamomum cassia twig', syn: ['Guizhi', 'cinnamon twig', 'Ramulus Cinnamomi'] },
  'ma hoang':        { en: 'Ephedra sinica', syn: ['Mahuang', 'ephedra', 'Herba Ephedrae'] },
  'kim ngan hoa':    { en: 'Lonicera japonica', syn: ['Jinyinhua', 'honeysuckle flower', 'Flos Lonicerae'] },
  'dan sam':         { en: 'Salvia miltiorrhiza', syn: ['Danshen', 'tanshinone', 'Radix Salviae Miltiorrhizae'] },
  'cat can':         { en: 'Pueraria lobata', syn: ['Gegen', 'puerarin', 'Radix Puerariae'] },
  'ngu vi tu':       { en: 'Schisandra chinensis', syn: ['Wuweizi', 'schisandrin', 'Fructus Schisandrae'] },
  'dia long':        { en: 'Pheretima', syn: ['Dilong', 'earthworm'] },
  'tam that':        { en: 'Panax notoginseng', syn: ['Sanqi', 'notoginseng', 'Radix Notoginseng'] },
  'ha thu o':        { en: 'Polygonum multiflorum', syn: ['Heshouwu', 'Fallopia multiflora', 'Radix Polygoni Multiflori'] },

  // ===== Cổ phương / bài thuốc =====
  'bo trung ich khi thang': { en: 'Buzhong Yiqi Tang', syn: ['Bu Zhong Yi Qi Wang', 'Hochu-ekki-to', 'TJ-41'] },
  'luc vi dia hoang hoan':  { en: 'Liuwei Dihuang Wan', syn: ['Rehmannia Six Formula', 'Rokumi-gan'] },
  'tu quan tu thang':       { en: 'Sijunzi Tang', syn: ['Four Gentlemen Decoction'] },
  'tu vat thang':           { en: 'Siwu Tang', syn: ['Four Substances Decoction'] },
  'que chi thang':          { en: 'Guizhi Tang', syn: ['Cinnamon Twig Decoction'] },
  'tieu sai ho thang':      { en: 'Xiao Chaihu Tang', syn: ['Minor Bupleurum Decoction', 'Sho-saiko-to', 'TJ-9'] },
  'bo huyet phuc mach thang': { en: 'Zhigancao Tang', syn: ['Honey-Fried Licorice Decoction'] },
  'ngoc binh phong tan':    { en: 'Yupingfeng San', syn: ['Jade Windscreen Powder'] },
  'bat tran thang':         { en: 'Bazhen Tang', syn: ['Eight Treasure Decoction'] },
  'sinh mach tan':          { en: 'Shengmai San', syn: ['Shengmai powder', 'Sheng Mai Yin'] },

  // ===== Chứng / biện chứng / khái niệm =====
  'ty khi hu':       { en: 'spleen qi deficiency', syn: ['spleen deficiency', 'Pi qi xu'] },
  'ty hu':           { en: 'spleen deficiency', syn: ['spleen qi deficiency'] },
  'than duong hu':   { en: 'kidney yang deficiency', syn: ['Shen yang xu'] },
  'than am hu':      { en: 'kidney yin deficiency', syn: ['Shen yin xu'] },
  'can khi uat ket': { en: 'liver qi stagnation', syn: ['liver depression', 'Gan qi yu jie'] },
  'khi tri huyet u': { en: 'qi stagnation and blood stasis', syn: ['blood stasis'] },
  'huyet u':         { en: 'blood stasis', syn: ['blood stasis syndrome', 'Xue yu'] },
  'am hu':           { en: 'yin deficiency', syn: ['yin deficiency syndrome'] },
  'duong hu':        { en: 'yang deficiency', syn: ['yang deficiency syndrome'] },
  'khi hu':          { en: 'qi deficiency', syn: ['qi deficiency syndrome'] },
  'dam thap':        { en: 'phlegm-dampness', syn: ['phlegm dampness syndrome', 'Tan shi'] },
  'ngoai cam phong han': { en: 'wind-cold exterior syndrome', syn: ['wind cold'] },

  // ===== Phương pháp trị liệu =====
  'cham cuu':        { en: 'acupuncture', syn: ['electroacupuncture', 'manual acupuncture'] },
  'dien cham':       { en: 'electroacupuncture', syn: ['electro-acupuncture'] },
  'cuu ngai':        { en: 'moxibustion', syn: ['moxa'] },
  'nhi cham':        { en: 'auricular acupuncture', syn: ['ear acupuncture', 'auriculotherapy'] },
  'giac hoi':        { en: 'cupping therapy', syn: ['cupping'] },
  'xoa bop bam huyet': { en: 'tuina massage', syn: ['tuina', 'Chinese therapeutic massage'] },
  'thuoc thang':     { en: 'Chinese herbal decoction', syn: ['herbal formula', 'herbal medicine'] },
  'duong sinh':      { en: 'qigong', syn: ['health preservation', 'yangsheng'] },

  // ===== Thuật ngữ khung =====
  'trung y':         { en: 'traditional Chinese medicine', syn: ['TCM', 'Chinese medicine'] },
  'yhct':            { en: 'traditional medicine', syn: ['traditional Chinese medicine', 'traditional Vietnamese medicine'] },
  'y hoc co truyen': { en: 'traditional medicine', syn: ['traditional Chinese medicine'] },
  'bien chung luan tri': { en: 'pattern differentiation', syn: ['syndrome differentiation', 'Bian Zheng'] },
  'kinh lac':        { en: 'meridian', syn: ['meridians and collaterals', 'channel'] },
  'huyet vi':        { en: 'acupuncture point', syn: ['acupoint'] },
};

// ===== Thuật ngữ y khoa PHỔ THÔNG tiếng Việt → tiếng Anh =====
// Đây là lớp thứ 2 (ngoài YHCT ở trên): bệnh/triệu chứng/giải phẫu/thủ thuật Tây y thường
// gặp — vốn KHÔNG có trong từ vựng YHCT nên trước đây gõ "đột quỵ", "tăng huyết áp"... ra 0
// kết quả. Chú trọng cả biến thể khẩu ngữ ("tai biến", "tai biến mạch máu não").
// Mở rộng dần; về lâu dài seed từ ICD-10 tiếng Việt (Bộ Y tế) + ICD-11 WHO.
const GENERAL = {
  // --- Tim mạch / mạch máu não ---
  'dot quy':                 { en: 'stroke', syn: ['cerebrovascular accident', 'brain infarction'] },
  'dot quy nao':             { en: 'stroke', syn: ['cerebrovascular accident'] },
  'tai bien':                { en: 'stroke', syn: ['cerebrovascular accident'] },
  'tai bien mach mau nao':   { en: 'stroke', syn: ['cerebrovascular accident'] },
  'nhoi mau nao':            { en: 'cerebral infarction', syn: ['ischemic stroke'] },
  'xuat huyet nao':          { en: 'cerebral hemorrhage', syn: ['intracerebral hemorrhage', 'hemorrhagic stroke'] },
  'liet nua nguoi':          { en: 'hemiplegia', syn: ['hemiparesis'] },
  'di chung dot quy':        { en: 'post-stroke', syn: ['stroke sequelae', 'stroke rehabilitation'] },
  'tang huyet ap':           { en: 'hypertension', syn: ['high blood pressure'] },
  'cao huyet ap':            { en: 'hypertension', syn: ['high blood pressure'] },
  'huyet ap thap':           { en: 'hypotension', syn: ['low blood pressure'] },
  'benh mach vanh':          { en: 'coronary artery disease', syn: ['coronary heart disease'] },
  'nhoi mau co tim':         { en: 'myocardial infarction', syn: ['heart attack'] },
  'suy tim':                 { en: 'heart failure', syn: ['cardiac failure'] },
  'roi loan nhip tim':       { en: 'cardiac arrhythmia', syn: ['arrhythmia'] },
  'rung nhi':                { en: 'atrial fibrillation', syn: [] },
  'xo vua dong mach':        { en: 'atherosclerosis', syn: [] },
  'roi loan lipid mau':      { en: 'dyslipidemia', syn: ['hyperlipidemia'] },
  'mo mau cao':              { en: 'hyperlipidemia', syn: ['dyslipidemia'] },

  // --- Nội tiết / chuyển hoá ---
  'dai thao duong':          { en: 'diabetes mellitus', syn: ['diabetes'] },
  'tieu duong':              { en: 'diabetes mellitus', syn: ['diabetes'] },
  'dai thao duong type 2':   { en: 'type 2 diabetes mellitus', syn: ['type 2 diabetes'] },
  'benh than dai thao duong':{ en: 'diabetic nephropathy', syn: ['diabetic kidney disease'] },
  'benh vong mac dai thao duong': { en: 'diabetic retinopathy', syn: [] },
  'beo phi':                 { en: 'obesity', syn: [] },
  'hoi chung chuyen hoa':    { en: 'metabolic syndrome', syn: [] },
  'suy giap':                { en: 'hypothyroidism', syn: [] },
  'cuong giap':              { en: 'hyperthyroidism', syn: ['thyrotoxicosis'] },
  'gut':                     { en: 'gout', syn: ['hyperuricemia'] },
  'loang xuong':             { en: 'osteoporosis', syn: [] },

  // --- Cơ xương khớp ---
  'viem khop':               { en: 'arthritis', syn: [] },
  'viem khop dang thap':     { en: 'rheumatoid arthritis', syn: [] },
  'thoai hoa khop':          { en: 'osteoarthritis', syn: ['degenerative joint disease'] },
  'thoai hoa cot song':      { en: 'spondylosis', syn: ['spinal degeneration'] },
  'thoat vi dia dem':        { en: 'intervertebral disc herniation', syn: ['herniated disc', 'disc prolapse'] },
  'dau that lung':           { en: 'low back pain', syn: ['lumbago'] },
  'dau lung':                { en: 'back pain', syn: ['low back pain'] },
  'dau vai gay':             { en: 'neck and shoulder pain', syn: ['cervical pain'] },
  'dau co':                  { en: 'neck pain', syn: ['cervical pain'] },
  'dau than kinh toa':       { en: 'sciatica', syn: ['sciatic neuralgia'] },
  'hoi chung ong co tay':    { en: 'carpal tunnel syndrome', syn: [] },
  'viem quanh khop vai':     { en: 'periarthritis of shoulder', syn: ['frozen shoulder', 'adhesive capsulitis'] },
  'gai cot song':            { en: 'spinal osteophyte', syn: ['bone spur', 'spondylosis'] },
  'loang gan':               { en: 'tendinopathy', syn: ['tendinitis'] },

  // --- Thần kinh / tâm thần ---
  'mat ngu':                 { en: 'insomnia', syn: ['sleep disorder'] },
  'roi loan giac ngu':       { en: 'sleep disorder', syn: ['insomnia'] },
  'tram cam':                { en: 'depression', syn: ['depressive disorder'] },
  'roi loan lo au':          { en: 'anxiety disorder', syn: ['anxiety'] },
  'lo au':                   { en: 'anxiety', syn: [] },
  'dau dau':                 { en: 'headache', syn: [] },
  'dau nua dau':             { en: 'migraine', syn: ['migraine headache'] },
  'chong mat':               { en: 'vertigo', syn: ['dizziness'] },
  'roi loan tien dinh':      { en: 'vestibular disorder', syn: ['vertigo'] },
  'liet day than kinh so 7': { en: 'facial paralysis', syn: ["Bell's palsy", 'facial nerve palsy'] },
  'liet mat':                { en: 'facial paralysis', syn: ["Bell's palsy"] },
  'dong kinh':               { en: 'epilepsy', syn: ['seizure'] },
  'sa sut tri tue':          { en: 'dementia', syn: [] },
  'benh alzheimer':          { en: "Alzheimer's disease", syn: ['Alzheimer disease'] },
  'benh parkinson':          { en: "Parkinson's disease", syn: ['Parkinson disease'] },
  'benh than kinh ngoai bien':{ en: 'peripheral neuropathy', syn: [] },
  'suy nhuoc than kinh':     { en: 'neurasthenia', syn: [] },
  'stress':                  { en: 'psychological stress', syn: ['stress'] },

  // --- Hô hấp ---
  'hen phe quan':            { en: 'bronchial asthma', syn: ['asthma'] },
  'hen suyen':               { en: 'asthma', syn: [] },
  'viem phe quan':           { en: 'bronchitis', syn: [] },
  'benh phoi tac nghen man tinh': { en: 'chronic obstructive pulmonary disease', syn: ['COPD'] },
  'viem xoang':              { en: 'sinusitis', syn: ['rhinosinusitis'] },
  'viem mui di ung':         { en: 'allergic rhinitis', syn: [] },
  'ho':                      { en: 'cough', syn: [] },
  'viem hong':               { en: 'pharyngitis', syn: ['sore throat'] },

  // --- Tiêu hoá ---
  'viem da day':             { en: 'gastritis', syn: [] },
  'loet da day ta trang':    { en: 'peptic ulcer', syn: ['gastric ulcer', 'duodenal ulcer'] },
  'trao nguoc da day thuc quan': { en: 'gastroesophageal reflux disease', syn: ['GERD'] },
  'hoi chung ruot kich thich': { en: 'irritable bowel syndrome', syn: ['IBS'] },
  'tao bon':                 { en: 'constipation', syn: [] },
  'tieu chay':               { en: 'diarrhea', syn: [] },
  'viem gan':                { en: 'hepatitis', syn: [] },
  'xo gan':                  { en: 'liver cirrhosis', syn: ['hepatic cirrhosis'] },
  'gan nhiem mo':            { en: 'fatty liver disease', syn: ['hepatic steatosis'] },
  'tri':                     { en: 'hemorrhoids', syn: [] },

  // --- Thận tiết niệu / sinh dục ---
  'suy than man':            { en: 'chronic kidney disease', syn: ['chronic renal failure'] },
  'soi than':                { en: 'kidney stone', syn: ['nephrolithiasis', 'renal calculi'] },
  'viem duong tiet nieu':    { en: 'urinary tract infection', syn: ['UTI'] },
  'phi dai tuyen tien liet': { en: 'benign prostatic hyperplasia', syn: ['BPH', 'prostatic hypertrophy'] },
  'roi loan cuong duong':    { en: 'erectile dysfunction', syn: ['impotence'] },
  'vo sinh':                 { en: 'infertility', syn: [] },
  'hiem muon':               { en: 'infertility', syn: ['subfertility'] },

  // --- Phụ khoa ---
  'roi loan kinh nguyet':    { en: 'menstrual disorder', syn: ['irregular menstruation'] },
  'thong kinh':              { en: 'dysmenorrhea', syn: ['menstrual pain'] },
  'tien man kinh':           { en: 'perimenopause', syn: ['menopausal transition'] },
  'man kinh':                { en: 'menopause', syn: ['climacteric'] },
  'hoi chung buong trung da nang': { en: 'polycystic ovary syndrome', syn: ['PCOS'] },
  'lac noi mac tu cung':     { en: 'endometriosis', syn: [] },

  // --- Da liễu ---
  'viem da co dia':          { en: 'atopic dermatitis', syn: ['eczema'] },
  'cham':                    { en: 'eczema', syn: ['dermatitis'] },
  'vay nen':                 { en: 'psoriasis', syn: [] },
  'me day':                  { en: 'urticaria', syn: ['hives'] },
  'mun trung ca':            { en: 'acne', syn: ['acne vulgaris'] },
  'rung toc':                { en: 'alopecia', syn: ['hair loss'] },
  'zona':                    { en: 'herpes zoster', syn: ['shingles'] },

  // --- Ung bướu & khác ---
  'ung thu':                 { en: 'cancer', syn: ['neoplasm', 'carcinoma'] },
  'khoi u':                  { en: 'tumor', syn: ['neoplasm'] },
  'hoa tri':                 { en: 'chemotherapy', syn: [] },
  'xa tri':                  { en: 'radiotherapy', syn: ['radiation therapy'] },
  'di can':                  { en: 'metastasis', syn: [] },
  'thieu mau':               { en: 'anemia', syn: [] },
  'suy giam mien dich':      { en: 'immunodeficiency', syn: [] },
  'covid':                   { en: 'COVID-19', syn: ['SARS-CoV-2'] },
  'hau covid':               { en: 'post-COVID-19 syndrome', syn: ['long COVID'] },
  'met moi man tinh':        { en: 'chronic fatigue syndrome', syn: ['chronic fatigue'] },
  'dau man tinh':            { en: 'chronic pain', syn: [] },
  'viem':                    { en: 'inflammation', syn: [] },

  // --- Thủ thuật / phương pháp Tây y hay đi kèm ---
  'phuc hoi chuc nang':      { en: 'rehabilitation', syn: ['physical rehabilitation'] },
  'vat ly tri lieu':         { en: 'physical therapy', syn: ['physiotherapy'] },
  'gay me':                  { en: 'anesthesia', syn: [] },
  'giam dau':                { en: 'analgesia', syn: ['pain relief'] },
  'phau thuat':              { en: 'surgery', syn: ['surgical operation'] },
};

// Khoá CHỮ HÁN cho các thuật ngữ pháp trị / chứng / bệnh mà CoreDB CHƯA phủ (CoreDB mạnh về
// dược liệu/huyệt vị/giải phẫu, chưa có module Bệnh lý & pháp trị). Nạp thẳng chuỗi Hán làm khoá.
const ZH_EXTRA = {
  // pháp trị / phương pháp
  '针灸':   { en: 'acupuncture', syn: ['electroacupuncture', 'manual acupuncture'] },
  '电针':   { en: 'electroacupuncture', syn: ['electro-acupuncture'] },
  '艾灸':   { en: 'moxibustion', syn: ['moxa'] },
  '灸法':   { en: 'moxibustion', syn: [] },
  '耳针':   { en: 'auricular acupuncture', syn: ['ear acupuncture'] },
  '拔罐':   { en: 'cupping therapy', syn: ['cupping'] },
  '推拿':   { en: 'tuina massage', syn: ['tuina', 'Chinese therapeutic massage'] },
  '按摩':   { en: 'massage therapy', syn: ['tuina'] },
  '中药':   { en: 'Chinese herbal medicine', syn: ['herbal medicine', 'Chinese materia medica'] },
  '中医':   { en: 'traditional Chinese medicine', syn: ['TCM'] },
  '中西医结合': { en: 'integrated traditional Chinese and Western medicine', syn: ['integrative medicine'] },
  '穴位':   { en: 'acupuncture point', syn: ['acupoint'] },
  '经络':   { en: 'meridian', syn: ['meridians and collaterals', 'channel'] },
  '辨证论治': { en: 'pattern differentiation and treatment', syn: ['syndrome differentiation'] },
  '康复':   { en: 'rehabilitation', syn: [] },
  // chứng / biện chứng
  '脾虚':   { en: 'spleen deficiency', syn: ['spleen qi deficiency'] },
  '脾气虚': { en: 'spleen qi deficiency', syn: [] },
  '气虚':   { en: 'qi deficiency', syn: [] },
  '血虚':   { en: 'blood deficiency', syn: [] },
  '阴虚':   { en: 'yin deficiency', syn: [] },
  '阳虚':   { en: 'yang deficiency', syn: [] },
  '血瘀':   { en: 'blood stasis', syn: ['blood stasis syndrome'] },
  '气滞血瘀': { en: 'qi stagnation and blood stasis', syn: [] },
  '肝郁':   { en: 'liver qi stagnation', syn: ['liver depression'] },
  '肝气郁结': { en: 'liver qi stagnation', syn: [] },
  '痰湿':   { en: 'phlegm-dampness', syn: [] },
  '湿热':   { en: 'damp-heat', syn: [] },
  '肾虚':   { en: 'kidney deficiency', syn: [] },
  '肾阳虚': { en: 'kidney yang deficiency', syn: [] },
  '肾阴虚': { en: 'kidney yin deficiency', syn: [] },
  // bệnh danh Tây/Trung y hay gặp trong y văn
  '中风':   { en: 'stroke', syn: ['cerebrovascular accident'] },
  '脑卒中': { en: 'stroke', syn: ['cerebrovascular accident'] },
  '脑梗死': { en: 'cerebral infarction', syn: ['ischemic stroke'] },
  '脑出血': { en: 'cerebral hemorrhage', syn: ['intracerebral hemorrhage'] },
  '偏瘫':   { en: 'hemiplegia', syn: ['hemiparesis'] },
  '面瘫':   { en: 'facial paralysis', syn: ["Bell's palsy"] },
  '高血压': { en: 'hypertension', syn: ['high blood pressure'] },
  '糖尿病': { en: 'diabetes mellitus', syn: ['diabetes'] },
  '失眠':   { en: 'insomnia', syn: ['sleep disorder'] },
  '抑郁症': { en: 'depression', syn: ['depressive disorder'] },
  '焦虑症': { en: 'anxiety disorder', syn: ['anxiety'] },
  '头痛':   { en: 'headache', syn: [] },
  '偏头痛': { en: 'migraine', syn: [] },
  '眩晕':   { en: 'vertigo', syn: ['dizziness'] },
  '颈椎病': { en: 'cervical spondylosis', syn: [] },
  '腰痛':   { en: 'low back pain', syn: ['lumbago'] },
  '腰椎间盘突出': { en: 'lumbar disc herniation', syn: ['herniated disc'] },
  '骨关节炎': { en: 'osteoarthritis', syn: [] },
  '类风湿关节炎': { en: 'rheumatoid arthritis', syn: [] },
  '膝骨关节炎': { en: 'knee osteoarthritis', syn: [] },
  '帕金森病': { en: "Parkinson's disease", syn: ['Parkinson disease'] },
  '阿尔茨海默病': { en: "Alzheimer's disease", syn: [] },
  '冠心病': { en: 'coronary heart disease', syn: ['coronary artery disease'] },
  '慢性疲劳': { en: 'chronic fatigue', syn: ['chronic fatigue syndrome'] },
  '肿瘤':   { en: 'tumor', syn: ['neoplasm'] },
  '癌症':   { en: 'cancer', syn: ['carcinoma'] },
  '化疗':   { en: 'chemotherapy', syn: [] },
};

// Chuẩn hoá: hạ chữ thường + bỏ dấu tiếng Việt để tra khớp rộng ("Hoàng Kỳ" == "hoang ky").
function stripDiacritics(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
export function normalizeTerm(s) {
  return stripDiacritics(String(s || '')).toLowerCase().replace(/\s+/g, ' ').trim();
}

// Từ điển lớn sinh từ CoreDB (dict.chimedis.vn): ~8k khoá vi / chữ Hán / pinyin cho Dược liệu,
// Huyệt vị, Giải phẫu, Sinh lý, Từ ghép Y Khoa. Sinh lại: `node scripts/build-tcm-dictionary.mjs`.
// Không có → chạy vẫn được, chỉ mất phần từ vựng lớn (chỉ còn RAW + GENERAL soạn tay).
let CORE_DICT = {};
try {
  CORE_DICT = JSON.parse(
    readFileSync(new URL('./tcm-dictionary.json', import.meta.url), 'utf8')
  );
} catch {
  // eslint-disable-next-line no-console
  console.warn('[tcm-vocab] Chưa có lib/tcm-dictionary.json — chạy scripts/build-tcm-dictionary.mjs để có từ vựng đầy đủ.');
}

// Bảng tra. Thứ tự nạp = độ ưu tiên khi trùng khoá (nạp SAU đè nạp TRƯỚC):
//   CoreDB (rộng) → GENERAL (bệnh Tây y soạn tay) → RAW (YHCT soạn tay, chuẩn nhất, thắng).
// Khoá của CoreDB đã chuẩn hoá sẵn (vi/pinyin) hoặc là chuỗi Hán thô — nạp thẳng, không normalize lại.
const INDEX = new Map();
for (const [k, v] of Object.entries(CORE_DICT)) {
  INDEX.set(k, v);
}
for (const [k, v] of Object.entries(ZH_EXTRA)) {
  INDEX.set(k, v); // khoá chữ Hán thô, không normalize
}
for (const [k, v] of Object.entries(GENERAL)) {
  INDEX.set(normalizeTerm(k), v);
}
for (const [k, v] of Object.entries(RAW)) {
  INDEX.set(normalizeTerm(k), v);
}

// Tập các khoá là chuỗi chữ Hán — để tách cụm chữ Hán trong truy vấn (chữ Hán không có
// khoảng trắng giữa từ nên vòng lặp theo "từ" bên dưới không tự tách được).
const HAN_KEYS = new Set();
for (const k of INDEX.keys()) {
  if (/[㐀-鿿豈-﫿]/.test(k)) HAN_KEYS.add(k);
}
const HAN_KEY_MAXLEN = Math.max(2, ...[...HAN_KEYS].map((k) => k.length));

/**
 * Tách truy vấn người dùng thành các cụm và tìm cụm YHCT dài nhất khớp được.
 * Trả về { hits: [{term, en, syn}], remainder: "phần chữ không khớp" }.
 */
export function matchTcmTerms(query) {
  const raw = String(query || '');
  if (!raw.trim()) return { hits: [], remainder: '', remainderIdx: [] };
  const norm = normalizeTerm(raw);
  const words = norm ? norm.split(' ') : [];
  const hits = [];
  const usedRanges = [];
  // Thử cụm dài trước (tối đa 6 từ) để "bo trung ich khi thang" khớp trước "khi".
  for (let size = Math.min(6, words.length); size >= 1; size--) {
    for (let i = 0; i + size <= words.length; i++) {
      if (usedRanges.some(([s, e]) => i < e && i + size > s)) continue;
      const phrase = words.slice(i, i + size).join(' ');
      const entry = INDEX.get(phrase);
      if (entry) {
        hits.push({ term: phrase, en: entry.en, syn: entry.syn || [] });
        usedRanges.push([i, i + size]);
      }
    }
  }

  // Chữ Hán không có khoảng trắng giữa từ → tách từng cụm chữ Hán liền nhau bằng khớp THAM
  // LAM (thử tiền tố dài nhất trong bảng tra trước, rồi trượt tới). Nhờ vậy "黄芪中风" hay
  // "针灸治疗中风" đều tách được thành các thuật ngữ đã biết.
  const seen = new Set(hits.map((h) => h.term));
  for (const run of raw.match(/[㐀-鿿豈-﫿]+/g) || []) {
    let i = 0;
    while (i < run.length) {
      let matched = null;
      // Chỉ nhận khớp từ 2 ký tự Hán trở lên — 1 ký tự đơn (脑, 肾, 中...) quá mơ hồ, xuất hiện
      // trong vô số từ ghép khác nhau, khớp lẻ chỉ gây nhiễu.
      for (let len = Math.min(HAN_KEY_MAXLEN, run.length - i); len >= 2; len--) {
        const sub = run.slice(i, i + len);
        if (HAN_KEYS.has(sub)) { matched = sub; break; }
      }
      if (matched) {
        if (!seen.has(matched)) {
          const entry = INDEX.get(matched);
          hits.push({ term: matched, en: entry.en, syn: entry.syn || [] });
          seen.add(matched);
        }
        i += matched.length;
      } else {
        i += 1;
      }
    }
  }

  const remainderIdx = words.map((_, idx) => idx).filter((idx) => !usedRanges.some(([s, e]) => idx >= s && idx < e));
  const remainderWords = remainderIdx.map((idx) => words[idx]);
  return { hits, remainder: remainderWords.join(' ').trim(), remainderIdx };
}

/**
 * Dựng truy vấn tiếng Anh để gửi cho API y văn.
 * - Nếu tìm thấy thuật ngữ YHCT/y khoa: ghép cụm tiếng Anh chuẩn của từng thuật ngữ + phần chữ còn lại.
 * - Nếu không: giữ nguyên truy vấn gốc (người dùng có thể đã gõ tiếng Anh).
 * @param {object} opts.orSynonyms - true: mở rộng mỗi thuật ngữ thành ("en" OR "syn1" OR "syn2")
 *   để tăng recall (dùng cho ô tìm kiếm đơn); false: chỉ giữ bản dịch chính (an toàn hơn cho
 *   truy vấn nâng cao theo trường, vì filter .search của OpenAlex không xử lý tốt cú pháp OR).
 * Trả về { text, expandedFrom: [...], note, untranslated: [chữ Việt không dịch được] }.
 */
export function buildSearchQuery(rawQuery, opts = {}) {
  const { orSynonyms = false } = opts;
  const { hits, remainder, remainderIdx } = matchTcmTerms(rawQuery);
  const rawWords = String(rawQuery || '').split(/\s+/).filter(Boolean);

  if (!hits.length) {
    // Không khớp từ vựng nào — nếu truy vấn còn mang dấu tiếng Việt, coi như "chưa dịch được"
    // để tầng trên cảnh báo, thay vì âm thầm gửi tiếng Việt cho API chỉ hiểu tiếng Anh.
    const untranslated = rawWords.filter((w) => w.length > 1 && w !== stripDiacritics(w.normalize('NFD')));
    return { text: String(rawQuery || '').trim(), expandedFrom: [], note: null, untranslated };
  }

  const parts = hits.map((h) => {
    // Chỉ đưa đồng nghĩa CHỮ LATIN vào truy vấn gửi API (bỏ chữ Hán + pinyin có dấu — y văn
    // quốc tế index tiếng Anh/Latin; nhồi chữ Hán vào dễ gây khớp nhiễu, nhất là ở CORE).
    // Chữ Hán/pinyin vẫn được giữ trong `expandedFrom` để hiển thị chip "đã nhận diện".
    const latinSyn = (h.syn || []).filter((s) => /^[\x00-\x7f]+$/.test(s) && !/[āáǎàēéěèīíǐìōóǒòūúǔù]/.test(s));
    if (orSynonyms && latinSyn.length) {
      const alts = [h.en, ...latinSyn.slice(0, 3)].map((t) => `"${t}"`);
      return `(${alts.join(' OR ')})`;
    }
    return `"${h.en}"`;
  });

  // Phần chữ còn sót: giữ lại nếu là tiếng Anh (gõ xen kẽ); phần còn mang dấu tiếng Việt mà
  // không khớp từ vựng → báo "untranslated" thay vì lặng lẽ bỏ qua hoặc gửi nguyên văn.
  const untranslated = [];
  if (remainder) {
    const keep = [];
    remainderIdx.forEach((idx) => {
      const original = rawWords[idx];
      if (!original) return;
      const isEnglishish = original.length > 2 && original === stripDiacritics(original.normalize('NFD'));
      if (isEnglishish) keep.push(original.toLowerCase().replace(/[^a-z0-9-]/g, ''));
      else if (original.length > 1) untranslated.push(original);
    });
    if (keep.length) parts.push(keep.filter(Boolean).join(' '));
  }

  return {
    text: parts.join(' '),
    expandedFrom: hits.map((h) => ({ vi: h.term, en: h.en, syn: h.syn })),
    note: 'Đã dịch thuật ngữ y khoa sang tiếng Anh để tra y văn quốc tế.',
    untranslated,
  };
}

export default { buildSearchQuery, matchTcmTerms, normalizeTerm };
