"use client";

import { useMemo, useState } from "react";
import type { SessionConversationGroup, Conversation } from "@/lib/darkroom-memory";

type SortField = "firstMessageAt" | "lastMessageAt";
type SortOrder = "asc" | "desc";

interface SortState {
  field: SortField;
  order: SortOrder;
}

const SORT_OPTIONS: { label: string; value: SortState }[] = [
  { label: "最早开始 ↑", value: { field: "firstMessageAt", order: "asc" } },
  { label: "最近开始 ↓", value: { field: "firstMessageAt", order: "desc" } },
  { label: "最早活跃 ↑", value: { field: "lastMessageAt", order: "asc" } },
  { label: "最近活跃 ↓", value: { field: "lastMessageAt", order: "desc" } },
];

interface RecentConversationListProps {
  groups: SessionConversationGroup[];
}

export function RecentConversationList({ groups }: RecentConversationListProps) {
  const [sort, setSort] = useState<SortState>({ field: "lastMessageAt", order: "desc" });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const aTime = new Date(a[sort.field]).getTime();
      const bTime = new Date(b[sort.field]).getTime();
      return sort.order === "asc" ? aTime - bTime : bTime - aTime;
    });
  }, [groups, sort]);

  const toggleExpanded = (sessionId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <h2 className="text-sm uppercase tracking-wider text-[#c9a227]">
          Recent Conversations
        </h2>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => {
            const active =
              sort.field === option.value.field && sort.order === option.value.order;
            return (
              <button
                key={option.label}
                onClick={() => setSort(option.value)}
                className={`text-xs px-2 py-1 border transition-colors ${
                  active
                    ? "bg-[#c9a227] text-[#0a0a0a] border-[#c9a227]"
                    : "text-[#a0a0a0] border-[#c9a22733] hover:border-[#c9a227]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {sortedGroups.length === 0 ? (
        <p className="text-[#a0a0a0] text-sm">No recent conversations.</p>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map((group) => (
            <SessionCard
              key={group.sessionId}
              group={group}
              expanded={expanded.has(group.sessionId)}
              onToggle={() => toggleExpanded(group.sessionId)}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface SessionCardProps {
  group: SessionConversationGroup;
  expanded: boolean;
  onToggle: () => void;
}

function SessionCard({ group, expanded, onToggle }: SessionCardProps) {
  return (
    <div className="border-b border-[#222] last:border-0 pb-4 last:pb-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 text-left group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[#c9a227] text-xs w-3 shrink-0">
            {expanded ? "▾" : "▸"}
          </span>
          <span className="text-sm text-[#f5f5f0] truncate group-hover:text-[#c9a227] transition-colors">
            {group.summary}
          </span>
        </div>
        <div className="text-xs text-[#666] shrink-0 hidden sm:block">
          首 {formatTime(group.firstMessageAt)} · 末 {formatTime(group.lastMessageAt)}
        </div>
      </button>

      <div className="text-xs text-[#666] mt-1 mb-2 sm:hidden pl-6">
        首 {formatTime(group.firstMessageAt)} · 末 {formatTime(group.lastMessageAt)}
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 pl-6">
          {group.conversations.map((conversation) => (
            <ConversationItem key={conversation.id} conversation={conversation} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
}

function ConversationItem({ conversation }: ConversationItemProps) {
  return (
    <div className="border-l-2 border-[#c9a22733] pl-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-[#666]">
          {formatTime(conversation.created_at)}
        </span>
        {!conversation.processed_for_memory && (
          <span className="text-xs px-2 py-0.5 bg-[#c9a227] text-[#0a0a0a]">
            unprocessed
          </span>
        )}
      </div>
      <p className="text-[#f5f5f0] text-sm mb-1">
        <span className="text-[#c9a227]">User:</span> {conversation.user_message}
      </p>
      <p className="text-[#a0a0a0] text-sm">
        <span className="text-[#c9a227]">AI:</span> {conversation.assistant_response}
      </p>
    </div>
  );
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
