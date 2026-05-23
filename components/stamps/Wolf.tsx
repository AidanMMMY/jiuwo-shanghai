export default function Wolf(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      {/* 外框 */}
      <circle cx="24" cy="24" r="22" />
      {/* 左耳（尖三角，向上） */}
      <path d="M12 20 L15 6 L20 18 Z" fill="currentColor" />
      {/* 右耳（尖三角，向上） */}
      <path d="M36 20 L33 6 L28 18 Z" fill="currentColor" />
      {/* 头 */}
      <path d="M14 20 Q14 12 24 14 Q34 12 34 20 Q36 28 32 34 Q28 38 24 38 Q20 38 16 34 Q12 28 14 20 Z" fill="currentColor" />
      {/* 左眼 */}
      <circle cx="19.5" cy="24" r="2" fill="#0a0a0a" />
      <circle cx="20" cy="23.5" r="0.6" fill="currentColor" />
      {/* 右眼 */}
      <circle cx="28.5" cy="24" r="2" fill="#0a0a0a" />
      <circle cx="29" cy="23.5" r="0.6" fill="currentColor" />
      {/* 鼻子 */}
      <ellipse cx="24" cy="31" rx="2.5" ry="2" fill="#0a0a0a" />
      {/* 嘴巴线条 */}
      <path d="M21 34q3 2 6 0" stroke="#0a0a0a" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
