export default function Dog(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      {/* 外框 */}
      <circle cx="24" cy="24" r="22" />
      {/* 左耳（下垂） */}
      <ellipse cx="11" cy="22" rx="4.5" ry="9" fill="currentColor" transform="rotate(-15 11 22)" />
      {/* 右耳（下垂） */}
      <ellipse cx="37" cy="22" rx="4.5" ry="9" fill="currentColor" transform="rotate(15 37 22)" />
      {/* 头 */}
      <ellipse cx="24" cy="24" rx="10" ry="11" fill="currentColor" />
      {/* 左眼 */}
      <circle cx="20" cy="22" r="2" fill="#0a0a0a" />
      <circle cx="20.5" cy="21.5" r="0.6" fill="currentColor" />
      {/* 右眼 */}
      <circle cx="28" cy="22" r="2" fill="#0a0a0a" />
      <circle cx="28.5" cy="21.5" r="0.6" fill="currentColor" />
      {/* 鼻子 */}
      <ellipse cx="24" cy="28" rx="3" ry="2.2" fill="#0a0a0a" />
      {/* 嘴巴 */}
      <path d="M21 31q3 2.5 6 0" stroke="#0a0a0a" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
