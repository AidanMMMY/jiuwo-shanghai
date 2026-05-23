export default function Bear(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      {/* 外框 */}
      <circle cx="24" cy="24" r="22" />
      {/* 左耳 */}
      <circle cx="13" cy="14" r="5" fill="currentColor" />
      {/* 右耳 */}
      <circle cx="35" cy="14" r="5" fill="currentColor" />
      {/* 头（宽圆） */}
      <ellipse cx="24" cy="26" rx="12" ry="11" fill="currentColor" />
      {/* 嘴部区域（稍浅） */}
      <ellipse cx="24" cy="29" rx="7" ry="5" stroke="#0a0a0a" strokeWidth="0.6" fill="none" opacity="0.3" />
      {/* 左眼 */}
      <circle cx="19" cy="23" r="2" fill="#0a0a0a" />
      <circle cx="19.5" cy="22.5" r="0.6" fill="currentColor" />
      {/* 右眼 */}
      <circle cx="29" cy="23" r="2" fill="#0a0a0a" />
      <circle cx="29.5" cy="22.5" r="0.6" fill="currentColor" />
      {/* 鼻子 */}
      <ellipse cx="24" cy="28" rx="3" ry="2.2" fill="#0a0a0a" />
      {/* 嘴巴 */}
      <path d="M21 31q3 2 6 0" stroke="#0a0a0a" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
