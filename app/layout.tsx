import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '公主与王子跑酷障碍挑战',
  description: '帮助勇敢的王子躲避障碍，拯救公主！',
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