import type { ReactNode } from 'react'

export type PrayerSvgIconName =
  | 'guided-prayer'
  | 'hands'
  | 'open-bible'
  | 'heart'
  | 'flame'
  | 'light'
  | 'path'

type PrayerSvgIconProps = {
  name: PrayerSvgIconName
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
  children: ReactNode
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

export default function PrayerSvgIcon({
  name,
  className = 'h-6 w-6',
  strokeWidth = 2.15,
}: PrayerSvgIconProps) {
  switch (name) {
    case 'guided-prayer':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M12 3.5v3" />
          <path d="M7.8 5.3l1.5 2.6" />
          <path d="M16.2 5.3l-1.5 2.6" />
          <path d="M8 12.2c1.8-1.5 3.4-1.5 4.8 0" />
          <path d="M16 12.2c-1.8-1.5-3.4-1.5-4.8 0" />
          <path d="M7.5 12.5l-2.2 3.7c-.4.7-.1 1.6.6 2l3.2 1.7" />
          <path d="M16.5 12.5l2.2 3.7c.4.7.1 1.6-.6 2l-3.2 1.7" />
          <path d="M9.2 20.2c1.8.8 3.8.8 5.6 0" />
        </SvgFrame>
      )

    case 'hands':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M7.2 11.4V6.8a1.4 1.4 0 0 1 2.8 0v5.7" />
          <path d="M10 12.2V5.6a1.4 1.4 0 0 1 2.8 0v6.6" />
          <path d="M12.8 12.2V6.8a1.4 1.4 0 0 1 2.8 0v4.6" />
          <path d="M15.6 12.8l1.3-2.2a1.4 1.4 0 0 1 2.4 1.4l-2.4 4.1c-1.1 1.9-3.1 3-5.2 3h-.8c-2.8 0-5.1-2.3-5.1-5.1v-2.6" />
          <path d="M6.2 13.2l-1.5-2.6A1.4 1.4 0 0 0 2.3 12l2.4 4.1c.8 1.3 2 2.3 3.5 2.8" />
        </SvgFrame>
      )

    case 'open-bible':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M4 5.8c2.7-.7 5.3-.3 8 1.2v12c-2.7-1.5-5.3-1.9-8-1.2z" />
          <path d="M20 5.8c-2.7-.7-5.3-.3-8 1.2v12c2.7-1.5 5.3-1.9 8-1.2z" />
          <path d="M7 9.2h2.2" />
          <path d="M7 12h2.2" />
          <path d="M14.8 9.2H17" />
          <path d="M14.8 12H17" />
        </SvgFrame>
      )

    case 'heart':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M12 20s-7.5-4.4-8.9-9.1C2.2 7.9 4.3 5 7.4 5c1.8 0 3.2.9 4.1 2.3C12.4 5.9 13.8 5 15.6 5c3.1 0 5.2 2.9 4.3 5.9C18.5 15.6 12 20 12 20z" />
          <path d="M12 9.5v4.2" />
          <path d="M9.9 11.6h4.2" />
        </SvgFrame>
      )

    case 'flame':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M13.5 3.5c.7 3.1-1.2 4.5-2.6 6.2-1.2 1.5-1.6 3.3-.5 4.8" />
          <path d="M16.4 8.2c2.2 2.2 3 4.7 2.1 7.1-.9 2.6-3.4 4.2-6.2 4.2-3.7 0-6.4-2.5-6.4-6.1 0-2.5 1.4-4.4 3.2-6.2.4 2.1 1.4 3.4 3 4.3" />
          <path d="M12.2 19.5c1.7-.9 2.5-2.1 2.5-3.7 0-1.3-.6-2.4-1.7-3.3" />
        </SvgFrame>
      )

    case 'light':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M12 3v2.2" />
          <path d="M4.9 5.9l1.6 1.6" />
          <path d="M19.1 5.9l-1.6 1.6" />
          <path d="M4 13h2.2" />
          <path d="M17.8 13H20" />
          <path d="M9 17.5h6" />
          <path d="M10 20h4" />
          <path d="M15.5 12.2a3.5 3.5 0 1 0-6.9 0c.2 1.1.9 1.9 1.5 2.6h3.8c.7-.7 1.3-1.5 1.6-2.6z" />
        </SvgFrame>
      )

    case 'path':
      return (
        <SvgFrame className={className} strokeWidth={strokeWidth}>
          <path d="M5 19c2.2-4.8 6.7-2.2 7.7-7.1.5-2.5 2.2-4.7 6.3-6.9" />
          <path d="M6.5 5.5h.01" />
          <path d="M9.5 8.5h.01" />
          <path d="M14.5 15.5h.01" />
          <path d="M18.5 18.5h.01" />
        </SvgFrame>
      )

    default:
      return null
  }
}
