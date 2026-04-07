"use client";

import { useState } from "react";
import EnrichModal, { EnrichedData } from "./EnrichModal";

interface AddFlashcardModalProps {
  originalText: string;
  translatedText: string;
  pronunciation?: string;
  direction: string;
  onClose: () => void;
  onSave: (enriched: EnrichedData | null) => Promise<void>;
}

export default function AddFlashcardModal({
  originalText,
  translatedText,
  pronunciation,
  direction,
  onClose,
  onSave,
}: AddFlashcardModalProps) {
  const [showEnrich, setShowEnrich] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleBasicSave = async () => {
    setSaving(true);
    await onSave(null);
    setSaving(false);
  };

  if (showEnrich) {
    return (
      <EnrichModal
        originalText={originalText}
        translatedText={translatedText}
        direction={direction}
        onClose={onClose}
        onSave={onSave}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              플래시카드에 추가
            </h2>
            <button onClick={onClose} className="text-gray-400 text-xl">
              ✕
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 mb-5">
            <p className="text-sm text-gray-900">{originalText}</p>
            <p className="text-sm text-blue-600 mt-1">{translatedText}</p>
            {pronunciation && (
              <p className="text-xs text-gray-400 mt-0.5">{pronunciation}</p>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setShowEnrich(true)}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-blue-500 text-white text-sm font-medium active:bg-blue-600 transition-colors disabled:opacity-40"
            >
              <p className="font-semibold">✨ AI로 가공해서 추가</p>
              <p className="text-xs text-blue-100 mt-0.5">
                자연스러운 표현, 뉘앙스, 관련 표현까지 학습
              </p>
            </button>

            <button
              onClick={handleBasicSave}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium active:bg-gray-200 transition-colors disabled:opacity-40"
            >
              <p className="font-semibold">📝 기본으로 추가</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {saving ? "저장 중..." : "원문과 번역만 저장"}
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
