'use client';

import { useState } from 'react';

interface StoryRelayInputProps {
  suggestions: { zh: string | null; en: string | null }[];
  onSubmit: (authorName: string, userInput: string) => void;
  disabled?: boolean;
  isZh?: boolean;
}

export function StoryRelayInput({ suggestions, onSubmit, disabled, isZh }: StoryRelayInputProps) {
  const [authorName, setAuthorName] = useState('');
  const [userInput, setUserInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !userInput.trim()) return;
    onSubmit(authorName.trim(), userInput.trim());
  };

  const inputLabels = {
    nameLabel: isZh ? '你的名字' : 'Your name',
    namePlaceholder: isZh ? '首次提交后将很难更改' : 'Hard to change later',
    inputPlaceholder: isZh ? '写下你的续写，或提出你想让故事怎么发展...' : 'Write your continuation, or steer the story...',
    submit: isZh ? '续写故事' : 'Continue story',
    submitting: isZh ? '续写中...' : 'Continuing...',
  };
  const hintText = isZh
    ? '不想自己写？直接选一个剧情方向：'
    : "Don't want to write? Pick a direction:";

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-5">
      <div className="mb-3">
        <label className="mb-1 flex items-center gap-1 text-xs text-[#888]">
          {inputLabels.nameLabel}
          <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder={inputLabels.namePlaceholder}
          className="w-full rounded border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-[#f5f5f0] placeholder:text-[#555] focus:border-[#c9a227] focus:outline-none"
        />
      </div>

      <textarea
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder={inputLabels.inputPlaceholder}
        rows={4}
        className="mb-4 w-full rounded border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-[#f5f5f0] placeholder:text-[#555] focus:border-[#c9a227] focus:outline-none"
      />

      {suggestions.some((s) => (isZh ? s.zh : s.en)) && (
        <div className="mb-4">
          <p className="mb-2 text-xs text-[#888]">{hintText}</p>
          <div className="flex flex-col gap-2">
            {suggestions.map((s, idx) => {
              const text = isZh ? s.zh : s.en;
              return text ? (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setUserInput(text)}
                  className="w-full rounded border border-[#3a3a3a] px-3 py-2.5 text-left text-base text-[#c9a227] hover:border-[#c9a227]"
                >
                  {String.fromCharCode(65 + idx)}. {text}
                </button>
              ) : null;
            })}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || !authorName.trim() || !userInput.trim()}
        className="rounded bg-[#c9a227] px-5 py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-50"
      >
        {disabled ? inputLabels.submitting : inputLabels.submit}
      </button>
    </form>
  );
}
