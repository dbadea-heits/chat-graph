import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Knowledge Graph',
  description: 'A skill extractor that you can question',
  generator: 'heits.digital',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className='bg-gray-900 text-white'>{children}</body>
    </html>
  )
}
