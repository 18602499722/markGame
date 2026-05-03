import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const BEST_SCORE_KEY = 'game:best_score'

export async function GET() {
  try {
    const bestScore = await redis.get<number>(BEST_SCORE_KEY)
    return NextResponse.json({ bestScore: bestScore || 0 })
  } catch (error) {
    console.error('Failed to get best score:', error)
    return NextResponse.json({ bestScore: 0 })
  }
}

export async function POST(request: Request) {
  try {
    const { score } = await request.json()
    if (typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
    }

    const currentBest = await redis.get<number>(BEST_SCORE_KEY)
    const newBest = Math.max(currentBest || 0, score)

    await redis.set(BEST_SCORE_KEY, newBest)

    return NextResponse.json({ bestScore: newBest })
  } catch (error) {
    console.error('Failed to save score:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}