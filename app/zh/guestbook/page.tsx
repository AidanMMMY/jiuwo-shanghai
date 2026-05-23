import GuestbookPage from '@/app/components/pages/GuestbookPage';
import { listEntries, countEntries } from '@/lib/guestbook';
import type { GuestbookLabels } from '@/lib/guestbook';

export const revalidate = 60;

const labels: GuestbookLabels = {
  title: '客言',
  subtitle: '在墙上留下你的痕迹',
  cta: '留下印章',
  countPrefix: '',
  countSuffix: ' 枚印章',
  nameLabel: '你的名字',
  messageLabel: '你想说的话',
  emailLabel: '邮箱（可选）',
  emailHint: '不会公开显示',
  stampSelectLabel: '选择你的印章',
  submitButton: '盖章',
  rateLimitMessage: '已经留下好几个章了，稍后再来吧。',
  closeButton: '关闭',
  emptyState: '还没有印章，来做第一个吧！',
};

export default async function Page() {
  const [entries, totalCount] = await Promise.all([
    listEntries(),
    countEntries(),
  ]);

  return (
    <GuestbookPage
      entries={entries}
      totalCount={totalCount}
      labels={labels}
      locale="zh"
    />
  );
}
