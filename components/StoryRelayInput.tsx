'use client';

import { useState } from 'react';

interface StoryRelayInputProps {
  latestQuestion: { zh: string | null; en: string | null } | null;
  suggestions: { zh: string | null; en: string | null }[];
  onSubmit: (authorName: string, userInput: string) => void;
  disabled?: boolean;
  isZh?: boolean;
}

export function StoryRelayInput({ latestQuestion, suggestions, onSubmit, disabled, isZh }: StoryRelayInputProps) {
  const [authorName, setAuthorName] = useState('');
  const [userInput, setUserInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !userInput.trim()) return;
    onSubmit(authorName.trim(), userInput.trim());
  };

  const questionText = isZh ? latestQuestion?.zh : latestQuestion?.en;
  const inputLabels = {
    yourTurn: isZh ? '轮到你了' : 'Your turn',
    namePlaceholder: isZh ? '你的名字（首次提交后将很难更改）' : 'Your name (hard to change later)',
    inputPlaceholder: isZh ? '回答 AI 的问题，或提出你的要求...' : 'Answer the question or steer the story...',
    submit: isZh ? '续写故事' : 'Continue story',
    submitting: isZh ? '续写中...' : 'Continuing...',
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-5">
      <div className="mb-3 text-xs uppercase tracking-widest text-[#888]">{inputLabels.yourTurn}</div>
      {questionText && (
        <div className="mb-4">
          <p className="text-lg text-[#f5f5f0]">{questionText}</p>
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        {suggestions.map((s, idx) => {
          const text = isZh ? s.zh : s.en;
          return text ? (
            <button
              key={idx}
              type="button"
              onClick={() => setUserInput(text)}
              className="rounded border border-[#3a3a3a] px-3 py-1 text-sm text-[#c9a227] hover:border-[#c9a227]"
            >
              {String.fromCharCode(65 + idx)}. {text}
            </button>
          ) : null;
        })}
      </div>
      <input
        type="text"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
        placeholder={inputLabels.namePlaceholder}
        className="mb-3 w-full rounded border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-[#f5f5f0] placeholder:text-[#555] focus:border-[#c9a227] focus:outline-none"
      />
      <textarea
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder={inputLabels.inputPlaceholder}
        rows={4}
        className="mb-3 w-full rounded border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-[#f5f5f0] placeholder:text-[#555] focus:border-[#c9a227] focus:outline-none"
      />
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
