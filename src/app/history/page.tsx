"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

interface Conversation {
  id: string;
  title: string;
  pinned: boolean;
  created_at: string;
  message_count: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Conversation[] | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, pinned, created_at, messages(count)")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    const mapped = (data || []).map((conv) => ({
      id: conv.id,
      title: conv.title,
      pinned: conv.pinned,
      created_at: conv.created_at,
      message_count: (conv.messages as unknown as { count: number }[])[0]?.count || 0,
    }));

    setConversations(mapped);
    setLoading(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    // 메시지 내용에서 검색 (원문 + 번역문)
    const { data: matchedMessages } = await supabase
      .from("messages")
      .select("conversation_id")
      .or(`original_text.ilike.%${query}%,translated_text.ilike.%${query}%`);

    // 대화 제목에서 검색
    const { data: matchedConvs } = await supabase
      .from("conversations")
      .select("id")
      .ilike("title", `%${query}%`);

    // 매칭된 대화 ID 합치기 (중복 제거)
    const matchedIds = new Set<string>();
    matchedMessages?.forEach((m) => matchedIds.add(m.conversation_id));
    matchedConvs?.forEach((c) => matchedIds.add(c.id));

    const filtered = conversations.filter((c) => matchedIds.has(c.id));
    setSearchResults(filtered);
  };

  const MAX_PINS = 3;

  const togglePin = async (id: string, currentPinned: boolean) => {
    if (!currentPinned && pinned.length >= MAX_PINS) {
      alert(`핀 고정은 최대 ${MAX_PINS}개까지 가능합니다.`);
      return;
    }
    await supabase
      .from("conversations")
      .update({ pinned: !currentPinned })
      .eq("id", id);
    loadConversations();
  };

  const updateTitle = async (id: string, newTitle: string) => {
    await supabase
      .from("conversations")
      .update({ title: newTitle })
      .eq("id", id);
    loadConversations();
  };

  const deleteConversation = async (id: string) => {
    if (!confirm("이 대화를 삭제하시겠습니까?")) return;
    await supabase.from("conversations").delete().eq("id", id);
    loadConversations();
  };

  const pinned = conversations.filter((c) => c.pinned);
  const unpinned = conversations.filter((c) => !c.pinned);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto bg-gray-50">
      <Header title="대화 기록" showBack onBack={() => router.push("/")} />

      {/* 검색창 */}
      <div className="px-4 pt-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="대화 내용 검색..."
          className="w-full px-4 py-2.5 rounded-full border border-gray-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto page-safe-bottom">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            로딩 중...
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            저장된 대화가 없습니다
          </div>
        ) : searchResults !== null && searchResults.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            &quot;{searchQuery}&quot; 검색 결과가 없습니다
          </div>
        ) : (
          <>
            {pinned.length > 0 && !searchResults && (
              <div className="px-4 pt-4">
                <p className="text-xs font-semibold text-gray-400 mb-2">
                  📌 핀 고정 (최대 3개)
                </p>
                {pinned.map((conv) => (
                  <ConversationCard
                    key={conv.id}
                    conversation={conv}
                    formatDate={formatDate}
                    onTap={() => router.push(`/history/${conv.id}`)}
                    onTogglePin={() => togglePin(conv.id, conv.pinned)}
                    onUpdateTitle={(t) => updateTitle(conv.id, t)}
                    onDelete={() => deleteConversation(conv.id)}
                  />
                ))}
              </div>
            )}

            <div className="px-4 pt-4">
              {pinned.length > 0 && !searchResults && (
                <p className="text-xs font-semibold text-gray-400 mb-2">
                  전체 기록
                </p>
              )}
              {searchResults && (
                <p className="text-xs font-semibold text-gray-400 mb-2">
                  검색 결과 ({searchResults.length}개)
                </p>
              )}
              {(searchResults || unpinned).map((conv) => (
                <ConversationCard
                  key={conv.id}
                  conversation={conv}
                  formatDate={formatDate}
                  onTap={() => router.push(`/history/${conv.id}`)}
                  onTogglePin={() => togglePin(conv.id, conv.pinned)}
                  onUpdateTitle={(t) => updateTitle(conv.id, t)}
                  onDelete={() => deleteConversation(conv.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ConversationCard({
  conversation,
  formatDate,
  onTap,
  onTogglePin,
  onUpdateTitle,
  onDelete,
}: {
  conversation: Conversation;
  formatDate: (d: string) => string;
  onTap: () => void;
  onTogglePin: () => void;
  onUpdateTitle: (title: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);

  return (
    <div className="bg-white rounded-xl p-4 mb-2 shadow-sm border border-gray-100 flex items-center gap-3">
      <div
        onClick={() => !isEditing && onTap()}
        className="flex-1 cursor-pointer active:opacity-70 transition-opacity"
      >
        {isEditing ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => {
              if (editTitle.trim()) onUpdateTitle(editTitle.trim());
              setIsEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (editTitle.trim()) onUpdateTitle(editTitle.trim());
                setIsEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-base font-medium text-gray-900 w-full border-b border-blue-500 outline-none bg-transparent"
          />
        ) : (
          <p className="text-base font-medium text-gray-900">
            {conversation.pinned && "📌 "}
            {conversation.title}
          </p>
        )}
        <p className="text-sm text-gray-400 mt-1">
          {conversation.message_count}개 메시지 |{" "}
          {formatDate(conversation.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditTitle(conversation.title);
            setIsEditing(true);
          }}
          className="p-2 rounded-full bg-gray-100 text-gray-400 active:bg-gray-200 transition-colors text-sm"
        >
          ✏️
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className={`p-2 rounded-full text-sm transition-colors ${
            conversation.pinned
              ? "bg-yellow-100 text-yellow-700 active:bg-yellow-200"
              : "bg-gray-100 text-gray-400 active:bg-gray-200"
          }`}
        >
          📌
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 rounded-full bg-gray-100 text-gray-400 active:bg-red-100 active:text-red-500 transition-colors text-sm"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
