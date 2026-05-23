export default function Pig(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="24" cy="24" r="22" />
      <ellipse cx="24" cy="26" rx="12" ry="10" />
      <ellipse cx="18" cy="22" rx="3" ry="2.5" />
      <ellipse cx="30" cy="22" rx="3" ry="2.5" />
      <circle cx="17.5" cy="21.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="29.5" cy="21.5" r="0.8" fill="currentColor" stroke="none" />
      <ellipse cx="24" cy="30" rx="4" ry="3" />
      <path d="M15 18c-4-1-6 2-5 5M33 18c4-1 6 2 5 5" />
      <path d="M20 36c0 2 1.8 3 4 3s4-1 4-3" />
    </svg>
  );
}
