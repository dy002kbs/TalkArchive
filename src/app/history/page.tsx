"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

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

  useEffect(() => { loadConversations(); }, []);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, pinned, created_at, messages(count)")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) { console.error(error); return; }

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
    if (!query.trim()) { setSearchResults(null); return; }

    const { data: matchedMessages } = await supabase
      .from("messages")
      .select("conversation_id")
      .or(`original_text.ilike.%${query}%,translated_text.ilike.%${query}%`);

    const { data: matchedConvs } = await supabase
      .from("conversations")
      .select("id")
      .ilike("title", `%${query}%`);

    const matchedIds = new Set<string>();
    matchedMessages?.forEach((m) => matchedIds.add(m.conversation_id));
    matchedConvs?.forEach((c) => matchedIds.add(c.id));

    setSearchResults(conversations.filter((c) => matchedIds.has(c.id)));
  };

  const MAX_PINS = 3;

  const togglePin = async (id: string, currentPinned: boolean) => {
    const pinnedList = conversations.filter((c) => c.pinned);
    if (!currentPinned && pinnedList.length >= MAX_PINS) {
      alert(`핀 고정은 최대 ${MAX_PINS}개까지 가능합니다.`);
      return;
    }
    await supabase.from("conversations").update({ pinned: !currentPinned }).eq("id", id);
    loadConversations();
  };

  const updateTitle = async (id: string, newTitle: string) => {
    await supabase.from("conversations").update({ title: newTitle }).eq("id", id);
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
    <div className="flex flex-col h-full max-w-lg mx-auto" style={{ background: "var(--c-bg)" }}>
      <Header title="대화 기록" showBack onBack={() => router.push("/")} />

      <div className="bg-white px-4 py-3" style={{ borderBottom: "1px solid var(--c-border)" }}>
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
          style={{ background: "var(--c-bg)", border: "1.5px solid var(--c-border)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="var(--c-subtle)" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="대화 내용 검색..."
            className="flex-1 text-sm bg-transparent focus:outline-none"
            style={{ color: "var(--c-text)" }}
          />
          {searchQuery && (
            <button onClick={() => handleSearch("")}
              className="text-xs" style={{ color: "var(--c-subtle)" }}>✕</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto page-safe-bottom">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--c-subtle)" }}>
            로딩 중...
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-sm" style={{ color: "var(--c-muted)" }}>저장된 대화가 없습니다</p>
            <p className="text-xs" style={{ color: "var(--c-subtle)" }}>번역 탭에서 대화를 시작해보세요</p>
          </div>
        ) : searchResults !== null && searchResults.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--c-subtle)" }}>
            &quot;{searchQuery}&quot; 검색 결과가 없습니다
          </div>
        ) : (
          <div className="px-4 pt-4 pb-2">
            {pinned.length > 0 && !searchResults && (
              <>
                <p className="text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--c-subtle)" }}>
                  핀 고정
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
              </>
            )}

            {(!searchResults || pinned.length > 0) && (
              <p className="text-[11px] font-semibold mb-2 mt-4 uppercase tracking-wider" style={{ color: "var(--c-subtle)" }}>
                {searchResults ? `검색 결과 (${searchResults.length}개)` : "전체 기록"}
              </p>
            )}
            {searchResults && !pinned.length && (
              <p className="text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--c-subtle)" }}>
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
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function ConversationCard({
  conversation, formatDate, onTap, onTogglePin, onUpdateTitle, onDelete,
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
    <div
      className="flex items-center gap-3 p-4 mb-2 rounded-2xl"
      style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", boxShadow: "var(--c-shadow-sm)" }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: conversation.pinned ? "var(--c-indigo-l)" : "var(--c-bg)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke={conversation.pinned ? "var(--c-indigo)" : "var(--c-muted)"}
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>

      <div
        className="flex-1 cursor-pointer active:opacity-70 transition-opacity"
        onClick={() => !isEditing && onTap()}
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
            className="text-sm font-semibold w-full bg-transparent focus:outline-none"
            style={{ color: "var(--c-text)", borderBottom: "1.5px solid var(--c-indigo)" }}
          />
        ) : (
          <p className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>
            {conversation.title}
          </p>
        )}
        <p className="text-xs mt-1" style={{ color: "var(--c-subtle)" }}>
          {conversation.message_count}개 메시지 · {formatDate(conversation.created_at)}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); setEditTitle(conversation.title); setIsEditing(true); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors active:opacity-60"
          style={{ background: "var(--c-bg)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="var(--c-muted)" strokeWidth="2.2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors active:opacity-60"
          style={{ background: conversation.pinned ? "var(--c-indigo-l)" : "var(--c-bg)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24"
            fill={conversation.pinned ? "var(--c-indigo)" : "none"}
            stroke={conversation.pinned ? "var(--c-indigo)" : "var(--c-muted)"}
            strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors active:opacity-60"
          style={{ background: "var(--c-bg)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="var(--c-muted)" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
