import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const LANG_NAMES: Record<string, { source: string; target: string }> = {
  ko2zh: { source: "Korean", target: "Chinese (Simplified)" },
  zh2ko: { source: "Chinese (Simplified)", target: "Korean" },
  ko2ja: { source: "Korean", target: "Japanese" },
  ja2ko: { source: "Japanese", target: "Korean" },
  ko2en: { source: "Korean", target: "English" },
  en2ko: { source: "English", target: "Korean" },
};

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Gemini API key not configured" },
      { status: 500 }
    );
  }

  const { originalText, translatedText, direction } = await request.json();

  const lang = LANG_NAMES[direction];
  if (!lang) {
    return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
  }

  const prompt = `You are a language learning assistant helping a Korean speaker learn ${lang.target}.

Source (${lang.source}): ${originalText}
Current translation (${lang.target}): ${translatedText}

Analyze the current translation and provide a learning resource that's helpful for both BEGINNERS and intermediate learners. Respond in JSON only, no markdown:

{
  "natural": "the most natural ${lang.target} expression for this situation (use current translation if already natural)",
  "naturalPronunciation": "한글 phonetic for the natural expression — only if target is Chinese or Japanese, else empty string",
  "wordBreakdown": [
    {"word": "word in ${lang.target}", "reading": "한글 발음", "meaning": "한국어 뜻"}
  ],
  "nuance": "1-2 sentences in Korean. Explain tone/formality/context concisely. Beginner-friendly.",
  "example": {
    "text": "a simple realistic example sentence in ${lang.target} using the natural expression",
    "reading": "한글 phonetic of the example — only for Chinese/Japanese, else empty string",
    "translation": "Korean translation of the example"
  },
  "alternatives": [
    {"text": "another way to say it", "reading": "한글 phonetic — empty for English", "note": "in Korean: when/why to use this"}
  ],
  "related": [
    {"text": "related expression in ${lang.target}", "reading": "한글 phonetic — empty for English", "meaning": "Korean meaning"}
  ]
}

Rules:
- "natural" must be in ${lang.target}
- "nuance", "note", "meaning", "translation", "wordBreakdown.meaning" must be in Korean
- "wordBreakdown": break the natural expression into 3-6 key words/chunks. Include pronunciation in 한글 for Chinese/Japanese (empty string for English)
- "example": realistic situation, use the natural expression naturally. Include 한글 reading for Chinese/Japanese (empty for English)
- "alternatives" and "related": include 한글 reading for Chinese/Japanese (empty string for English)
- Provide 1-2 alternatives and 2-3 related expressions max
- For Chinese: include 한글 발음 in naturalPronunciation and wordBreakdown.reading
- For Japanese: include 한글 발음 in naturalPronunciation and wordBreakdown.reading
- For English: leave naturalPronunciation and reading as empty strings
- Output ONLY valid JSON, no markdown wrapper`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: "Gemini call failed", details: err },
        { status: res.status }
      );
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: "No response from Gemini" },
        { status: 500 }
      );
    }

    // JSON 파싱
    let enriched;
    try {
      enriched = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Gemini response", raw: text },
        { status: 500 }
      );
    }

    return NextResponse.json({ enriched });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal error", details: String(err) },
      { status: 500 }
    );
  }
}
