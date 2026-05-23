export default function Wolf(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="24" cy="24" r="22" />
      <path d="M14 28c-2-2-3-6-1-9l3-8 4 4 4-2 4 2 4-4 3 8c2 3 1 7-1 9" />
      <ellipse cx="20" cy="24" rx="2" ry="2.5" />
      <ellipse cx="28" cy="24" rx="2" ry="2.5" />
      <circle cx="19.5" cy="23.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="27.5" cy="23.5" r="0.8" fill="currentColor" stroke="none" />
      <path d="M22 30l2 3 2-3" />
    </svg>
  );
}
