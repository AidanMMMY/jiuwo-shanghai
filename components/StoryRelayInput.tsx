'use client';

import { useState } from 'react';

interface StoryRelayInputProps {
  latestQuestion: { zh: string | null; en: string | null } | null;
  suggestions: { zh: string | null; en: string | null }[];
  onSubmit: (authorName: string, userInput: string) => void;
  disabled?: boolean;
  isZh?: boolean;
  defaultName?: string;
}

export function StoryRelayInput({ latestQuestion, suggestions, onSubmit, disabled, isZh, defaultName }: StoryRelayInputProps) {
  const [authorName, setAuthorName] = useState(defaultName ?? '');
  const [userInput, setUserInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !userInput.trim()) return;
    onSubmit(authorName.trim(), userInput.trim());
    setUserInput('');
  };

  const questionText = isZh ? latestQuestion?.zh : latestQuestion?.en;
  const questionLabel = isZh ? '接下来' : 'What next?';
  const inputLabels = {
    nameLabel: isZh ? '留下一个名字' : 'Leave a name',
    namePlaceholder: isZh ? '笔名、真名、或是你想被写进故事的名字' : 'A pen name, real name, or any name you want in the story',
    inputPlaceholder: isZh ? '写下你的续写，或提出你想让故事怎么发展...' : 'Write your continuation, or steer the story...',
    submit: isZh ? '续写故事' : 'Continue story',
    submitting: isZh ? '续写中...' : 'Continuing...',
  };
  const nameHint = isZh
    ? '这个名字会悄悄潜入故事，变成某个角落的角色。想好再写——一经落笔，概不退换。'
    : "This name will slip into the story as a character somewhere in the corner. Choose wisely — once written, no refunds.";
  const hintText = isZh
    ? '不想自己写？直接选一个剧情方向：'
    : "Don't want to write? Pick a direction:";
  const loadingText = isZh
    ? '匿名酒保正在接棒'
    : 'The Anonymous Bartender is taking the baton';

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-5">
      {questionText && (
        <div className="mb-6 border-l-2 border-[#c9a227] pl-4">
          <div className="mb-1 text-xs uppercase tracking-widest text-[#888]">{questionLabel}</div>
          <p className="text-lg font-semibold leading-relaxed text-[#c9a227]">{questionText}</p>
        </div>
      )}

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
        <p className="mt-1.5 text-xs leading-relaxed text-[#666]">{nameHint}</p>
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
              const raw = isZh ? s.zh : s.en;
              const text = raw ? raw.replace(/^[A-C][.．、]?\s*/, '') : '';
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

      {disabled && (
        <div className="mt-4 flex items-center gap-2 text-xs text-[#888]">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#3a3a3a] border-t-[#c9a227]" />
          <span>{loadingText}</span>
          <span className="inline-flex w-6">
            <span className="animate-pulse">…</span>
          </span>
        </div>
      )}
    </form>
  );
}
