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
  wa: "와", wo: "오",
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
};

// 장음 → 모음 반복 (파파고 스타일: ō → 오오)
function expandLongVowels(text: string): string {
  return text
    .replace(/ō/g, "oo").replace(/Ō/g, "oo")
    .replace(/ū/g, "uu").replace(/Ū/g, "uu")
    .replace(/ā/g, "aa").replace(/Ā/g, "aa")
    .replace(/ē/g, "ee").replace(/Ē/g, "ee")
    .replace(/ī/g, "ii").replace(/Ī/g, "ii");
}

function romajiToHangul(romaji: string): string {
  const normalized = expandLongVowels(romaji.toLowerCase());
  const words = normalized.split(/\s+/);

  const hangulWords = words.map((word) => {
    let result = "";
    let i = 0;
    const w = word;

    while (i < w.length) {
      // 구두점 처리
      if (/[.,!?？。、！]/.test(w[i])) {
        i++;
        continue;
      }

      // n' 처리 (ん): kon'ya → 콘야
      if (w[i] === "n" && i + 1 < w.length && w[i + 1] === "'") {
        result += "ㄴ";
        i += 2;
        continue;
      }

      // n + 자음 처리 (ん): konban → 콘반
      if (w[i] === "n" && i + 1 < w.length && /[bcdfghjklmnpqrstvwxyz]/.test(w[i + 1])) {
        result += "ㄴ";
        i += 1;
        continue;
      }

      // 단어 끝의 n (ん): san → 산
      if (w[i] === "n" && i === w.length - 1) {
        result += "ㄴ";
        i++;
        continue;
      }

      // 촉음 (연속 자음): kk, tt, pp, ss
      if (i + 1 < w.length && w[i] === w[i + 1] && /[bcdfghjklmnpqrstvwxyz]/.test(w[i])) {
        result += "ッ";
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

      i++;
    }

    result = mergeReceivingConsonant(result);
    return result;
  });

  return hangulWords.join(" ");
}

// ㄴ 받침을 앞 한글 글자에 합성
function mergeReceivingConsonant(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "ㄴ" && i > 0) {
      const prevChar = result[result.length - 1];
      const merged = addBatchim(prevChar, "ㄴ");
      if (merged) {
        result = result.slice(0, -1) + merged;
        continue;
      }
    }
    if (text[i] === "ッ" && i > 0) {
      const prevChar = result[result.length - 1];
      const merged = addBatchim(prevChar, "ㅅ");
      if (merged) {
        result = result.slice(0, -1) + merged;
        continue;
      }
    }
    result += text[i];
  }
  return result;
}

// 한글 글자에 받침 추가
function addBatchim(char: string, batchim: string): string | null {
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  const currentBatchim = (code - 0xac00) % 28;
  if (currentBatchim !== 0) return null;
  const batchimMap: Record<string, number> = { "ㄴ": 4, "ㅅ": 19 };
  const batchimCode = batchimMap[batchim];
  if (batchimCode === undefined) return null;
  return String.fromCharCode(code + batchimCode);
}

// 일본어 조사를 앞 단어에 붙이기 (파파고 스타일)
const PARTICLES = new Set(["o", "wa", "ga", "ni", "de", "no", "to", "ka", "mo", "e", "wo"]);

function mergeParticles(romaji: string): string {
  const words = romaji.split(/\s+/);
  const merged: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const lower = words[i].toLowerCase().replace(/[.,!?？。！]/g, "");
    if (PARTICLES.has(lower) && merged.length > 0) {
      // 조사를 앞 단어에 붙이기
      merged[merged.length - 1] += words[i];
    } else {
      merged.push(words[i]);
    }
  }

  return merged.join(" ");
}

/**
 * Google 비공식 API에서 일본어 romaji를 가져와 한글로 변환
 * 실패 시 빈 문자열 반환 (graceful fallback)
 */
export async function japaneseToHangulPronunciation(text: string): Promise<string> {
  try {
    const encoded = encodeURIComponent(text);
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=ko&dt=rm&dt=t&q=${encoded}`
    );

    if (!res.ok) return "";

    const raw = await res.text();
    // null을 JSON 파싱 가능하게 변환
    const data = JSON.parse(raw.replace(/,null/g, ',"null"').replace(/null,/g, '"null",').replace(/\[null/g, '["null"').replace(/null\]/g, '"null"]'));

    // romaji는 data[0][1][3] 위치
    const romaji = data?.[0]?.[1]?.[3];
    if (!romaji || romaji === "null") return "";

    return romajiToHangul(mergeParticles(romaji));
  } catch {
    return "";
  }
}
