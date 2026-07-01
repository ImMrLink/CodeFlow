// Line icons lifted from the CodeFlow design (16×16 viewBox, currentColor stroke).
import type { ReactNode } from 'react'

type P = { size?: number }

const svg = (size: number, sw: number, children: ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={sw}>
    {children}
  </svg>
)

export const IconSidebar = ({ size = 15 }: P) =>
  svg(size, 1.4, (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" />
      <line x1="6" y1="2.5" x2="6" y2="13.5" />
    </>
  ))

export const IconAccount = ({ size = 15 }: P) =>
  svg(size, 1.4, (
    <>
      <circle cx="8" cy="5.6" r="2.5" />
      <path d="M3 13.5c.8-2.5 2.6-3.8 5-3.8s4.2 1.3 5 3.8" />
    </>
  ))

export const IconBell = ({ size = 14 }: P) =>
  svg(size, 1.4, (
    <>
      <path d="M8 2a4 4 0 0 1 4 4v3l1.4 2H2.6L4 9V6a4 4 0 0 1 4-4z" />
      <path d="M6.6 13.2a1.5 1.5 0 0 0 2.8 0" />
    </>
  ))

export const IconMinimize = ({ size = 13 }: P) => svg(size, 1.4, <line x1="3" y1="8.5" x2="13" y2="8.5" />)

export const IconMaximize = ({ size = 12 }: P) => svg(size, 1.4, <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" />)

export const IconRestore = ({ size = 12 }: P) =>
  svg(size, 1.4, (
    <>
      <rect x="2.8" y="4.8" width="8" height="8" rx="1.4" />
      <path d="M5.2 4.8V3.2a1.4 1.4 0 0 1 1.4-1.4h6" />
    </>
  ))

export const IconClose = ({ size = 13 }: P) =>
  svg(size, 1.4, (
    <>
      <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" />
      <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" />
    </>
  ))

export const IconHome = ({ size = 15 }: P) =>
  svg(size, 1.5, <path d="M3 7.4 8 3l5 4.4V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />)

export const IconHistory = ({ size = 15 }: P) =>
  svg(size, 1.5, (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.8V8l2.2 1.6" />
    </>
  ))

export const IconSettings = ({ size = 15 }: P) =>
  svg(size, 1.5, (
    <>
      <line x1="2.5" y1="5" x2="13.5" y2="5" />
      <circle cx="6" cy="5" r="1.6" fill="var(--shell)" />
      <line x1="2.5" y1="11" x2="13.5" y2="11" />
      <circle cx="10.5" cy="11" r="1.6" fill="var(--shell)" />
    </>
  ))

export const IconHelp = ({ size = 15 }: P) =>
  svg(size, 1.5, (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M6.3 6.2A1.8 1.8 0 1 1 8 8.4v1" />
      <circle cx="8" cy="11.4" r=".4" fill="currentColor" />
    </>
  ))

export const IconCopy = ({ size = 14 }: P) =>
  svg(size, 1.4, (
    <>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
    </>
  ))

export const IconX = ({ size = 10 }: P) =>
  svg(size, 1.6, (
    <>
      <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" />
      <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" />
    </>
  ))
