export default function Dog(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="24" cy="24" r="22" />
      <ellipse cx="24" cy="26" rx="10" ry="9" />
      <ellipse cx="17" cy="20" rx="4" ry="5" />
      <ellipse cx="31" cy="20" rx="4" ry="5" />
      <circle cx="16.5" cy="19" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="30.5" cy="19" r="0.8" fill="currentColor" stroke="none" />
      <ellipse cx="24" cy="30" rx="3.5" ry="2.5" />
      <path d="M19 14c-1-3-3-4-5-3M29 14c1-3 3-4 5-3" />
    </svg>
  );
}
