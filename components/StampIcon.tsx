import { ALLOWED_STAMPS, type StampId } from '@/lib/guestbook';
import Monkey from './stamps/Monkey';
import Pig from './stamps/Pig';
import Wolf from './stamps/Wolf';
import Dog from './stamps/Dog';
import Bear from './stamps/Bear';

const STAMP_LABELS: Record<StampId, { en: string; zh: string }> = {
  monkey: { en: 'Monkey', zh: '猴' },
  pig: { en: 'Pig', zh: '猪' },
  wolf: { en: 'Wolf', zh: '狼' },
  dog: { en: 'Dog', zh: '狗' },
  bear: { en: 'Bear', zh: '熊' },
};

const StampComponents: Record<StampId, React.FC<React.SVGProps<SVGSVGElement>>> = {
  monkey: Monkey,
  pig: Pig,
  wolf: Wolf,
  dog: Dog,
  bear: Bear,
};

export function StampIcon({
  stamp,
  className = '',
  size = 48,
  'aria-label': ariaLabel,
}: {
  stamp: StampId;
  className?: string;
  size?: number;
  'aria-label'?: string;
}) {
  const Component = StampComponents[stamp];
  const label = ariaLabel || STAMP_LABELS[stamp].en;
  return (
    <Component
      className={className}
      width={size}
      height={size}
      aria-label={label}
      role="img"
    />
  );
}

export function getStampLabel(stamp: StampId, locale: 'en' | 'zh' = 'en'): string {
  return STAMP_LABELS[stamp][locale];
}

export { ALLOWED_STAMPS, type StampId };
