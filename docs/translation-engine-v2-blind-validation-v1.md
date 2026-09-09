# Translate Engine v2 — Blind Validation Set v1

> Mục tiêu: kiểm định độc lập engine v2 SAU D1–D3, trước khi chuyển `TRANSLATE_ENGINE=shadow → v2`.
>
> **QUY TẮC BLIND:** Không đưa các câu trong file này vào `test/tcm-queries.json`, không sửa `data/tcm-concepts/**`, không thêm synonym/surface form, không đổi threshold trước khi chạy vòng đầu. Phải lưu **raw output vòng 1** trước mọi sửa chữa.
>
> Engine cần test ở cả `discovery` và `evidence` khi được chỉ định. Mỗi dòng phải ghi: `id`, `input`, `mode`, `effective_query`, `spans`, `confidence`, `ambiguous/unresolved`, `needs_resolution`, `engine_version`, và nhận xét.

## A — Tiếng Việt đúng dấu, phương pháp YHCT
A01. châm cứu điều trị đau thắt lưng
A02. điện châm phục hồi chức năng sau đột quỵ
A03. cứu ngải điều trị đau khớp gối
A04. nhĩ châm điều trị mất ngủ
A05. cấy chỉ điều trị béo phì
A06. giác hơi điều trị đau vai gáy
A07. mai hoa châm điều trị đau thần kinh
A08. hỏa châm điều trị đau mạn tính
A09. đầu châm phục hồi vận động sau đột quỵ
A10. châm cứu dự phòng tái phát đột quỵ

## B — Biện chứng / chứng hậu
B01. can khí uất kết và mất ngủ
B02. tỳ khí hư ở bệnh nhân mệt mỏi mạn tính
B03. thận âm hư và ù tai
B04. thận dương hư điều trị bằng cứu ngải
B05. âm hư hỏa vượng ở phụ nữ mãn kinh
B06. khí trệ huyết ứ trong đau bụng kinh
B07. đàm thấp trở trệ và béo phì
B08. đàm nhiệt nhiễu tâm và mất ngủ
B09. tỳ thận dương hư ở tiêu chảy mạn tính
B10. khí huyết lưỡng hư sau đột quỵ

## C — Dược liệu
C01. hoàng kỳ trong phục hồi sau đột quỵ
C02. đương quy điều trị thiếu máu
C03. đan sâm và bệnh mạch vành
C04. xuyên khung điều trị đau đầu
C05. bạch truật và tỳ khí hư
C06. phục linh điều trị phù
C07. bán hạ điều trị đàm thấp
C08. hoàng liên điều trị tiêu chảy
C09. sinh địa hoàng và âm hư
C10. thục địa hoàng trong thận âm hư

## D — Phương tễ
D01. bổ dương hoàn ngũ thang điều trị di chứng đột quỵ
D02. huyết phủ trục ứ thang điều trị đau ngực
D03. lục vị địa hoàng hoàn điều trị thận âm hư
D04. tứ quân tử thang điều trị tỳ khí hư
D05. bán hạ bạch truật thiên ma thang điều trị chóng mặt
D06. thiên ma câu đằng ẩm điều trị tăng huyết áp
D07. tiêu dao tán điều trị can khí uất kết
D08. quy tỳ thang điều trị mất ngủ
D09. ôn đởm thang điều trị đàm nhiệt nhiễu tâm
D10. đại thừa khí thang điều trị táo bón

## E — Huyệt vị
E01. hợp cốc điều trị đau đầu
E02. túc tam lý điều trị mệt mỏi
E03. tam âm giao điều trị mất ngủ
E04. thái xung điều trị tăng huyết áp
E05. nội quan điều trị buồn nôn
E06. bách hội phục hồi chức năng sau đột quỵ
E07. phong trì điều trị đau đầu
E08. thái khê điều trị thận âm hư
E09. quan nguyên điều trị tỳ thận dương hư
E10. huyệt trung phong điều trị đau mắt cá chân

## F — Ca dấu tiếng Việt nguy hiểm
> Chạy **evidence mode**.
F01. giả châm điều trị đau lưng
F02. bệnh chàm điều trị bằng châm cứu
F03. chàm và châm cứu
F04. trị liệu bệnh trĩ
F05. điều trị trĩ bằng châm cứu
F06. trúng phong điều trị bằng điện châm
F07. huyệt trung phong trong châm cứu
F08. trung phong và trúng phong
F09. thận hư và đau thắt lưng
F10. thân thể suy nhược

## G — Không dấu / mơ hồ
> Chạy **evidence mode** trừ G08–G09 là discovery.
G01. cham
G02. cham cuu
G03. gia cham
G04. tri
G05. trung phong
G06. than
G07. than hu
G08. dien cham dot quy
G09. hoang ky tieu duong
G10. tuc tam ly dau goi

## H — Lỗi gõ / biến thể chính tả
H01. châm cưu điều trị đau lưng
H02. điện châm điêu trị đột quỵ
H03. hoàng kì điều trị mệt mỏi
H04. túc tam lí đau khớp gối
H05. đột quị phục hồi chức năng
H06. tỳ khi hư
H07. thận âm hư hoả vượng
H08. châm cứu tri đau lưng
H09. phong tri đau đầu
H10. tam am giao mat ngu

## I — Trung văn giản thể / phồn thể
I01. 针灸治疗中风后偏瘫
I02. 电针预防脑卒中复发
I03. 针刺联合康复训练治疗脑卒中
I04. 假针刺对照随机临床试验
I05. 针灸治疗失眠
I06. 黄芪治疗脑卒中后疲劳
I07. 补阳还五汤治疗脑卒中
I08. 肝气郁结失眠针灸治疗
I09. 腎陰虛針灸治療
I10. 黃芪與當歸治療氣血兩虛

## J — Pinyin
J01. zhēn jiǔ zhì liáo zhōng fēng
J02. diàn zhēn nǎo zú zhòng
J03. huáng qí
J04. dāng guī
J05. bǔ yáng huán wǔ tāng
J06. zú sān lǐ
J07. hé gǔ
J08. tai chong
J09. zhong feng
J10. zhen jiu stroke rehabilitation

## K — Việt + Anh hỗn hợp
K01. điện châm stroke rehabilitation RCT
K02. châm cứu low back pain systematic review
K03. hoàng kỳ post-stroke fatigue
K04. giả châm sham controlled trial
K05. thận âm hư tinnitus acupuncture
K06. can khí uất kết depression
K07. bổ dương hoàn ngũ thang stroke meta-analysis
K08. bách hội GV20 stroke rehabilitation
K09. túc tam lý ST36 fatigue
K10. acupuncture điều trị đau thần kinh sau zona

## L — Việt + Trung hỗn hợp
L01. điện châm 中风 康复
L02. 针灸 điều trị đột quỵ
L03. hoàng kỳ 黄芪 stroke
L04. giả châm 假针刺 randomized trial
L05. can khí uất kết 肝气郁结
L06. túc tam lý 足三里 đau khớp gối
L07. 中封 huyệt trung phong
L08. trúng phong 中风 phục hồi
L09. 补阳还五汤 di chứng đột quỵ
L10. thận âm hư 腎陰虛 tinnitus

## M — Thuật ngữ phương pháp nghiên cứu
M01. thử nghiệm lâm sàng ngẫu nhiên có đối chứng điện châm đột quỵ
M02. điện châm đột quỵ randomized controlled trial
M03. tổng quan hệ thống châm cứu điều trị đau lưng
M04. phân tích gộp châm cứu điều trị mất ngủ
M05. nghiên cứu đoàn hệ châm cứu và đột quỵ
M06. nghiên cứu bệnh chứng yếu tố nguy cơ đột quỵ
M07. tác dụng không mong muốn của điện châm
M08. an toàn của châm cứu ở người cao tuổi
M09. sham acupuncture double blind randomized trial
M10. protocol randomized trial acupuncture stroke rehabilitation

## N — Truy vấn dài gần đề tài thật
N01. hiệu quả điện châm kết hợp phục hồi chức năng điều trị liệt nửa người sau đột quỵ
N02. điện châm kết hợp tập vận động cải thiện chức năng chi trên ở bệnh nhân nhồi máu não
N03. châm cứu dự phòng tái phát đột quỵ ở người bệnh tăng huyết áp
N04. mối liên quan giữa thể chất Trung Y và nguy cơ đột quỵ thiếu máu não
N05. giá trị dự báo của chứng đàm thấp huyết ứ đối với nguy cơ đột quỵ
N06. hiệu quả bổ dương hoàn ngũ thang kết hợp châm cứu trong phục hồi sau đột quỵ
N07. tác động của điện châm lên chức năng vận động và chất lượng cuộc sống sau đột quỵ
N08. so sánh châm cứu thật và giả châm trong điều trị đau thắt lưng mạn tính
N09. hiệu quả và an toàn của châm cứu điều trị mất ngủ ở người cao tuổi
N10. ảnh hưởng của châm cứu lên biến thiên nhịp tim ở bệnh nhân tăng huyết áp

## O — Boolean / query syntax
O01. châm cứu AND đột quỵ
O02. điện châm AND phục hồi AND đột quỵ
O03. châm cứu OR điện châm AND stroke
O04. acupuncture AND stroke NOT animal
O05. "giả châm" AND "đau thắt lưng"
O06. ("châm cứu" OR "điện châm") AND đột quỵ
O07. hoàng kỳ AND (đột quỵ OR thiếu máu não)
O08. 针灸 AND 中风 NOT 动物
O09. acupuncture AND "kidney deficiency"
O10. "bổ dương hoàn ngũ thang" AND stroke

## P — Negative controls
P01. Nguyễn Văn Trung
P02. Trần Thị Châm
P03. Trung tâm y tế quận 5
P04. nghiên cứu năm 2024 tại Hà Nội
P05. artificial intelligence stroke prediction
P06. convolutional neural network MRI
P07. blood pressure monitoring wearable device
P08. GPT-5 medical research
P09. 123456789
P10. abc xyz lorem ipsum

## Q — Red-team
Q01. bệnh chàm điều trị bằng châm cứu
Q02. huyệt trung phong dùng cho bệnh nhân trúng phong
Q03. điều trị bệnh trĩ bằng liệu pháp không dùng thuốc
Q04. thận hư nhưng toàn thân không phù
Q05. sham acupuncture giả châm trong eczema bệnh chàm
Q06. cham cuu dieu tri benh cham
Q07. trung phong dieu tri trung phong
Q08. 针刺中封治疗中风
Q09. giả châm và chàm trong nghiên cứu châm cứu da liễu
Q10. Trần Văn Trung nghiên cứu châm cứu điều trị trúng phong

---

# Protocol chạy test

## Vòng 1 — BLIND RAW RUN
1. Không sửa code/dictionary/test fixture trước khi chạy.
2. Chạy toàn bộ A01–Q10 bằng engine v2 hiện tại.
3. Với nhóm có mode chỉ định, phải chạy đúng mode; các nhóm còn lại chạy discovery trước, nếu có ambiguity quan trọng thì chạy thêm evidence.
4. Xuất `docs/translation-engine-v2-blind-results-v1.md` chứa raw output từng case.
5. Commit raw results **trước** mọi sửa chữa.

## Vòng 2 — Chấm lỗi
Chấm 6 chiều:
- Semantic accuracy
- Safety / ambiguity handling
- Recall (không bỏ mất concept)
- Precision (không TCM-hoá tên người/từ thường)
- Provenance (span/transform/confidence/trust)
- Mode correctness (Discovery fail-safe; Evidence block ambiguity)

Phân severity:
- **S0 Critical:** clinical concept bị dịch sai thành concept khác và Evidence vẫn chạy; ambiguous Evidence bị tự resolve sai; unresolved bị âm thầm xoá khỏi query.
- **S1 Major:** bỏ mất concept chính, phá Boolean/operator, negative control bị TCM-hoá mạnh.
- **S2 Moderate:** thiếu synonym/recall nhưng vẫn cảnh báo đúng; `auto/medium` chưa tối ưu.
- **S3 Minor:** wording/display/provenance nhỏ.

## Acceptance gate `shadow → v2`
- **0 S0**.
- 0 trường hợp Evidence ambiguity bị tự resolve sai.
- 0 trường hợp unresolved bị âm thầm xóa.
- 0 verified/high mapping sai nghiêm trọng.
- Boolean syntax không bị phá ở O01–O10.
- Negative controls P01–P10 không bị chuyển thành concept YHCT sai.
- Mọi failure được phân loại và có nguyên nhân; không được sửa dictionary trước khi raw report đã commit.

Nếu fail gate: lập bảng lỗi + root cause + đề xuất patch nhỏ nhất; **không tự thêm hàng loạt term để làm đẹp điểm**. Sau patch, chạy lại đúng bộ blind này thành v1.1 và so sánh delta.
