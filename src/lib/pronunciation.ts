import { pinyin, segment } from "pinyin-pro";

// 병음 음절 → 한글 발음 매핑 테이블
const PINYIN_TO_HANGUL: Record<string, string> = {
  // 성모 + 운모 조합 (주요 음절)
  a: "아", ai: "아이", an: "안", ang: "앙", ao: "아오",
  ba: "바", bai: "바이", ban: "반", bang: "방", bao: "바오",
  bei: "베이", ben: "번", beng: "붕", bi: "비", bian: "비엔",
  biao: "비아오", bie: "비에", bin: "빈", bing: "빙", bo: "보",
  bu: "부",
  ca: "차", cai: "차이", can: "찬", cang: "창", cao: "차오",
  ce: "처", cen: "천", ceng: "청", cha: "차", chai: "차이",
  chan: "찬", chang: "창", chao: "차오", che: "처", chen: "천",
  cheng: "청", chi: "츠", chong: "충", chou: "초우", chu: "추",
  chua: "추아", chuai: "추아이", chuan: "추안", chuang: "추앙",
  chui: "추이", chun: "춘", chuo: "추오", ci: "츠", cong: "충",
  cou: "코우", cu: "추", cuan: "추안", cui: "추이", cun: "춘",
  cuo: "추오",
  da: "다", dai: "다이", dan: "단", dang: "당", dao: "다오",
  de: "더", dei: "데이", den: "던", deng: "덩", di: "디",
  dia: "디아", dian: "디엔", diao: "디아오", die: "디에",
  ding: "딩", diu: "디우", dong: "둥", dou: "도우", du: "두",
  duan: "두안", dui: "두이", dun: "둔", duo: "뚜오",
  e: "어", ei: "에이", en: "언", eng: "엉", er: "얼",
  fa: "파", fan: "판", fang: "팡", fei: "페이", fen: "펀",
  feng: "펑", fo: "포", fou: "포우", fu: "푸",
  ga: "가", gai: "가이", gan: "간", gang: "강", gao: "가오",
  ge: "거", gei: "게이", gen: "건", geng: "겅", gong: "공",
  gou: "고우", gu: "구", gua: "구아", guai: "구아이",
  guan: "관", guang: "광", gui: "구이", gun: "군", guo: "궈",
  ha: "하", hai: "하이", han: "한", hang: "항", hao: "하오",
  he: "허", hei: "헤이", hen: "헌", heng: "헝", hong: "홍",
  hou: "호우", hu: "후", hua: "화", huai: "화이", huan: "환",
  huang: "황", hui: "후이", hun: "훈", huo: "훠",
  ji: "지", jia: "지아", jian: "지엔", jiang: "지앙",
  jiao: "지아오", jie: "지에", jin: "진", jing: "징",
  jiong: "지옹", jiu: "지우", ju: "쥐", juan: "쥐엔",
  jue: "쥐에", jun: "쥔",
  ka: "카", kai: "카이", kan: "칸", kang: "캉", kao: "카오",
  ke: "커", ken: "컨", keng: "컹", kong: "콩", kou: "코우",
  ku: "쿠", kua: "쿠아", kuai: "쿠아이", kuan: "쿠안",
  kuang: "쿠앙", kui: "쿠이", kun: "쿤", kuo: "쿠오",
  la: "라", lai: "라이", lan: "란", lang: "랑", lao: "라오",
  le: "러", lei: "레이", leng: "렁", li: "리", lia: "리아",
  lian: "리엔", liang: "리앙", liao: "리아오", lie: "리에",
  lin: "린", ling: "링", liu: "리우", long: "롱", lou: "로우",
  lu: "루", luan: "루안", lun: "룬", luo: "루오",
  lv: "뤼", lve: "뤼에",
  ma: "마", mai: "마이", man: "만", mang: "망", mao: "마오",
  me: "머", mei: "메이", men: "먼", meng: "멍", mi: "미",
  mian: "미엔", miao: "미아오", mie: "미에", min: "민",
  ming: "밍", miu: "미우", mo: "모", mou: "모우", mu: "무",
  na: "나", nai: "나이", nan: "난", nang: "낭", nao: "나오",
  ne: "너", nei: "네이", nen: "넌", neng: "넝", ni: "니",
  nian: "니엔", niang: "니앙", niao: "니아오", nie: "니에",
  nin: "닌", ning: "닝", niu: "니우", nong: "농", nou: "노우",
  nu: "누", nuan: "누안", nuo: "누오", nv: "뉘", nve: "뉘에",
  o: "오", ou: "오우",
  pa: "파", pai: "파이", pan: "판", pang: "팡", pao: "파오",
  pei: "페이", pen: "펀", peng: "펑", pi: "피", pian: "피엔",
  piao: "피아오", pie: "피에", pin: "핀", ping: "핑", po: "포",
  pou: "포우", pu: "푸",
  qi: "치", qia: "치아", qian: "치엔", qiang: "치앙",
  qiao: "치아오", qie: "치에", qin: "친", qing: "칭",
  qiong: "치옹", qiu: "치우", qu: "취", quan: "취엔",
  que: "취에", qun: "취안",
  ran: "란", rang: "랑", rao: "라오", re: "러", ren: "런",
  reng: "렁", ri: "르", rong: "롱", rou: "로우", ru: "루",
  ruan: "루안", rui: "루이", run: "룬", ruo: "루오",
  sa: "사", sai: "사이", san: "산", sang: "상", sao: "사오",
  se: "서", sen: "선", seng: "승", sha: "샤", shai: "샤이",
  shan: "산", shang: "상", shao: "샤오", she: "서", shei: "셰이",
  shen: "선", sheng: "성", shi: "스", shou: "쇼우", shu: "슈",
  shua: "슈아", shuai: "슈아이", shuan: "슈안", shuang: "슈앙",
  shui: "슈이", shun: "순", shuo: "슈오", si: "쓰",
  song: "쏭", sou: "소우", su: "쑤", suan: "쑤안", sui: "쑤이",
  sun: "쑨", suo: "쑤오",
  ta: "타", tai: "타이", tan: "탄", tang: "탕", tao: "타오",
  te: "터", teng: "텅", ti: "티", tian: "티엔", tiao: "티아오",
  tie: "티에", ting: "팅", tong: "통", tou: "토우", tu: "투",
  tuan: "투안", tui: "투이", tun: "툰", tuo: "투오",
  wa: "와", wai: "와이", wan: "완", wang: "왕", wei: "웨이",
  wen: "원", weng: "웡", wo: "워", wu: "우",
  xi: "시", xia: "시아", xian: "시엔", xiang: "시앙",
  xiao: "시아오", xie: "시에", xin: "신", xing: "싱",
  xiong: "시옹", xiu: "시우", xu: "쉬", xuan: "쉬엔",
  xue: "쉬에", xun: "쉰",
  ya: "야", yan: "이엔", yang: "양", yao: "야오", ye: "예",
  yi: "이", yin: "인", ying: "잉", yong: "용", you: "요우",
  yu: "위", yuan: "위엔", yue: "위에", yun: "윈",
  za: "자", zai: "자이", zan: "잔", zang: "장", zao: "자오",
  ze: "저", zei: "제이", zen: "전", zeng: "쩡", zha: "자",
  zhai: "자이", zhan: "잔", zhang: "장", zhao: "자오",
  zhe: "저", zhei: "제이", zhen: "전", zheng: "정", zhi: "즈",
  zhong: "중", zhou: "조우", zhu: "주", zhua: "주아",
  zhuai: "주아이", zhuan: "주안", zhuang: "주앙", zhui: "주이",
  zhun: "준", zhuo: "주오", zi: "쯔", zong: "종", zou: "조우",
  zu: "주", zuan: "주안", zui: "주이", zun: "준", zuo: "주오",
};

function removeTone(pinyinStr: string): string {
  const map: Record<string, string> = {
    'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
    'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
    'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
    'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
    'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
    'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v',
  };
  return pinyinStr.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, (m) => map[m] || m);
}

/**
 * 중국어 텍스트를 단어 단위로 분리하여 한글 발음으로 변환
 */
export function chineseToHangulPronunciation(text: string): string {
  const words = segment(text);

  const hangulWords = words.map((word: { origin: string; result: string }) => {
    // 구두점/공백은 건너뛰기
    if (/^[\s，。！？、：；""''（）\d]+$/.test(word.origin)) {
      return "";
    }

    // segment result에서 성조 제거
    const noTone = removeTone(word.result);

    if (word.origin.length === 1) {
      // 단일 글자: 바로 매핑
      return PINYIN_TO_HANGUL[noTone.toLowerCase().trim()] || noTone;
    }

    // 복합어 (예: 高兴 → gāoxìng)
    // 전체 문장의 pinyin을 참조하여 글자별 병음 분리
    // segment의 result를 신뢰하되, 글자 수만큼 분리
    const chars = [...word.origin];
    // 전체 문장에서 해당 단어 위치의 글자별 병음 가져오기 (문맥 유지)
    const fullPinyin = pinyin(text, { toneType: "none", type: "array" });
    const wordStartIdx = text.indexOf(word.origin);
    const charPinyins: string[] = [];
    let charCount = 0;
    for (let i = 0; i < [...text].length && charCount < chars.length; i++) {
      if (i >= wordStartIdx && i < wordStartIdx + chars.length) {
        charPinyins.push(fullPinyin[i] || "");
        charCount++;
      }
    }

    return charPinyins
      .map((s: string) => PINYIN_TO_HANGUL[s.toLowerCase().trim()] || s)
      .join("");
  });

  return hangulWords.filter(Boolean).join(" ");
}

/**
 * 중국어 텍스트를 단어 단위 병음(성조 포함)으로 변환
 */
export function chineseToPinyinWithTone(text: string): string {
  const words = segment(text);

  const pinyinWords = words.map((word: { origin: string; result: string }) => {
    if (/^[\s，。！？、：；""''（）\d]+$/.test(word.origin)) {
      return "";
    }
    return word.result;
  });

  return pinyinWords.filter(Boolean).join(" ");
}

/**
 * 한국어 텍스트의 발음을 병음 스타일로 변환 (중국인이 읽을 수 있게)
 * → v2에서 구현 예정, 지금은 빈 문자열 반환
 */
export function koreanToPinyinPronunciation(_text: string): string {
  return "";
}
