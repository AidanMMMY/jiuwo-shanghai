'use client';

import { useState, useCallback } from 'react';
import { StampIcon, getStampLabel } from './StampIcon';
import { ALLOWED_STAMPS, type StampId, type GuestbookEntry, type GuestbookLabels } from '@/lib/guestbook';

export function StampPanel({
  isOpen,
  onClose,
  onSuccess,
  labels,
  locale,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (entry: GuestbookEntry) => void;
  labels: GuestbookLabels;
  locale: 'en' | 'zh';
}) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [selectedStamp, setSelectedStamp] = useState<StampId | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showDropAnimation, setShowDropAnimation] = useState(false);

  const isFormValid =
    name.trim().length > 0 &&
    name.trim().length <= 30 &&
    message.trim().length > 0 &&
    message.trim().length <= 140 &&
    selectedStamp !== null;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isFormValid || isSubmitting) return;

      setIsSubmitting(true);
      setError('');

      try {
        const res = await fetch('/api/guestbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            message: message.trim(),
            stamp: selectedStamp,
            email: email.trim() || undefined,
            website: website.trim() || undefined,
          }),
        });

        if (res.status === 429) {
          setError(labels.rateLimitMessage);
          setIsSubmitting(false);
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Something went wrong');
          setIsSubmitting(false);
          return;
        }

        const entry: GuestbookEntry = await res.json();

        // Trigger drop animation
        setShowDropAnimation(true);
        setTimeout(() => {
          setShowDropAnimation(false);
          onSuccess(entry);
          onClose();
          // Reset form
          setName('');
          setMessage('');
          setEmail('');
          setSelectedStamp(null);
        }, 1200);
      } catch (err) {
        setError('Network error. Please try again.');
        setIsSubmitting(false);
      }
    },
    [isFormValid, isSubmitting, name, message, selectedStamp, email, website, labels, onSuccess, onClose]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a] border-t border-[#c9a22733] max-h-[90vh] overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 md:px-12 py-8">
          {/* Close button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={onClose}
              className="text-[#a0a0a0] hover:text-[#f5f5f0] text-sm tracking-wider"
            >
              {labels.closeButton} ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#a0a0a0] mb-2">
                {labels.nameLabel}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                className="w-full bg-transparent border-b border-[#c9a22733] text-[#f5f5f0] py-2 focus:outline-none focus:border-[#c9a227] transition-colors"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#a0a0a0] mb-2">
                {labels.messageLabel}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={140}
                rows={3}
                className="w-full bg-transparent border-b border-[#c9a22733] text-[#f5f5f0] py-2 focus:outline-none focus:border-[#c9a227] transition-colors resize-none"
                required
              />
              <p className="text-right text-xs text-[#666] mt-1">{message.length}/140</p>
            </div>

            {/* Email (optional) */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#a0a0a0] mb-2">
                {labels.emailLabel}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-[#c9a22733] text-[#f5f5f0] py-2 focus:outline-none focus:border-[#c9a227] transition-colors"
              />
              <p className="text-xs text-[#666] mt-1">{labels.emailHint}</p>
            </div>

            {/* Honeypot — hidden */}
            <div style={{ display: 'none' }}>
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Stamp selection */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#a0a0a0] mb-4">
                {labels.stampSelectLabel}
              </label>
              <div className="flex gap-4 justify-center">
                {ALLOWED_STAMPS.map((stamp) => (
                  <button
                    key={stamp}
                    type="button"
                    onClick={() => setSelectedStamp(stamp)}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      selectedStamp === stamp
                        ? 'scale-110 ring-2 ring-[#c9a227] ring-offset-2 ring-offset-[#0a0a0a]'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    aria-label={getStampLabel(stamp, locale)}
                  >
                    <StampIcon
                      stamp={stamp}
                      size={40}
                      className={selectedStamp === stamp ? 'text-[#c9a227]' : 'text-[#a0a0a0]'}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full py-3 bg-[#c9a227] text-[#0a0a0a] text-sm uppercase tracking-[0.2em] font-medium hover:bg-[#d4b43a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? '...' : labels.submitButton}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Drop animation overlay */}
      {showDropAnimation && selectedStamp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="animate-[stampDrop_1.2s_ease-out_forwards]">
            <StampIcon
              stamp={selectedStamp}
              size={120}
              className="text-[#c9a227]"
            />
          </div>
          <div className="absolute inset-0 animate-[inkHalo_1.2s_ease-out_forwards]" />
        </div>
      )}

      <style jsx>{`
        @keyframes stampDrop {
          0% { transform: translateY(-200px) scale(0.5); opacity: 0; }
          40% { transform: translateY(10px) scale(1.1); opacity: 1; }
          50% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 0.8; }
        }
        @keyframes inkHalo {
          0% { background: radial-gradient(circle at center, rgba(201,162,39,0) 0%, rgba(201,162,39,0) 100%); }
          50% { background: radial-gradient(circle at center, rgba(201,162,39,0.15) 0%, rgba(201,162,39,0) 70%); }
          100% { background: radial-gradient(circle at center, rgba(201,162,39,0) 0%, rgba(201,162,39,0) 100%); }
        }
      `}</style>
    </>
  );
}
