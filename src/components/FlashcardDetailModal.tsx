"use client";

interface DetailEnrichedData {
  natural?: string;
  naturalPronunciation?: string;
  wordBreakdown?: { word: string; reading: string; meaning: string }[];
  nuance?: string;
  example?: { text: string; reading?: string; translation: string };
  alternatives?: { text: string; reading?: string; note: string }[];
  related?: { text: string; reading?: string; meaning: string }[];
}

interface FlashcardDetailModalProps {
  originalText: string;
  translatedText: string;
  pronunciation?: string;
  enriched: DetailEnrichedData;
  onClose: () => void;
}

export default function FlashcardDetailModal({
  originalText,
  translatedText,
  pronunciation,
  enriched,
  onClose,
}: FlashcardDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              ✨ 학습 카드 상세
            </h2>
            <button onClick={onClose} className="text-gray-400 text-xl">
              ✕
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 mb-4 text-center">
            <p className="text-sm text-gray-900">{originalText}</p>
            <p className="text-sm text-blue-600 mt-1">{translatedText}</p>
            {pronunciation && (
              <p className="text-xs text-gray-400 mt-0.5">{pronunciation}</p>
            )}
          </div>

          <div className="space-y-4">
            {enriched.natural && (
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
            )}

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

            {enriched.alternatives && enriched.alternatives.length > 0 && (
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

            {enriched.related && enriched.related.length > 0 && (
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

          <button
            onClick={onClose}
            className="w-full mt-5 py-2.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium active:bg-gray-200 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
