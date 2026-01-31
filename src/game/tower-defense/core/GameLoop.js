/**
 * 游戏循环 - 包含 deltaTime 机制
 */
export class GameLoop {
  constructor(game) {
    this.game = game
    this.running = false
    this.paused = false
    this.lastTime = 0
    this.animationId = null

    // 帧率控制
    this.targetFPS = 60
    this.frameInterval = 1000 / this.targetFPS

    // 性能统计
    this.fps = 0
    this.frameCount = 0
    this.fpsTimer = 0
  }

  /**
   * 开始游戏循环
   */
  start() {
    this.running = true
    this.paused = false
    this.lastTime = performance.now()
    this.loop()
  }

  /**
   * 暂停游戏循环（继续渲染但不更新）
   */
  pause() {
    this.paused = true
  }

  /**
   * 恢复游戏循环
   */
  resume() {
    this.paused = false
    this.lastTime = performance.now()
  }

  /**
   * 停止游戏循环
   */
  stop() {
    this.running = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /**
   * 游戏循环主体
   */
  loop() {
    if (!this.running) return

    const currentTime = performance.now()
    const dt = currentTime - this.lastTime
    this.lastTime = currentTime

    // 防止 dt 过大（切换标签页后回来）
    const clampedDt = Math.min(dt, 100)

    // 更新 FPS 统计
    this.updateFPS(dt)

    // 暂停时只渲染，不更新
    if (!this.paused) {
      this.game.update(clampedDt)
    }
    this.game.render()

    this.animationId = requestAnimationFrame(() => this.loop())
  }

  /**
   * 更新 FPS 统计
   */
  updateFPS(dt) {
    this.frameCount++
    this.fpsTimer += dt
    if (this.fpsTimer >= 1000) {
      this.fps = Math.round(this.frameCount * 1000 / this.fpsTimer)
      this.frameCount = 0
      this.fpsTimer = 0
    }
  }

  /**
   * 获取当前 FPS
   */
  getFPS() {
    return this.fps
  }
}

export default GameLoop
