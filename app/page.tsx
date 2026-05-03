'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Prince {
  x: number
  originalX: number
  y: number
  width: number
  height: number
  velocityY: number
  velocityX: number
  isJumping: boolean
  isSliding: boolean
  isChargingJump: boolean
  jumpChargeTime: number
  jumpVelocity: number
  gravity: number
  maxJumpHeight: number
  maxChargeTime: number
  minJumpPower: number
  maxJumpPower: number
  slideTimer: number
  moveSpeed: number
}

interface Princess {
  x: number
  y: number
  width: number
  height: number
  bobOffset: number
  bobDirection: number
  image: HTMLImageElement | null
}

interface Obstacle {
  type: 'river' | 'puddle'
  x: number
  y: number
  width: number
  height: number
  update: () => void
  draw: (ctx: CanvasRenderingContext2D) => void
  isOffScreen: () => boolean
}

interface Keys {
  Space: boolean
  ArrowUp: boolean
  ArrowDown: boolean
  ArrowLeft: boolean
  ArrowRight: boolean
}

const GAME_WIDTH = 900
const GAME_HEIGHT = 500
const GROUND_Y = GAME_HEIGHT - 100
const LANE_HEIGHT = 80

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start')

  const gameRunningRef = useRef(false)
  const princeRef = useRef<Prince>({
    x: 150,
    originalX: 150,
    y: GROUND_Y - 80,
    width: 50,
    height: 80,
    velocityY: 0,
    velocityX: 0,
    isJumping: false,
    isSliding: false,
    isChargingJump: false,
    jumpChargeTime: 0,
    jumpVelocity: 0,
    gravity: 0.45,
    maxJumpHeight: 200,
    maxChargeTime: 45,
    minJumpPower: 12,
    maxJumpPower: 28,
    slideTimer: 0,
    moveSpeed: 8
  })

  const princessRef = useRef<Princess>({
    x: 50,
    y: GROUND_Y - 160,
    width: 100,
    height: 160,
    bobOffset: 0,
    bobDirection: 1,
    image: null
  })

  const obstaclesRef = useRef<Obstacle[]>([])
  const keysRef = useRef<Keys>({
    Space: false,
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
  })

  const gameSpeedRef = useRef(5)
  const lastObstacleTimeRef = useRef(0)
  const animationIdRef = useRef<number>(0)
  const scoreRef = useRef(0)
  const gameStateRef = useRef<'start' | 'playing' | 'gameover'>('start')

  const bestScoreRef = useRef(0)
  const bestScoreApiRef = useRef(0)

  useEffect(() => {
    bestScoreRef.current = bestScore
  }, [bestScore])

  useEffect(() => {
    fetch('/api/score')
      .then(res => res.json())
      .then(data => {
        setBestScore(data.bestScore)
        bestScoreRef.current = data.bestScore
        bestScoreApiRef.current = data.bestScore
      })
      .catch(() => {
        console.error('Failed to fetch best score')
      })

    const princessImage = new Image()
    princessImage.src = '/gz.jpg'
    princessImage.onload = () => {
      princessRef.current.image = princessImage
    }
  }, [])

  const ObstacleClass = useCallback((type: 'river' | 'puddle', updateFn: () => void, drawFn: (ctx: CanvasRenderingContext2D) => void, isOffScreenFn: () => boolean): Obstacle => {
    const width = type === 'river' ? 120 : 80
    const height = type === 'river' ? 35 : 60
    return {
      type,
      x: GAME_WIDTH + 50,
      y: GROUND_Y - height - 5,
      width,
      height,
      update: updateFn,
      draw: drawFn,
      isOffScreen: isOffScreenFn
    }
  }, [])

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    gradient.addColorStop(0, '#87CEEB')
    gradient.addColorStop(0.5, '#98D8C8')
    gradient.addColorStop(1, '#90EE90')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    ctx.fillStyle = '#228B22'
    ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y)

    ctx.fillStyle = '#2E7D32'
    for (let i = 0; i < GAME_WIDTH; i += 30) {
      ctx.beginPath()
      ctx.moveTo(i, GROUND_Y)
      ctx.lineTo(i + 15, GROUND_Y - 20)
      ctx.lineTo(i + 30, GROUND_Y)
      ctx.fill()
    }

    ctx.strokeStyle = '#8B4513'
    ctx.lineWidth = 8
    for (let i = 0; i < GAME_WIDTH; i += 100) {
      ctx.beginPath()
      ctx.moveTo(i, GROUND_Y)
      ctx.lineTo(i, GROUND_Y + 20)
      ctx.stroke()
    }

    for (let i = 0; i < 5; i++) {
      const cloudX = 100 + i * 200 + Math.sin(Date.now() / 2000 + i) * 10
      drawCloud(ctx, cloudX, 50)
    }
  }, [])

  const drawCloud = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.arc(x, y, 30, 0, Math.PI * 2)
    ctx.arc(x + 25, y - 10, 25, 0, Math.PI * 2)
    ctx.arc(x + 50, y, 30, 0, Math.PI * 2)
    ctx.arc(x + 25, y + 5, 20, 0, Math.PI * 2)
    ctx.fill()
  }, [])

  const drawPrincess = useCallback((ctx: CanvasRenderingContext2D) => {
    const princess = princessRef.current
    const bobY = princess.y + Math.sin(Date.now() / 300) * 3

    if (princess.image) {
      ctx.drawImage(princess.image, princess.x, bobY, princess.width, princess.height)
    } else {
      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.arc(princess.x + princess.width / 2, bobY - princess.height + 15, princess.width / 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#FFE4B5'
      ctx.fillRect(princess.x + princess.width / 5, bobY - princess.height + 30, princess.width * 3 / 5, princess.height / 2)

      ctx.fillStyle = '#FFD700'
      ctx.fillRect(princess.x + princess.width / 6, bobY - princess.height / 3, princess.width * 4 / 6, princess.height / 2.5)

      ctx.fillStyle = '#FF69B4'
      ctx.beginPath()
      ctx.moveTo(princess.x, bobY - princess.height / 3)
      ctx.lineTo(princess.x - princess.width / 3, bobY + princess.height / 6)
      ctx.lineTo(princess.x + princess.width / 5, bobY + princess.height / 6)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = '#FF69B4'
      ctx.beginPath()
      ctx.moveTo(princess.x + princess.width, bobY - princess.height / 3)
      ctx.lineTo(princess.x + princess.width + princess.width / 3, bobY + princess.height / 6)
      ctx.lineTo(princess.x + princess.width - princess.width / 5, bobY + princess.height / 6)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.arc(princess.x + princess.width / 3, bobY - princess.height + 20, 3, 0, Math.PI * 2)
      ctx.arc(princess.x + princess.width * 2 / 3, bobY - princess.height + 20, 3, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#FF69B4'
      ctx.beginPath()
      ctx.moveTo(princess.x + princess.width * 3 / 4, bobY - princess.height + 25)
      ctx.lineTo(princess.x + princess.width, bobY - princess.height + 22)
      ctx.lineTo(princess.x + princess.width * 3 / 4, bobY - princess.height + 18)
      ctx.closePath()
      ctx.fill()
    }
  }, [])

  const drawPrince = useCallback((ctx: CanvasRenderingContext2D) => {
    const prince = princeRef.current
    let princeY = prince.y

    if (prince.isSliding) {
      princeY = GROUND_Y - 40
    }

    ctx.fillStyle = '#8B0000'
    ctx.beginPath()
    ctx.arc(prince.x + prince.width / 2, princeY - 65, 18, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#FFE4C4'
    ctx.fillRect(prince.x + 10, princeY - 47, prince.width - 20, 35)

    ctx.fillStyle = '#4169E1'
    const bodyHeight = prince.isSliding ? 25 : 55
    ctx.fillRect(prince.x + 8, princeY - 12, prince.width - 16, bodyHeight)

    ctx.fillStyle = '#4169E1'
    if (prince.isSliding) {
      ctx.fillRect(prince.x - 10, princeY - 5, 20, 15)
      ctx.fillRect(prince.x + prince.width - 10, princeY - 5, 20, 15)
    } else {
      ctx.fillRect(prince.x + 5, princeY - 5, 15, 40)
      ctx.fillRect(prince.x + prince.width - 20, princeY - 5, 15, 40)
    }

    ctx.fillStyle = '#654321'
    ctx.fillRect(prince.x + prince.width / 2 - 5, princeY - 80, 10, 20)

    ctx.fillStyle = '#C0C0C0'
    ctx.beginPath()
    ctx.moveTo(prince.x + prince.width / 2, princeY - 85)
    ctx.lineTo(prince.x + prince.width / 2 - 15, princeY - 100)
    ctx.lineTo(prince.x + prince.width / 2 + 15, princeY - 100)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(prince.x + 17, princeY - 52, 3, 0, Math.PI * 2)
    ctx.arc(prince.x + 33, princeY - 52, 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(prince.x + 25, princeY - 42, 8, 0, Math.PI)
    ctx.stroke()

    if (prince.isSliding) {
      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.arc(prince.x + 5, princeY + 5, 8, 0, Math.PI * 2)
      ctx.fill()
    }

    if (prince.isChargingJump) {
      const chargeRatio = prince.jumpChargeTime / prince.maxChargeTime
      ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + chargeRatio * 0.5})`
      ctx.beginPath()
      ctx.arc(prince.x + prince.width / 2, princeY - 40, 30 + chargeRatio * 20, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(prince.x + prince.width / 2, princeY - 40, 25 + chargeRatio * 15, -Math.PI / 2, -Math.PI / 2 + chargeRatio * Math.PI * 2)
      ctx.stroke()
    }
  }, [])

  const drawLanes = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.lineWidth = 2

    for (let i = 1; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(0, GROUND_Y - LANE_HEIGHT * i)
      ctx.lineTo(GAME_WIDTH, GROUND_Y - LANE_HEIGHT * i)
      ctx.stroke()
    }
  }, [])

  const updatePrince = useCallback(() => {
    const prince = princeRef.current
    const keys = keysRef.current
    const jumpKeyPressed = keys.Space || keys.ArrowUp

    if (jumpKeyPressed && !prince.isJumping && !prince.isSliding && !prince.isChargingJump) {
      prince.isChargingJump = true
      prince.jumpChargeTime = 0
    }

    if (prince.isChargingJump && jumpKeyPressed) {
      prince.jumpChargeTime++
      if (prince.jumpChargeTime >= prince.maxChargeTime) {
        prince.jumpChargeTime = prince.maxChargeTime
      }
    }

    if (prince.isChargingJump && !jumpKeyPressed) {
      const chargeRatio = prince.jumpChargeTime / prince.maxChargeTime
      const jumpPower = prince.minJumpPower + chargeRatio * (prince.maxJumpPower - prince.minJumpPower)
      prince.isJumping = true
      prince.jumpVelocity = -jumpPower
      prince.isChargingJump = false
      prince.jumpChargeTime = 0
    }

    if (keys.ArrowDown && !prince.isJumping && !prince.isSliding) {
      prince.isSliding = true
      prince.slideTimer = 30
    }

    if (prince.isJumping) {
      prince.jumpVelocity += prince.gravity
      prince.y += prince.jumpVelocity

      if (prince.y >= GROUND_Y - 80) {
        prince.y = GROUND_Y - 80
        prince.isJumping = false
        prince.jumpVelocity = 0
      }
    }

    if (prince.isSliding) {
      prince.slideTimer--
      if (prince.slideTimer <= 0) {
        prince.isSliding = false
      }
    }

    if (keys.ArrowLeft) {
      prince.x -= prince.moveSpeed
    }
    if (keys.ArrowRight) {
      prince.x += prince.moveSpeed
    }

    prince.x = Math.max(20, Math.min(prince.x, GAME_WIDTH - prince.width - 20))
  }, [])

  const spawnObstacle = useCallback(() => {
    const now = Date.now()
    const gameSpeed = gameSpeedRef.current
    if (now - lastObstacleTimeRef.current > 1500 - gameSpeed * 50) {
      const type = Math.random() > 0.3 ? 'river' : 'puddle'
      const obstacleX = type === 'puddle' ? GAME_WIDTH + 50 + Math.random() * 200 : GAME_WIDTH + 50

      const newObstacle: Obstacle = {
        type,
        x: obstacleX,
        y: GROUND_Y - (type === 'river' ? 35 : 60) - 5,
        width: type === 'river' ? 120 : 80,
        height: type === 'river' ? 35 : 60,
        update() {
          this.x -= gameSpeedRef.current
        },
        draw(ctx) {
          if (this.type === 'river') {
            ctx.fillStyle = '#3498db'
            ctx.fillRect(this.x, this.y, this.width, this.height)

            ctx.fillStyle = '#5dade2'
            for (let i = 0; i < 3; i++) {
              ctx.beginPath()
              ctx.moveTo(this.x + i * 40, this.y)
              ctx.quadraticCurveTo(
                this.x + i * 40 + 20, this.y + this.height / 2,
                this.x + i * 40, this.y + this.height
              )
              ctx.stroke()
            }

            ctx.fillStyle = '#85c1e9'
            ctx.fillRect(this.x, this.y, this.width, 5)
          } else {
            ctx.fillStyle = '#3498db'
            ctx.beginPath()
            ctx.ellipse(
              this.x + this.width / 2,
              this.y + this.height / 2,
              this.width / 2,
              this.height / 3,
              0, 0, Math.PI * 2
            )
            ctx.fill()

            ctx.fillStyle = '#5dade2'
            ctx.beginPath()
            ctx.ellipse(
              this.x + this.width / 2 - 10,
              this.y + this.height / 2 - 5,
              this.width / 4,
              this.height / 6,
              0, 0, Math.PI * 2
            )
            ctx.fill()
          }
        },
        isOffScreen() {
          return this.x + this.width < 0
        }
      }

      obstaclesRef.current.push(newObstacle)
      lastObstacleTimeRef.current = now
    }
  }, [])

  const checkCollision = useCallback((): boolean => {
    const prince = princeRef.current

    if (prince.isJumping) {
      const jumpHeight = (GROUND_Y - 80) - prince.y
      if (jumpHeight > 40) {
        return false
      }
    }

    const princeHitbox = {
      x: prince.x + 10,
      y: prince.y,
      width: prince.width - 20,
      height: prince.isSliding ? 40 : prince.height - 20
    }

    if (prince.isSliding) {
      princeHitbox.y = GROUND_Y - 40
    } else if (!prince.isJumping) {
      princeHitbox.y = prince.y
    } else {
      princeHitbox.y = GROUND_Y - prince.height
    }

    for (const obstacle of obstaclesRef.current) {
      if (
        princeHitbox.x < obstacle.x + obstacle.width &&
        princeHitbox.x + princeHitbox.width > obstacle.x &&
        princeHitbox.y < obstacle.y + obstacle.height &&
        princeHitbox.y + princeHitbox.height > obstacle.y
      ) {
        return true
      }
    }
    return false
  }, [])

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!gameRunningRef.current) return

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    drawBackground(ctx)
    drawLanes(ctx)

    spawnObstacle()

    obstaclesRef.current = obstaclesRef.current.filter(obs => !obs.isOffScreen())
    obstaclesRef.current.forEach(obs => {
      obs.update()
      obs.draw(ctx)
    })

    updatePrince()
    drawPrincess(ctx)
    drawPrince(ctx)

    if (checkCollision()) {
      setGameState('gameover')
      gameRunningRef.current = false
      cancelAnimationFrame(animationIdRef.current)

      const currentScore = scoreRef.current

      fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: currentScore })
      })
        .then(res => res.json())
        .then(data => {
          setBestScore(data.bestScore)
          bestScoreRef.current = data.bestScore
        })
        .catch(err => {
          console.error('Failed to save score:', err)
        })
      return
    }

    scoreRef.current++
    setScore(scoreRef.current)

    if (scoreRef.current % 500 === 0 && gameSpeedRef.current < 12) {
      gameSpeedRef.current += 0.5
    }

    animationIdRef.current = requestAnimationFrame(gameLoop)
  }, [drawBackground, drawLanes, spawnObstacle, updatePrince, drawPrincess, drawPrince, checkCollision])

  const startGame = useCallback(() => {
    gameRunningRef.current = true
    gameStateRef.current = 'playing'
    setGameState('playing')

    scoreRef.current = 0
    setScore(0)
    gameSpeedRef.current = 5
    obstaclesRef.current = []

    const prince = princeRef.current
    prince.isJumping = false
    prince.isSliding = false
    prince.isChargingJump = false
    prince.jumpChargeTime = 0
    prince.jumpVelocity = 0
    prince.velocityX = 0
    prince.x = prince.originalX
    prince.y = GROUND_Y - 80

    lastObstacleTimeRef.current = 0

    Object.keys(keysRef.current).forEach(key => {
      keysRef.current[key as keyof Keys] = false
    })

    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
        drawBackground(ctx)
        drawLanes(ctx)
        drawPrincess(ctx)
        drawPrince(ctx)
      }
    }

    animationIdRef.current = requestAnimationFrame(gameLoop)
  }, [drawBackground, drawLanes, drawPrincess, drawPrince, gameLoop])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawBackground(ctx)
    drawLanes(ctx)
    drawPrincess(ctx)
    drawPrince(ctx)
  }, [drawBackground, drawLanes, drawPrincess, drawPrince])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = keysRef.current
      if (e.key in keys) {
        keys[e.key as keyof Keys] = true
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const keys = keysRef.current
      if (e.key in keys) {
        keys[e.key as keyof Keys] = false
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handleControlPress = (key: keyof Keys) => {
    keysRef.current[key] = true
  }

  const handleControlRelease = (key: keyof Keys) => {
    keysRef.current[key] = false
  }

  return (
    <>
      <div className="game-container">
        <canvas ref={canvasRef} id="gameCanvas" width={GAME_WIDTH} height={GAME_HEIGHT} />
        <div className="score-display">分数: {score}</div>
        <div className="best-score">最高分: {bestScore}</div>

        <div className={`game-overlay ${gameState !== 'start' ? 'hidden' : ''}`} id="startScreen">
          <h1 className="title">🏰 马可菠萝，蹦蹦蹦 🏰</h1>
          <p className="subtitle">帮助勇敢的马可菠萝躲避障碍，拯救公主！</p>
          <button className="start-btn" onClick={startGame}>开始游戏</button>
          <div className="instructions">
            <p>💻 电脑：使用 <strong>↑ ↓ ← →</strong> 方向键</p>
            <p>📱 手机：使用下方的控制按钮</p>
            <p>⏫ 空格键/上键/绿色按钮 = 蓄力跳跃（按得越久跳得越高！）</p>
            <p>⏬ 下键/红色按钮 = 下滑</p>
            <p>⬅️ 左键/蓝色按钮 = 向左移动</p>
            <p>➡️ 右键/蓝色按钮 = 向右移动</p>
            <p>💡 躲避河流和水坑，坚持越久分数越高！</p>
          </div>
        </div>

        <div className={`game-overlay ${gameState !== 'gameover' ? 'hidden' : ''}`} id="gameOverScreen">
          <h1 className="game-over-text">💔 游戏结束 💔</h1>
          <p className="final-score" id="finalScore">
            {score > bestScore ? `🎉 新纪录！最终分数: ${score}` : `最终分数: ${score}`}
          </p>
          <button className="start-btn" onClick={startGame}>再玩一次</button>
        </div>
      </div>

      <div className="controls" id="controls">
        <button
          className="control-btn blue small"
          id="btnLeft"
          onTouchStart={() => handleControlPress('ArrowLeft')}
          onTouchEnd={() => handleControlRelease('ArrowLeft')}
          onMouseDown={() => handleControlPress('ArrowLeft')}
          onMouseUp={() => handleControlRelease('ArrowLeft')}
          onMouseLeave={() => handleControlRelease('ArrowLeft')}
        >
          ←
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            className="control-btn green"
            id="btnUp"
            onTouchStart={() => handleControlPress('Space')}
            onTouchEnd={() => handleControlRelease('Space')}
            onMouseDown={() => handleControlPress('Space')}
            onMouseUp={() => handleControlRelease('Space')}
            onMouseLeave={() => handleControlRelease('Space')}
          >
            ↑
          </button>
          <button
            className="control-btn red"
            id="btnDown"
            onTouchStart={() => handleControlPress('ArrowDown')}
            onTouchEnd={() => handleControlRelease('ArrowDown')}
            onMouseDown={() => handleControlPress('ArrowDown')}
            onMouseUp={() => handleControlRelease('ArrowDown')}
            onMouseLeave={() => handleControlRelease('ArrowDown')}
          >
            ↓
          </button>
        </div>
        <button
          className="control-btn blue small"
          id="btnRight"
          onTouchStart={() => handleControlPress('ArrowRight')}
          onTouchEnd={() => handleControlRelease('ArrowRight')}
          onMouseDown={() => handleControlPress('ArrowRight')}
          onMouseUp={() => handleControlRelease('ArrowRight')}
          onMouseLeave={() => handleControlRelease('ArrowRight')}
        >
          →
        </button>
      </div>
    </>
  )
}