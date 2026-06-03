import { redirect } from 'next/navigation';
import { listEntries, deleteEntry } from '@/lib/guestbook';
import { StampIcon } from '@/components/StampIcon';
import type { StampId } from '@/lib/guestbook';

interface PageProps {
  searchParams: Promise<{ key?: string; id?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { key, id } = await searchParams;
  const adminKey = process.env.GUESTBOOK_ADMIN_KEY;

  if (!adminKey || key !== adminKey) {
    redirect('/');
  }

  const entries = await listEntries();

  // Handle delete action (server action via form)
  async function handleDelete(formData: FormData) {
    'use server';
    const entryId = formData.get('entryId');
    const adminKeyFromForm = formData.get('adminKey');
    if (entryId && adminKeyFromForm === process.env.GUESTBOOK_ADMIN_KEY) {
      await deleteEntry(Number(entryId));
    }
  }

  return (
    <main className="bg-[#0a0a0a] min-h-[100lvh] px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl text-[#f5f5f0] mb-8">Guestbook Admin</h1>

        {id && (
          <div className="mb-6 p-4 border border-[#c9a227] text-[#c9a227] text-sm">
            Viewing entry #{id}
          </div>
        )}

        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`p-4 border border-[#c9a22733] ${
                id && Number(id) === entry.id ? 'border-[#c9a227]' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[#f5f5f0]">&ldquo;{entry.message}&rdquo;</p>
                  <p className="text-sm text-[#c9a227] mt-2">
                    — {entry.name} · {entry.stamp} · {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
                <StampIcon stamp={entry.stamp as StampId} size={24} className="text-[#c9a227]" />
              </div>
              <form action={handleDelete} className="mt-3">
                <input type="hidden" name="entryId" value={entry.id} />
                <input type="hidden" name="adminKey" value={key} />
                <button
                  type="submit"
                  className="text-xs text-red-400 hover:text-red-300 underline"
                >
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>

        {entries.length === 0 && (
          <p className="text-[#a0a0a0]">No entries yet.</p>
        )}
      </div>
    </main>
  );
}
