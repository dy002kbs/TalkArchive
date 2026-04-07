"use client";

import { useEffect, useState } from "react";

export interface EnrichedData {
  natural: string;
  naturalPronunciation: string;
  wordBreakdown?: { word: string; reading: string; meaning: string }[];
  nuance: string;
  example?: { text: string; reading?: string; translation: string };
  alternatives: { text: string; reading?: string; note: string }[];
  related: { text: string; reading?: string; meaning: string }[];
}

interface EnrichModalProps {
  originalText: string;
  translatedText: string;
  direction: string;
  onClose: () => void;
  onSave: (enriched: EnrichedData | null) => Promise<void>;
}

export default function EnrichModal({
  originalText,
  translatedText,
  direction,
  onClose,
  onSave,
}: EnrichModalProps) {
  const [enriched, setEnriched] = useState<EnrichedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEnriched();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEnriched = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalText, translatedText, direction }),
      });
      if (!res.ok) throw new Error("AI 분석 실패");
      const data = await res.json();
      setEnriched(data.enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(enriched);
    setSaving(false);
  };


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              ✨ AI 학습 카드
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 text-xl"
            >
              ✕
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 mb-4 text-center">
            <p className="text-sm text-gray-900">{originalText}</p>
            <p className="text-sm text-blue-600 mt-1">{translatedText}</p>
          </div>

          {loading && (
            <div className="text-center py-8 text-sm text-gray-400">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mb-2" />
              <p>AI가 분석하고 있어요...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-4 text-sm text-red-500">
              <p>{error}</p>
              <button
                onClick={fetchEnriched}
                className="mt-2 px-4 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs"
              >
                다시 시도
              </button>
            </div>
          )}

          {enriched && !loading && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-1">
                  🎯 자연스러운 표현
                </p>
                <p className="text-base text-gray-900">{enriched.natural}</p>
                {enriched.naturalPronunciation && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {enriched.naturalPronunciation}
                  </p>
                )}
              </div>

              {enriched.wordBreakdown && enriched.wordBreakdown.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1">
                    📝 단어 분해
                  </p>
                  <div className="space-y-1">
                    {enriched.wordBreakdown.map((w, i) => (
                      <div key={i} className="text-sm flex items-baseline gap-2">
                        <span className="text-gray-900 font-medium">{w.word}</span>
                        {w.reading && (
                          <span className="text-xs text-gray-400">({w.reading})</span>
                        )}
                        <span className="text-xs text-gray-500">— {w.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {enriched.nuance && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1">
                    💡 뉘앙스
                  </p>
                  <p className="text-sm text-gray-700">{enriched.nuance}</p>
                </div>
              )}

              {enriched.example?.text && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1">
                    📖 실전 예문
                  </p>
                  <p className="text-sm text-gray-900">{enriched.example.text}</p>
                  {enriched.example.reading && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {enriched.example.reading}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {enriched.example.translation}
                  </p>
                </div>
              )}

              {enriched.alternatives?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1">
                    🔄 다른 표현
                  </p>
                  <div className="space-y-2">
                    {enriched.alternatives.map((alt, i) => (
                      <div key={i} className="text-sm">
                        <p className="text-gray-900">{alt.text}</p>
                        {alt.reading && (
                          <p className="text-xs text-gray-400">{alt.reading}</p>
                        )}
                        <p className="text-xs text-gray-500">{alt.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {enriched.related?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1">
                    📚 함께 알면 좋은 것
                  </p>
                  <div className="space-y-2">
                    {enriched.related.map((rel, i) => (
                      <div key={i} className="text-sm">
                        <p className="text-gray-900">{rel.text}</p>
                        {rel.reading && (
                          <p className="text-xs text-gray-400">{rel.reading}</p>
                        )}
                        <p className="text-xs text-gray-500">{rel.meaning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-5">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium active:bg-gray-200 transition-colors disabled:opacity-40"
            >
              취소
            </button>
            {enriched && !loading && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-full bg-blue-500 text-white text-sm font-medium active:bg-blue-600 transition-colors disabled:opacity-40"
              >
                {saving ? "저장 중..." : "이 카드로 저장"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
