import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Brain Builder',
  description: 'A Neo4j Graph Chat Application',
  generator: 'heits.digital',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
