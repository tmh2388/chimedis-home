# Translate Engine v2 — BLIND RAW RESULTS v1

> Vòng 1 BLIND RAW RUN. KHÔNG sửa data/code/fixture trước khi chạy. Commit file này TRƯỚC mọi sửa chữa.
>
> - engine_version: `te-v2-d1`
> - engineMode() env: `legacy` (không ảnh hưởng — test gọi `translateQuery` trực tiếp vào engine v2)
> - Ngày chạy: 2026-09-09T10:40:04.370Z
> - Số case: 170 (mỗi case ở mode chỉ định; nhóm Q chạy CẢ discovery + evidence)

## Bảng tóm tắt

| id | mode | effective_query | concepts dịch | confidence | ambiguous | unresolved | needs_resolution | behavior |
|---|---|---|---|---|---|---|---|---|
| A01 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("low back pain" OR "lumbago" OR "lower back pain")` | châm cứu→acupuncture ; điều trị→treatment ; đau thắt lưng→low back pain | high,high,high | — | — | false | clean |
| A02 | discovery | `("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("rehabilitation" OR "recovery" OR "functional recovery") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | điện châm→electroacupuncture ; phục hồi chức năng→rehabilitation ; đột quỵ→stroke | high,high,high | — | — | false | clean |
| A03 | discovery | `("moxibustion" OR "moxa") "arthralgia" gối` | cứu ngải→moxibustion ; điều trị→treatment ; đau khớp→arthralgia | high,high,medium | — | gối | false | unresolved kept: gối |
| A04 | discovery | `("auricular acupuncture" OR "ear acupuncture" OR "auriculotherapy") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("insomnia" OR "sleeplessness" OR "sleep disorder")` | nhĩ châm→auricular acupuncture ; điều trị→treatment ; mất ngủ→insomnia | high,high,high | — | — | false | clean |
| A05 | discovery | `("acupoint catgut embedding" OR "catgut embedding" OR "thread embedding acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("obesity" OR "overweight")` | cấy chỉ→acupoint catgut embedding ; điều trị→treatment ; béo phì→obesity | high,high,high | — | — | false | clean |
| A06 | discovery | `("cupping therapy" OR "cupping") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("neck pain" OR "cervicalgia")` | giác hơi→cupping therapy ; điều trị→treatment ; đau vai gáy→neck pain | high,high,high | — | — | false | clean |
| A07 | discovery | `"Prunus mume Sieb. et" ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") "nephralgia" kinh` | mai hoa→Prunus mume Sieb. et ; châm→acupuncture ; điều trị→treatment ; đau thần→nephralgia | medium,high,high,medium | — | kinh | false | unresolved kept: kinh | SUSPECT-MAP: đau thần→nephralgia |
| A08 | discovery | `hỏa ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") đau "chronic"` | châm→acupuncture ; điều trị→treatment ; mạn tính→chronic | high,high,high | — | hỏa | đau | false | unresolved kept: hỏa,đau |
| A09 | discovery | `("scalp acupuncture" OR "head acupuncture") ("rehabilitation" OR "recovery" OR "functional recovery") vận động ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | đầu châm→scalp acupuncture ; phục hồi→rehabilitation ; đột quỵ→stroke | high,high,high | — | vận động | false | unresolved kept: vận động |
| A10 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("prevention" OR "prophylaxis" OR "preventive" OR "prophylactic") phát ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | châm cứu→acupuncture ; dự phòng→prevention ; đột quỵ→stroke | high,high,high | — | phát | false | unresolved kept: phát | SILENT-DROP: «tái» |
| B01 | discovery | `("liver qi stagnation" OR "liver qi depression" OR "constrained liver qi") ("insomnia" OR "sleeplessness" OR "sleep disorder")` | can khí uất kết→liver qi stagnation ; mất ngủ→insomnia | high,high | — | — | false | SILENT-DROP: «và» |
| B02 | discovery | `("spleen qi deficiency" OR "spleen deficiency" OR "spleen qi vacuity") mệt "chronic"` | tỳ khí hư→spleen qi deficiency ; mạn tính→chronic | high,high | — | mệt | false | unresolved kept: mệt | SILENT-DROP: «bệnh» | SILENT-DROP: «nhân» | SILENT-DROP: «mỏi» |
| B03 | discovery | `("kidney yin deficiency" OR "kidney yin vacuity") "tinnitus"` | thận âm hư→kidney yin deficiency ; ù tai→tinnitus | high,high | — | — | false | SILENT-DROP: «và» |
| B04 | discovery | `("kidney yang deficiency" OR "kidney yang vacuity") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("moxibustion" OR "moxa")` | thận dương hư→kidney yang deficiency ; điều trị→treatment ; cứu ngải→moxibustion | high,high,high | — | — | false | SILENT-DROP: «bằng» |
| B05 | discovery | `("yin deficiency with effulgent fire" OR "yin deficiency fire" OR "deficiency heat") ("postmenopausal" OR "menopausal" OR "postmenopause")` | âm hư hỏa vượng→yin deficiency with effulgent fire ; phụ nữ mãn kinh→postmenopausal | high,high | — | — | false | clean |
| B06 | discovery | `("qi stagnation" OR "qi stagnation" OR "stagnant qi") ("blood stasis" OR "blood stagnation" OR "static blood") ("dysmenorrhea" OR "menstrual pain" OR "period pain")` | khí trệ→qi stagnation ; huyết ứ→blood stasis ; đau bụng kinh→dysmenorrhea | high,high,high | — | — | false | clean |
| B07 | discovery | `("phlegm-dampness" OR "phlegm damp" OR "damp phlegm") trở trệ ("obesity" OR "overweight")` | đàm thấp→phlegm-dampness ; béo phì→obesity | high,high | — | trở trệ | false | unresolved kept: trở trệ | SILENT-DROP: «và» |
| B08 | discovery | `đàm nhiệt nhiễu tâm ("insomnia" OR "sleeplessness" OR "sleep disorder")` | mất ngủ→insomnia | high | — | đàm nhiệt nhiễu tâm | false | unresolved kept: đàm nhiệt nhiễu tâm | SILENT-DROP: «và» |
| B09 | discovery | `tỳ ("kidney yang deficiency" OR "kidney yang vacuity") ("diarrhea" OR "diarrhoea") "chronic"` | thận dương hư→kidney yang deficiency ; tiêu chảy→diarrhea ; mạn tính→chronic | high,high,high | — | tỳ | false | unresolved kept: tỳ |
| B10 | discovery | `("qi and blood deficiency" OR "dual deficiency of qi and blood") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | khí huyết lưỡng hư→qi and blood deficiency ; đột quỵ→stroke | high,high | — | — | false | clean |
| C01 | discovery | `("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") ("rehabilitation" OR "recovery" OR "functional recovery") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | hoàng kỳ→Astragalus membranaceus ; phục hồi→rehabilitation ; đột quỵ→stroke | high,high,high | — | — | false | clean |
| C02 | discovery | `("Angelica sinensis" OR "Danggui" OR "Dong quai" OR "Radix Angelicae Sinensis") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("anemia" OR "anaemia")` | đương quy→Angelica sinensis ; điều trị→treatment ; thiếu máu→anemia | high,high,high | — | — | false | clean |
| C03 | discovery | `("Salvia miltiorrhiza" OR "Danshen" OR "Radix Salviae Miltiorrhizae" OR "red sage") ("coronary artery disease" OR "coronary heart disease" OR "coronary disease")` | đan sâm→Salvia miltiorrhiza ; bệnh mạch vành→coronary artery disease | high,high | — | — | false | clean |
| C04 | discovery | `("Ligusticum chuanxiong" OR "Chuanxiong" OR "Rhizoma Chuanxiong") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("headache" OR "cephalgia")` | xuyên khung→Ligusticum chuanxiong ; điều trị→treatment ; đau đầu→headache | high,high,high | — | — | false | clean |
| C05 | discovery | `("Atractylodes macrocephala" OR "Baizhu" OR "Rhizoma Atractylodis Macrocephalae") ("spleen qi deficiency" OR "spleen deficiency" OR "spleen qi vacuity")` | bạch truật→Atractylodes macrocephala ; tỳ khí hư→spleen qi deficiency | high,high | — | — | false | SILENT-DROP: «và» |
| C06 | discovery | `("Poria cocos" OR "Fuling" OR "Wolfiporia extensa" OR "Poria") ("treatment" OR "therapy" OR "therapeutic" OR "management") phù` | phục linh→Poria cocos ; điều trị→treatment | high,high | — | phù | false | unresolved kept: phù |
| C07 | discovery | `"Pinellia ternata Breit." ("treatment" OR "therapy" OR "therapeutic" OR "management") ("phlegm-dampness" OR "phlegm damp" OR "damp phlegm")` | bán hạ→Pinellia ternata Breit. ; điều trị→treatment ; đàm thấp→phlegm-dampness | medium,high,high | — | — | false | clean |
| C08 | discovery | `("Coptis chinensis" OR "Huanglian" OR "Rhizoma Coptidis" OR "Chinese goldthread") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("diarrhea" OR "diarrhoea")` | hoàng liên→Coptis chinensis ; điều trị→treatment ; tiêu chảy→diarrhea | high,high,high | — | — | false | clean |
| C09 | discovery | `"Rehmanniae Radix" âm ("deficiency" OR "vacuity" OR "xu")` | sinh địa hoàng→Rehmanniae Radix ; hư→deficiency | medium,high | — | âm | false | unresolved kept: âm | SILENT-DROP: «và» |
| C10 | discovery | `"Rehmannia glutinosa Libosch. prepared root" ("kidney yin deficiency" OR "kidney yin vacuity")` | thục địa hoàng→Rehmannia glutinosa Libosch. prepared root ; thận âm hư→kidney yin deficiency | medium,high | — | — | false | clean |
| D01 | discovery | `("Buyang Huanwu Tang" OR "Bu Yang Huan Wu Tang" OR "Supplement Yang to Restore Five Tenths Decoction") di chứng ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | bổ dương hoàn ngũ thang→Buyang Huanwu Tang ; điều trị→treatment ; đột quỵ→stroke | high,high,high | — | di chứng | false | unresolved kept: di chứng |
| D02 | discovery | `("Xuefu Zhuyu Tang" OR "Xue Fu Zhu Yu Tang" OR "Drive Out Stasis in the Mansion of Blood Decoction") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("chest pain" OR "angina pectoris" OR "angina")` | huyết phủ trục ứ thang→Xuefu Zhuyu Tang ; điều trị→treatment ; đau ngực→chest pain | high,high,high | — | — | false | clean |
| D03 | discovery | `("Liuwei Dihuang Wan" OR "Liu Wei Di Huang Wan" OR "Six Ingredient Rehmannia Pill") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("kidney yin deficiency" OR "kidney yin vacuity")` | lục vị địa hoàng hoàn→Liuwei Dihuang Wan ; điều trị→treatment ; thận âm hư→kidney yin deficiency | high,high,high | — | — | false | clean |
| D04 | discovery | `("Sijunzi Tang" OR "Si Jun Zi Tang" OR "Four Gentlemen Decoction") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("spleen qi deficiency" OR "spleen deficiency" OR "spleen qi vacuity")` | tứ quân tử thang→Sijunzi Tang ; điều trị→treatment ; tỳ khí hư→spleen qi deficiency | high,high,high | — | — | false | clean |
| D05 | discovery | `"Pinellia ternata Breit." ("Atractylodes macrocephala" OR "Baizhu" OR "Rhizoma Atractylodis Macrocephalae") ("Gastrodia elata" OR "Tianma" OR "Rhizoma Gastrodiae") thang ("vertigo" OR "dizziness")` | bán hạ→Pinellia ternata Breit. ; bạch truật→Atractylodes macrocephala ; thiên ma→Gastrodia elata ; điều trị→treatment ; chóng mặt→vertigo | medium,high,high,high,high | — | thang | false | unresolved kept: thang |
| D06 | discovery | `("Tianma Gouteng Yin" OR "Tian Ma Gou Teng Yin" OR "Gastrodia and Uncaria Decoction") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("hypertension" OR "high blood pressure" OR "arterial hypertension")` | thiên ma câu đằng ẩm→Tianma Gouteng Yin ; điều trị→treatment ; tăng huyết áp→hypertension | high,high,high | — | — | false | clean |
| D07 | discovery | `("Xiaoyao San" OR "Xiao Yao San" OR "Free and Easy Wanderer Powder" OR "Rambling Powder") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("liver qi stagnation" OR "liver qi depression" OR "constrained liver qi")` | tiêu dao tán→Xiaoyao San ; điều trị→treatment ; can khí uất kết→liver qi stagnation | high,high,high | — | — | false | clean |
| D08 | discovery | `quy tỳ thang ("treatment" OR "therapy" OR "therapeutic" OR "management") ("insomnia" OR "sleeplessness" OR "sleep disorder")` | điều trị→treatment ; mất ngủ→insomnia | high,high | — | quy tỳ thang | false | unresolved kept: quy tỳ thang |
| D09 | discovery | `ôn đởm thang ("treatment" OR "therapy" OR "therapeutic" OR "management") đàm nhiệt nhiễu tâm` | điều trị→treatment | high | — | ôn đởm thang | đàm nhiệt nhiễu tâm | false | unresolved kept: ôn đởm thang,đàm nhiệt nhiễu tâm |
| D10 | discovery | `đại thừa khí thang ("treatment" OR "therapy" OR "therapeutic" OR "management") "constipation"` | điều trị→treatment ; táo bón→constipation | high,high | — | đại thừa khí thang | false | unresolved kept: đại thừa khí thang |
| E01 | discovery | `("Hegu (LI4)" OR "LI4" OR "Large Intestine 4" OR "He Gu") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("headache" OR "cephalgia")` | hợp cốc→Hegu (LI4) ; điều trị→treatment ; đau đầu→headache | high,high,high | — | — | false | clean |
| E02 | discovery | `("Zusanli (ST36)" OR "ST36" OR "Stomach 36" OR "Zu San Li") ("treatment" OR "therapy" OR "therapeutic" OR "management") mệt` | túc tam lý→Zusanli (ST36) ; điều trị→treatment | high,high | — | mệt | false | unresolved kept: mệt | SILENT-DROP: «mỏi» |
| E03 | discovery | `("Sanyinjiao (SP6)" OR "SP6" OR "Spleen 6" OR "San Yin Jiao") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("insomnia" OR "sleeplessness" OR "sleep disorder")` | tam âm giao→Sanyinjiao (SP6) ; điều trị→treatment ; mất ngủ→insomnia | high,high,high | — | — | false | clean |
| E04 | discovery | `("Taichong (LR3)" OR "LR3" OR "Liver 3" OR "Tai Chong") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("hypertension" OR "high blood pressure" OR "arterial hypertension")` | thái xung→Taichong (LR3) ; điều trị→treatment ; tăng huyết áp→hypertension | high,high,high | — | — | false | clean |
| E05 | discovery | `("Neiguan (PC6)" OR "PC6" OR "Pericardium 6" OR "Nei Guan") ("treatment" OR "therapy" OR "therapeutic" OR "management") buồn nôn` | nội quan→Neiguan (PC6) ; điều trị→treatment | high,high | — | buồn nôn | false | unresolved kept: buồn nôn |
| E06 | discovery | `("Baihui (GV20)" OR "GV20" OR "DU20" OR "Governing Vessel 20" OR "Bai Hui") ("rehabilitation" OR "recovery" OR "functional recovery") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | bách hội→Baihui (GV20) ; phục hồi chức năng→rehabilitation ; đột quỵ→stroke | high,high,high | — | — | false | clean |
| E07 | discovery | `("Fengchi (GB20)" OR "GB20" OR "Gallbladder 20" OR "Feng Chi") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("headache" OR "cephalgia")` | phong trì→Fengchi (GB20) ; điều trị→treatment ; đau đầu→headache | high,high,high | — | — | false | clean |
| E08 | discovery | `("Taixi (KI3)" OR "KI3" OR "Kidney 3" OR "Tai Xi") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("kidney yin deficiency" OR "kidney yin vacuity")` | thái khê→Taixi (KI3) ; điều trị→treatment ; thận âm hư→kidney yin deficiency | high,high,high | — | — | false | clean |
| E09 | discovery | `("Guanyuan (CV4)" OR "CV4" OR "RN4" OR "Conception Vessel 4" OR "Guan Yuan") tỳ ("kidney yang deficiency" OR "kidney yang vacuity")` | quan nguyên→Guanyuan (CV4) ; điều trị→treatment ; thận dương hư→kidney yang deficiency | high,high,high | — | tỳ | false | unresolved kept: tỳ |
| E10 | discovery | `("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng") đau "Ankle Joint"` | huyệt trung phong→Zhongfeng (LR4) ; điều trị→treatment ; mắt cá chân→Ankle Joint | high,high,medium | — | đau | false | unresolved kept: đau |
| F01 | evidence | `("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("low back pain" OR "lumbago" OR "lower back pain")` | giả châm→sham acupuncture ; điều trị→treatment ; đau lưng→low back pain | high,high,high | — | — | false | clean |
| F02 | evidence | `("eczema" OR "atopic dermatitis" OR "dermatitis") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")` | bệnh chàm→eczema ; điều trị→treatment ; châm cứu→acupuncture | high,high,high | — | — | false | SILENT-DROP: «bằng» |
| F03 | evidence | `("eczema" OR "atopic dermatitis" OR "dermatitis") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")` | chàm→eczema ; châm cứu→acupuncture | high,high | — | — | false | SILENT-DROP: «và» |
| F04 | evidence | `("treatment" OR "therapy" OR "therapeutic" OR "management") ("hemorrhoids" OR "haemorrhoids" OR "piles")` | trị liệu→treatment ; bệnh trĩ→hemorrhoids | high,high | — | — | false | clean |
| F05 | evidence | `("treatment" OR "therapy" OR "therapeutic" OR "management") ("hemorrhoids" OR "haemorrhoids" OR "piles") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")` | điều trị→treatment ; trĩ→hemorrhoids ; châm cứu→acupuncture | high,high,high | — | — | false | SILENT-DROP: «bằng» |
| F06 | evidence | `("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture")` | trúng phong→stroke ; điều trị→treatment ; điện châm→electroacupuncture | high,high,high | — | — | false | SILENT-DROP: «bằng» |
| F07 | evidence | `("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")` | huyệt trung phong→Zhongfeng (LR4) ; châm cứu→acupuncture | high,high | — | — | false | clean |
| F08 | evidence | `trung phong ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | trúng phong→stroke | high | trung phong{lr4-zhongfeng|stroke}:toneless-collision | — | true | ambiguous→needs_resolution | SILENT-DROP: «và» |
| F09 | evidence | `thận ("deficiency" OR "vacuity" OR "xu") ("low back pain" OR "lumbago" OR "lower back pain")` | hư→deficiency ; đau thắt lưng→low back pain | high,high | — | thận | true | unresolved kept: thận | SILENT-DROP: «và» |
| F10 | evidence | `thân thể suy nhược` | — | — | — | thân thể suy nhược | true | unresolved kept: thân thể suy nhược |
| G01 | evidence | `cham` | — | — | cham{eczema|acupuncture}:collision | — | true | ambiguous→needs_resolution |
| G02 | evidence | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")` | cham cuu→acupuncture | medium | — | — | false | ok |
| G03 | evidence | `("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture")` | gia cham→sham acupuncture | medium | — | — | false | ok |
| G04 | evidence | `tri` | — | — | tri{hemorrhoids|treatment}:collision | — | true | ambiguous→needs_resolution |
| G05 | evidence | `trung phong` | — | — | trung phong{lr4-zhongfeng|stroke}:toneless-collision | — | true | ambiguous→needs_resolution |
| G06 | evidence | `than` | — | — | — | than | true | unresolved kept: than |
| G07 | evidence | `than ("deficiency" OR "vacuity" OR "xu")` | hu→deficiency | medium | — | than | true | unresolved kept: than |
| G10 | evidence | `("Zusanli (ST36)" OR "ST36" OR "Stomach 36" OR "Zu San Li") "knee"` | tuc tam ly→Zusanli (ST36) ; dau goi→knee | medium,medium | — | — | false | ok |
| G08 | discovery | `("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | dien cham→electroacupuncture ; dot quy→stroke | medium,medium | — | — | false | ok |
| G09 | discovery | `("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") ("diabetes mellitus" OR "diabetes" OR "type 2 diabetes")` | hoang ky→Astragalus membranaceus ; tieu duong→diabetes mellitus | medium,medium | — | — | false | ok |
| H01 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") cưu ("low back pain" OR "lumbago" OR "lower back pain")` | châm→acupuncture ; điều trị→treatment ; đau lưng→low back pain | high,high,high | — | cưu | false | unresolved kept: cưu |
| H02 | discovery | `("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | điện châm→electroacupuncture ; trị→treatment ; đột quỵ→stroke | high,high,high | — | — | false | SILENT-DROP: «điêu» |
| H03 | discovery | `("Astragalus propinquus" OR "Astragalus membranaceus") ("treatment" OR "therapy" OR "therapeutic" OR "management") mệt` | hoàng kì→Astragalus propinquus ; điều trị→treatment | high,high | — | mệt | false | unresolved kept: mệt | SILENT-DROP: «mỏi» |
| H04 | discovery | `túc tam lí "arthralgia" gối` | đau khớp→arthralgia | medium | — | túc tam lí | gối | false | unresolved kept: túc tam lí,gối |
| H05 | discovery | `đột quị ("rehabilitation" OR "recovery" OR "functional recovery")` | phục hồi chức năng→rehabilitation | high | — | đột quị | false | unresolved kept: đột quị |
| H06 | discovery | `tỳ ("deficiency" OR "vacuity" OR "xu")` | hư→deficiency | high | — | tỳ | false | unresolved kept: tỳ |
| H07 | discovery | `("kidney yin deficiency" OR "kidney yin vacuity") hoả vượng` | thận âm hư→kidney yin deficiency | high | — | hoả vượng | false | unresolved kept: hoả vượng |
| H08 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") tri ("low back pain" OR "lumbago" OR "lower back pain")` | châm cứu→acupuncture ; đau lưng→low back pain | high,high | tri{hemorrhoids|treatment}:collision | — | false | ambiguous→kept-verbatim(discovery) |
| H09 | discovery | `("Fengchi (GB20)" OR "GB20" OR "Gallbladder 20" OR "Feng Chi") ("headache" OR "cephalgia")` | phong tri→Fengchi (GB20) ; đau đầu→headache | medium,high | — | — | false | clean |
| H10 | discovery | `("Sanyinjiao (SP6)" OR "SP6" OR "Spleen 6" OR "San Yin Jiao") ("insomnia" OR "sleeplessness" OR "sleep disorder")` | tam am giao→Sanyinjiao (SP6) ; mat ngu→insomnia | medium,medium | — | — | false | ok |
| I01 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") ("hemiplegia" OR "hemiparesis")` | 针灸→acupuncture ; 治疗→treatment ; 中风→stroke ; 偏瘫→hemiplegia | high,high,high,high | — | — | false | clean |
| I02 | discovery | `("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("prevention" OR "prophylaxis" OR "preventive" OR "prophylactic") "part of the brain" ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") 复发` | 电针→electroacupuncture ; 预防→prevention ; 脑→part of the brain ; 卒中→stroke | high,high,medium,high | — | 复发 | false | unresolved kept: 复发 | SUSPECT-MAP: 脑→part of the brain |
| I03 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("rehabilitation" OR "recovery" OR "functional recovery") 训练 "part of the brain" ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | 针刺→acupuncture ; 联合→combined therapy ; 康复→rehabilitation ; 治疗→treatment ; 脑→part of the brain ; 卒中→stroke | high,high,high,high,medium,high | — | 训练 | false | unresolved kept: 训练 | SUSPECT-MAP: 脑→part of the brain |
| I04 | discovery | `("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") 刺照随机试验` | 假针→sham acupuncture | high | — | 刺照随机试验 | false | unresolved kept: 刺照随机试验 |
| I05 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("insomnia" OR "sleeplessness" OR "sleep disorder")` | 针灸→acupuncture ; 治疗→treatment ; 失眠→insomnia | high,high,high | — | — | false | clean |
| I06 | discovery | `("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") "part of the brain" ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") 疲劳` | 黄芪→Astragalus membranaceus ; 治疗→treatment ; 脑→part of the brain ; 卒中→stroke | high,high,medium,high | — | 疲劳 | false | unresolved kept: 疲劳 | SUSPECT-MAP: 脑→part of the brain |
| I07 | discovery | `("Buyang Huanwu Tang" OR "Bu Yang Huan Wu Tang" OR "Supplement Yang to Restore Five Tenths Decoction") "part of the brain" ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | 补阳还五汤→Buyang Huanwu Tang ; 治疗→treatment ; 脑→part of the brain ; 卒中→stroke | high,high,medium,high | — | — | false | SUSPECT-MAP: 脑→part of the brain |
| I08 | discovery | `("liver qi stagnation" OR "liver qi depression" OR "constrained liver qi") ("insomnia" OR "sleeplessness" OR "sleep disorder") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")` | 肝气郁结→liver qi stagnation ; 失眠→insomnia ; 针灸→acupuncture ; 治疗→treatment | high,high,high,high | — | — | false | clean |
| I09 | discovery | `腎陰虛針灸` | — | — | — | 腎陰虛針灸 | false | unresolved kept: 腎陰虛針灸 |
| I10 | discovery | `("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") "Angelica sinensis Diels" 氣血兩虛` | 黃芪→Astragalus membranaceus ; 當歸→Angelica sinensis Diels | high,medium | — | 氣血兩虛 | false | unresolved kept: 氣血兩虛 |
| J01 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") zhì liáo "Zhongfeng"` | zhēn jiǔ→acupuncture ; zhōng fēng→Zhongfeng | high,medium | — | zhì liáo | false | unresolved kept: zhì liáo |
| J02 | discovery | `("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") nǎo zú zhòng` | diàn zhēn→electroacupuncture | high | — | nǎo zú zhòng | false | unresolved kept: nǎo zú zhòng |
| J03 | discovery | `("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus")` | huáng qí→Astragalus membranaceus | high | — | — | false | clean |
| J04 | discovery | `("Angelica sinensis" OR "Danggui" OR "Dong quai" OR "Radix Angelicae Sinensis")` | dāng guī→Angelica sinensis | high | — | — | false | clean |
| J05 | discovery | `bǔ yáng huán wǔ tāng` | — | — | — | bǔ yáng huán wǔ tāng | false | unresolved kept: bǔ yáng huán wǔ tāng |
| J06 | discovery | `("Zusanli (ST36)" OR "ST36" OR "Stomach 36" OR "Zu San Li")` | zú sān lǐ→Zusanli (ST36) | high | — | — | false | clean |
| J07 | discovery | `"Hegu"` | hé gǔ→Hegu | medium | — | — | false | ok |
| J08 | discovery | `"Taichong"` | tai chong→Taichong | medium | — | — | false | ok |
| J09 | discovery | `"Zhongfeng"` | zhong feng→Zhongfeng | medium | — | — | false | ok |
| J10 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") stroke rehabilitation` | zhen jiu→acupuncture | medium | — | stroke rehabilitation | false | unresolved kept: stroke rehabilitation |
| K01 | discovery | `("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") stroke rehabilitation rct` | điện châm→electroacupuncture | high | — | stroke rehabilitation rct | false | unresolved kept: stroke rehabilitation rct |
| K02 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") low back pain systematic review` | châm cứu→acupuncture | high | — | low back pain systematic review | false | unresolved kept: low back pain systematic review |
| K03 | discovery | `("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") post-stroke fatigue` | hoàng kỳ→Astragalus membranaceus | high | — | post-stroke fatigue | false | unresolved kept: post-stroke fatigue |
| K04 | discovery | `("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") sham controlled trial` | giả châm→sham acupuncture | high | — | sham controlled trial | false | unresolved kept: sham controlled trial |
| K05 | discovery | `("kidney yin deficiency" OR "kidney yin vacuity") tinnitus acupuncture` | thận âm hư→kidney yin deficiency | high | — | tinnitus acupuncture | false | unresolved kept: tinnitus acupuncture |
| K06 | discovery | `("liver qi stagnation" OR "liver qi depression" OR "constrained liver qi") depression` | can khí uất kết→liver qi stagnation | high | — | depression | false | unresolved kept: depression |
| K07 | discovery | `("Buyang Huanwu Tang" OR "Bu Yang Huan Wu Tang" OR "Supplement Yang to Restore Five Tenths Decoction") stroke meta-analysis` | bổ dương hoàn ngũ thang→Buyang Huanwu Tang | high | — | stroke meta-analysis | false | unresolved kept: stroke meta-analysis |
| K08 | discovery | `("Baihui (GV20)" OR "GV20" OR "DU20" OR "Governing Vessel 20" OR "Bai Hui") gv20 stroke rehabilitation` | bách hội→Baihui (GV20) | high | — | gv20 stroke rehabilitation | false | unresolved kept: gv20 stroke rehabilitation |
| K09 | discovery | `("Zusanli (ST36)" OR "ST36" OR "Stomach 36" OR "Zu San Li") st36 fatigue` | túc tam lý→Zusanli (ST36) | high | — | st36 fatigue | false | unresolved kept: st36 fatigue |
| K10 | discovery | `acupuncture "nephralgia" kinh zona` | điều trị→treatment ; đau thần→nephralgia | high,medium | — | acupuncture | kinh zona | false | unresolved kept: acupuncture,kinh zona | SUSPECT-MAP: đau thần→nephralgia |
| L01 | discovery | `("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") ("rehabilitation" OR "recovery" OR "functional recovery")` | điện châm→electroacupuncture ; 中风→stroke ; 康复→rehabilitation | high,high,high | — | — | false | clean |
| L02 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | 针灸→acupuncture ; điều trị→treatment ; đột quỵ→stroke | high,high,high | — | — | false | clean |
| L03 | discovery | `("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") ("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") stroke` | hoàng kỳ→Astragalus membranaceus ; 黄芪→Astragalus membranaceus | high,high | — | stroke | false | unresolved kept: stroke |
| L04 | discovery | `("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") 刺 randomized trial` | giả châm→sham acupuncture ; 假针→sham acupuncture | high,high | — | 刺 randomized trial | false | unresolved kept: 刺 randomized trial |
| L05 | discovery | `("liver qi stagnation" OR "liver qi depression" OR "constrained liver qi") ("liver qi stagnation" OR "liver qi depression" OR "constrained liver qi")` | can khí uất kết→liver qi stagnation ; 肝气郁结→liver qi stagnation | high,high | — | — | false | clean |
| L06 | discovery | `("Zusanli (ST36)" OR "ST36" OR "Stomach 36" OR "Zu San Li") ("Zusanli (ST36)" OR "ST36" OR "Stomach 36" OR "Zu San Li") "arthralgia" gối` | túc tam lý→Zusanli (ST36) ; 足三里→Zusanli (ST36) ; đau khớp→arthralgia | high,high,medium | — | gối | false | unresolved kept: gối |
| L07 | discovery | `("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng") ("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng")` | 中封→Zhongfeng (LR4) ; huyệt trung phong→Zhongfeng (LR4) | high,high | — | — | false | clean |
| L08 | discovery | `("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") ("rehabilitation" OR "recovery" OR "functional recovery")` | trúng phong→stroke ; 中风→stroke ; phục hồi→rehabilitation | high,high,high | — | — | false | clean |
| L09 | discovery | `("Buyang Huanwu Tang" OR "Bu Yang Huan Wu Tang" OR "Supplement Yang to Restore Five Tenths Decoction") di chứng ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | 补阳还五汤→Buyang Huanwu Tang ; đột quỵ→stroke | high,high | — | di chứng | false | unresolved kept: di chứng |
| L10 | discovery | `("kidney yin deficiency" OR "kidney yin vacuity") 腎陰虛 tinnitus` | thận âm hư→kidney yin deficiency | high | — | 腎陰虛 tinnitus | false | unresolved kept: 腎陰虛 tinnitus |
| M01 | discovery | `thử lâm sàng đối chứng ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | điện châm→electroacupuncture ; đột quỵ→stroke | high,high | — | thử lâm sàng đối chứng | false | unresolved kept: thử lâm sàng đối chứng | SILENT-DROP: «nghiệm» | SILENT-DROP: «ngẫu» | SILENT-DROP: «nhiên» | SILENT-DROP: «có» |
| M02 | discovery | `("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") randomized controlled trial` | điện châm→electroacupuncture ; đột quỵ→stroke | high,high | — | randomized controlled trial | false | unresolved kept: randomized controlled trial |
| M03 | discovery | `("systematic review" OR "meta-analysis") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("low back pain" OR "lumbago" OR "lower back pain")` | tổng quan hệ thống→systematic review ; châm cứu→acupuncture ; điều trị→treatment ; đau lưng→low back pain | high,high,high,high | — | — | false | clean |
| M04 | discovery | `("systematic review" OR "meta-analysis") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("insomnia" OR "sleeplessness" OR "sleep disorder")` | phân tích gộp→systematic review ; châm cứu→acupuncture ; điều trị→treatment ; mất ngủ→insomnia | high,high,high,high | — | — | false | clean |
| M05 | discovery | `cứu đoàn hệ ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | châm cứu→acupuncture ; đột quỵ→stroke | high,high | — | cứu đoàn hệ | false | unresolved kept: cứu đoàn hệ | SILENT-DROP: «nghiên» | SILENT-DROP: «và» |
| M06 | discovery | `cứu chứng yếu tố nguy cơ ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | đột quỵ→stroke | high | — | cứu chứng yếu tố nguy cơ | false | unresolved kept: cứu chứng yếu tố nguy cơ | SILENT-DROP: «nghiên» | SILENT-DROP: «bệnh» |
| M07 | discovery | `mong muốn ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture")` | điện châm→electroacupuncture | high | — | mong muốn | false | unresolved kept: mong muốn | SILENT-DROP: «tác» | SILENT-DROP: «dụng» | SILENT-DROP: «không» | SILENT-DROP: «của» |
| M08 | discovery | `("safety" OR "tolerability" OR "adverse events") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") người cao tuổi` | an toàn→safety ; châm cứu→acupuncture | high,high | — | người cao tuổi | false | unresolved kept: người cao tuổi | SILENT-DROP: «của» |
| M09 | discovery | `sham acupuncture double blind randomized trial` | — | — | — | sham acupuncture double blind randomized trial | false | unresolved kept: sham acupuncture double blind randomized trial |
| M10 | discovery | `protocol randomized trial acupuncture stroke rehabilitation` | — | — | — | protocol randomized trial acupuncture stroke rehabilitation | false | unresolved kept: protocol randomized trial acupuncture stroke rehabilitation |
| N01 | discovery | `("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("rehabilitation" OR "recovery" OR "functional recovery") ("hemiplegia" OR "hemiparesis") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | hiệu quả→efficacy ; điện châm→electroacupuncture ; kết hợp→combined therapy ; phục hồi chức năng→rehabilitation ; điều trị→treatment ; liệt nửa người→hemiplegia ; đột quỵ→stroke | high,high,high,high,high,high,high | — | — | false | clean |
| N02 | discovery | `("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") tập vận động chức năng "Upper Limbs:" ("ischemic stroke" OR "cerebral infarction" OR "ischaemic stroke")` | điện châm→electroacupuncture ; kết hợp→combined therapy ; chi trên→Upper Limbs: ; nhồi máu não→ischemic stroke | high,high,medium,high | — | tập vận động chức năng | false | unresolved kept: tập vận động chức năng | SILENT-DROP: «cải» | SILENT-DROP: «thiện» | SILENT-DROP: «bệnh» | SILENT-DROP: «nhân» |
| N03 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("prevention" OR "prophylaxis" OR "preventive" OR "prophylactic") phát ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") người ("hypertension" OR "high blood pressure" OR "arterial hypertension")` | châm cứu→acupuncture ; dự phòng→prevention ; đột quỵ→stroke ; tăng huyết áp→hypertension | high,high,high,high | — | phát | người | false | unresolved kept: phát,người | SILENT-DROP: «tái» | SILENT-DROP: «bệnh» |
| N04 | discovery | `liên quan thể chất trung y nguy cơ ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") ("anemia" OR "anaemia") não` | đột quỵ→stroke ; thiếu máu→anemia | high,high | — | liên quan thể chất trung y nguy cơ | não | false | unresolved kept: liên quan thể chất trung y nguy cơ,não | SILENT-DROP: «mối» | SILENT-DROP: «giữa» | SILENT-DROP: «và» |
| N05 | discovery | `giá dự báo chứng ("phlegm-dampness" OR "phlegm damp" OR "damp phlegm") ("blood stasis" OR "blood stagnation" OR "static blood") đối nguy cơ ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | trị→treatment ; đàm thấp→phlegm-dampness ; huyết ứ→blood stasis ; đột quỵ→stroke | high,high,high,high | — | giá | dự báo chứng | đối nguy cơ | false | unresolved kept: giá,dự báo chứng,đối nguy cơ | SILENT-DROP: «của» | SILENT-DROP: «với» |
| N06 | discovery | `("Buyang Huanwu Tang" OR "Bu Yang Huan Wu Tang" OR "Supplement Yang to Restore Five Tenths Decoction") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("rehabilitation" OR "recovery" OR "functional recovery") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | hiệu quả→efficacy ; bổ dương hoàn ngũ thang→Buyang Huanwu Tang ; kết hợp→combined therapy ; châm cứu→acupuncture ; phục hồi→rehabilitation ; đột quỵ→stroke | high,high,high,high,high,high | — | — | false | clean |
| N07 | discovery | `động ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") lên chức năng vận động ("quality of life" OR "QoL" OR "health-related quality of life") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | điện châm→electroacupuncture ; chất lượng cuộc sống→quality of life ; đột quỵ→stroke | high,high,high | — | động | lên chức năng vận động | false | unresolved kept: động,lên chức năng vận động | SILENT-DROP: «tác» | SILENT-DROP: «của» | SILENT-DROP: «và» |
| N08 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") ("low back pain" OR "lumbago" OR "lower back pain") "chronic"` | châm cứu→acupuncture ; giả châm→sham acupuncture ; điều trị→treatment ; đau thắt lưng→low back pain ; mạn tính→chronic | high,high,high,high,high | — | — | false | SILENT-DROP: «sánh» | SILENT-DROP: «thật» | SILENT-DROP: «và» |
| N09 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("insomnia" OR "sleeplessness" OR "sleep disorder") người cao tuổi` | hiệu quả→efficacy ; an toàn→safety ; châm cứu→acupuncture ; điều trị→treatment ; mất ngủ→insomnia | high,high,high,high,high | — | người cao tuổi | false | unresolved kept: người cao tuổi | SILENT-DROP: «và» | SILENT-DROP: «của» |
| N10 | discovery | `ảnh hưởng ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") lên biến thiên nhịp tim ("hypertension" OR "high blood pressure" OR "arterial hypertension")` | châm cứu→acupuncture ; tăng huyết áp→hypertension | high,high | — | ảnh hưởng | lên biến thiên nhịp tim | false | unresolved kept: ảnh hưởng,lên biến thiên nhịp tim | SILENT-DROP: «của» | SILENT-DROP: «bệnh» | SILENT-DROP: «nhân» |
| O01 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") AND ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | châm cứu→acupuncture ; đột quỵ→stroke | high,high | — | AND | false | unresolved kept: AND |
| O02 | discovery | `("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") AND ("rehabilitation" OR "recovery" OR "functional recovery") AND ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | điện châm→electroacupuncture ; phục hồi→rehabilitation ; đột quỵ→stroke | high,high,high | — | AND | AND | false | unresolved kept: AND,AND |
| O03 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") OR ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") AND stroke` | châm cứu→acupuncture ; điện châm→electroacupuncture | high,high | — | OR | AND stroke | false | unresolved kept: OR,AND stroke |
| O04 | discovery | `acupuncture AND stroke NOT animal` | — | — | — | acupuncture AND stroke NOT animal | false | unresolved kept: acupuncture AND stroke NOT animal |
| O05 | discovery | `("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") AND ("low back pain" OR "lumbago" OR "lower back pain")` | giả châm→sham acupuncture ; đau thắt lưng→low back pain | high,high | — | AND | false | unresolved kept: AND |
| O06 | discovery | `( ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") OR ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ) AND ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | châm cứu→acupuncture ; điện châm→electroacupuncture ; đột quỵ→stroke | high,high,high | — | ( | OR | ) AND | false | unresolved kept: (,OR,) AND |
| O07 | discovery | `("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") AND ( ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") OR ("anemia" OR "anaemia") não )` | hoàng kỳ→Astragalus membranaceus ; đột quỵ→stroke ; thiếu máu→anemia | high,high,high | — | AND ( | OR | não ) | false | unresolved kept: AND (,OR,não ) |
| O08 | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") AND ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") NOT 动物` | 针灸→acupuncture ; 中风→stroke | high,high | — | AND | NOT 动物 | false | unresolved kept: AND,NOT 动物 |
| O09 | discovery | `acupuncture AND kidney deficiency` | — | — | — | acupuncture AND kidney deficiency | false | unresolved kept: acupuncture AND kidney deficiency |
| O10 | discovery | `("Buyang Huanwu Tang" OR "Bu Yang Huan Wu Tang" OR "Supplement Yang to Restore Five Tenths Decoction") AND stroke` | bổ dương hoàn ngũ thang→Buyang Huanwu Tang | high | — | AND stroke | false | unresolved kept: AND stroke |
| P01 | discovery | `nguyễn trung` | — | — | — | nguyễn trung | false | unresolved kept: nguyễn trung | SILENT-DROP: «văn» |
| P02 | discovery | `trần châm` | — | — | châm{eczema|acupuncture}:collision | trần | false | ambiguous→kept-verbatim(discovery) | unresolved kept: trần | SILENT-DROP: «thị» |
| P03 | discovery | `trung tâm y tế quận 5` | — | — | — | trung tâm y tế quận 5 | false | unresolved kept: trung tâm y tế quận 5 |
| P04 | discovery | `cứu năm 2024 hà nội` | — | — | — | cứu năm 2024 hà nội | false | unresolved kept: cứu năm 2024 hà nội | SILENT-DROP: «nghiên» | SILENT-DROP: «tại» |
| P05 | discovery | `artificial intelligence stroke prediction` | — | — | — | artificial intelligence stroke prediction | false | unresolved kept: artificial intelligence stroke prediction |
| P06 | discovery | `convolutional neural network mri` | — | — | — | convolutional neural network mri | false | unresolved kept: convolutional neural network mri |
| P07 | discovery | `blood pressure monitoring wearable device` | — | — | — | blood pressure monitoring wearable device | false | unresolved kept: blood pressure monitoring wearable device |
| P08 | discovery | `gpt-5 medical research` | — | — | — | gpt-5 medical research | false | unresolved kept: gpt-5 medical research |
| P09 | discovery | `123456789` | — | — | — | 123456789 | false | unresolved kept: 123456789 |
| P10 | discovery | `abc xyz lorem ipsum` | — | — | — | abc xyz lorem ipsum | false | unresolved kept: abc xyz lorem ipsum |
| Q01·d | discovery | `("eczema" OR "atopic dermatitis" OR "dermatitis") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")` | bệnh chàm→eczema ; điều trị→treatment ; châm cứu→acupuncture | high,high,high | — | — | false | SILENT-DROP: «bằng» |
| Q01·e | evidence | `("eczema" OR "atopic dermatitis" OR "dermatitis") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")` | bệnh chàm→eczema ; điều trị→treatment ; châm cứu→acupuncture | high,high,high | — | — | false | SILENT-DROP: «bằng» |
| Q02·d | discovery | `("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | huyệt trung phong→Zhongfeng (LR4) ; trúng phong→stroke | high,high | — | — | false | SILENT-DROP: «dùng» | SILENT-DROP: «bệnh» | SILENT-DROP: «nhân» |
| Q02·e | evidence | `("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | huyệt trung phong→Zhongfeng (LR4) ; trúng phong→stroke | high,high | — | — | false | SILENT-DROP: «dùng» | SILENT-DROP: «bệnh» | SILENT-DROP: «nhân» |
| Q03·d | discovery | `("treatment" OR "therapy" OR "therapeutic" OR "management") ("hemorrhoids" OR "haemorrhoids" OR "piles") liệu pháp thuốc` | điều trị→treatment ; bệnh trĩ→hemorrhoids | high,high | — | liệu pháp thuốc | false | unresolved kept: liệu pháp thuốc | SILENT-DROP: «bằng» | SILENT-DROP: «không» | SILENT-DROP: «dùng» |
| Q03·e | evidence | `("treatment" OR "therapy" OR "therapeutic" OR "management") ("hemorrhoids" OR "haemorrhoids" OR "piles") liệu pháp thuốc` | điều trị→treatment ; bệnh trĩ→hemorrhoids | high,high | — | liệu pháp thuốc | true | unresolved kept: liệu pháp thuốc | SILENT-DROP: «bằng» | SILENT-DROP: «không» | SILENT-DROP: «dùng» |
| Q04·d | discovery | `thận ("deficiency" OR "vacuity" OR "xu") toàn thân phù` | hư→deficiency | high | — | thận | toàn thân phù | false | unresolved kept: thận,toàn thân phù | SILENT-DROP: «nhưng» | SILENT-DROP: «không» |
| Q04·e | evidence | `thận ("deficiency" OR "vacuity" OR "xu") toàn thân phù` | hư→deficiency | high | — | thận | toàn thân phù | true | unresolved kept: thận,toàn thân phù | SILENT-DROP: «nhưng» | SILENT-DROP: «không» |
| Q05·d | discovery | `sham acupuncture ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") eczema ("eczema" OR "atopic dermatitis" OR "dermatitis")` | giả châm→sham acupuncture ; bệnh chàm→eczema | high,high | — | sham acupuncture | eczema | false | unresolved kept: sham acupuncture,eczema |
| Q05·e | evidence | `sham acupuncture ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") eczema ("eczema" OR "atopic dermatitis" OR "dermatitis")` | giả châm→sham acupuncture ; bệnh chàm→eczema | high,high | — | sham acupuncture | eczema | true | unresolved kept: sham acupuncture,eczema |
| Q06·d | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("eczema" OR "atopic dermatitis" OR "dermatitis")` | cham cuu→acupuncture ; dieu tri→treatment ; benh cham→eczema | medium,medium,medium | — | — | false | ok |
| Q06·e | evidence | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("eczema" OR "atopic dermatitis" OR "dermatitis")` | cham cuu→acupuncture ; dieu tri→treatment ; benh cham→eczema | medium,medium,medium | — | — | false | ok |
| Q07·d | discovery | `trung phong ("treatment" OR "therapy" OR "therapeutic" OR "management") trung phong` | dieu tri→treatment | medium | trung phong{lr4-zhongfeng|stroke}:toneless-collision ; trung phong{lr4-zhongfeng|stroke}:toneless-collision | — | false | ambiguous→kept-verbatim(discovery) |
| Q07·e | evidence | `trung phong ("treatment" OR "therapy" OR "therapeutic" OR "management") trung phong` | dieu tri→treatment | medium | trung phong{lr4-zhongfeng|stroke}:toneless-collision ; trung phong{lr4-zhongfeng|stroke}:toneless-collision | — | true | ambiguous→needs_resolution |
| Q08·d | discovery | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | 针刺→acupuncture ; 中封→Zhongfeng (LR4) ; 治疗→treatment ; 中风→stroke | high,high,high,high | — | — | false | clean |
| Q08·e | evidence | `("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | 针刺→acupuncture ; 中封→Zhongfeng (LR4) ; 治疗→treatment ; 中风→stroke | high,high,high,high | — | — | false | clean |
| Q09·d | discovery | `("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") ("eczema" OR "atopic dermatitis" OR "dermatitis") cứu ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") liễu` | giả châm→sham acupuncture ; chàm→eczema ; châm cứu→acupuncture | high,high,high | — | cứu | liễu | false | unresolved kept: cứu,liễu | SILENT-DROP: «và» | SILENT-DROP: «nghiên» |
| Q09·e | evidence | `("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") ("eczema" OR "atopic dermatitis" OR "dermatitis") cứu ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") liễu` | giả châm→sham acupuncture ; chàm→eczema ; châm cứu→acupuncture | high,high,high | — | cứu | liễu | true | unresolved kept: cứu,liễu | SILENT-DROP: «và» | SILENT-DROP: «nghiên» |
| Q10·d | discovery | `trần trung cứu ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | châm cứu→acupuncture ; điều trị→treatment ; trúng phong→stroke | high,high,high | — | trần trung cứu | false | unresolved kept: trần trung cứu | SILENT-DROP: «văn» | SILENT-DROP: «nghiên» |
| Q10·e | evidence | `trần trung cứu ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")` | châm cứu→acupuncture ; điều trị→treatment ; trúng phong→stroke | high,high,high | — | trần trung cứu | true | unresolved kept: trần trung cứu | SILENT-DROP: «văn» | SILENT-DROP: «nghiên» |

## Chi tiết từng case

### A01 — `châm cứu điều trị đau thắt lưng`  · mode=discovery
```
input             : châm cứu điều trị đau thắt lưng
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("low back pain" OR "lumbago" OR "lower back pain")
spans             : châm cứu·translate→acupuncture(high)  điều trị·translate→treatment(high)  đau thắt lưng·translate→low back pain(high)
concept đã chọn   : châm cứu→acupuncture ; điều trị→treatment ; đau thắt lưng→low back pain
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### A02 — `điện châm phục hồi chức năng sau đột quỵ`  · mode=discovery
```
input             : điện châm phục hồi chức năng sau đột quỵ
mode              : discovery
effective_query   : ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("rehabilitation" OR "recovery" OR "functional recovery") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : điện châm·translate→electroacupuncture(high)  phục hồi chức năng·translate→rehabilitation(high)  sau·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : điện châm→electroacupuncture ; phục hồi chức năng→rehabilitation ; đột quỵ→stroke
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### A03 — `cứu ngải điều trị đau khớp gối`  · mode=discovery
```
input             : cứu ngải điều trị đau khớp gối
mode              : discovery
effective_query   : ("moxibustion" OR "moxa") "arthralgia" gối
spans             : cứu ngải·translate→moxibustion(high)  điều trị·translate→treatment(high)  đau khớp·translate→arthralgia(medium)  gối·unresolved
concept đã chọn   : cứu ngải→moxibustion ; điều trị→treatment ; đau khớp→arthralgia
confidence        : high,high,medium
ambiguous         : —
unresolved        : gối
needs_resolution  : false
warning           : Chưa dịch được: «gối» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: gối
engine_version    : te-v2-d1
```

### A04 — `nhĩ châm điều trị mất ngủ`  · mode=discovery
```
input             : nhĩ châm điều trị mất ngủ
mode              : discovery
effective_query   : ("auricular acupuncture" OR "ear acupuncture" OR "auriculotherapy") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("insomnia" OR "sleeplessness" OR "sleep disorder")
spans             : nhĩ châm·translate→auricular acupuncture(high)  điều trị·translate→treatment(high)  mất ngủ·translate→insomnia(high)
concept đã chọn   : nhĩ châm→auricular acupuncture ; điều trị→treatment ; mất ngủ→insomnia
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### A05 — `cấy chỉ điều trị béo phì`  · mode=discovery
```
input             : cấy chỉ điều trị béo phì
mode              : discovery
effective_query   : ("acupoint catgut embedding" OR "catgut embedding" OR "thread embedding acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("obesity" OR "overweight")
spans             : cấy chỉ·translate→acupoint catgut embedding(high)  điều trị·translate→treatment(high)  béo phì·translate→obesity(high)
concept đã chọn   : cấy chỉ→acupoint catgut embedding ; điều trị→treatment ; béo phì→obesity
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### A06 — `giác hơi điều trị đau vai gáy`  · mode=discovery
```
input             : giác hơi điều trị đau vai gáy
mode              : discovery
effective_query   : ("cupping therapy" OR "cupping") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("neck pain" OR "cervicalgia")
spans             : giác hơi·translate→cupping therapy(high)  điều trị·translate→treatment(high)  đau vai gáy·translate→neck pain(high)
concept đã chọn   : giác hơi→cupping therapy ; điều trị→treatment ; đau vai gáy→neck pain
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### A07 — `mai hoa châm điều trị đau thần kinh`  · mode=discovery
```
input             : mai hoa châm điều trị đau thần kinh
mode              : discovery
effective_query   : "Prunus mume Sieb. et" ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") "nephralgia" kinh
spans             : mai hoa·translate→Prunus mume Sieb. et(medium)  châm·translate→acupuncture(high)  điều trị·translate→treatment(high)  đau thần·translate→nephralgia(medium)  kinh·unresolved
concept đã chọn   : mai hoa→Prunus mume Sieb. et ; châm→acupuncture ; điều trị→treatment ; đau thần→nephralgia
confidence        : medium,high,high,medium
ambiguous         : —
unresolved        : kinh
needs_resolution  : false
warning           : Chưa dịch được: «kinh» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: kinh | SUSPECT-MAP: đau thần→nephralgia
engine_version    : te-v2-d1
```

### A08 — `hỏa châm điều trị đau mạn tính`  · mode=discovery
```
input             : hỏa châm điều trị đau mạn tính
mode              : discovery
effective_query   : hỏa ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") đau "chronic"
spans             : hỏa·unresolved  châm·translate→acupuncture(high)  điều trị·translate→treatment(high)  đau·unresolved  mạn tính·translate→chronic(high)
concept đã chọn   : châm→acupuncture ; điều trị→treatment ; mạn tính→chronic
confidence        : high,high,high
ambiguous         : —
unresolved        : hỏa | đau
needs_resolution  : false
warning           : Chưa dịch được: «hỏa», «đau» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: hỏa,đau
engine_version    : te-v2-d1
```

### A09 — `đầu châm phục hồi vận động sau đột quỵ`  · mode=discovery
```
input             : đầu châm phục hồi vận động sau đột quỵ
mode              : discovery
effective_query   : ("scalp acupuncture" OR "head acupuncture") ("rehabilitation" OR "recovery" OR "functional recovery") vận động ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : đầu châm·translate→scalp acupuncture(high)  phục hồi·translate→rehabilitation(high)  vận·unresolved  động·unresolved  sau·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : đầu châm→scalp acupuncture ; phục hồi→rehabilitation ; đột quỵ→stroke
confidence        : high,high,high
ambiguous         : —
unresolved        : vận động
needs_resolution  : false
warning           : Chưa dịch được: «vận động» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: vận động
engine_version    : te-v2-d1
```

### A10 — `châm cứu dự phòng tái phát đột quỵ`  · mode=discovery
```
input             : châm cứu dự phòng tái phát đột quỵ
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("prevention" OR "prophylaxis" OR "preventive" OR "prophylactic") phát ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : châm cứu·translate→acupuncture(high)  dự phòng·translate→prevention(high)  tái·unresolved  phát·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : châm cứu→acupuncture ; dự phòng→prevention ; đột quỵ→stroke
confidence        : high,high,high
ambiguous         : —
unresolved        : phát
needs_resolution  : false
warning           : Chưa dịch được: «phát» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: phát | SILENT-DROP: «tái»
engine_version    : te-v2-d1
```

### B01 — `can khí uất kết và mất ngủ`  · mode=discovery
```
input             : can khí uất kết và mất ngủ
mode              : discovery
effective_query   : ("liver qi stagnation" OR "liver qi depression" OR "constrained liver qi") ("insomnia" OR "sleeplessness" OR "sleep disorder")
spans             : can khí uất kết·translate→liver qi stagnation(high)  và·unresolved  mất ngủ·translate→insomnia(high)
concept đã chọn   : can khí uất kết→liver qi stagnation ; mất ngủ→insomnia
confidence        : high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : SILENT-DROP: «và»
engine_version    : te-v2-d1
```

### B02 — `tỳ khí hư ở bệnh nhân mệt mỏi mạn tính`  · mode=discovery
```
input             : tỳ khí hư ở bệnh nhân mệt mỏi mạn tính
mode              : discovery
effective_query   : ("spleen qi deficiency" OR "spleen deficiency" OR "spleen qi vacuity") mệt "chronic"
spans             : tỳ khí hư·translate→spleen qi deficiency(high)  ở·unresolved  bệnh·unresolved  nhân·unresolved  mệt·unresolved  mỏi·unresolved  mạn tính·translate→chronic(high)
concept đã chọn   : tỳ khí hư→spleen qi deficiency ; mạn tính→chronic
confidence        : high,high
ambiguous         : —
unresolved        : mệt
needs_resolution  : false
warning           : Chưa dịch được: «mệt» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: mệt | SILENT-DROP: «bệnh» | SILENT-DROP: «nhân» | SILENT-DROP: «mỏi»
engine_version    : te-v2-d1
```

### B03 — `thận âm hư và ù tai`  · mode=discovery
```
input             : thận âm hư và ù tai
mode              : discovery
effective_query   : ("kidney yin deficiency" OR "kidney yin vacuity") "tinnitus"
spans             : thận âm hư·translate→kidney yin deficiency(high)  và·unresolved  ù tai·translate→tinnitus(high)
concept đã chọn   : thận âm hư→kidney yin deficiency ; ù tai→tinnitus
confidence        : high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : SILENT-DROP: «và»
engine_version    : te-v2-d1
```

### B04 — `thận dương hư điều trị bằng cứu ngải`  · mode=discovery
```
input             : thận dương hư điều trị bằng cứu ngải
mode              : discovery
effective_query   : ("kidney yang deficiency" OR "kidney yang vacuity") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("moxibustion" OR "moxa")
spans             : thận dương hư·translate→kidney yang deficiency(high)  điều trị·translate→treatment(high)  bằng·unresolved  cứu ngải·translate→moxibustion(high)
concept đã chọn   : thận dương hư→kidney yang deficiency ; điều trị→treatment ; cứu ngải→moxibustion
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : SILENT-DROP: «bằng»
engine_version    : te-v2-d1
```

### B05 — `âm hư hỏa vượng ở phụ nữ mãn kinh`  · mode=discovery
```
input             : âm hư hỏa vượng ở phụ nữ mãn kinh
mode              : discovery
effective_query   : ("yin deficiency with effulgent fire" OR "yin deficiency fire" OR "deficiency heat") ("postmenopausal" OR "menopausal" OR "postmenopause")
spans             : âm hư hỏa vượng·translate→yin deficiency with effulgent fire(high)  ở·unresolved  phụ nữ mãn kinh·translate→postmenopausal(high)
concept đã chọn   : âm hư hỏa vượng→yin deficiency with effulgent fire ; phụ nữ mãn kinh→postmenopausal
confidence        : high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### B06 — `khí trệ huyết ứ trong đau bụng kinh`  · mode=discovery
```
input             : khí trệ huyết ứ trong đau bụng kinh
mode              : discovery
effective_query   : ("qi stagnation" OR "qi stagnation" OR "stagnant qi") ("blood stasis" OR "blood stagnation" OR "static blood") ("dysmenorrhea" OR "menstrual pain" OR "period pain")
spans             : khí trệ·translate→qi stagnation(high)  huyết ứ·translate→blood stasis(high)  trong·unresolved  đau bụng kinh·translate→dysmenorrhea(high)
concept đã chọn   : khí trệ→qi stagnation ; huyết ứ→blood stasis ; đau bụng kinh→dysmenorrhea
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### B07 — `đàm thấp trở trệ và béo phì`  · mode=discovery
```
input             : đàm thấp trở trệ và béo phì
mode              : discovery
effective_query   : ("phlegm-dampness" OR "phlegm damp" OR "damp phlegm") trở trệ ("obesity" OR "overweight")
spans             : đàm thấp·translate→phlegm-dampness(high)  trở·unresolved  trệ·unresolved  và·unresolved  béo phì·translate→obesity(high)
concept đã chọn   : đàm thấp→phlegm-dampness ; béo phì→obesity
confidence        : high,high
ambiguous         : —
unresolved        : trở trệ
needs_resolution  : false
warning           : Chưa dịch được: «trở trệ» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: trở trệ | SILENT-DROP: «và»
engine_version    : te-v2-d1
```

### B08 — `đàm nhiệt nhiễu tâm và mất ngủ`  · mode=discovery
```
input             : đàm nhiệt nhiễu tâm và mất ngủ
mode              : discovery
effective_query   : đàm nhiệt nhiễu tâm ("insomnia" OR "sleeplessness" OR "sleep disorder")
spans             : đàm·unresolved  nhiệt·unresolved  nhiễu·unresolved  tâm·unresolved  và·unresolved  mất ngủ·translate→insomnia(high)
concept đã chọn   : mất ngủ→insomnia
confidence        : high
ambiguous         : —
unresolved        : đàm nhiệt nhiễu tâm
needs_resolution  : false
warning           : Chưa dịch được: «đàm nhiệt nhiễu tâm» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: đàm nhiệt nhiễu tâm | SILENT-DROP: «và»
engine_version    : te-v2-d1
```

### B09 — `tỳ thận dương hư ở tiêu chảy mạn tính`  · mode=discovery
```
input             : tỳ thận dương hư ở tiêu chảy mạn tính
mode              : discovery
effective_query   : tỳ ("kidney yang deficiency" OR "kidney yang vacuity") ("diarrhea" OR "diarrhoea") "chronic"
spans             : tỳ·unresolved  thận dương hư·translate→kidney yang deficiency(high)  ở·unresolved  tiêu chảy·translate→diarrhea(high)  mạn tính·translate→chronic(high)
concept đã chọn   : thận dương hư→kidney yang deficiency ; tiêu chảy→diarrhea ; mạn tính→chronic
confidence        : high,high,high
ambiguous         : —
unresolved        : tỳ
needs_resolution  : false
warning           : Chưa dịch được: «tỳ» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: tỳ
engine_version    : te-v2-d1
```

### B10 — `khí huyết lưỡng hư sau đột quỵ`  · mode=discovery
```
input             : khí huyết lưỡng hư sau đột quỵ
mode              : discovery
effective_query   : ("qi and blood deficiency" OR "dual deficiency of qi and blood") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : khí huyết lưỡng hư·translate→qi and blood deficiency(high)  sau·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : khí huyết lưỡng hư→qi and blood deficiency ; đột quỵ→stroke
confidence        : high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### C01 — `hoàng kỳ trong phục hồi sau đột quỵ`  · mode=discovery
```
input             : hoàng kỳ trong phục hồi sau đột quỵ
mode              : discovery
effective_query   : ("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") ("rehabilitation" OR "recovery" OR "functional recovery") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : hoàng kỳ·translate→Astragalus membranaceus(high)  trong·unresolved  phục hồi·translate→rehabilitation(high)  sau·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : hoàng kỳ→Astragalus membranaceus ; phục hồi→rehabilitation ; đột quỵ→stroke
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### C02 — `đương quy điều trị thiếu máu`  · mode=discovery
```
input             : đương quy điều trị thiếu máu
mode              : discovery
effective_query   : ("Angelica sinensis" OR "Danggui" OR "Dong quai" OR "Radix Angelicae Sinensis") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("anemia" OR "anaemia")
spans             : đương quy·translate→Angelica sinensis(high)  điều trị·translate→treatment(high)  thiếu máu·translate→anemia(high)
concept đã chọn   : đương quy→Angelica sinensis ; điều trị→treatment ; thiếu máu→anemia
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### C03 — `đan sâm và bệnh mạch vành`  · mode=discovery
```
input             : đan sâm và bệnh mạch vành
mode              : discovery
effective_query   : ("Salvia miltiorrhiza" OR "Danshen" OR "Radix Salviae Miltiorrhizae" OR "red sage") ("coronary artery disease" OR "coronary heart disease" OR "coronary disease")
spans             : đan sâm·translate→Salvia miltiorrhiza(high)  và·unresolved  bệnh mạch vành·translate→coronary artery disease(high)
concept đã chọn   : đan sâm→Salvia miltiorrhiza ; bệnh mạch vành→coronary artery disease
confidence        : high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### C04 — `xuyên khung điều trị đau đầu`  · mode=discovery
```
input             : xuyên khung điều trị đau đầu
mode              : discovery
effective_query   : ("Ligusticum chuanxiong" OR "Chuanxiong" OR "Rhizoma Chuanxiong") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("headache" OR "cephalgia")
spans             : xuyên khung·translate→Ligusticum chuanxiong(high)  điều trị·translate→treatment(high)  đau đầu·translate→headache(high)
concept đã chọn   : xuyên khung→Ligusticum chuanxiong ; điều trị→treatment ; đau đầu→headache
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### C05 — `bạch truật và tỳ khí hư`  · mode=discovery
```
input             : bạch truật và tỳ khí hư
mode              : discovery
effective_query   : ("Atractylodes macrocephala" OR "Baizhu" OR "Rhizoma Atractylodis Macrocephalae") ("spleen qi deficiency" OR "spleen deficiency" OR "spleen qi vacuity")
spans             : bạch truật·translate→Atractylodes macrocephala(high)  và·unresolved  tỳ khí hư·translate→spleen qi deficiency(high)
concept đã chọn   : bạch truật→Atractylodes macrocephala ; tỳ khí hư→spleen qi deficiency
confidence        : high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : SILENT-DROP: «và»
engine_version    : te-v2-d1
```

### C06 — `phục linh điều trị phù`  · mode=discovery
```
input             : phục linh điều trị phù
mode              : discovery
effective_query   : ("Poria cocos" OR "Fuling" OR "Wolfiporia extensa" OR "Poria") ("treatment" OR "therapy" OR "therapeutic" OR "management") phù
spans             : phục linh·translate→Poria cocos(high)  điều trị·translate→treatment(high)  phù·unresolved
concept đã chọn   : phục linh→Poria cocos ; điều trị→treatment
confidence        : high,high
ambiguous         : —
unresolved        : phù
needs_resolution  : false
warning           : Chưa dịch được: «phù» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: phù
engine_version    : te-v2-d1
```

### C07 — `bán hạ điều trị đàm thấp`  · mode=discovery
```
input             : bán hạ điều trị đàm thấp
mode              : discovery
effective_query   : "Pinellia ternata Breit." ("treatment" OR "therapy" OR "therapeutic" OR "management") ("phlegm-dampness" OR "phlegm damp" OR "damp phlegm")
spans             : bán hạ·translate→Pinellia ternata Breit.(medium)  điều trị·translate→treatment(high)  đàm thấp·translate→phlegm-dampness(high)
concept đã chọn   : bán hạ→Pinellia ternata Breit. ; điều trị→treatment ; đàm thấp→phlegm-dampness
confidence        : medium,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### C08 — `hoàng liên điều trị tiêu chảy`  · mode=discovery
```
input             : hoàng liên điều trị tiêu chảy
mode              : discovery
effective_query   : ("Coptis chinensis" OR "Huanglian" OR "Rhizoma Coptidis" OR "Chinese goldthread") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("diarrhea" OR "diarrhoea")
spans             : hoàng liên·translate→Coptis chinensis(high)  điều trị·translate→treatment(high)  tiêu chảy·translate→diarrhea(high)
concept đã chọn   : hoàng liên→Coptis chinensis ; điều trị→treatment ; tiêu chảy→diarrhea
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### C09 — `sinh địa hoàng và âm hư`  · mode=discovery
```
input             : sinh địa hoàng và âm hư
mode              : discovery
effective_query   : "Rehmanniae Radix" âm ("deficiency" OR "vacuity" OR "xu")
spans             : sinh địa hoàng·translate→Rehmanniae Radix(medium)  và·unresolved  âm·unresolved  hư·translate→deficiency(high)
concept đã chọn   : sinh địa hoàng→Rehmanniae Radix ; hư→deficiency
confidence        : medium,high
ambiguous         : —
unresolved        : âm
needs_resolution  : false
warning           : Chưa dịch được: «âm» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: âm | SILENT-DROP: «và»
engine_version    : te-v2-d1
```

### C10 — `thục địa hoàng trong thận âm hư`  · mode=discovery
```
input             : thục địa hoàng trong thận âm hư
mode              : discovery
effective_query   : "Rehmannia glutinosa Libosch. prepared root" ("kidney yin deficiency" OR "kidney yin vacuity")
spans             : thục địa hoàng·translate→Rehmannia glutinosa Libosch. prepared root(medium)  trong·unresolved  thận âm hư·translate→kidney yin deficiency(high)
concept đã chọn   : thục địa hoàng→Rehmannia glutinosa Libosch. prepared root ; thận âm hư→kidney yin deficiency
confidence        : medium,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### D01 — `bổ dương hoàn ngũ thang điều trị di chứng đột quỵ`  · mode=discovery
```
input             : bổ dương hoàn ngũ thang điều trị di chứng đột quỵ
mode              : discovery
effective_query   : ("Buyang Huanwu Tang" OR "Bu Yang Huan Wu Tang" OR "Supplement Yang to Restore Five Tenths Decoction") di chứng ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : bổ dương hoàn ngũ thang·translate→Buyang Huanwu Tang(high)  điều trị·translate→treatment(high)  di·unresolved  chứng·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : bổ dương hoàn ngũ thang→Buyang Huanwu Tang ; điều trị→treatment ; đột quỵ→stroke
confidence        : high,high,high
ambiguous         : —
unresolved        : di chứng
needs_resolution  : false
warning           : Chưa dịch được: «di chứng» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: di chứng
engine_version    : te-v2-d1
```

### D02 — `huyết phủ trục ứ thang điều trị đau ngực`  · mode=discovery
```
input             : huyết phủ trục ứ thang điều trị đau ngực
mode              : discovery
effective_query   : ("Xuefu Zhuyu Tang" OR "Xue Fu Zhu Yu Tang" OR "Drive Out Stasis in the Mansion of Blood Decoction") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("chest pain" OR "angina pectoris" OR "angina")
spans             : huyết phủ trục ứ thang·translate→Xuefu Zhuyu Tang(high)  điều trị·translate→treatment(high)  đau ngực·translate→chest pain(high)
concept đã chọn   : huyết phủ trục ứ thang→Xuefu Zhuyu Tang ; điều trị→treatment ; đau ngực→chest pain
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### D03 — `lục vị địa hoàng hoàn điều trị thận âm hư`  · mode=discovery
```
input             : lục vị địa hoàng hoàn điều trị thận âm hư
mode              : discovery
effective_query   : ("Liuwei Dihuang Wan" OR "Liu Wei Di Huang Wan" OR "Six Ingredient Rehmannia Pill") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("kidney yin deficiency" OR "kidney yin vacuity")
spans             : lục vị địa hoàng hoàn·translate→Liuwei Dihuang Wan(high)  điều trị·translate→treatment(high)  thận âm hư·translate→kidney yin deficiency(high)
concept đã chọn   : lục vị địa hoàng hoàn→Liuwei Dihuang Wan ; điều trị→treatment ; thận âm hư→kidney yin deficiency
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### D04 — `tứ quân tử thang điều trị tỳ khí hư`  · mode=discovery
```
input             : tứ quân tử thang điều trị tỳ khí hư
mode              : discovery
effective_query   : ("Sijunzi Tang" OR "Si Jun Zi Tang" OR "Four Gentlemen Decoction") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("spleen qi deficiency" OR "spleen deficiency" OR "spleen qi vacuity")
spans             : tứ quân tử thang·translate→Sijunzi Tang(high)  điều trị·translate→treatment(high)  tỳ khí hư·translate→spleen qi deficiency(high)
concept đã chọn   : tứ quân tử thang→Sijunzi Tang ; điều trị→treatment ; tỳ khí hư→spleen qi deficiency
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### D05 — `bán hạ bạch truật thiên ma thang điều trị chóng mặt`  · mode=discovery
```
input             : bán hạ bạch truật thiên ma thang điều trị chóng mặt
mode              : discovery
effective_query   : "Pinellia ternata Breit." ("Atractylodes macrocephala" OR "Baizhu" OR "Rhizoma Atractylodis Macrocephalae") ("Gastrodia elata" OR "Tianma" OR "Rhizoma Gastrodiae") thang ("vertigo" OR "dizziness")
spans             : bán hạ·translate→Pinellia ternata Breit.(medium)  bạch truật·translate→Atractylodes macrocephala(high)  thiên ma·translate→Gastrodia elata(high)  thang·unresolved  điều trị·translate→treatment(high)  chóng mặt·translate→vertigo(high)
concept đã chọn   : bán hạ→Pinellia ternata Breit. ; bạch truật→Atractylodes macrocephala ; thiên ma→Gastrodia elata ; điều trị→treatment ; chóng mặt→vertigo
confidence        : medium,high,high,high,high
ambiguous         : —
unresolved        : thang
needs_resolution  : false
warning           : Chưa dịch được: «thang» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: thang
engine_version    : te-v2-d1
```

### D06 — `thiên ma câu đằng ẩm điều trị tăng huyết áp`  · mode=discovery
```
input             : thiên ma câu đằng ẩm điều trị tăng huyết áp
mode              : discovery
effective_query   : ("Tianma Gouteng Yin" OR "Tian Ma Gou Teng Yin" OR "Gastrodia and Uncaria Decoction") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("hypertension" OR "high blood pressure" OR "arterial hypertension")
spans             : thiên ma câu đằng ẩm·translate→Tianma Gouteng Yin(high)  điều trị·translate→treatment(high)  tăng huyết áp·translate→hypertension(high)
concept đã chọn   : thiên ma câu đằng ẩm→Tianma Gouteng Yin ; điều trị→treatment ; tăng huyết áp→hypertension
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### D07 — `tiêu dao tán điều trị can khí uất kết`  · mode=discovery
```
input             : tiêu dao tán điều trị can khí uất kết
mode              : discovery
effective_query   : ("Xiaoyao San" OR "Xiao Yao San" OR "Free and Easy Wanderer Powder" OR "Rambling Powder") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("liver qi stagnation" OR "liver qi depression" OR "constrained liver qi")
spans             : tiêu dao tán·translate→Xiaoyao San(high)  điều trị·translate→treatment(high)  can khí uất kết·translate→liver qi stagnation(high)
concept đã chọn   : tiêu dao tán→Xiaoyao San ; điều trị→treatment ; can khí uất kết→liver qi stagnation
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### D08 — `quy tỳ thang điều trị mất ngủ`  · mode=discovery
```
input             : quy tỳ thang điều trị mất ngủ
mode              : discovery
effective_query   : quy tỳ thang ("treatment" OR "therapy" OR "therapeutic" OR "management") ("insomnia" OR "sleeplessness" OR "sleep disorder")
spans             : quy·unresolved  tỳ·unresolved  thang·unresolved  điều trị·translate→treatment(high)  mất ngủ·translate→insomnia(high)
concept đã chọn   : điều trị→treatment ; mất ngủ→insomnia
confidence        : high,high
ambiguous         : —
unresolved        : quy tỳ thang
needs_resolution  : false
warning           : Chưa dịch được: «quy tỳ thang» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: quy tỳ thang
engine_version    : te-v2-d1
```

### D09 — `ôn đởm thang điều trị đàm nhiệt nhiễu tâm`  · mode=discovery
```
input             : ôn đởm thang điều trị đàm nhiệt nhiễu tâm
mode              : discovery
effective_query   : ôn đởm thang ("treatment" OR "therapy" OR "therapeutic" OR "management") đàm nhiệt nhiễu tâm
spans             : ôn·unresolved  đởm·unresolved  thang·unresolved  điều trị·translate→treatment(high)  đàm·unresolved  nhiệt·unresolved  nhiễu·unresolved  tâm·unresolved
concept đã chọn   : điều trị→treatment
confidence        : high
ambiguous         : —
unresolved        : ôn đởm thang | đàm nhiệt nhiễu tâm
needs_resolution  : false
warning           : Chưa dịch được: «ôn đởm thang», «đàm nhiệt nhiễu tâm» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: ôn đởm thang,đàm nhiệt nhiễu tâm
engine_version    : te-v2-d1
```

### D10 — `đại thừa khí thang điều trị táo bón`  · mode=discovery
```
input             : đại thừa khí thang điều trị táo bón
mode              : discovery
effective_query   : đại thừa khí thang ("treatment" OR "therapy" OR "therapeutic" OR "management") "constipation"
spans             : đại·unresolved  thừa·unresolved  khí·unresolved  thang·unresolved  điều trị·translate→treatment(high)  táo bón·translate→constipation(high)
concept đã chọn   : điều trị→treatment ; táo bón→constipation
confidence        : high,high
ambiguous         : —
unresolved        : đại thừa khí thang
needs_resolution  : false
warning           : Chưa dịch được: «đại thừa khí thang» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: đại thừa khí thang
engine_version    : te-v2-d1
```

### E01 — `hợp cốc điều trị đau đầu`  · mode=discovery
```
input             : hợp cốc điều trị đau đầu
mode              : discovery
effective_query   : ("Hegu (LI4)" OR "LI4" OR "Large Intestine 4" OR "He Gu") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("headache" OR "cephalgia")
spans             : hợp cốc·translate→Hegu (LI4)(high)  điều trị·translate→treatment(high)  đau đầu·translate→headache(high)
concept đã chọn   : hợp cốc→Hegu (LI4) ; điều trị→treatment ; đau đầu→headache
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### E02 — `túc tam lý điều trị mệt mỏi`  · mode=discovery
```
input             : túc tam lý điều trị mệt mỏi
mode              : discovery
effective_query   : ("Zusanli (ST36)" OR "ST36" OR "Stomach 36" OR "Zu San Li") ("treatment" OR "therapy" OR "therapeutic" OR "management") mệt
spans             : túc tam lý·translate→Zusanli (ST36)(high)  điều trị·translate→treatment(high)  mệt·unresolved  mỏi·unresolved
concept đã chọn   : túc tam lý→Zusanli (ST36) ; điều trị→treatment
confidence        : high,high
ambiguous         : —
unresolved        : mệt
needs_resolution  : false
warning           : Chưa dịch được: «mệt» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: mệt | SILENT-DROP: «mỏi»
engine_version    : te-v2-d1
```

### E03 — `tam âm giao điều trị mất ngủ`  · mode=discovery
```
input             : tam âm giao điều trị mất ngủ
mode              : discovery
effective_query   : ("Sanyinjiao (SP6)" OR "SP6" OR "Spleen 6" OR "San Yin Jiao") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("insomnia" OR "sleeplessness" OR "sleep disorder")
spans             : tam âm giao·translate→Sanyinjiao (SP6)(high)  điều trị·translate→treatment(high)  mất ngủ·translate→insomnia(high)
concept đã chọn   : tam âm giao→Sanyinjiao (SP6) ; điều trị→treatment ; mất ngủ→insomnia
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### E04 — `thái xung điều trị tăng huyết áp`  · mode=discovery
```
input             : thái xung điều trị tăng huyết áp
mode              : discovery
effective_query   : ("Taichong (LR3)" OR "LR3" OR "Liver 3" OR "Tai Chong") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("hypertension" OR "high blood pressure" OR "arterial hypertension")
spans             : thái xung·translate→Taichong (LR3)(high)  điều trị·translate→treatment(high)  tăng huyết áp·translate→hypertension(high)
concept đã chọn   : thái xung→Taichong (LR3) ; điều trị→treatment ; tăng huyết áp→hypertension
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### E05 — `nội quan điều trị buồn nôn`  · mode=discovery
```
input             : nội quan điều trị buồn nôn
mode              : discovery
effective_query   : ("Neiguan (PC6)" OR "PC6" OR "Pericardium 6" OR "Nei Guan") ("treatment" OR "therapy" OR "therapeutic" OR "management") buồn nôn
spans             : nội quan·translate→Neiguan (PC6)(high)  điều trị·translate→treatment(high)  buồn·unresolved  nôn·unresolved
concept đã chọn   : nội quan→Neiguan (PC6) ; điều trị→treatment
confidence        : high,high
ambiguous         : —
unresolved        : buồn nôn
needs_resolution  : false
warning           : Chưa dịch được: «buồn nôn» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: buồn nôn
engine_version    : te-v2-d1
```

### E06 — `bách hội phục hồi chức năng sau đột quỵ`  · mode=discovery
```
input             : bách hội phục hồi chức năng sau đột quỵ
mode              : discovery
effective_query   : ("Baihui (GV20)" OR "GV20" OR "DU20" OR "Governing Vessel 20" OR "Bai Hui") ("rehabilitation" OR "recovery" OR "functional recovery") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : bách hội·translate→Baihui (GV20)(high)  phục hồi chức năng·translate→rehabilitation(high)  sau·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : bách hội→Baihui (GV20) ; phục hồi chức năng→rehabilitation ; đột quỵ→stroke
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### E07 — `phong trì điều trị đau đầu`  · mode=discovery
```
input             : phong trì điều trị đau đầu
mode              : discovery
effective_query   : ("Fengchi (GB20)" OR "GB20" OR "Gallbladder 20" OR "Feng Chi") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("headache" OR "cephalgia")
spans             : phong trì·translate→Fengchi (GB20)(high)  điều trị·translate→treatment(high)  đau đầu·translate→headache(high)
concept đã chọn   : phong trì→Fengchi (GB20) ; điều trị→treatment ; đau đầu→headache
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### E08 — `thái khê điều trị thận âm hư`  · mode=discovery
```
input             : thái khê điều trị thận âm hư
mode              : discovery
effective_query   : ("Taixi (KI3)" OR "KI3" OR "Kidney 3" OR "Tai Xi") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("kidney yin deficiency" OR "kidney yin vacuity")
spans             : thái khê·translate→Taixi (KI3)(high)  điều trị·translate→treatment(high)  thận âm hư·translate→kidney yin deficiency(high)
concept đã chọn   : thái khê→Taixi (KI3) ; điều trị→treatment ; thận âm hư→kidney yin deficiency
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### E09 — `quan nguyên điều trị tỳ thận dương hư`  · mode=discovery
```
input             : quan nguyên điều trị tỳ thận dương hư
mode              : discovery
effective_query   : ("Guanyuan (CV4)" OR "CV4" OR "RN4" OR "Conception Vessel 4" OR "Guan Yuan") tỳ ("kidney yang deficiency" OR "kidney yang vacuity")
spans             : quan nguyên·translate→Guanyuan (CV4)(high)  điều trị·translate→treatment(high)  tỳ·unresolved  thận dương hư·translate→kidney yang deficiency(high)
concept đã chọn   : quan nguyên→Guanyuan (CV4) ; điều trị→treatment ; thận dương hư→kidney yang deficiency
confidence        : high,high,high
ambiguous         : —
unresolved        : tỳ
needs_resolution  : false
warning           : Chưa dịch được: «tỳ» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: tỳ
engine_version    : te-v2-d1
```

### E10 — `huyệt trung phong điều trị đau mắt cá chân`  · mode=discovery
```
input             : huyệt trung phong điều trị đau mắt cá chân
mode              : discovery
effective_query   : ("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng") đau "Ankle Joint"
spans             : huyệt trung phong·translate→Zhongfeng (LR4)(high)  điều trị·translate→treatment(high)  đau·unresolved  mắt cá chân·translate→Ankle Joint(medium)
concept đã chọn   : huyệt trung phong→Zhongfeng (LR4) ; điều trị→treatment ; mắt cá chân→Ankle Joint
confidence        : high,high,medium
ambiguous         : —
unresolved        : đau
needs_resolution  : false
warning           : Chưa dịch được: «đau» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: đau
engine_version    : te-v2-d1
```

### F01 — `giả châm điều trị đau lưng`  · mode=evidence
```
input             : giả châm điều trị đau lưng
mode              : evidence
effective_query   : ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("low back pain" OR "lumbago" OR "lower back pain")
spans             : giả châm·translate→sham acupuncture(high)  điều trị·translate→treatment(high)  đau lưng·translate→low back pain(high)
concept đã chọn   : giả châm→sham acupuncture ; điều trị→treatment ; đau lưng→low back pain
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### F02 — `bệnh chàm điều trị bằng châm cứu`  · mode=evidence
```
input             : bệnh chàm điều trị bằng châm cứu
mode              : evidence
effective_query   : ("eczema" OR "atopic dermatitis" OR "dermatitis") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")
spans             : bệnh chàm·translate→eczema(high)  điều trị·translate→treatment(high)  bằng·unresolved  châm cứu·translate→acupuncture(high)
concept đã chọn   : bệnh chàm→eczema ; điều trị→treatment ; châm cứu→acupuncture
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : SILENT-DROP: «bằng»
engine_version    : te-v2-d1
```

### F03 — `chàm và châm cứu`  · mode=evidence
```
input             : chàm và châm cứu
mode              : evidence
effective_query   : ("eczema" OR "atopic dermatitis" OR "dermatitis") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")
spans             : chàm·translate→eczema(high)  và·unresolved  châm cứu·translate→acupuncture(high)
concept đã chọn   : chàm→eczema ; châm cứu→acupuncture
confidence        : high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : SILENT-DROP: «và»
engine_version    : te-v2-d1
```

### F04 — `trị liệu bệnh trĩ`  · mode=evidence
```
input             : trị liệu bệnh trĩ
mode              : evidence
effective_query   : ("treatment" OR "therapy" OR "therapeutic" OR "management") ("hemorrhoids" OR "haemorrhoids" OR "piles")
spans             : trị liệu·translate→treatment(high)  bệnh trĩ·translate→hemorrhoids(high)
concept đã chọn   : trị liệu→treatment ; bệnh trĩ→hemorrhoids
confidence        : high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### F05 — `điều trị trĩ bằng châm cứu`  · mode=evidence
```
input             : điều trị trĩ bằng châm cứu
mode              : evidence
effective_query   : ("treatment" OR "therapy" OR "therapeutic" OR "management") ("hemorrhoids" OR "haemorrhoids" OR "piles") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")
spans             : điều trị·translate→treatment(high)  trĩ·translate→hemorrhoids(high)  bằng·unresolved  châm cứu·translate→acupuncture(high)
concept đã chọn   : điều trị→treatment ; trĩ→hemorrhoids ; châm cứu→acupuncture
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : SILENT-DROP: «bằng»
engine_version    : te-v2-d1
```

### F06 — `trúng phong điều trị bằng điện châm`  · mode=evidence
```
input             : trúng phong điều trị bằng điện châm
mode              : evidence
effective_query   : ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture")
spans             : trúng phong·translate→stroke(high)  điều trị·translate→treatment(high)  bằng·unresolved  điện châm·translate→electroacupuncture(high)
concept đã chọn   : trúng phong→stroke ; điều trị→treatment ; điện châm→electroacupuncture
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : SILENT-DROP: «bằng»
engine_version    : te-v2-d1
```

### F07 — `huyệt trung phong trong châm cứu`  · mode=evidence
```
input             : huyệt trung phong trong châm cứu
mode              : evidence
effective_query   : ("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")
spans             : huyệt trung phong·translate→Zhongfeng (LR4)(high)  trong·unresolved  châm cứu·translate→acupuncture(high)
concept đã chọn   : huyệt trung phong→Zhongfeng (LR4) ; châm cứu→acupuncture
confidence        : high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### F08 — `trung phong và trúng phong`  · mode=evidence
```
input             : trung phong và trúng phong
mode              : evidence
effective_query   : trung phong ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : trung phong·ambiguous[lr4-zhongfeng|stroke]  và·unresolved  trúng phong·translate→stroke(high)
concept đã chọn   : trúng phong→stroke
confidence        : high
ambiguous         : trung phong{lr4-zhongfeng|stroke}:toneless-collision
unresolved        : —
needs_resolution  : true
warning           : Có 1 cụm chưa rõ nghĩa — cần chọn: «trung phong»
nhận xét (máy)    : ambiguous→needs_resolution | SILENT-DROP: «và»
engine_version    : te-v2-d1
```

### F09 — `thận hư và đau thắt lưng`  · mode=evidence
```
input             : thận hư và đau thắt lưng
mode              : evidence
effective_query   : thận ("deficiency" OR "vacuity" OR "xu") ("low back pain" OR "lumbago" OR "lower back pain")
spans             : thận·unresolved  hư·translate→deficiency(high)  và·unresolved  đau thắt lưng·translate→low back pain(high)
concept đã chọn   : hư→deficiency ; đau thắt lưng→low back pain
confidence        : high,high
ambiguous         : —
unresolved        : thận
needs_resolution  : true
warning           : Chưa dịch được: «thận» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: thận | SILENT-DROP: «và»
engine_version    : te-v2-d1
```

### F10 — `thân thể suy nhược`  · mode=evidence
```
input             : thân thể suy nhược
mode              : evidence
effective_query   : thân thể suy nhược
spans             : thân·unresolved  thể·unresolved  suy·unresolved  nhược·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : thân thể suy nhược
needs_resolution  : true
warning           : Chưa dịch được: «thân thể suy nhược» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: thân thể suy nhược
engine_version    : te-v2-d1
```

### G01 — `cham`  · mode=evidence
```
input             : cham
mode              : evidence
effective_query   : cham
spans             : cham·ambiguous[eczema|acupuncture]
concept đã chọn   : —
confidence        : —
ambiguous         : cham{eczema|acupuncture}:collision
unresolved        : —
needs_resolution  : true
warning           : Có 1 cụm chưa rõ nghĩa — cần chọn: «cham»
nhận xét (máy)    : ambiguous→needs_resolution
engine_version    : te-v2-d1
```

### G02 — `cham cuu`  · mode=evidence
```
input             : cham cuu
mode              : evidence
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")
spans             : cham cuu·translate→acupuncture(medium)
concept đã chọn   : cham cuu→acupuncture
confidence        : medium
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : ok
engine_version    : te-v2-d1
```

### G03 — `gia cham`  · mode=evidence
```
input             : gia cham
mode              : evidence
effective_query   : ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture")
spans             : gia cham·translate→sham acupuncture(medium)
concept đã chọn   : gia cham→sham acupuncture
confidence        : medium
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : ok
engine_version    : te-v2-d1
```

### G04 — `tri`  · mode=evidence
```
input             : tri
mode              : evidence
effective_query   : tri
spans             : tri·ambiguous[hemorrhoids|treatment]
concept đã chọn   : —
confidence        : —
ambiguous         : tri{hemorrhoids|treatment}:collision
unresolved        : —
needs_resolution  : true
warning           : Có 1 cụm chưa rõ nghĩa — cần chọn: «tri»
nhận xét (máy)    : ambiguous→needs_resolution
engine_version    : te-v2-d1
```

### G05 — `trung phong`  · mode=evidence
```
input             : trung phong
mode              : evidence
effective_query   : trung phong
spans             : trung phong·ambiguous[lr4-zhongfeng|stroke]
concept đã chọn   : —
confidence        : —
ambiguous         : trung phong{lr4-zhongfeng|stroke}:toneless-collision
unresolved        : —
needs_resolution  : true
warning           : Có 1 cụm chưa rõ nghĩa — cần chọn: «trung phong»
nhận xét (máy)    : ambiguous→needs_resolution
engine_version    : te-v2-d1
```

### G06 — `than`  · mode=evidence
```
input             : than
mode              : evidence
effective_query   : than
spans             : than·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : than
needs_resolution  : true
warning           : Chưa dịch được: «than» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: than
engine_version    : te-v2-d1
```

### G07 — `than hu`  · mode=evidence
```
input             : than hu
mode              : evidence
effective_query   : than ("deficiency" OR "vacuity" OR "xu")
spans             : than·unresolved  hu·translate→deficiency(medium)
concept đã chọn   : hu→deficiency
confidence        : medium
ambiguous         : —
unresolved        : than
needs_resolution  : true
warning           : Chưa dịch được: «than» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: than
engine_version    : te-v2-d1
```

### G10 — `tuc tam ly dau goi`  · mode=evidence
```
input             : tuc tam ly dau goi
mode              : evidence
effective_query   : ("Zusanli (ST36)" OR "ST36" OR "Stomach 36" OR "Zu San Li") "knee"
spans             : tuc tam ly·translate→Zusanli (ST36)(medium)  dau goi·translate→knee(medium)
concept đã chọn   : tuc tam ly→Zusanli (ST36) ; dau goi→knee
confidence        : medium,medium
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : ok
engine_version    : te-v2-d1
```

### G08 — `dien cham dot quy`  · mode=discovery
```
input             : dien cham dot quy
mode              : discovery
effective_query   : ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : dien cham·translate→electroacupuncture(medium)  dot quy·translate→stroke(medium)
concept đã chọn   : dien cham→electroacupuncture ; dot quy→stroke
confidence        : medium,medium
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : ok
engine_version    : te-v2-d1
```

### G09 — `hoang ky tieu duong`  · mode=discovery
```
input             : hoang ky tieu duong
mode              : discovery
effective_query   : ("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") ("diabetes mellitus" OR "diabetes" OR "type 2 diabetes")
spans             : hoang ky·translate→Astragalus membranaceus(medium)  tieu duong·translate→diabetes mellitus(medium)
concept đã chọn   : hoang ky→Astragalus membranaceus ; tieu duong→diabetes mellitus
confidence        : medium,medium
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : ok
engine_version    : te-v2-d1
```

### H01 — `châm cưu điều trị đau lưng`  · mode=discovery
```
input             : châm cưu điều trị đau lưng
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") cưu ("low back pain" OR "lumbago" OR "lower back pain")
spans             : châm·translate→acupuncture(high)  cưu·unresolved  điều trị·translate→treatment(high)  đau lưng·translate→low back pain(high)
concept đã chọn   : châm→acupuncture ; điều trị→treatment ; đau lưng→low back pain
confidence        : high,high,high
ambiguous         : —
unresolved        : cưu
needs_resolution  : false
warning           : Chưa dịch được: «cưu» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: cưu
engine_version    : te-v2-d1
```

### H02 — `điện châm điêu trị đột quỵ`  · mode=discovery
```
input             : điện châm điêu trị đột quỵ
mode              : discovery
effective_query   : ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : điện châm·translate→electroacupuncture(high)  điêu·unresolved  trị·translate→treatment(high)  đột quỵ·translate→stroke(high)
concept đã chọn   : điện châm→electroacupuncture ; trị→treatment ; đột quỵ→stroke
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : SILENT-DROP: «điêu»
engine_version    : te-v2-d1
```

### H03 — `hoàng kì điều trị mệt mỏi`  · mode=discovery
```
input             : hoàng kì điều trị mệt mỏi
mode              : discovery
effective_query   : ("Astragalus propinquus" OR "Astragalus membranaceus") ("treatment" OR "therapy" OR "therapeutic" OR "management") mệt
spans             : hoàng kì·translate→Astragalus propinquus(high)  điều trị·translate→treatment(high)  mệt·unresolved  mỏi·unresolved
concept đã chọn   : hoàng kì→Astragalus propinquus ; điều trị→treatment
confidence        : high,high
ambiguous         : —
unresolved        : mệt
needs_resolution  : false
warning           : Chưa dịch được: «mệt» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: mệt | SILENT-DROP: «mỏi»
engine_version    : te-v2-d1
```

### H04 — `túc tam lí đau khớp gối`  · mode=discovery
```
input             : túc tam lí đau khớp gối
mode              : discovery
effective_query   : túc tam lí "arthralgia" gối
spans             : túc·unresolved  tam·unresolved  lí·unresolved  đau khớp·translate→arthralgia(medium)  gối·unresolved
concept đã chọn   : đau khớp→arthralgia
confidence        : medium
ambiguous         : —
unresolved        : túc tam lí | gối
needs_resolution  : false
warning           : Chưa dịch được: «túc tam lí», «gối» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: túc tam lí,gối
engine_version    : te-v2-d1
```

### H05 — `đột quị phục hồi chức năng`  · mode=discovery
```
input             : đột quị phục hồi chức năng
mode              : discovery
effective_query   : đột quị ("rehabilitation" OR "recovery" OR "functional recovery")
spans             : đột·unresolved  quị·unresolved  phục hồi chức năng·translate→rehabilitation(high)
concept đã chọn   : phục hồi chức năng→rehabilitation
confidence        : high
ambiguous         : —
unresolved        : đột quị
needs_resolution  : false
warning           : Chưa dịch được: «đột quị» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: đột quị
engine_version    : te-v2-d1
```

### H06 — `tỳ khi hư`  · mode=discovery
```
input             : tỳ khi hư
mode              : discovery
effective_query   : tỳ ("deficiency" OR "vacuity" OR "xu")
spans             : tỳ·unresolved  khi·unresolved  hư·translate→deficiency(high)
concept đã chọn   : hư→deficiency
confidence        : high
ambiguous         : —
unresolved        : tỳ
needs_resolution  : false
warning           : Chưa dịch được: «tỳ» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: tỳ
engine_version    : te-v2-d1
```

### H07 — `thận âm hư hoả vượng`  · mode=discovery
```
input             : thận âm hư hoả vượng
mode              : discovery
effective_query   : ("kidney yin deficiency" OR "kidney yin vacuity") hoả vượng
spans             : thận âm hư·translate→kidney yin deficiency(high)  hoả·unresolved  vượng·unresolved
concept đã chọn   : thận âm hư→kidney yin deficiency
confidence        : high
ambiguous         : —
unresolved        : hoả vượng
needs_resolution  : false
warning           : Chưa dịch được: «hoả vượng» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: hoả vượng
engine_version    : te-v2-d1
```

### H08 — `châm cứu tri đau lưng`  · mode=discovery
```
input             : châm cứu tri đau lưng
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") tri ("low back pain" OR "lumbago" OR "lower back pain")
spans             : châm cứu·translate→acupuncture(high)  tri·ambiguous[hemorrhoids|treatment]  đau lưng·translate→low back pain(high)
concept đã chọn   : châm cứu→acupuncture ; đau lưng→low back pain
confidence        : high,high
ambiguous         : tri{hemorrhoids|treatment}:collision
unresolved        : —
needs_resolution  : false
warning           : Có 1 cụm chưa rõ nghĩa — cần chọn: «tri»
nhận xét (máy)    : ambiguous→kept-verbatim(discovery)
engine_version    : te-v2-d1
```

### H09 — `phong tri đau đầu`  · mode=discovery
```
input             : phong tri đau đầu
mode              : discovery
effective_query   : ("Fengchi (GB20)" OR "GB20" OR "Gallbladder 20" OR "Feng Chi") ("headache" OR "cephalgia")
spans             : phong tri·translate→Fengchi (GB20)(medium)  đau đầu·translate→headache(high)
concept đã chọn   : phong tri→Fengchi (GB20) ; đau đầu→headache
confidence        : medium,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### H10 — `tam am giao mat ngu`  · mode=discovery
```
input             : tam am giao mat ngu
mode              : discovery
effective_query   : ("Sanyinjiao (SP6)" OR "SP6" OR "Spleen 6" OR "San Yin Jiao") ("insomnia" OR "sleeplessness" OR "sleep disorder")
spans             : tam am giao·translate→Sanyinjiao (SP6)(medium)  mat ngu·translate→insomnia(medium)
concept đã chọn   : tam am giao→Sanyinjiao (SP6) ; mat ngu→insomnia
confidence        : medium,medium
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : ok
engine_version    : te-v2-d1
```

### I01 — `针灸治疗中风后偏瘫`  · mode=discovery
```
input             : 针灸治疗中风后偏瘫
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") ("hemiplegia" OR "hemiparesis")
spans             : 针灸·translate→acupuncture(high)  治疗·translate→treatment(high)  中风·translate→stroke(high)  后·unresolved  偏瘫·translate→hemiplegia(high)
concept đã chọn   : 针灸→acupuncture ; 治疗→treatment ; 中风→stroke ; 偏瘫→hemiplegia
confidence        : high,high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### I02 — `电针预防脑卒中复发`  · mode=discovery
```
input             : 电针预防脑卒中复发
mode              : discovery
effective_query   : ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("prevention" OR "prophylaxis" OR "preventive" OR "prophylactic") "part of the brain" ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") 复发
spans             : 电针·translate→electroacupuncture(high)  预防·translate→prevention(high)  脑·translate→part of the brain(medium)  卒中·translate→stroke(high)  复发·unresolved
concept đã chọn   : 电针→electroacupuncture ; 预防→prevention ; 脑→part of the brain ; 卒中→stroke
confidence        : high,high,medium,high
ambiguous         : —
unresolved        : 复发
needs_resolution  : false
warning           : Chưa dịch được: «复发» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: 复发 | SUSPECT-MAP: 脑→part of the brain
engine_version    : te-v2-d1
```

### I03 — `针刺联合康复训练治疗脑卒中`  · mode=discovery
```
input             : 针刺联合康复训练治疗脑卒中
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("rehabilitation" OR "recovery" OR "functional recovery") 训练 "part of the brain" ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : 针刺·translate→acupuncture(high)  联合·translate→combined therapy(high)  康复·translate→rehabilitation(high)  训练·unresolved  治疗·translate→treatment(high)  脑·translate→part of the brain(medium)  卒中·translate→stroke(high)
concept đã chọn   : 针刺→acupuncture ; 联合→combined therapy ; 康复→rehabilitation ; 治疗→treatment ; 脑→part of the brain ; 卒中→stroke
confidence        : high,high,high,high,medium,high
ambiguous         : —
unresolved        : 训练
needs_resolution  : false
warning           : Chưa dịch được: «训练» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: 训练 | SUSPECT-MAP: 脑→part of the brain
engine_version    : te-v2-d1
```

### I04 — `假针刺对照随机临床试验`  · mode=discovery
```
input             : 假针刺对照随机临床试验
mode              : discovery
effective_query   : ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") 刺照随机试验
spans             : 假针·translate→sham acupuncture(high)  刺对照随机临床试验·unresolved
concept đã chọn   : 假针→sham acupuncture
confidence        : high
ambiguous         : —
unresolved        : 刺照随机试验
needs_resolution  : false
warning           : Chưa dịch được: «刺照随机试验» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: 刺照随机试验
engine_version    : te-v2-d1
```

### I05 — `针灸治疗失眠`  · mode=discovery
```
input             : 针灸治疗失眠
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("insomnia" OR "sleeplessness" OR "sleep disorder")
spans             : 针灸·translate→acupuncture(high)  治疗·translate→treatment(high)  失眠·translate→insomnia(high)
concept đã chọn   : 针灸→acupuncture ; 治疗→treatment ; 失眠→insomnia
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### I06 — `黄芪治疗脑卒中后疲劳`  · mode=discovery
```
input             : 黄芪治疗脑卒中后疲劳
mode              : discovery
effective_query   : ("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") "part of the brain" ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") 疲劳
spans             : 黄芪·translate→Astragalus membranaceus(high)  治疗·translate→treatment(high)  脑·translate→part of the brain(medium)  卒中·translate→stroke(high)  后疲劳·unresolved
concept đã chọn   : 黄芪→Astragalus membranaceus ; 治疗→treatment ; 脑→part of the brain ; 卒中→stroke
confidence        : high,high,medium,high
ambiguous         : —
unresolved        : 疲劳
needs_resolution  : false
warning           : Chưa dịch được: «疲劳» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: 疲劳 | SUSPECT-MAP: 脑→part of the brain
engine_version    : te-v2-d1
```

### I07 — `补阳还五汤治疗脑卒中`  · mode=discovery
```
input             : 补阳还五汤治疗脑卒中
mode              : discovery
effective_query   : ("Buyang Huanwu Tang" OR "Bu Yang Huan Wu Tang" OR "Supplement Yang to Restore Five Tenths Decoction") "part of the brain" ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : 补阳还五汤·translate→Buyang Huanwu Tang(high)  治疗·translate→treatment(high)  脑·translate→part of the brain(medium)  卒中·translate→stroke(high)
concept đã chọn   : 补阳还五汤→Buyang Huanwu Tang ; 治疗→treatment ; 脑→part of the brain ; 卒中→stroke
confidence        : high,high,medium,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : SUSPECT-MAP: 脑→part of the brain
engine_version    : te-v2-d1
```

### I08 — `肝气郁结失眠针灸治疗`  · mode=discovery
```
input             : 肝气郁结失眠针灸治疗
mode              : discovery
effective_query   : ("liver qi stagnation" OR "liver qi depression" OR "constrained liver qi") ("insomnia" OR "sleeplessness" OR "sleep disorder") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")
spans             : 肝气郁结·translate→liver qi stagnation(high)  失眠·translate→insomnia(high)  针灸·translate→acupuncture(high)  治疗·translate→treatment(high)
concept đã chọn   : 肝气郁结→liver qi stagnation ; 失眠→insomnia ; 针灸→acupuncture ; 治疗→treatment
confidence        : high,high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### I09 — `腎陰虛針灸治療`  · mode=discovery
```
input             : 腎陰虛針灸治療
mode              : discovery
effective_query   : 腎陰虛針灸
spans             : 腎陰虛針灸治療·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : 腎陰虛針灸
needs_resolution  : false
warning           : Chưa dịch được: «腎陰虛針灸» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: 腎陰虛針灸
engine_version    : te-v2-d1
```

### I10 — `黃芪與當歸治療氣血兩虛`  · mode=discovery
```
input             : 黃芪與當歸治療氣血兩虛
mode              : discovery
effective_query   : ("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") "Angelica sinensis Diels" 氣血兩虛
spans             : 黃芪·translate→Astragalus membranaceus(high)  與·unresolved  當歸·translate→Angelica sinensis Diels(medium)  治療氣血兩虛·unresolved
concept đã chọn   : 黃芪→Astragalus membranaceus ; 當歸→Angelica sinensis Diels
confidence        : high,medium
ambiguous         : —
unresolved        : 氣血兩虛
needs_resolution  : false
warning           : Chưa dịch được: «氣血兩虛» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: 氣血兩虛
engine_version    : te-v2-d1
```

### J01 — `zhēn jiǔ zhì liáo zhōng fēng`  · mode=discovery
```
input             : zhēn jiǔ zhì liáo zhōng fēng
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") zhì liáo "Zhongfeng"
spans             : zhēn jiǔ·translate→acupuncture(high)  zhì·unresolved  liáo·unresolved  zhōng fēng·translate→Zhongfeng(medium)
concept đã chọn   : zhēn jiǔ→acupuncture ; zhōng fēng→Zhongfeng
confidence        : high,medium
ambiguous         : —
unresolved        : zhì liáo
needs_resolution  : false
warning           : Chưa dịch được: «zhì liáo» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: zhì liáo
engine_version    : te-v2-d1
```

### J02 — `diàn zhēn nǎo zú zhòng`  · mode=discovery
```
input             : diàn zhēn nǎo zú zhòng
mode              : discovery
effective_query   : ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") nǎo zú zhòng
spans             : diàn zhēn·translate→electroacupuncture(high)  nǎo·unresolved  zú·unresolved  zhòng·unresolved
concept đã chọn   : diàn zhēn→electroacupuncture
confidence        : high
ambiguous         : —
unresolved        : nǎo zú zhòng
needs_resolution  : false
warning           : Chưa dịch được: «nǎo zú zhòng» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: nǎo zú zhòng
engine_version    : te-v2-d1
```

### J03 — `huáng qí`  · mode=discovery
```
input             : huáng qí
mode              : discovery
effective_query   : ("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus")
spans             : huáng qí·translate→Astragalus membranaceus(high)
concept đã chọn   : huáng qí→Astragalus membranaceus
confidence        : high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### J04 — `dāng guī`  · mode=discovery
```
input             : dāng guī
mode              : discovery
effective_query   : ("Angelica sinensis" OR "Danggui" OR "Dong quai" OR "Radix Angelicae Sinensis")
spans             : dāng guī·translate→Angelica sinensis(high)
concept đã chọn   : dāng guī→Angelica sinensis
confidence        : high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### J05 — `bǔ yáng huán wǔ tāng`  · mode=discovery
```
input             : bǔ yáng huán wǔ tāng
mode              : discovery
effective_query   : bǔ yáng huán wǔ tāng
spans             : bǔ·unresolved  yáng·unresolved  huán·unresolved  wǔ·unresolved  tāng·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : bǔ yáng huán wǔ tāng
needs_resolution  : false
warning           : Chưa dịch được: «bǔ yáng huán wǔ tāng» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: bǔ yáng huán wǔ tāng
engine_version    : te-v2-d1
```

### J06 — `zú sān lǐ`  · mode=discovery
```
input             : zú sān lǐ
mode              : discovery
effective_query   : ("Zusanli (ST36)" OR "ST36" OR "Stomach 36" OR "Zu San Li")
spans             : zú sān lǐ·translate→Zusanli (ST36)(high)
concept đã chọn   : zú sān lǐ→Zusanli (ST36)
confidence        : high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### J07 — `hé gǔ`  · mode=discovery
```
input             : hé gǔ
mode              : discovery
effective_query   : "Hegu"
spans             : hé gǔ·translate→Hegu(medium)
concept đã chọn   : hé gǔ→Hegu
confidence        : medium
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : ok
engine_version    : te-v2-d1
```

### J08 — `tai chong`  · mode=discovery
```
input             : tai chong
mode              : discovery
effective_query   : "Taichong"
spans             : tai chong·translate→Taichong(medium)
concept đã chọn   : tai chong→Taichong
confidence        : medium
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : ok
engine_version    : te-v2-d1
```

### J09 — `zhong feng`  · mode=discovery
```
input             : zhong feng
mode              : discovery
effective_query   : "Zhongfeng"
spans             : zhong feng·translate→Zhongfeng(medium)
concept đã chọn   : zhong feng→Zhongfeng
confidence        : medium
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : ok
engine_version    : te-v2-d1
```

### J10 — `zhen jiu stroke rehabilitation`  · mode=discovery
```
input             : zhen jiu stroke rehabilitation
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") stroke rehabilitation
spans             : zhen jiu·translate→acupuncture(medium)  stroke·unresolved  rehabilitation·unresolved
concept đã chọn   : zhen jiu→acupuncture
confidence        : medium
ambiguous         : —
unresolved        : stroke rehabilitation
needs_resolution  : false
warning           : Chưa dịch được: «stroke rehabilitation» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: stroke rehabilitation
engine_version    : te-v2-d1
```

### K01 — `điện châm stroke rehabilitation RCT`  · mode=discovery
```
input             : điện châm stroke rehabilitation RCT
mode              : discovery
effective_query   : ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") stroke rehabilitation rct
spans             : điện châm·translate→electroacupuncture(high)  stroke·unresolved  rehabilitation·unresolved  rct·unresolved
concept đã chọn   : điện châm→electroacupuncture
confidence        : high
ambiguous         : —
unresolved        : stroke rehabilitation rct
needs_resolution  : false
warning           : Chưa dịch được: «stroke rehabilitation rct» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: stroke rehabilitation rct
engine_version    : te-v2-d1
```

### K02 — `châm cứu low back pain systematic review`  · mode=discovery
```
input             : châm cứu low back pain systematic review
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") low back pain systematic review
spans             : châm cứu·translate→acupuncture(high)  low·unresolved  back·unresolved  pain·unresolved  systematic·unresolved  review·unresolved
concept đã chọn   : châm cứu→acupuncture
confidence        : high
ambiguous         : —
unresolved        : low back pain systematic review
needs_resolution  : false
warning           : Chưa dịch được: «low back pain systematic review» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: low back pain systematic review
engine_version    : te-v2-d1
```

### K03 — `hoàng kỳ post-stroke fatigue`  · mode=discovery
```
input             : hoàng kỳ post-stroke fatigue
mode              : discovery
effective_query   : ("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") post-stroke fatigue
spans             : hoàng kỳ·translate→Astragalus membranaceus(high)  post-stroke·unresolved  fatigue·unresolved
concept đã chọn   : hoàng kỳ→Astragalus membranaceus
confidence        : high
ambiguous         : —
unresolved        : post-stroke fatigue
needs_resolution  : false
warning           : Chưa dịch được: «post-stroke fatigue» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: post-stroke fatigue
engine_version    : te-v2-d1
```

### K04 — `giả châm sham controlled trial`  · mode=discovery
```
input             : giả châm sham controlled trial
mode              : discovery
effective_query   : ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") sham controlled trial
spans             : giả châm·translate→sham acupuncture(high)  sham·unresolved  controlled·unresolved  trial·unresolved
concept đã chọn   : giả châm→sham acupuncture
confidence        : high
ambiguous         : —
unresolved        : sham controlled trial
needs_resolution  : false
warning           : Chưa dịch được: «sham controlled trial» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: sham controlled trial
engine_version    : te-v2-d1
```

### K05 — `thận âm hư tinnitus acupuncture`  · mode=discovery
```
input             : thận âm hư tinnitus acupuncture
mode              : discovery
effective_query   : ("kidney yin deficiency" OR "kidney yin vacuity") tinnitus acupuncture
spans             : thận âm hư·translate→kidney yin deficiency(high)  tinnitus·unresolved  acupuncture·unresolved
concept đã chọn   : thận âm hư→kidney yin deficiency
confidence        : high
ambiguous         : —
unresolved        : tinnitus acupuncture
needs_resolution  : false
warning           : Chưa dịch được: «tinnitus acupuncture» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: tinnitus acupuncture
engine_version    : te-v2-d1
```

### K06 — `can khí uất kết depression`  · mode=discovery
```
input             : can khí uất kết depression
mode              : discovery
effective_query   : ("liver qi stagnation" OR "liver qi depression" OR "constrained liver qi") depression
spans             : can khí uất kết·translate→liver qi stagnation(high)  depression·unresolved
concept đã chọn   : can khí uất kết→liver qi stagnation
confidence        : high
ambiguous         : —
unresolved        : depression
needs_resolution  : false
warning           : Chưa dịch được: «depression» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: depression
engine_version    : te-v2-d1
```

### K07 — `bổ dương hoàn ngũ thang stroke meta-analysis`  · mode=discovery
```
input             : bổ dương hoàn ngũ thang stroke meta-analysis
mode              : discovery
effective_query   : ("Buyang Huanwu Tang" OR "Bu Yang Huan Wu Tang" OR "Supplement Yang to Restore Five Tenths Decoction") stroke meta-analysis
spans             : bổ dương hoàn ngũ thang·translate→Buyang Huanwu Tang(high)  stroke·unresolved  meta-analysis·unresolved
concept đã chọn   : bổ dương hoàn ngũ thang→Buyang Huanwu Tang
confidence        : high
ambiguous         : —
unresolved        : stroke meta-analysis
needs_resolution  : false
warning           : Chưa dịch được: «stroke meta-analysis» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: stroke meta-analysis
engine_version    : te-v2-d1
```

### K08 — `bách hội GV20 stroke rehabilitation`  · mode=discovery
```
input             : bách hội GV20 stroke rehabilitation
mode              : discovery
effective_query   : ("Baihui (GV20)" OR "GV20" OR "DU20" OR "Governing Vessel 20" OR "Bai Hui") gv20 stroke rehabilitation
spans             : bách hội·translate→Baihui (GV20)(high)  gv20·unresolved  stroke·unresolved  rehabilitation·unresolved
concept đã chọn   : bách hội→Baihui (GV20)
confidence        : high
ambiguous         : —
unresolved        : gv20 stroke rehabilitation
needs_resolution  : false
warning           : Chưa dịch được: «gv20 stroke rehabilitation» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: gv20 stroke rehabilitation
engine_version    : te-v2-d1
```

### K09 — `túc tam lý ST36 fatigue`  · mode=discovery
```
input             : túc tam lý ST36 fatigue
mode              : discovery
effective_query   : ("Zusanli (ST36)" OR "ST36" OR "Stomach 36" OR "Zu San Li") st36 fatigue
spans             : túc tam lý·translate→Zusanli (ST36)(high)  st36·unresolved  fatigue·unresolved
concept đã chọn   : túc tam lý→Zusanli (ST36)
confidence        : high
ambiguous         : —
unresolved        : st36 fatigue
needs_resolution  : false
warning           : Chưa dịch được: «st36 fatigue» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: st36 fatigue
engine_version    : te-v2-d1
```

### K10 — `acupuncture điều trị đau thần kinh sau zona`  · mode=discovery
```
input             : acupuncture điều trị đau thần kinh sau zona
mode              : discovery
effective_query   : acupuncture "nephralgia" kinh zona
spans             : acupuncture·unresolved  điều trị·translate→treatment(high)  đau thần·translate→nephralgia(medium)  kinh·unresolved  sau·unresolved  zona·unresolved
concept đã chọn   : điều trị→treatment ; đau thần→nephralgia
confidence        : high,medium
ambiguous         : —
unresolved        : acupuncture | kinh zona
needs_resolution  : false
warning           : Chưa dịch được: «acupuncture», «kinh zona» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: acupuncture,kinh zona | SUSPECT-MAP: đau thần→nephralgia
engine_version    : te-v2-d1
```

### L01 — `điện châm 中风 康复`  · mode=discovery
```
input             : điện châm 中风 康复
mode              : discovery
effective_query   : ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") ("rehabilitation" OR "recovery" OR "functional recovery")
spans             : điện châm·translate→electroacupuncture(high)  中风·translate→stroke(high)  康复·translate→rehabilitation(high)
concept đã chọn   : điện châm→electroacupuncture ; 中风→stroke ; 康复→rehabilitation
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### L02 — `针灸 điều trị đột quỵ`  · mode=discovery
```
input             : 针灸 điều trị đột quỵ
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : 针灸·translate→acupuncture(high)  điều trị·translate→treatment(high)  đột quỵ·translate→stroke(high)
concept đã chọn   : 针灸→acupuncture ; điều trị→treatment ; đột quỵ→stroke
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### L03 — `hoàng kỳ 黄芪 stroke`  · mode=discovery
```
input             : hoàng kỳ 黄芪 stroke
mode              : discovery
effective_query   : ("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") ("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") stroke
spans             : hoàng kỳ·translate→Astragalus membranaceus(high)  黄芪·translate→Astragalus membranaceus(high)  stroke·unresolved
concept đã chọn   : hoàng kỳ→Astragalus membranaceus ; 黄芪→Astragalus membranaceus
confidence        : high,high
ambiguous         : —
unresolved        : stroke
needs_resolution  : false
warning           : Chưa dịch được: «stroke» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: stroke
engine_version    : te-v2-d1
```

### L04 — `giả châm 假针刺 randomized trial`  · mode=discovery
```
input             : giả châm 假针刺 randomized trial
mode              : discovery
effective_query   : ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") 刺 randomized trial
spans             : giả châm·translate→sham acupuncture(high)  假针·translate→sham acupuncture(high)  刺·unresolved  randomized·unresolved  trial·unresolved
concept đã chọn   : giả châm→sham acupuncture ; 假针→sham acupuncture
confidence        : high,high
ambiguous         : —
unresolved        : 刺 randomized trial
needs_resolution  : false
warning           : Chưa dịch được: «刺 randomized trial» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: 刺 randomized trial
engine_version    : te-v2-d1
```

### L05 — `can khí uất kết 肝气郁结`  · mode=discovery
```
input             : can khí uất kết 肝气郁结
mode              : discovery
effective_query   : ("liver qi stagnation" OR "liver qi depression" OR "constrained liver qi") ("liver qi stagnation" OR "liver qi depression" OR "constrained liver qi")
spans             : can khí uất kết·translate→liver qi stagnation(high)  肝气郁结·translate→liver qi stagnation(high)
concept đã chọn   : can khí uất kết→liver qi stagnation ; 肝气郁结→liver qi stagnation
confidence        : high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### L06 — `túc tam lý 足三里 đau khớp gối`  · mode=discovery
```
input             : túc tam lý 足三里 đau khớp gối
mode              : discovery
effective_query   : ("Zusanli (ST36)" OR "ST36" OR "Stomach 36" OR "Zu San Li") ("Zusanli (ST36)" OR "ST36" OR "Stomach 36" OR "Zu San Li") "arthralgia" gối
spans             : túc tam lý·translate→Zusanli (ST36)(high)  足三里·translate→Zusanli (ST36)(high)  đau khớp·translate→arthralgia(medium)  gối·unresolved
concept đã chọn   : túc tam lý→Zusanli (ST36) ; 足三里→Zusanli (ST36) ; đau khớp→arthralgia
confidence        : high,high,medium
ambiguous         : —
unresolved        : gối
needs_resolution  : false
warning           : Chưa dịch được: «gối» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: gối
engine_version    : te-v2-d1
```

### L07 — `中封 huyệt trung phong`  · mode=discovery
```
input             : 中封 huyệt trung phong
mode              : discovery
effective_query   : ("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng") ("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng")
spans             : 中封·translate→Zhongfeng (LR4)(high)  huyệt trung phong·translate→Zhongfeng (LR4)(high)
concept đã chọn   : 中封→Zhongfeng (LR4) ; huyệt trung phong→Zhongfeng (LR4)
confidence        : high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### L08 — `trúng phong 中风 phục hồi`  · mode=discovery
```
input             : trúng phong 中风 phục hồi
mode              : discovery
effective_query   : ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") ("rehabilitation" OR "recovery" OR "functional recovery")
spans             : trúng phong·translate→stroke(high)  中风·translate→stroke(high)  phục hồi·translate→rehabilitation(high)
concept đã chọn   : trúng phong→stroke ; 中风→stroke ; phục hồi→rehabilitation
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### L09 — `补阳还五汤 di chứng đột quỵ`  · mode=discovery
```
input             : 补阳还五汤 di chứng đột quỵ
mode              : discovery
effective_query   : ("Buyang Huanwu Tang" OR "Bu Yang Huan Wu Tang" OR "Supplement Yang to Restore Five Tenths Decoction") di chứng ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : 补阳还五汤·translate→Buyang Huanwu Tang(high)  di·unresolved  chứng·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : 补阳还五汤→Buyang Huanwu Tang ; đột quỵ→stroke
confidence        : high,high
ambiguous         : —
unresolved        : di chứng
needs_resolution  : false
warning           : Chưa dịch được: «di chứng» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: di chứng
engine_version    : te-v2-d1
```

### L10 — `thận âm hư 腎陰虛 tinnitus`  · mode=discovery
```
input             : thận âm hư 腎陰虛 tinnitus
mode              : discovery
effective_query   : ("kidney yin deficiency" OR "kidney yin vacuity") 腎陰虛 tinnitus
spans             : thận âm hư·translate→kidney yin deficiency(high)  腎陰虛·unresolved  tinnitus·unresolved
concept đã chọn   : thận âm hư→kidney yin deficiency
confidence        : high
ambiguous         : —
unresolved        : 腎陰虛 tinnitus
needs_resolution  : false
warning           : Chưa dịch được: «腎陰虛 tinnitus» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: 腎陰虛 tinnitus
engine_version    : te-v2-d1
```

### M01 — `thử nghiệm lâm sàng ngẫu nhiên có đối chứng điện châm đột quỵ`  · mode=discovery
```
input             : thử nghiệm lâm sàng ngẫu nhiên có đối chứng điện châm đột quỵ
mode              : discovery
effective_query   : thử lâm sàng đối chứng ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : thử·unresolved  nghiệm·unresolved  lâm·unresolved  sàng·unresolved  ngẫu·unresolved  nhiên·unresolved  có·unresolved  đối·unresolved  chứng·unresolved  điện châm·translate→electroacupuncture(high)  đột quỵ·translate→stroke(high)
concept đã chọn   : điện châm→electroacupuncture ; đột quỵ→stroke
confidence        : high,high
ambiguous         : —
unresolved        : thử lâm sàng đối chứng
needs_resolution  : false
warning           : Chưa dịch được: «thử lâm sàng đối chứng» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: thử lâm sàng đối chứng | SILENT-DROP: «nghiệm» | SILENT-DROP: «ngẫu» | SILENT-DROP: «nhiên» | SILENT-DROP: «có»
engine_version    : te-v2-d1
```

### M02 — `điện châm đột quỵ randomized controlled trial`  · mode=discovery
```
input             : điện châm đột quỵ randomized controlled trial
mode              : discovery
effective_query   : ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") randomized controlled trial
spans             : điện châm·translate→electroacupuncture(high)  đột quỵ·translate→stroke(high)  randomized·unresolved  controlled·unresolved  trial·unresolved
concept đã chọn   : điện châm→electroacupuncture ; đột quỵ→stroke
confidence        : high,high
ambiguous         : —
unresolved        : randomized controlled trial
needs_resolution  : false
warning           : Chưa dịch được: «randomized controlled trial» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: randomized controlled trial
engine_version    : te-v2-d1
```

### M03 — `tổng quan hệ thống châm cứu điều trị đau lưng`  · mode=discovery
```
input             : tổng quan hệ thống châm cứu điều trị đau lưng
mode              : discovery
effective_query   : ("systematic review" OR "meta-analysis") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("low back pain" OR "lumbago" OR "lower back pain")
spans             : tổng quan hệ thống·translate→systematic review(high)  châm cứu·translate→acupuncture(high)  điều trị·translate→treatment(high)  đau lưng·translate→low back pain(high)
concept đã chọn   : tổng quan hệ thống→systematic review ; châm cứu→acupuncture ; điều trị→treatment ; đau lưng→low back pain
confidence        : high,high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### M04 — `phân tích gộp châm cứu điều trị mất ngủ`  · mode=discovery
```
input             : phân tích gộp châm cứu điều trị mất ngủ
mode              : discovery
effective_query   : ("systematic review" OR "meta-analysis") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("insomnia" OR "sleeplessness" OR "sleep disorder")
spans             : phân tích gộp·translate→systematic review(high)  châm cứu·translate→acupuncture(high)  điều trị·translate→treatment(high)  mất ngủ·translate→insomnia(high)
concept đã chọn   : phân tích gộp→systematic review ; châm cứu→acupuncture ; điều trị→treatment ; mất ngủ→insomnia
confidence        : high,high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### M05 — `nghiên cứu đoàn hệ châm cứu và đột quỵ`  · mode=discovery
```
input             : nghiên cứu đoàn hệ châm cứu và đột quỵ
mode              : discovery
effective_query   : cứu đoàn hệ ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : nghiên·unresolved  cứu·unresolved  đoàn·unresolved  hệ·unresolved  châm cứu·translate→acupuncture(high)  và·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : châm cứu→acupuncture ; đột quỵ→stroke
confidence        : high,high
ambiguous         : —
unresolved        : cứu đoàn hệ
needs_resolution  : false
warning           : Chưa dịch được: «cứu đoàn hệ» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: cứu đoàn hệ | SILENT-DROP: «nghiên» | SILENT-DROP: «và»
engine_version    : te-v2-d1
```

### M06 — `nghiên cứu bệnh chứng yếu tố nguy cơ đột quỵ`  · mode=discovery
```
input             : nghiên cứu bệnh chứng yếu tố nguy cơ đột quỵ
mode              : discovery
effective_query   : cứu chứng yếu tố nguy cơ ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : nghiên·unresolved  cứu·unresolved  bệnh·unresolved  chứng·unresolved  yếu·unresolved  tố·unresolved  nguy·unresolved  cơ·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : đột quỵ→stroke
confidence        : high
ambiguous         : —
unresolved        : cứu chứng yếu tố nguy cơ
needs_resolution  : false
warning           : Chưa dịch được: «cứu chứng yếu tố nguy cơ» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: cứu chứng yếu tố nguy cơ | SILENT-DROP: «nghiên» | SILENT-DROP: «bệnh»
engine_version    : te-v2-d1
```

### M07 — `tác dụng không mong muốn của điện châm`  · mode=discovery
```
input             : tác dụng không mong muốn của điện châm
mode              : discovery
effective_query   : mong muốn ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture")
spans             : tác·unresolved  dụng·unresolved  không·unresolved  mong·unresolved  muốn·unresolved  của·unresolved  điện châm·translate→electroacupuncture(high)
concept đã chọn   : điện châm→electroacupuncture
confidence        : high
ambiguous         : —
unresolved        : mong muốn
needs_resolution  : false
warning           : Chưa dịch được: «mong muốn» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: mong muốn | SILENT-DROP: «tác» | SILENT-DROP: «dụng» | SILENT-DROP: «không» | SILENT-DROP: «của»
engine_version    : te-v2-d1
```

### M08 — `an toàn của châm cứu ở người cao tuổi`  · mode=discovery
```
input             : an toàn của châm cứu ở người cao tuổi
mode              : discovery
effective_query   : ("safety" OR "tolerability" OR "adverse events") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") người cao tuổi
spans             : an toàn·translate→safety(high)  của·unresolved  châm cứu·translate→acupuncture(high)  ở·unresolved  người·unresolved  cao·unresolved  tuổi·unresolved
concept đã chọn   : an toàn→safety ; châm cứu→acupuncture
confidence        : high,high
ambiguous         : —
unresolved        : người cao tuổi
needs_resolution  : false
warning           : Chưa dịch được: «người cao tuổi» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: người cao tuổi | SILENT-DROP: «của»
engine_version    : te-v2-d1
```

### M09 — `sham acupuncture double blind randomized trial`  · mode=discovery
```
input             : sham acupuncture double blind randomized trial
mode              : discovery
effective_query   : sham acupuncture double blind randomized trial
spans             : sham·unresolved  acupuncture·unresolved  double·unresolved  blind·unresolved  randomized·unresolved  trial·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : sham acupuncture double blind randomized trial
needs_resolution  : false
warning           : Chưa dịch được: «sham acupuncture double blind randomized trial» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: sham acupuncture double blind randomized trial
engine_version    : te-v2-d1
```

### M10 — `protocol randomized trial acupuncture stroke rehabilitation`  · mode=discovery
```
input             : protocol randomized trial acupuncture stroke rehabilitation
mode              : discovery
effective_query   : protocol randomized trial acupuncture stroke rehabilitation
spans             : protocol·unresolved  randomized·unresolved  trial·unresolved  acupuncture·unresolved  stroke·unresolved  rehabilitation·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : protocol randomized trial acupuncture stroke rehabilitation
needs_resolution  : false
warning           : Chưa dịch được: «protocol randomized trial acupuncture stroke rehabilitation» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: protocol randomized trial acupuncture stroke rehabilitation
engine_version    : te-v2-d1
```

### N01 — `hiệu quả điện châm kết hợp phục hồi chức năng điều trị liệt nửa người sau đột quỵ`  · mode=discovery
```
input             : hiệu quả điện châm kết hợp phục hồi chức năng điều trị liệt nửa người sau đột quỵ
mode              : discovery
effective_query   : ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ("rehabilitation" OR "recovery" OR "functional recovery") ("hemiplegia" OR "hemiparesis") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : hiệu quả·translate→efficacy(high)  điện châm·translate→electroacupuncture(high)  kết hợp·translate→combined therapy(high)  phục hồi chức năng·translate→rehabilitation(high)  điều trị·translate→treatment(high)  liệt nửa người·translate→hemiplegia(high)  sau·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : hiệu quả→efficacy ; điện châm→electroacupuncture ; kết hợp→combined therapy ; phục hồi chức năng→rehabilitation ; điều trị→treatment ; liệt nửa người→hemiplegia ; đột quỵ→stroke
confidence        : high,high,high,high,high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### N02 — `điện châm kết hợp tập vận động cải thiện chức năng chi trên ở bệnh nhân nhồi máu não`  · mode=discovery
```
input             : điện châm kết hợp tập vận động cải thiện chức năng chi trên ở bệnh nhân nhồi máu não
mode              : discovery
effective_query   : ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") tập vận động chức năng "Upper Limbs:" ("ischemic stroke" OR "cerebral infarction" OR "ischaemic stroke")
spans             : điện châm·translate→electroacupuncture(high)  kết hợp·translate→combined therapy(high)  tập·unresolved  vận·unresolved  động·unresolved  cải·unresolved  thiện·unresolved  chức·unresolved  năng·unresolved  chi trên·translate→Upper Limbs:(medium)  ở·unresolved  bệnh·unresolved  nhân·unresolved  nhồi máu não·translate→ischemic stroke(high)
concept đã chọn   : điện châm→electroacupuncture ; kết hợp→combined therapy ; chi trên→Upper Limbs: ; nhồi máu não→ischemic stroke
confidence        : high,high,medium,high
ambiguous         : —
unresolved        : tập vận động chức năng
needs_resolution  : false
warning           : Chưa dịch được: «tập vận động chức năng» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: tập vận động chức năng | SILENT-DROP: «cải» | SILENT-DROP: «thiện» | SILENT-DROP: «bệnh» | SILENT-DROP: «nhân»
engine_version    : te-v2-d1
```

### N03 — `châm cứu dự phòng tái phát đột quỵ ở người bệnh tăng huyết áp`  · mode=discovery
```
input             : châm cứu dự phòng tái phát đột quỵ ở người bệnh tăng huyết áp
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("prevention" OR "prophylaxis" OR "preventive" OR "prophylactic") phát ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") người ("hypertension" OR "high blood pressure" OR "arterial hypertension")
spans             : châm cứu·translate→acupuncture(high)  dự phòng·translate→prevention(high)  tái·unresolved  phát·unresolved  đột quỵ·translate→stroke(high)  ở·unresolved  người·unresolved  bệnh·unresolved  tăng huyết áp·translate→hypertension(high)
concept đã chọn   : châm cứu→acupuncture ; dự phòng→prevention ; đột quỵ→stroke ; tăng huyết áp→hypertension
confidence        : high,high,high,high
ambiguous         : —
unresolved        : phát | người
needs_resolution  : false
warning           : Chưa dịch được: «phát», «người» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: phát,người | SILENT-DROP: «tái» | SILENT-DROP: «bệnh»
engine_version    : te-v2-d1
```

### N04 — `mối liên quan giữa thể chất Trung Y và nguy cơ đột quỵ thiếu máu não`  · mode=discovery
```
input             : mối liên quan giữa thể chất Trung Y và nguy cơ đột quỵ thiếu máu não
mode              : discovery
effective_query   : liên quan thể chất trung y nguy cơ ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") ("anemia" OR "anaemia") não
spans             : mối·unresolved  liên·unresolved  quan·unresolved  giữa·unresolved  thể·unresolved  chất·unresolved  trung·unresolved  y·unresolved  và·unresolved  nguy·unresolved  cơ·unresolved  đột quỵ·translate→stroke(high)  thiếu máu·translate→anemia(high)  não·unresolved
concept đã chọn   : đột quỵ→stroke ; thiếu máu→anemia
confidence        : high,high
ambiguous         : —
unresolved        : liên quan thể chất trung y nguy cơ | não
needs_resolution  : false
warning           : Chưa dịch được: «liên quan thể chất trung y nguy cơ», «não» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: liên quan thể chất trung y nguy cơ,não | SILENT-DROP: «mối» | SILENT-DROP: «giữa» | SILENT-DROP: «và»
engine_version    : te-v2-d1
```

### N05 — `giá trị dự báo của chứng đàm thấp huyết ứ đối với nguy cơ đột quỵ`  · mode=discovery
```
input             : giá trị dự báo của chứng đàm thấp huyết ứ đối với nguy cơ đột quỵ
mode              : discovery
effective_query   : giá dự báo chứng ("phlegm-dampness" OR "phlegm damp" OR "damp phlegm") ("blood stasis" OR "blood stagnation" OR "static blood") đối nguy cơ ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : giá·unresolved  trị·translate→treatment(high)  dự·unresolved  báo·unresolved  của·unresolved  chứng·unresolved  đàm thấp·translate→phlegm-dampness(high)  huyết ứ·translate→blood stasis(high)  đối·unresolved  với·unresolved  nguy·unresolved  cơ·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : trị→treatment ; đàm thấp→phlegm-dampness ; huyết ứ→blood stasis ; đột quỵ→stroke
confidence        : high,high,high,high
ambiguous         : —
unresolved        : giá | dự báo chứng | đối nguy cơ
needs_resolution  : false
warning           : Chưa dịch được: «giá», «dự báo chứng», «đối nguy cơ» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: giá,dự báo chứng,đối nguy cơ | SILENT-DROP: «của» | SILENT-DROP: «với»
engine_version    : te-v2-d1
```

### N06 — `hiệu quả bổ dương hoàn ngũ thang kết hợp châm cứu trong phục hồi sau đột quỵ`  · mode=discovery
```
input             : hiệu quả bổ dương hoàn ngũ thang kết hợp châm cứu trong phục hồi sau đột quỵ
mode              : discovery
effective_query   : ("Buyang Huanwu Tang" OR "Bu Yang Huan Wu Tang" OR "Supplement Yang to Restore Five Tenths Decoction") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("rehabilitation" OR "recovery" OR "functional recovery") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : hiệu quả·translate→efficacy(high)  bổ dương hoàn ngũ thang·translate→Buyang Huanwu Tang(high)  kết hợp·translate→combined therapy(high)  châm cứu·translate→acupuncture(high)  trong·unresolved  phục hồi·translate→rehabilitation(high)  sau·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : hiệu quả→efficacy ; bổ dương hoàn ngũ thang→Buyang Huanwu Tang ; kết hợp→combined therapy ; châm cứu→acupuncture ; phục hồi→rehabilitation ; đột quỵ→stroke
confidence        : high,high,high,high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### N07 — `tác động của điện châm lên chức năng vận động và chất lượng cuộc sống sau đột quỵ`  · mode=discovery
```
input             : tác động của điện châm lên chức năng vận động và chất lượng cuộc sống sau đột quỵ
mode              : discovery
effective_query   : động ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") lên chức năng vận động ("quality of life" OR "QoL" OR "health-related quality of life") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : tác·unresolved  động·unresolved  của·unresolved  điện châm·translate→electroacupuncture(high)  lên·unresolved  chức·unresolved  năng·unresolved  vận·unresolved  động·unresolved  và·unresolved  chất lượng cuộc sống·translate→quality of life(high)  sau·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : điện châm→electroacupuncture ; chất lượng cuộc sống→quality of life ; đột quỵ→stroke
confidence        : high,high,high
ambiguous         : —
unresolved        : động | lên chức năng vận động
needs_resolution  : false
warning           : Chưa dịch được: «động», «lên chức năng vận động» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: động,lên chức năng vận động | SILENT-DROP: «tác» | SILENT-DROP: «của» | SILENT-DROP: «và»
engine_version    : te-v2-d1
```

### N08 — `so sánh châm cứu thật và giả châm trong điều trị đau thắt lưng mạn tính`  · mode=discovery
```
input             : so sánh châm cứu thật và giả châm trong điều trị đau thắt lưng mạn tính
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") ("low back pain" OR "lumbago" OR "lower back pain") "chronic"
spans             : so·unresolved  sánh·unresolved  châm cứu·translate→acupuncture(high)  thật·unresolved  và·unresolved  giả châm·translate→sham acupuncture(high)  trong·unresolved  điều trị·translate→treatment(high)  đau thắt lưng·translate→low back pain(high)  mạn tính·translate→chronic(high)
concept đã chọn   : châm cứu→acupuncture ; giả châm→sham acupuncture ; điều trị→treatment ; đau thắt lưng→low back pain ; mạn tính→chronic
confidence        : high,high,high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : SILENT-DROP: «sánh» | SILENT-DROP: «thật» | SILENT-DROP: «và»
engine_version    : te-v2-d1
```

### N09 — `hiệu quả và an toàn của châm cứu điều trị mất ngủ ở người cao tuổi`  · mode=discovery
```
input             : hiệu quả và an toàn của châm cứu điều trị mất ngủ ở người cao tuổi
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("insomnia" OR "sleeplessness" OR "sleep disorder") người cao tuổi
spans             : hiệu quả·translate→efficacy(high)  và·unresolved  an toàn·translate→safety(high)  của·unresolved  châm cứu·translate→acupuncture(high)  điều trị·translate→treatment(high)  mất ngủ·translate→insomnia(high)  ở·unresolved  người·unresolved  cao·unresolved  tuổi·unresolved
concept đã chọn   : hiệu quả→efficacy ; an toàn→safety ; châm cứu→acupuncture ; điều trị→treatment ; mất ngủ→insomnia
confidence        : high,high,high,high,high
ambiguous         : —
unresolved        : người cao tuổi
needs_resolution  : false
warning           : Chưa dịch được: «người cao tuổi» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: người cao tuổi | SILENT-DROP: «và» | SILENT-DROP: «của»
engine_version    : te-v2-d1
```

### N10 — `ảnh hưởng của châm cứu lên biến thiên nhịp tim ở bệnh nhân tăng huyết áp`  · mode=discovery
```
input             : ảnh hưởng của châm cứu lên biến thiên nhịp tim ở bệnh nhân tăng huyết áp
mode              : discovery
effective_query   : ảnh hưởng ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") lên biến thiên nhịp tim ("hypertension" OR "high blood pressure" OR "arterial hypertension")
spans             : ảnh·unresolved  hưởng·unresolved  của·unresolved  châm cứu·translate→acupuncture(high)  lên·unresolved  biến·unresolved  thiên·unresolved  nhịp·unresolved  tim·unresolved  ở·unresolved  bệnh·unresolved  nhân·unresolved  tăng huyết áp·translate→hypertension(high)
concept đã chọn   : châm cứu→acupuncture ; tăng huyết áp→hypertension
confidence        : high,high
ambiguous         : —
unresolved        : ảnh hưởng | lên biến thiên nhịp tim
needs_resolution  : false
warning           : Chưa dịch được: «ảnh hưởng», «lên biến thiên nhịp tim» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: ảnh hưởng,lên biến thiên nhịp tim | SILENT-DROP: «của» | SILENT-DROP: «bệnh» | SILENT-DROP: «nhân»
engine_version    : te-v2-d1
```

### O01 — `châm cứu AND đột quỵ`  · mode=discovery
```
input             : châm cứu AND đột quỵ
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") AND ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : châm cứu·translate→acupuncture(high)  AND·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : châm cứu→acupuncture ; đột quỵ→stroke
confidence        : high,high
ambiguous         : —
unresolved        : AND
needs_resolution  : false
warning           : Chưa dịch được: «AND» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: AND
engine_version    : te-v2-d1
```

### O02 — `điện châm AND phục hồi AND đột quỵ`  · mode=discovery
```
input             : điện châm AND phục hồi AND đột quỵ
mode              : discovery
effective_query   : ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") AND ("rehabilitation" OR "recovery" OR "functional recovery") AND ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : điện châm·translate→electroacupuncture(high)  AND·unresolved  phục hồi·translate→rehabilitation(high)  AND·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : điện châm→electroacupuncture ; phục hồi→rehabilitation ; đột quỵ→stroke
confidence        : high,high,high
ambiguous         : —
unresolved        : AND | AND
needs_resolution  : false
warning           : Chưa dịch được: «AND», «AND» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: AND,AND
engine_version    : te-v2-d1
```

### O03 — `châm cứu OR điện châm AND stroke`  · mode=discovery
```
input             : châm cứu OR điện châm AND stroke
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") OR ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") AND stroke
spans             : châm cứu·translate→acupuncture(high)  OR·unresolved  điện châm·translate→electroacupuncture(high)  AND·unresolved  stroke·unresolved
concept đã chọn   : châm cứu→acupuncture ; điện châm→electroacupuncture
confidence        : high,high
ambiguous         : —
unresolved        : OR | AND stroke
needs_resolution  : false
warning           : Chưa dịch được: «OR», «AND stroke» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: OR,AND stroke
engine_version    : te-v2-d1
```

### O04 — `acupuncture AND stroke NOT animal`  · mode=discovery
```
input             : acupuncture AND stroke NOT animal
mode              : discovery
effective_query   : acupuncture AND stroke NOT animal
spans             : acupuncture·unresolved  AND·unresolved  stroke·unresolved  NOT·unresolved  animal·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : acupuncture AND stroke NOT animal
needs_resolution  : false
warning           : Chưa dịch được: «acupuncture AND stroke NOT animal» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: acupuncture AND stroke NOT animal
engine_version    : te-v2-d1
```

### O05 — `"giả châm" AND "đau thắt lưng"`  · mode=discovery
```
input             : "giả châm" AND "đau thắt lưng"
mode              : discovery
effective_query   : ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") AND ("low back pain" OR "lumbago" OR "lower back pain")
spans             : giả châm·translate→sham acupuncture(high)  AND·unresolved  đau thắt lưng·translate→low back pain(high)
concept đã chọn   : giả châm→sham acupuncture ; đau thắt lưng→low back pain
confidence        : high,high
ambiguous         : —
unresolved        : AND
needs_resolution  : false
warning           : Chưa dịch được: «AND» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: AND
engine_version    : te-v2-d1
```

### O06 — `("châm cứu" OR "điện châm") AND đột quỵ`  · mode=discovery
```
input             : ("châm cứu" OR "điện châm") AND đột quỵ
mode              : discovery
effective_query   : ( ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") OR ("electroacupuncture" OR "electro-acupuncture" OR "electrical acupuncture") ) AND ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : (·unresolved  châm cứu·translate→acupuncture(high)  OR·unresolved  điện châm·translate→electroacupuncture(high)  )·unresolved  AND·unresolved  đột quỵ·translate→stroke(high)
concept đã chọn   : châm cứu→acupuncture ; điện châm→electroacupuncture ; đột quỵ→stroke
confidence        : high,high,high
ambiguous         : —
unresolved        : ( | OR | ) AND
needs_resolution  : false
warning           : Chưa dịch được: «(», «OR», «) AND» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: (,OR,) AND
engine_version    : te-v2-d1
```

### O07 — `hoàng kỳ AND (đột quỵ OR thiếu máu não)`  · mode=discovery
```
input             : hoàng kỳ AND (đột quỵ OR thiếu máu não)
mode              : discovery
effective_query   : ("Astragalus membranaceus" OR "Huangqi" OR "Radix Astragali" OR "Astragalus") AND ( ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") OR ("anemia" OR "anaemia") não )
spans             : hoàng kỳ·translate→Astragalus membranaceus(high)  AND·unresolved  (·unresolved  đột quỵ·translate→stroke(high)  OR·unresolved  thiếu máu·translate→anemia(high)  não·unresolved  )·unresolved
concept đã chọn   : hoàng kỳ→Astragalus membranaceus ; đột quỵ→stroke ; thiếu máu→anemia
confidence        : high,high,high
ambiguous         : —
unresolved        : AND ( | OR | não )
needs_resolution  : false
warning           : Chưa dịch được: «AND (», «OR», «não )» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: AND (,OR,não )
engine_version    : te-v2-d1
```

### O08 — `针灸 AND 中风 NOT 动物`  · mode=discovery
```
input             : 针灸 AND 中风 NOT 动物
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") AND ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy") NOT 动物
spans             : 针灸·translate→acupuncture(high)  AND·unresolved  中风·translate→stroke(high)  NOT·unresolved  动物·unresolved
concept đã chọn   : 针灸→acupuncture ; 中风→stroke
confidence        : high,high
ambiguous         : —
unresolved        : AND | NOT 动物
needs_resolution  : false
warning           : Chưa dịch được: «AND», «NOT 动物» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: AND,NOT 动物
engine_version    : te-v2-d1
```

### O09 — `acupuncture AND "kidney deficiency"`  · mode=discovery
```
input             : acupuncture AND "kidney deficiency"
mode              : discovery
effective_query   : acupuncture AND kidney deficiency
spans             : acupuncture·unresolved  AND·unresolved  kidney·unresolved  deficiency·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : acupuncture AND kidney deficiency
needs_resolution  : false
warning           : Chưa dịch được: «acupuncture AND kidney deficiency» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: acupuncture AND kidney deficiency
engine_version    : te-v2-d1
```

### O10 — `"bổ dương hoàn ngũ thang" AND stroke`  · mode=discovery
```
input             : "bổ dương hoàn ngũ thang" AND stroke
mode              : discovery
effective_query   : ("Buyang Huanwu Tang" OR "Bu Yang Huan Wu Tang" OR "Supplement Yang to Restore Five Tenths Decoction") AND stroke
spans             : bổ dương hoàn ngũ thang·translate→Buyang Huanwu Tang(high)  AND·unresolved  stroke·unresolved
concept đã chọn   : bổ dương hoàn ngũ thang→Buyang Huanwu Tang
confidence        : high
ambiguous         : —
unresolved        : AND stroke
needs_resolution  : false
warning           : Chưa dịch được: «AND stroke» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: AND stroke
engine_version    : te-v2-d1
```

### P01 — `Nguyễn Văn Trung`  · mode=discovery
```
input             : Nguyễn Văn Trung
mode              : discovery
effective_query   : nguyễn trung
spans             : nguyễn·unresolved  văn·unresolved  trung·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : nguyễn trung
needs_resolution  : false
warning           : Chưa dịch được: «nguyễn trung» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: nguyễn trung | SILENT-DROP: «văn»
engine_version    : te-v2-d1
```

### P02 — `Trần Thị Châm`  · mode=discovery
```
input             : Trần Thị Châm
mode              : discovery
effective_query   : trần châm
spans             : trần·unresolved  thị·unresolved  châm·ambiguous[eczema|acupuncture]
concept đã chọn   : —
confidence        : —
ambiguous         : châm{eczema|acupuncture}:collision
unresolved        : trần
needs_resolution  : false
warning           : Có 1 cụm chưa rõ nghĩa — cần chọn: «châm»
nhận xét (máy)    : ambiguous→kept-verbatim(discovery) | unresolved kept: trần | SILENT-DROP: «thị»
engine_version    : te-v2-d1
```

### P03 — `Trung tâm y tế quận 5`  · mode=discovery
```
input             : Trung tâm y tế quận 5
mode              : discovery
effective_query   : trung tâm y tế quận 5
spans             : trung·unresolved  tâm·unresolved  y·unresolved  tế·unresolved  quận·unresolved  5·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : trung tâm y tế quận 5
needs_resolution  : false
warning           : Chưa dịch được: «trung tâm y tế quận 5» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: trung tâm y tế quận 5
engine_version    : te-v2-d1
```

### P04 — `nghiên cứu năm 2024 tại Hà Nội`  · mode=discovery
```
input             : nghiên cứu năm 2024 tại Hà Nội
mode              : discovery
effective_query   : cứu năm 2024 hà nội
spans             : nghiên·unresolved  cứu·unresolved  năm·unresolved  2024·unresolved  tại·unresolved  hà·unresolved  nội·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : cứu năm 2024 hà nội
needs_resolution  : false
warning           : Chưa dịch được: «cứu năm 2024 hà nội» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: cứu năm 2024 hà nội | SILENT-DROP: «nghiên» | SILENT-DROP: «tại»
engine_version    : te-v2-d1
```

### P05 — `artificial intelligence stroke prediction`  · mode=discovery
```
input             : artificial intelligence stroke prediction
mode              : discovery
effective_query   : artificial intelligence stroke prediction
spans             : artificial·unresolved  intelligence·unresolved  stroke·unresolved  prediction·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : artificial intelligence stroke prediction
needs_resolution  : false
warning           : Chưa dịch được: «artificial intelligence stroke prediction» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: artificial intelligence stroke prediction
engine_version    : te-v2-d1
```

### P06 — `convolutional neural network MRI`  · mode=discovery
```
input             : convolutional neural network MRI
mode              : discovery
effective_query   : convolutional neural network mri
spans             : convolutional·unresolved  neural·unresolved  network·unresolved  mri·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : convolutional neural network mri
needs_resolution  : false
warning           : Chưa dịch được: «convolutional neural network mri» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: convolutional neural network mri
engine_version    : te-v2-d1
```

### P07 — `blood pressure monitoring wearable device`  · mode=discovery
```
input             : blood pressure monitoring wearable device
mode              : discovery
effective_query   : blood pressure monitoring wearable device
spans             : blood·unresolved  pressure·unresolved  monitoring·unresolved  wearable·unresolved  device·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : blood pressure monitoring wearable device
needs_resolution  : false
warning           : Chưa dịch được: «blood pressure monitoring wearable device» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: blood pressure monitoring wearable device
engine_version    : te-v2-d1
```

### P08 — `GPT-5 medical research`  · mode=discovery
```
input             : GPT-5 medical research
mode              : discovery
effective_query   : gpt-5 medical research
spans             : gpt-5·unresolved  medical·unresolved  research·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : gpt-5 medical research
needs_resolution  : false
warning           : Chưa dịch được: «gpt-5 medical research» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: gpt-5 medical research
engine_version    : te-v2-d1
```

### P09 — `123456789`  · mode=discovery
```
input             : 123456789
mode              : discovery
effective_query   : 123456789
spans             : 123456789·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : 123456789
needs_resolution  : false
warning           : Chưa dịch được: «123456789» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: 123456789
engine_version    : te-v2-d1
```

### P10 — `abc xyz lorem ipsum`  · mode=discovery
```
input             : abc xyz lorem ipsum
mode              : discovery
effective_query   : abc xyz lorem ipsum
spans             : abc·unresolved  xyz·unresolved  lorem·unresolved  ipsum·unresolved
concept đã chọn   : —
confidence        : —
ambiguous         : —
unresolved        : abc xyz lorem ipsum
needs_resolution  : false
warning           : Chưa dịch được: «abc xyz lorem ipsum» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: abc xyz lorem ipsum
engine_version    : te-v2-d1
```

### Q01 — `bệnh chàm điều trị bằng châm cứu`  · mode=discovery
```
input             : bệnh chàm điều trị bằng châm cứu
mode              : discovery
effective_query   : ("eczema" OR "atopic dermatitis" OR "dermatitis") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")
spans             : bệnh chàm·translate→eczema(high)  điều trị·translate→treatment(high)  bằng·unresolved  châm cứu·translate→acupuncture(high)
concept đã chọn   : bệnh chàm→eczema ; điều trị→treatment ; châm cứu→acupuncture
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : SILENT-DROP: «bằng»
engine_version    : te-v2-d1
```

### Q01 — `bệnh chàm điều trị bằng châm cứu`  · mode=evidence
```
input             : bệnh chàm điều trị bằng châm cứu
mode              : evidence
effective_query   : ("eczema" OR "atopic dermatitis" OR "dermatitis") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture")
spans             : bệnh chàm·translate→eczema(high)  điều trị·translate→treatment(high)  bằng·unresolved  châm cứu·translate→acupuncture(high)
concept đã chọn   : bệnh chàm→eczema ; điều trị→treatment ; châm cứu→acupuncture
confidence        : high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : SILENT-DROP: «bằng»
engine_version    : te-v2-d1
```

### Q02 — `huyệt trung phong dùng cho bệnh nhân trúng phong`  · mode=discovery
```
input             : huyệt trung phong dùng cho bệnh nhân trúng phong
mode              : discovery
effective_query   : ("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : huyệt trung phong·translate→Zhongfeng (LR4)(high)  dùng·unresolved  cho·unresolved  bệnh·unresolved  nhân·unresolved  trúng phong·translate→stroke(high)
concept đã chọn   : huyệt trung phong→Zhongfeng (LR4) ; trúng phong→stroke
confidence        : high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : SILENT-DROP: «dùng» | SILENT-DROP: «bệnh» | SILENT-DROP: «nhân»
engine_version    : te-v2-d1
```

### Q02 — `huyệt trung phong dùng cho bệnh nhân trúng phong`  · mode=evidence
```
input             : huyệt trung phong dùng cho bệnh nhân trúng phong
mode              : evidence
effective_query   : ("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : huyệt trung phong·translate→Zhongfeng (LR4)(high)  dùng·unresolved  cho·unresolved  bệnh·unresolved  nhân·unresolved  trúng phong·translate→stroke(high)
concept đã chọn   : huyệt trung phong→Zhongfeng (LR4) ; trúng phong→stroke
confidence        : high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : SILENT-DROP: «dùng» | SILENT-DROP: «bệnh» | SILENT-DROP: «nhân»
engine_version    : te-v2-d1
```

### Q03 — `điều trị bệnh trĩ bằng liệu pháp không dùng thuốc`  · mode=discovery
```
input             : điều trị bệnh trĩ bằng liệu pháp không dùng thuốc
mode              : discovery
effective_query   : ("treatment" OR "therapy" OR "therapeutic" OR "management") ("hemorrhoids" OR "haemorrhoids" OR "piles") liệu pháp thuốc
spans             : điều trị·translate→treatment(high)  bệnh trĩ·translate→hemorrhoids(high)  bằng·unresolved  liệu·unresolved  pháp·unresolved  không·unresolved  dùng·unresolved  thuốc·unresolved
concept đã chọn   : điều trị→treatment ; bệnh trĩ→hemorrhoids
confidence        : high,high
ambiguous         : —
unresolved        : liệu pháp thuốc
needs_resolution  : false
warning           : Chưa dịch được: «liệu pháp thuốc» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: liệu pháp thuốc | SILENT-DROP: «bằng» | SILENT-DROP: «không» | SILENT-DROP: «dùng»
engine_version    : te-v2-d1
```

### Q03 — `điều trị bệnh trĩ bằng liệu pháp không dùng thuốc`  · mode=evidence
```
input             : điều trị bệnh trĩ bằng liệu pháp không dùng thuốc
mode              : evidence
effective_query   : ("treatment" OR "therapy" OR "therapeutic" OR "management") ("hemorrhoids" OR "haemorrhoids" OR "piles") liệu pháp thuốc
spans             : điều trị·translate→treatment(high)  bệnh trĩ·translate→hemorrhoids(high)  bằng·unresolved  liệu·unresolved  pháp·unresolved  không·unresolved  dùng·unresolved  thuốc·unresolved
concept đã chọn   : điều trị→treatment ; bệnh trĩ→hemorrhoids
confidence        : high,high
ambiguous         : —
unresolved        : liệu pháp thuốc
needs_resolution  : true
warning           : Chưa dịch được: «liệu pháp thuốc» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: liệu pháp thuốc | SILENT-DROP: «bằng» | SILENT-DROP: «không» | SILENT-DROP: «dùng»
engine_version    : te-v2-d1
```

### Q04 — `thận hư nhưng toàn thân không phù`  · mode=discovery
```
input             : thận hư nhưng toàn thân không phù
mode              : discovery
effective_query   : thận ("deficiency" OR "vacuity" OR "xu") toàn thân phù
spans             : thận·unresolved  hư·translate→deficiency(high)  nhưng·unresolved  toàn·unresolved  thân·unresolved  không·unresolved  phù·unresolved
concept đã chọn   : hư→deficiency
confidence        : high
ambiguous         : —
unresolved        : thận | toàn thân phù
needs_resolution  : false
warning           : Chưa dịch được: «thận», «toàn thân phù» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: thận,toàn thân phù | SILENT-DROP: «nhưng» | SILENT-DROP: «không»
engine_version    : te-v2-d1
```

### Q04 — `thận hư nhưng toàn thân không phù`  · mode=evidence
```
input             : thận hư nhưng toàn thân không phù
mode              : evidence
effective_query   : thận ("deficiency" OR "vacuity" OR "xu") toàn thân phù
spans             : thận·unresolved  hư·translate→deficiency(high)  nhưng·unresolved  toàn·unresolved  thân·unresolved  không·unresolved  phù·unresolved
concept đã chọn   : hư→deficiency
confidence        : high
ambiguous         : —
unresolved        : thận | toàn thân phù
needs_resolution  : true
warning           : Chưa dịch được: «thận», «toàn thân phù» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: thận,toàn thân phù | SILENT-DROP: «nhưng» | SILENT-DROP: «không»
engine_version    : te-v2-d1
```

### Q05 — `sham acupuncture giả châm trong eczema bệnh chàm`  · mode=discovery
```
input             : sham acupuncture giả châm trong eczema bệnh chàm
mode              : discovery
effective_query   : sham acupuncture ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") eczema ("eczema" OR "atopic dermatitis" OR "dermatitis")
spans             : sham·unresolved  acupuncture·unresolved  giả châm·translate→sham acupuncture(high)  trong·unresolved  eczema·unresolved  bệnh chàm·translate→eczema(high)
concept đã chọn   : giả châm→sham acupuncture ; bệnh chàm→eczema
confidence        : high,high
ambiguous         : —
unresolved        : sham acupuncture | eczema
needs_resolution  : false
warning           : Chưa dịch được: «sham acupuncture», «eczema» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: sham acupuncture,eczema
engine_version    : te-v2-d1
```

### Q05 — `sham acupuncture giả châm trong eczema bệnh chàm`  · mode=evidence
```
input             : sham acupuncture giả châm trong eczema bệnh chàm
mode              : evidence
effective_query   : sham acupuncture ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") eczema ("eczema" OR "atopic dermatitis" OR "dermatitis")
spans             : sham·unresolved  acupuncture·unresolved  giả châm·translate→sham acupuncture(high)  trong·unresolved  eczema·unresolved  bệnh chàm·translate→eczema(high)
concept đã chọn   : giả châm→sham acupuncture ; bệnh chàm→eczema
confidence        : high,high
ambiguous         : —
unresolved        : sham acupuncture | eczema
needs_resolution  : true
warning           : Chưa dịch được: «sham acupuncture», «eczema» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: sham acupuncture,eczema
engine_version    : te-v2-d1
```

### Q06 — `cham cuu dieu tri benh cham`  · mode=discovery
```
input             : cham cuu dieu tri benh cham
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("eczema" OR "atopic dermatitis" OR "dermatitis")
spans             : cham cuu·translate→acupuncture(medium)  dieu tri·translate→treatment(medium)  benh cham·translate→eczema(medium)
concept đã chọn   : cham cuu→acupuncture ; dieu tri→treatment ; benh cham→eczema
confidence        : medium,medium,medium
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : ok
engine_version    : te-v2-d1
```

### Q06 — `cham cuu dieu tri benh cham`  · mode=evidence
```
input             : cham cuu dieu tri benh cham
mode              : evidence
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("treatment" OR "therapy" OR "therapeutic" OR "management") ("eczema" OR "atopic dermatitis" OR "dermatitis")
spans             : cham cuu·translate→acupuncture(medium)  dieu tri·translate→treatment(medium)  benh cham·translate→eczema(medium)
concept đã chọn   : cham cuu→acupuncture ; dieu tri→treatment ; benh cham→eczema
confidence        : medium,medium,medium
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : ok
engine_version    : te-v2-d1
```

### Q07 — `trung phong dieu tri trung phong`  · mode=discovery
```
input             : trung phong dieu tri trung phong
mode              : discovery
effective_query   : trung phong ("treatment" OR "therapy" OR "therapeutic" OR "management") trung phong
spans             : trung phong·ambiguous[lr4-zhongfeng|stroke]  dieu tri·translate→treatment(medium)  trung phong·ambiguous[lr4-zhongfeng|stroke]
concept đã chọn   : dieu tri→treatment
confidence        : medium
ambiguous         : trung phong{lr4-zhongfeng|stroke}:toneless-collision ; trung phong{lr4-zhongfeng|stroke}:toneless-collision
unresolved        : —
needs_resolution  : false
warning           : Có 2 cụm chưa rõ nghĩa — cần chọn: «trung phong», «trung phong»
nhận xét (máy)    : ambiguous→kept-verbatim(discovery)
engine_version    : te-v2-d1
```

### Q07 — `trung phong dieu tri trung phong`  · mode=evidence
```
input             : trung phong dieu tri trung phong
mode              : evidence
effective_query   : trung phong ("treatment" OR "therapy" OR "therapeutic" OR "management") trung phong
spans             : trung phong·ambiguous[lr4-zhongfeng|stroke]  dieu tri·translate→treatment(medium)  trung phong·ambiguous[lr4-zhongfeng|stroke]
concept đã chọn   : dieu tri→treatment
confidence        : medium
ambiguous         : trung phong{lr4-zhongfeng|stroke}:toneless-collision ; trung phong{lr4-zhongfeng|stroke}:toneless-collision
unresolved        : —
needs_resolution  : true
warning           : Có 2 cụm chưa rõ nghĩa — cần chọn: «trung phong», «trung phong»
nhận xét (máy)    : ambiguous→needs_resolution
engine_version    : te-v2-d1
```

### Q08 — `针刺中封治疗中风`  · mode=discovery
```
input             : 针刺中封治疗中风
mode              : discovery
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : 针刺·translate→acupuncture(high)  中封·translate→Zhongfeng (LR4)(high)  治疗·translate→treatment(high)  中风·translate→stroke(high)
concept đã chọn   : 针刺→acupuncture ; 中封→Zhongfeng (LR4) ; 治疗→treatment ; 中风→stroke
confidence        : high,high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### Q08 — `针刺中封治疗中风`  · mode=evidence
```
input             : 针刺中封治疗中风
mode              : evidence
effective_query   : ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("Zhongfeng (LR4)" OR "LR4" OR "Liver 4" OR "Zhong Feng") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : 针刺·translate→acupuncture(high)  中封·translate→Zhongfeng (LR4)(high)  治疗·translate→treatment(high)  中风·translate→stroke(high)
concept đã chọn   : 针刺→acupuncture ; 中封→Zhongfeng (LR4) ; 治疗→treatment ; 中风→stroke
confidence        : high,high,high,high
ambiguous         : —
unresolved        : —
needs_resolution  : false
warning           : —
nhận xét (máy)    : clean
engine_version    : te-v2-d1
```

### Q09 — `giả châm và chàm trong nghiên cứu châm cứu da liễu`  · mode=discovery
```
input             : giả châm và chàm trong nghiên cứu châm cứu da liễu
mode              : discovery
effective_query   : ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") ("eczema" OR "atopic dermatitis" OR "dermatitis") cứu ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") liễu
spans             : giả châm·translate→sham acupuncture(high)  và·unresolved  chàm·translate→eczema(high)  trong·unresolved  nghiên·unresolved  cứu·unresolved  châm cứu·translate→acupuncture(high)  da·unresolved  liễu·unresolved
concept đã chọn   : giả châm→sham acupuncture ; chàm→eczema ; châm cứu→acupuncture
confidence        : high,high,high
ambiguous         : —
unresolved        : cứu | liễu
needs_resolution  : false
warning           : Chưa dịch được: «cứu», «liễu» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: cứu,liễu | SILENT-DROP: «và» | SILENT-DROP: «nghiên»
engine_version    : te-v2-d1
```

### Q09 — `giả châm và chàm trong nghiên cứu châm cứu da liễu`  · mode=evidence
```
input             : giả châm và chàm trong nghiên cứu châm cứu da liễu
mode              : evidence
effective_query   : ("sham acupuncture" OR "placebo acupuncture" OR "sham needling" OR "minimal acupuncture") ("eczema" OR "atopic dermatitis" OR "dermatitis") cứu ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") liễu
spans             : giả châm·translate→sham acupuncture(high)  và·unresolved  chàm·translate→eczema(high)  trong·unresolved  nghiên·unresolved  cứu·unresolved  châm cứu·translate→acupuncture(high)  da·unresolved  liễu·unresolved
concept đã chọn   : giả châm→sham acupuncture ; chàm→eczema ; châm cứu→acupuncture
confidence        : high,high,high
ambiguous         : —
unresolved        : cứu | liễu
needs_resolution  : true
warning           : Chưa dịch được: «cứu», «liễu» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: cứu,liễu | SILENT-DROP: «và» | SILENT-DROP: «nghiên»
engine_version    : te-v2-d1
```

### Q10 — `Trần Văn Trung nghiên cứu châm cứu điều trị trúng phong`  · mode=discovery
```
input             : Trần Văn Trung nghiên cứu châm cứu điều trị trúng phong
mode              : discovery
effective_query   : trần trung cứu ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : trần·unresolved  văn·unresolved  trung·unresolved  nghiên·unresolved  cứu·unresolved  châm cứu·translate→acupuncture(high)  điều trị·translate→treatment(high)  trúng phong·translate→stroke(high)
concept đã chọn   : châm cứu→acupuncture ; điều trị→treatment ; trúng phong→stroke
confidence        : high,high,high
ambiguous         : —
unresolved        : trần trung cứu
needs_resolution  : false
warning           : Chưa dịch được: «trần trung cứu» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: trần trung cứu | SILENT-DROP: «văn» | SILENT-DROP: «nghiên»
engine_version    : te-v2-d1
```

### Q10 — `Trần Văn Trung nghiên cứu châm cứu điều trị trúng phong`  · mode=evidence
```
input             : Trần Văn Trung nghiên cứu châm cứu điều trị trúng phong
mode              : evidence
effective_query   : trần trung cứu ("acupuncture" OR "needle acupuncture" OR "manual acupuncture" OR "body acupuncture") ("stroke" OR "cerebrovascular accident" OR "brain infarction" OR "cerebral apoplexy")
spans             : trần·unresolved  văn·unresolved  trung·unresolved  nghiên·unresolved  cứu·unresolved  châm cứu·translate→acupuncture(high)  điều trị·translate→treatment(high)  trúng phong·translate→stroke(high)
concept đã chọn   : châm cứu→acupuncture ; điều trị→treatment ; trúng phong→stroke
confidence        : high,high,high
ambiguous         : —
unresolved        : trần trung cứu
needs_resolution  : true
warning           : Chưa dịch được: «trần trung cứu» (giữ nguyên văn trong truy vấn)
nhận xét (máy)    : unresolved kept: trần trung cứu | SILENT-DROP: «văn» | SILENT-DROP: «nghiên»
engine_version    : te-v2-d1
```
