import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Nerdos D&D',
    template: '%s | Nerdos D&D',
  },
  description: 'Private D&D 5e platform — character sheets, combat tracker, encounter builder.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {/* WCAG 2.4.1 — skip link lets keyboard users bypass nav */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  )
}
