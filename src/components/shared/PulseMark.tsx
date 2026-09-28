export function PulseMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="24" rx="7" fill="var(--color-teal-600)" />
      <path
        d="M4 12H14L17 6L21 18L25 9L28 15L31 12H44"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="120"
        className="animate-vital"
      />
    </svg>
  )
}
