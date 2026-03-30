import { NextRequest, NextResponse } from "next/server";
import { chineseToHangulPronunciation, chineseToPinyinWithTone } from "@/lib/pronunciation";

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  const { text, direction } = await request.json();

  const source = direction === "ko2zh" ? "ko" : "zh-CN";
  const target = direction === "ko2zh" ? "zh-CN" : "ko";

  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source,
        target,
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

  // 발음 생성: 번역된 언어의 발음을 생성
  let pronunciation = "";
  let pinyinText = "";
  if (direction === "ko2zh") {
    // 한→중: 중국어 번역 결과의 한글 발음 + 병음(성조)
    pronunciation = chineseToHangulPronunciation(translatedText);
    pinyinText = chineseToPinyinWithTone(translatedText);
  } else {
    // 중→한: 원문(중국어)의 한글 발음 + 병음(성조)
    pronunciation = chineseToHangulPronunciation(text);
    pinyinText = chineseToPinyinWithTone(text);
  }

  return NextResponse.json({ translatedText, pronunciation, pinyinText });
}
