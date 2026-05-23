export default function Pig(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      {/* 外框 */}
      <circle cx="24" cy="24" r="22" />
      {/* 左耳 */}
      <ellipse cx="12" cy="14" rx="4" ry="6" fill="currentColor" transform="rotate(-20 12 14)" />
      {/* 右耳 */}
      <ellipse cx="36" cy="14" rx="4" ry="6" fill="currentColor" transform="rotate(20 36 14)" />
      {/* 头 */}
      <ellipse cx="24" cy="26" rx="12" ry="11" fill="currentColor" />
      {/* 左眼 */}
      <circle cx="19" cy="23" r="2" fill="#0a0a0a" />
      <circle cx="19.5" cy="22.5" r="0.6" fill="currentColor" />
      {/* 右眼 */}
      <circle cx="29" cy="23" r="2" fill="#0a0a0a" />
      <circle cx="29.5" cy="22.5" r="0.6" fill="currentColor" />
      {/* 大鼻子 */}
      <ellipse cx="24" cy="29" rx="5" ry="4" fill="#0a0a0a" />
      {/* 左鼻孔 */}
      <ellipse cx="22.5" cy="29" rx="1.2" ry="1.8" fill="currentColor" />
      {/* 右鼻孔 */}
      <ellipse cx="25.5" cy="29" rx="1.2" ry="1.8" fill="currentColor" />
    </svg>
  );
}
