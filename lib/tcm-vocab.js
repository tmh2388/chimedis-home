// Từ vựng YHCT — ánh xạ thuật ngữ tiếng Việt / pinyin sang từ khoá tiếng Anh dùng cho
// tìm kiếm y văn quốc tế (OpenAlex, Europe PMC). Đây là điểm khác biệt của Chimedis so với
// SciSpace/Elicit: người dùng gõ "Hoàng kỳ", "chứng Tỳ khí hư" bằng tiếng Việt vẫn ra
// đúng bài PubMed (vốn chỉ index tiếng Anh / Latin).
//
// Danh sách này CỐ TÌNH nhỏ và soạn tay (đúng nguyên tắc: thuật ngữ nhỏ dịch tay, không
// tin máy dịch). Mở rộng dần bằng cách thêm dòng vào ba nhóm bên dưới.
// Về sau có thể nạp từ bảng chung `tcm-vocabulary.json` của dict.chimedis.vn.

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

// Chuẩn hoá: hạ chữ thường + bỏ dấu tiếng Việt để tra khớp rộng ("Hoàng Kỳ" == "hoang ky").
function stripDiacritics(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
export function normalizeTerm(s) {
  return stripDiacritics(String(s || '')).toLowerCase().replace(/\s+/g, ' ').trim();
}

// Bảng tra đã chuẩn hoá khoá.
const INDEX = new Map();
for (const [k, v] of Object.entries(RAW)) {
  INDEX.set(normalizeTerm(k), v);
}

/**
 * Tách truy vấn người dùng thành các cụm và tìm cụm YHCT dài nhất khớp được.
 * Trả về { hits: [{term, en, syn}], remainder: "phần chữ không khớp" }.
 */
export function matchTcmTerms(query) {
  const norm = normalizeTerm(query);
  if (!norm) return { hits: [], remainder: '' };
  const words = norm.split(' ');
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
  const remainderWords = words.filter((_, idx) => !usedRanges.some(([s, e]) => idx >= s && idx < e));
  return { hits, remainder: remainderWords.join(' ').trim() };
}

/**
 * Dựng truy vấn tiếng Anh để gửi cho API y văn.
 * - Nếu tìm thấy thuật ngữ YHCT: ghép cụm tiếng Anh chuẩn của từng thuật ngữ + phần chữ còn lại.
 * - Nếu không: giữ nguyên truy vấn gốc (người dùng có thể đã gõ tiếng Anh).
 * Trả về { text, expandedFrom: [...], note }.
 */
export function buildSearchQuery(rawQuery) {
  const { hits, remainder } = matchTcmTerms(rawQuery);
  if (!hits.length) {
    return { text: String(rawQuery || '').trim(), expandedFrom: [], note: null };
  }
  const parts = hits.map((h) => `"${h.en}"`);
  // Chỉ giữ lại phần chữ còn sót nếu là từ tiếng Anh (trong truy vấn gốc không mang dấu) —
  // bỏ chữ Việt đã bị lược dấu như "dieu tri dai thao duong" vì chỉ gây nhiễu khi tra PubMed.
  if (remainder) {
    const rawWords = String(rawQuery).split(/\s+/);
    const englishish = new Set(
      rawWords
        .filter((w) => w.length > 2 && w === stripDiacritics(w.normalize('NFD')))
        .map((w) => w.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    );
    const keep = remainder.split(' ').filter((w) => englishish.has(w));
    if (keep.length) parts.push(keep.join(' '));
  }
  return {
    text: parts.join(' '),
    expandedFrom: hits.map((h) => ({ vi: h.term, en: h.en, syn: h.syn })),
    note: 'Đã dịch thuật ngữ YHCT sang tiếng Anh để tra y văn quốc tế.',
  };
}

export default { buildSearchQuery, matchTcmTerms, normalizeTerm };
