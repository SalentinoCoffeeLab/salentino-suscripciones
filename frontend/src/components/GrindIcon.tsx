interface GrindIconProps {
  id: string
}

export function GrindIcon({ id }: GrindIconProps) {
  const props = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  switch (id) {
    case 'grano':
      return (
        <svg {...props}>
          <ellipse cx="12" cy="12" rx="5.5" ry="8.5" transform="rotate(28 12 12)" />
          <path d="M8.6 5.8c2.6 2.4 1.2 5.2 3.2 6.6s1.4 4.6 3.6 6" />
        </svg>
      )
    case 'prensa':
      return (
        <svg {...props}>
          <path d="M6.5 7.5h10v11.5a1.5 1.5 0 0 1-1.5 1.5h-7a1.5 1.5 0 0 1-1.5-1.5z" />
          <path d="M16.5 10h1.5a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-1.5" />
          <path d="M5.5 7.5h12" />
          <path d="M11.5 3v9.5" />
          <path d="M9.5 3h4" />
          <path d="M8 12.5h7" />
        </svg>
      )
    case 'aeropress':
      return (
        <svg {...props}>
          <path d="M9 2.5h6v3.5H9z" />
          <path d="M8 6h8v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z" />
          <path d="M6.5 18h11" />
          <path d="M10 9.5h2M10 12.5h2" />
          <path d="M9 21.5h6" />
        </svg>
      )
    case 'v60':
      return (
        <svg {...props}>
          <path d="M3.5 6h17l-6 9h-5z" />
          <path d="M10 15h4v2h-4z" />
          <path d="M10 8.5l1.2 4M14 8.5l-1.2 4" />
          <path d="M6.5 20.5h11" />
          <path d="M12 17.5v1.5" />
        </svg>
      )
    case 'espresso':
      return (
        <svg {...props}>
          <path d="M5.5 11.5h10v3a4.5 4.5 0 0 1-4.5 4.5h-1a4.5 4.5 0 0 1-4.5-4.5z" />
          <path d="M15.5 12.5h1.5a2 2 0 0 1 0 4h-1.5" />
          <path d="M3.5 21.5h14" />
          <path d="M9 4.5c0 1.5 1.5 1.5 1.5 3M12.5 4.5c0 1.5 1.5 1.5 1.5 3" />
        </svg>
      )
    default:
      return null
  }
}
