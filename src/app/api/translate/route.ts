import { NextRequest, NextResponse } from "next/server";
import { chineseToHangulPronunciation, chineseToPinyinWithTone } from "@/lib/pronunciation";
import { japaneseToHangulPronunciation, japaneseToFurigana } from "@/lib/pronunciation-ja";

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

const LANG_MAP: Record<string, { source: string; target: string }> = {
  ko2zh: { source: "ko", target: "zh-CN" },
  zh2ko: { source: "zh-CN", target: "ko" },
  ko2ja: { source: "ko", target: "ja" },
  ja2ko: { source: "ja", target: "ko" },
  ko2en: { source: "ko", target: "en" },
  en2ko: { source: "en", target: "ko" },
};

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  const { text, direction } = await request.json();

  const langPair = LANG_MAP[direction];
  if (!langPair) {
    return NextResponse.json(
      { error: "Invalid direction" },
      { status: 400 }
    );
  }

  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: langPair.source,
        target: langPair.target,
        format: "text",
      }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    return NextResponse.json(
      { error: "Translation failed", details: error },
      { status: res.status }
    );
  }

  const data = await res.json();
  const translatedText = data.data.translations[0].translatedText;

  let pronunciation = "";
  let pinyinText = "";

  if (direction === "ko2zh") {
    pronunciation = chineseToHangulPronunciation(translatedText);
    pinyinText = chineseToPinyinWithTone(translatedText);
  } else if (direction === "zh2ko") {
    pronunciation = chineseToHangulPronunciation(text);
    pinyinText = chineseToPinyinWithTone(text);
  } else if (direction === "ko2ja") {
    // 한→일: 한글 발음 + 후리가나
    pronunciation = await japaneseToHangulPronunciation(translatedText);
    pinyinText = await japaneseToFurigana(translatedText);
  } else if (direction === "ja2ko") {
    // 일→한: 원문의 한글 발음 + 후리가나
    pronunciation = await japaneseToHangulPronunciation(text);
    pinyinText = await japaneseToFurigana(text);
  }
  // 영어(ko2en, en2ko)는 발음 변환 불필요 — 빈 문자열 그대로

  return NextResponse.json({ translatedText, pronunciation, pinyinText });
}
