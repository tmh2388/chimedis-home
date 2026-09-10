// P0 Translate Engine v2 — deterministic synthetic shadow workload generator.
// Purpose: generate a reproducible 620-query pack for shadow validation.
// NOT a regression fixture and NOT a blind test. Do not import into test/tcm-queries.json.
// Run: node scripts/generate-shadow-traffic-pack-v1.mjs > /tmp/translation-shadow-traffic-pack-v1.jsonl

const rows = [];
const add = (category, mode, input) => rows.push({ category, mode, input: input.replace(/\s+/g, ' ').trim() });

const product = (a, b, fn, category, mode, limit = Infinity) => {
  let n = 0;
  for (const x of a) for (const y of b) {
    if (n++ >= limit) return;
    add(category, mode, fn(x, y));
  }
};

const methods = ['châm cứu','điện châm','cứu ngải','nhĩ châm','đầu châm','hỏa châm','mai hoa châm','cấy chỉ','giác hơi','xoa bóp bấm huyệt'];
const conditions = ['đột quỵ','đau thắt lưng','đau khớp gối','mất ngủ','đau đầu migraine','tăng huyết áp','liệt nửa người sau đột quỵ','đau vai gáy','đau thần kinh tọa','trầm cảm'];
product(methods, conditions, (m,c)=>`${m} điều trị ${c}`, 'VI-clinical', 'discovery', 100);

const patterns = ['thận âm hư','thận dương hư','tỳ khí hư','can khí uất kết','đàm thấp','đàm nhiệt nhiễu tâm','khí trệ huyết ứ','khí huyết lưỡng hư','âm hư hỏa vượng','tỳ thận dương hư'];
const patternConds = ['mất ngủ','chóng mặt','đau đầu','mệt mỏi mạn tính','đau bụng kinh','ù tai','tiêu chảy mạn tính','béo phì'];
product(patterns, patternConds, (p,c)=>`${p} trong ${c}`, 'VI-pattern', 'discovery', 50);

const herbs = ['hoàng kỳ','đương quy','đan sâm','xuyên khung','bạch truật','phục linh','bán hạ','hoàng liên','sinh địa hoàng','thục địa hoàng'];
const herbConds = ['đột quỵ','đái tháo đường','tăng huyết áp'];
product(herbs, herbConds, (h,c)=>`${h} hỗ trợ điều trị ${c}`, 'VI-herb', 'discovery');

const formulas = ['bổ dương hoàn ngũ thang','huyết phủ trục ứ thang','lục vị địa hoàng hoàn','tứ quân tử thang','bán hạ bạch truật thiên ma thang','thiên ma câu đằng ẩm','tiêu dao tán','quy tỳ thang','ôn đởm thang','đại thừa khí thang'];
const formulaConds = ['đột quỵ','mất ngủ','chóng mặt','tăng huyết áp'];
product(formulas, formulaConds, (f,c)=>`${f} điều trị ${c}`, 'VI-formula', 'discovery');

[
'cham cuu dieu tri dot quy','dien cham phuc hoi sau dot quy','gia cham dau that lung','benh cham dieu tri bang cham cuu','trung phong dieu tri bang dien cham','huyet trung phong dau mat ca','than hu dau that lung','ty khi hu met moi','can khi uat ket mat ngu','dam nhiet nhieu tam','hoang ky dot quy','duong quy thieu mau','dan sam benh mach vanh','xuyen khung dau dau','bo duong hoan ngu thang dot quy','luc vi dia hoang hoan than am hu','tuc tam ly met moi','hop coc dau dau','tam am giao mat ngu','bach hoi dot quy','noi quan buon non','thai xung tang huyet ap','cham cuu AND dot quy','dien cham AND phuc hoi AND dot quy','cham OR cham cuu','trung phong','tri','cham','than','phong tri','tuc tam ly dau goi','hoang ky tieu duong','mai hoa cham dau than kinh','hoa cham dau man tinh','cay chi beo phi','giac hoi dau vai gay','nhi cham mat ngu','dau cham phuc hoi van dong','cham cuu du phong dot quy','cham cuu tai phat dot quy','ty than duong hu tieu chay','khi tre huyet u dau bung kinh','am hu hoa vuong man kinh','dam thap beo phi','than am hu u tai','than duong hu cuu ngai','dau than kinh toa cham cuu','cham cuu tram cam','cham cuu migraine','dien cham liet nua nguoi','cham cuu benh cham','Tran Thi Cham cham cuu','Nguyen Van Trung dot quy','Trung tam y te cham cuu','van dong phuc hoi','tai phat dot quy','met moi man tinh','nao tot khong','co dau vai gay'
].forEach(q=>add('VI-toneless', /(^| )AND( |$)|^tri$|^cham$|trung phong|^than$/i.test(q) ? 'evidence' : 'discovery', q));

[
'针灸治疗脑卒中','电针治疗中风后偏瘫','针刺联合康复训练治疗脑卒中','假针刺对照随机临床试验','针灸治疗失眠','黄芪治疗脑卒中后疲劳','补阳还五汤治疗脑卒中','肝气郁结失眠针灸治疗','脾气虚慢性疲劳','肾阴虚耳鸣针灸','肾阳虚艾灸治疗','痰湿肥胖针灸','痰热扰心失眠','气滞血瘀痛经针灸','气血两虚脑卒中恢复','针灸预防脑卒中复发','百会针刺脑卒中康复','足三里治疗疲劳','合谷治疗头痛','内关治疗恶心','太冲治疗高血压','三阴交治疗失眠','中封穴治疗踝关节疼痛','中风康复针灸','火针治疗慢性疼痛','梅花针治疗神经痛','耳针治疗失眠','头针改善脑卒中运动功能','针灸治疗腰痛','针灸治疗膝骨关节炎','针灸治疗偏头痛','针刺治疗抑郁症','随机对照试验针灸脑卒中','系统评价针灸失眠','Meta分析电针脑卒中','针灸不良事件','针灸安全性老年人','针灸与心率变异性','中医体质与脑卒中风险'
].forEach(q=>add('ZH-simplified','discovery',q));

[
'針灸治療腦卒中','電針治療中風後偏癱','針刺聯合康復訓練治療腦卒中','假針刺對照隨機臨床試驗','黃芪治療腦卒中後疲勞','補陽還五湯治療腦卒中','肝氣鬱結失眠針灸治療','腎陰虛針灸治療','腎陽虛艾灸治療','氣滯血瘀痛經針灸','氣血兩虛腦卒中恢復','針灸預防腦卒中復發','百會針刺腦卒中康復','足三里治療疲勞','合谷治療頭痛','內關治療噁心','太衝治療高血壓','三陰交治療失眠','中封穴治療踝關節疼痛','中風康復針灸','火針治療慢性疼痛','梅花針治療神經痛','耳針治療失眠','頭針改善腦卒中運動功能','針灸治療腰痛','針灸治療膝骨關節炎','隨機對照試驗針灸腦卒中','系統評價針灸失眠','針灸不良事件','針灸安全性老年人','腎陰虛針灸治療失眠'
].forEach(q=>add('ZH-traditional','discovery',q));

[
'điện châm 中风 rehabilitation','针灸 điều trị đột quỵ','hoàng kỳ 黄芪 stroke','giả châm 假针刺 randomized trial','can khí uất kết 肝气郁结 depression','túc tam lý 足三里 fatigue','中封 huyệt trung phong','trúng phong 中风 rehabilitation','补阳还五汤 di chứng đột quỵ','thận âm hư 腎陰虛 tinnitus','electroacupuncture 电针 phục hồi chức năng','stroke 中风 châm cứu','RCT 针灸 điều trị mất ngủ','systematic review 针灸 đau thắt lưng','meta-analysis 电针 stroke rehabilitation','bách hội 百会 GV20 stroke','nội quan 内关 nausea','tam âm giao 三阴交 insomnia','thái xung 太冲 hypertension','hoàng kỳ 黄芪 post-stroke fatigue','đương quy 当归 anemia','đan sâm 丹参 coronary artery disease','xuyên khung 川芎 headache','mai hoa châm 梅花针 neuralgia','hỏa châm 火针 chronic pain','cứu ngải 艾灸 kidney yang deficiency','acupuncture điều trị bệnh chàm 湿疹','eczema bệnh chàm châm cứu acupuncture','sham acupuncture giả châm chronic low back pain','Trần Văn Trung 针灸 stroke','Nguyễn Thị Châm acupuncture research','Hà Nội 中医 针灸 stroke','长沙 acupuncture stroke rehabilitation','thận hư kidney deficiency 腎虛','tỳ khí hư spleen qi deficiency 脾气虚','đàm thấp phlegm dampness 痰湿','khí trệ huyết ứ 气滞血瘀 dysmenorrhea','đàm nhiệt nhiễu tâm 痰热扰心 insomnia','quy tỳ thang 归脾汤 insomnia','ôn đởm thang 温胆汤 insomnia','đại thừa khí thang 大承气汤 constipation','bổ dương hoàn ngũ thang 补阳还五汤 stroke','lục vị địa hoàng hoàn 六味地黄丸 kidney yin deficiency','tiêu dao tán 逍遥散 depression','randomized controlled trial điện châm 中风','cohort châm cứu stroke recurrence','case-control 中医体质 stroke risk','protocol acupuncture stroke prevention','AI 中医体质 stroke prediction','wearable blood pressure 中医 stroke prevention','针灸 adverse events người cao tuổi','acupuncture safety 老年人','脉诊 pulse diagnosis stroke risk','舌诊 tongue diagnosis AI','electroacupuncture 运动功能恢复 post-stroke','功能性便秘 acupuncture 针灸','migraine 偏头痛 châm cứu','tinnitus 耳鸣 thận âm hư','hypertension 高血压 thái xung','diabetes 糖尿病 hoàng kỳ','obesity 肥胖 đàm thấp','insomnia 失眠 can khí uất kết','depression 抑郁症 acupuncture','low back pain 腰痛 điện châm','knee osteoarthritis 膝骨关节炎 châm cứu','post-stroke fatigue 脑卒中后疲劳 hoàng kỳ','hemiplegia 偏瘫 điện châm','dysphagia 吞咽障碍 acupuncture','spasticity 痉挛 post stroke acupuncture','atrial fibrillation 房颤 acupuncture','HRV 心率变异性 châm cứu'
].forEach(q=>add('MIXED','discovery',q));

const boolSubjects = ['stroke','insomnia','low back pain','knee osteoarthritis','migraine','hypertension','depression','tinnitus','post-stroke rehabilitation','constipation'];
const boolInts = ['acupuncture','electroacupuncture','"sham acupuncture"','moxibustion','"scalp acupuncture"'];
[
'("châm cứu" OR "điện châm") AND "đột quỵ"','("châm cứu" OR "điện châm") AND ("đột quỵ" OR "nhồi máu não")','("giả châm" OR "sham acupuncture") AND "đau thắt lưng"','"hoàng kỳ" AND ("đột quỵ" OR "mệt mỏi sau đột quỵ")','针灸 AND 中风 NOT 动物','(针灸 OR 电针) AND (中风 OR 脑卒中)','("acupuncture" OR "electroacupuncture") AND stroke NOT animal','("kidney deficiency" OR "thận hư") AND tinnitus','("bổ dương hoàn ngũ thang" OR 补阳还五汤) AND stroke','("quy tỳ thang" OR 归脾汤) AND insomnia'
].forEach(q=>add('BOOLEAN','evidence',q));
product(boolInts, boolSubjects, (i,s)=>`(${i} OR 针灸) AND ("${s}" OR ${s.replace(/ /g,'_')}) NOT animal`, 'BOOLEAN', 'evidence', 50);

const designs = ['RCT','systematic review','meta-analysis','cohort study','case-control study','protocol'];
const evidenceTopics = ['acupuncture stroke rehabilitation','electroacupuncture insomnia','moxibustion knee osteoarthritis','acupuncture migraine','acupuncture hypertension','TCM constitution stroke risk','herbal medicine post-stroke fatigue','sham acupuncture low back pain','acupuncture adverse events','acupuncture depression'];
product(designs, evidenceTopics, (d,t)=>`${d} ${t}`, 'EVIDENCE', 'evidence', 60);

[
'Nguyễn Văn Trung nghiên cứu y học','Trần Thị Châm báo cáo hội nghị','Hoàng Kỳ Anh luận văn thạc sĩ','Đặng Thị Mai Hoa nghiên cứu sức khỏe','Bệnh viện Trung ương Quân đội 108','Trung tâm Y tế Hoàng Mai','Đại học Y Hà Nội nghiên cứu đột quỵ','Học viện Y Dược học cổ truyền Việt Nam','Hunan University of Chinese Medicine','Changsha Central Hospital stroke','Hà Nội 2026 nghiên cứu y học','Trung Quốc y học cổ truyền','Facebook login Chimedis','Apple Sign in Chimedis','ORCID researcher profile','OpenAI medical research','Python meta analysis script','MySQL search log','Firebase email verification','Hostinger deployment','John Smith acupuncture','Michael Jordan stroke research','Anna Tran clinical trial','Paris acupuncture conference','New York stroke registry','London medical school','Tokyo acupuncture university','Beijing clinical trial center','AI prediction model stroke','machine learning MRI','wearable blood pressure device','smartwatch heart rate variability','2026 acupuncture conference','doi 10.1000 test','PMID 12345678','NCT01234567','abc xyz lorem ipsum','123456789','hello world acupuncture','randomized word test'
].forEach(q=>add('NEGATIVE','discovery',q));

[
'châm cưu điều trị đột quỵ','điên châm phục hồi chức năng','hoàng kì điều trị mệt mỏi','túc tam lí mất ngủ','đột quị châm cứu','tỳ khi hư mệt mỏi','thận âm hư hoả vượng','cham cứu đau lưng','điện cham đột quỵ','trung phong điều trị trung phong','châm cứu  điều trị   đau lưng','针灸 治疗 中风','針灸治療中風','huang qi stroke','zhong feng acupuncture','zhen jiu stroke rehabilitation','dian zhen nao zu zhong','huáng qí stroke','dāng guī anemia','zú sān lǐ fatigue','he gu headache','tai chong hypertension','chamcuu dotquy','diencham phuchoi dotquy','giacham lowbackpain','hoangky stroke','châm-cứu đột-quỵ','điện_châm phục_hồi','stroke, acupuncture; rehabilitation','针灸，中风；康复','(châm cứu OR điện châm AND đột quỵ','"châm cứu AND đột quỵ','AND châm cứu OR','châm cứu NOT','châm cứu + đột quỵ','acupuncture & stroke','điện châm / châm cứu đột quỵ','châm cứu？đột quỵ','针灸？中风','châm cứu🙂đột quỵ'
].forEach(q=>add('NOISY','discovery',q));

// Additional research-style combinations are generated only to reach exactly 620 unique probes.
const populations = ['người cao tuổi','phụ nữ mãn kinh','bệnh nhân sau đột quỵ','người tăng huyết áp','người đái tháo đường','bệnh nhân mất ngủ','người đau lưng mạn','bệnh nhân đau khớp gối'];
const outcomes = ['hiệu quả','an toàn','chất lượng cuộc sống','chức năng vận động','mức độ đau','giấc ngủ','tái phát','biến thiên nhịp tim'];
for (const m of methods) for (const p of populations) for (const o of outcomes) {
  if (rows.length >= 760) break;
  add('VI-long','discovery',`${o} của ${m} ở ${p}`);
}

// De-duplicate by exact input while preserving the first category/mode assignment.
const seen = new Set();
let unique = rows.filter(r => r.input && !seen.has(r.input) && seen.add(r.input));

// Deterministic Fisher-Yates shuffle (xorshift32), then take exactly 620.
let seed = 20260910 >>> 0;
const rand = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
for (let i = unique.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [unique[i], unique[j]] = [unique[j], unique[i]];
}
if (unique.length < 620) throw new Error(`Generator only produced ${unique.length} unique queries; need 620.`);
unique = unique.slice(0, 620).map((r, i) => ({
  synthetic_case_id: `P0-${String(i + 1).padStart(4,'0')}`,
  batch: (i % 6) + 1,
  ...r,
}));

// Guardrails: fail generation if the final pack loses essential coverage.
const required = ['VI-clinical','VI-pattern','VI-herb','VI-formula','VI-toneless','ZH-simplified','ZH-traditional','MIXED','BOOLEAN','EVIDENCE','NEGATIVE','NOISY'];
for (const c of required) if (!unique.some(r => r.category === c)) throw new Error(`Missing category: ${c}`);
if (!unique.some(r => r.mode === 'evidence')) throw new Error('Missing Evidence probes');
if (!unique.some(r => r.mode === 'discovery')) throw new Error('Missing Discovery probes');

for (const r of unique) process.stdout.write(JSON.stringify(r) + '\n');
