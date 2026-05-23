export default function Monkey(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="24" cy="24" r="22" />
      <ellipse cx="18" cy="16" rx="5" ry="6" />
      <ellipse cx="30" cy="16" rx="5" ry="6" />
      <path d="M16 14c0-2 2-3 4-3s4 1 4 3M12 20c-3 4-2 10 2 14 3 3 8 4 12 4s9-1 12-4c4-4 5-10 2-14" />
      <path d="M22 28c0 2 1.5 3 3 3s3-1 3-3" />
    </svg>
  );
}
