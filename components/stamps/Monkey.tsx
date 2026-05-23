export default function Monkey(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      {/* 外框 */}
      <circle cx="24" cy="24" r="22" />
      {/* 左耳 */}
      <circle cx="13" cy="14" r="5.5" fill="currentColor" />
      {/* 右耳 */}
      <circle cx="35" cy="14" r="5.5" fill="currentColor" />
      {/* 头 */}
      <ellipse cx="24" cy="26" rx="11" ry="12" fill="currentColor" />
      {/* 心形脸区域（用深色描边示意） */}
      <ellipse cx="24" cy="29" rx="8" ry="7" stroke="#0a0a0a" strokeWidth="0.8" fill="none" opacity="0.4" />
      {/* 左眼 */}
      <circle cx="20" cy="24" r="2" fill="#0a0a0a" />
      <circle cx="20.5" cy="23.5" r="0.6" fill="currentColor" />
      {/* 右眼 */}
      <circle cx="28" cy="24" r="2" fill="#0a0a0a" />
      <circle cx="28.5" cy="23.5" r="0.6" fill="currentColor" />
      {/* 鼻子 */}
      <ellipse cx="24" cy="28.5" rx="2.5" ry="1.8" fill="#0a0a0a" />
      {/* 嘴巴 */}
      <path d="M21 32q3 2.5 6 0" stroke="#0a0a0a" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
