import { NextResponse } from 'next/server'

let bestScore = 0

export async function GET() {
  return NextResponse.json({ bestScore })
}

export async function POST(request: Request) {
  try {
    const { score } = await request.json()
    if (typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
    }

    if (score > bestScore) {
      bestScore = score
    }

    return NextResponse.json({ bestScore })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}