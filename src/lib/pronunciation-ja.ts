import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

let kuroshiroInstance: Kuroshiro | null = null;

async function getKuroshiro(): Promise<Kuroshiro> {
  if (kuroshiroInstance) return kuroshiroInstance;
  const kuroshiro = new Kuroshiro();
  await kuroshiro.init(new KuromojiAnalyzer());
  kuroshiroInstance = kuroshiro;
  return kuroshiro;
}

// 로마자 음절 → 한글 매핑
const ROMAJI_TO_HANGUL: Record<string, string> = {
  a: "아", i: "이", u: "우", e: "에", o: "오",
  ka: "카", ki: "키", ku: "쿠", ke: "케", ko: "코",
  sa: "사", shi: "시", si: "시", su: "스", se: "세", so: "소",
  ta: "타", chi: "치", ti: "치", tsu: "츠", tu: "츠", te: "테", to: "토",
  na: "나", ni: "니", nu: "누", ne: "네", no: "노",
  ha: "하", hi: "히", fu: "후", hu: "후", he: "헤", ho: "호",
  ma: "마", mi: "미", mu: "무", me: "메", mo: "모",
  ya: "야", yu: "유", yo: "요",
  ra: "라", ri: "리", ru: "루", re: "레", ro: "로",
  wa: "와", wo: "오", n: "은",
  ga: "가", gi: "기", gu: "구", ge: "게", go: "고",
  za: "자", ji: "지", zi: "지", zu: "즈", ze: "제", zo: "조",
  da: "다", di: "디", du: "두", de: "데", do: "도",
  ba: "바", bi: "비", bu: "부", be: "베", bo: "보",
  pa: "파", pi: "피", pu: "푸", pe: "페", po: "포",
  // 요음
  kya: "캬", kyu: "큐", kyo: "쿄",
  sha: "샤", shu: "슈", sho: "쇼",
  cha: "차", chu: "추", cho: "초",
  nya: "냐", nyu: "뉴", nyo: "뇨",
  hya: "햐", hyu: "휴", hyo: "효",
  mya: "먀", myu: "뮤", myo: "묘",
  rya: "랴", ryu: "류", ryo: "료",
  gya: "갸", gyu: "규", gyo: "교",
  ja: "자", ju: "주", jo: "조",
  bya: "뱌", byu: "뷰", byo: "뵤",
  pya: "퍄", pyu: "퓨", pyo: "표",
  // 기타
  nn: "은",
};

// 장음 문자를 일반 모음으로 변환
function normalizeLongVowels(text: string): string {
  return text
    .replace(/ō/g, "o").replace(/Ō/g, "o")
    .replace(/ū/g, "u").replace(/Ū/g, "u")
    .replace(/ā/g, "a").replace(/Ā/g, "a")
    .replace(/ē/g, "e").replace(/Ē/g, "e")
    .replace(/ī/g, "i").replace(/Ī/g, "i");
}

function romajiToHangul(romaji: string): string {
  // 단어 단위로 분리
  const words = romaji.split(/\s+/);

  const hangulWords = words.map((word) => {
    let result = "";
    let i = 0;
    const w = normalizeLongVowels(word.toLowerCase());

    while (i < w.length) {
      // 구두점 처리
      if (/[.,!?]/.test(w[i])) {
        i++;
        continue;
      }

      // 촉음 (연속 자음): kk, tt, pp, ss, cch 등
      if (i + 1 < w.length && w[i] === w[i + 1] && /[a-z]/.test(w[i])) {
        // 첫 자음은 받침으로 (간략화: 그냥 건너뜀)
        i++;
        continue;
      }

      // 3글자 매칭
      if (i + 2 < w.length) {
        const three = w.slice(i, i + 3);
        if (ROMAJI_TO_HANGUL[three]) {
          result += ROMAJI_TO_HANGUL[three];
          i += 3;
          continue;
        }
      }

      // 2글자 매칭
      if (i + 1 < w.length) {
        const two = w.slice(i, i + 2);
        if (ROMAJI_TO_HANGUL[two]) {
          result += ROMAJI_TO_HANGUL[two];
          i += 2;
          continue;
        }
      }

      // 1글자 매칭
      const one = w[i];
      if (ROMAJI_TO_HANGUL[one]) {
        result += ROMAJI_TO_HANGUL[one];
        i++;
        continue;
      }

      // 매칭 안 되면 그대로
      result += one;
      i++;
    }

    return result;
  });

  return hangulWords.join(" ");
}

/**
 * 일본어 텍스트를 romaji로 변환
 */
export async function japaneseToRomaji(text: string): Promise<string> {
  const kuroshiro = await getKuroshiro();
  return await kuroshiro.convert(text, { to: "romaji", mode: "spaced" });
}

/**
 * 일본어 텍스트의 후리가나(히라가나) 반환
 */
export async function japaneseToFurigana(text: string): Promise<string> {
  const kuroshiro = await getKuroshiro();
  return await kuroshiro.convert(text, { to: "hiragana" });
}
