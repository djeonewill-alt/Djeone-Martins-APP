export type GamificationSvgIconName =
  | 'listener'
  | 'intercessor'
  | 'encourager'
  | 'evangelist'
  | 'student'
  | 'witness'
  | 'sower'
  | 'perseverance'
  | 'journey'
  | 'level'

type GamificationSvgIconProps = {
  name: GamificationSvgIconName
  className?: string
  strokeWidth?: number
}

function SvgFrame({
  className,
  strokeWidth,
  children,
}: {
  className: string
  strokeWidth: number
  children: React.ReactNode
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export default function GamificationSvgIcon({
  name,
  className = 'h-7 w-7',
  strokeWidth = 2.05,
}: GamificationSvgIconProps) {
  switch (name) {
    case 'listener':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M5.2 12.8v-1.2a6.8 6.8 0 0 1 13.6 0v1.2" />
          <path d="M6.5 12.4h1.2c.7 0 1.3.6 1.3 1.3v3c0 .7-.6 1.3-1.3 1.3H6.5a2 2 0 0 1-2-2v-1.6a2 2 0 0 1 2-2z" />
          <path d="M17.5 12.4h-1.2c-.7 0-1.3.6-1.3 1.3v3c0 .7.6 1.3 1.3 1.3h1.2a2 2 0 0 0 2-2v-1.6a2 2 0 0 0-2-2z" />
          <path d="M10 20h4" />
        </SvgFrame>
      )

    case 'intercessor':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M7.2 11.4V6.8a1.4 1.4 0 0 1 2.8 0v5.7" />
          <path d="M10 12.2V5.6a1.4 1.4 0 0 1 2.8 0v6.6" />
          <path d="M12.8 12.2V6.8a1.4 1.4 0 0 1 2.8 0v4.6" />
          <path d="M15.6 12.8l1.3-2.2a1.4 1.4 0 0 1 2.4 1.4l-2.4 4.1c-1.1 1.9-3.1 3-5.2 3h-.8c-2.8 0-5.1-2.3-5.1-5.1v-2.6" />
        </SvgFrame>
      )

    case 'encourager':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M12 20s-7.4-4.4-8.8-9C2.3 8 4.4 5.2 7.4 5.2c1.8 0 3.2.9 4.1 2.2.9-1.3 2.3-2.2 4.1-2.2 3 0 5.1 2.8 4.2 5.8C18.4 15.6 12 20 12 20z" />
          <path d="M12 9.7v4" />
          <path d="M10 11.7h4" />
        </SvgFrame>
      )

    case 'evangelist':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M4 12.2l15-7-4.2 15-3.1-6.4z" />
          <path d="M11.7 13.8l7.3-8.6" />
          <path d="M5.4 17.6l2.3-2.3" />
          <path d="M4 21l4.6-4.6" />
        </SvgFrame>
      )

    case 'student':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M4 5.8c2.7-.7 5.3-.3 8 1.2v12c-2.7-1.5-5.3-1.9-8-1.2z" />
          <path d="M20 5.8c-2.7-.7-5.3-.3-8 1.2v12c2.7-1.5 5.3-1.9 8-1.2z" />
          <path d="M7 9.2h2.2" />
          <path d="M14.8 9.2H17" />
        </SvgFrame>
      )

    case 'witness':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M12 3.5c2.3 2.2 3.4 4.3 3.4 6.2a3.4 3.4 0 0 1-6.8 0c0-1.9 1.1-4 3.4-6.2z" />
          <path d="M7.2 14.4c-1.2.8-2 2-2 3.4 0 2 3 3.7 6.8 3.7s6.8-1.7 6.8-3.7c0-1.4-.8-2.6-2-3.4" />
          <path d="M12 13.2v5" />
        </SvgFrame>
      )

    case 'sower':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M12 20c3.5-3.5 4.9-7.1 4.2-10.7" />
          <path d="M12 20c-3.5-3.5-4.9-7.1-4.2-10.7" />
          <path d="M12 11.5c2.8-.2 4.8-1.8 6-4.8-3.1-.3-5.1.8-6 3.2" />
          <path d="M12 11.5c-2.8-.2-4.8-1.8-6-4.8 3.1-.3 5.1.8 6 3.2" />
          <path d="M9 21h6" />
        </SvgFrame>
      )

    case 'perseverance':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M4.5 19.5c2.8-5.7 7.7-3.2 8.8-8.2.6-2.7 2.4-4.9 6.2-6.8" />
          <path d="M5.5 7.2h.01" />
          <path d="M8.8 10h.01" />
          <path d="M14.8 16.4h.01" />
          <path d="M19 19.2h.01" />
        </SvgFrame>
      )

    case 'level':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M12 3.5l7.5 4.3v8.4L12 20.5l-7.5-4.3V7.8z" />
          <path d="M12 8v8" />
          <path d="M8.8 11.2H12" />
          <path d="M12 8l3.2 3.2" />
        </SvgFrame>
      )

    case 'journey':
    default:
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M5 19c2.2-4.8 6.7-2.2 7.7-7.1.5-2.5 2.2-4.7 6.3-6.9" />
          <path d="M6.5 5.5h.01" />
          <path d="M9.5 8.5h.01" />
          <path d="M14.5 15.5h.01" />
          <path d="M18.5 18.5h.01" />
        </SvgFrame>
      )
  }
}
