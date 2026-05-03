import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '马可菠萝，蹦蹦蹦',
  description: '帮助勇敢的马可菠萝躲避障碍，拯救公主！',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}