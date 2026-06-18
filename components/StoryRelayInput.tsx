'use client';

import { useState } from 'react';

interface StoryRelayInputProps {
  latestQuestion: { zh: string | null; en: string | null } | null;
  suggestions: { zh: string | null; en: string | null }[];
  onSubmit: (authorName: string, userInput: string) => void;
  disabled?: boolean;
}

export function StoryRelayInput({ latestQuestion, suggestions, onSubmit, disabled }: StoryRelayInputProps) {
  const [authorName, setAuthorName] = useState('');
  const [userInput, setUserInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !userInput.trim()) return;
    onSubmit(authorName.trim(), userInput.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-5">
      <div className="mb-3 text-xs uppercase tracking-widest text-[#888]">轮到你了</div>
      {latestQuestion && (
        <div className="mb-4">
          <p className="text-lg text-[#f5f5f0]">{latestQuestion.zh}</p>
          <p className="text-base text-[#888]">{latestQuestion.en}</p>
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        {suggestions.map((s, idx) =>
          s.zh ? (
            <button
              key={idx}
              type="button"
              onClick={() => setUserInput(s.zh || '')}
              className="rounded border border-[#3a3a3a] px-3 py-1 text-sm text-[#c9a227] hover:border-[#c9a227]"
            >
              {String.fromCharCode(65 + idx)}. {s.zh}
            </button>
          ) : null
        )}
      </div>
      <input
        type="text"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
        placeholder="你的名字（首次提交后将很难更改）"
        className="mb-3 w-full rounded border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-[#f5f5f0] placeholder:text-[#555] focus:border-[#c9a227] focus:outline-none"
      />
      <textarea
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="回答 AI 的问题，或提出你的要求..."
        rows={4}
        className="mb-3 w-full rounded border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-[#f5f5f0] placeholder:text-[#555] focus:border-[#c9a227] focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !authorName.trim() || !userInput.trim()}
        className="rounded bg-[#c9a227] px-5 py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-50"
      >
        {disabled ? '续写中...' : '续写故事'}
      </button>
    </form>
  );
}
