export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#2f6feb" />
      <path d="M7.5 13.2 16 8.5l8.5 4.7-8.5 4.7-8.5-4.7Z" fill="#fff" />
      <path d="M7.5 17.2 16 21.9l8.5-4.7" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" fill="none" />
      <path d="M7.5 21.2 16 25.9l8.5-4.7" stroke="oklch(0.85 0.08 230)" strokeWidth="1.7" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
