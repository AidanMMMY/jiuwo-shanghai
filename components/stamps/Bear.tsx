export default function Bear(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="24" cy="24" r="22" />
      <circle cx="14" cy="14" r="5" />
      <circle cx="34" cy="14" r="5" />
      <ellipse cx="24" cy="27" rx="11" ry="10" />
      <ellipse cx="19" cy="25" rx="2.5" ry="3" />
      <ellipse cx="29" cy="25" rx="2.5" ry="3" />
      <circle cx="18.5" cy="24.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="28.5" cy="24.5" r="0.8" fill="currentColor" stroke="none" />
      <ellipse cx="24" cy="31" rx="4" ry="3" />
      <path d="M21 34c0 2 1.5 3 3 3s3-1 3-3" />
    </svg>
  );
}
