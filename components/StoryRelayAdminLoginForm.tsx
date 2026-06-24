'use client';

import { useActionState } from 'react';

interface StoryRelayAdminLoginFormProps {
  loginAction: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
}

export function StoryRelayAdminLoginForm({ loginAction }: StoryRelayAdminLoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, { error: undefined });

  return (
    <div className="flex min-h-[100lvh] items-center justify-center bg-[#0a0a0a] px-4 text-[#f5f5f0]">
      <form
        action={formAction}
        className="w-full max-w-md rounded-lg border border-[#2a2a2a] bg-[#151515] p-8"
      >
        <h1 className="mb-6 text-2xl font-semibold tracking-wide text-[#c9a227]">
          Story Relay Admin
        </h1>
        <label className="mb-2 block text-sm text-[#a0a0a0]">Admin Token</label>
        <input
          type="password"
          name="token"
          required
          autoFocus
          className="mb-4 w-full rounded border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-[#f5f5f0] placeholder:text-[#555] focus:border-[#c9a227] focus:outline-none"
        />
        {state?.error && (
          <p className="mb-4 text-sm text-red-300">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-[#c9a227] px-5 py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-50"
        >
          {isPending ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  );
}
