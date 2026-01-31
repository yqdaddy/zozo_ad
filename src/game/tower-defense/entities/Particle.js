/**
 * 粒子类
 */
import { Entity } from './Entity.js'

export class Particle extends Entity {
  constructor(game, options) {
    super(game, options.x, options.y)

    this.vx = options.vx || 0
    this.vy = options.vy || 0
    this.life = options.life || 30
    this.maxLife = options.maxLife || options.life || 30
    this.color = options.color || '#ffffff'
    this.size = options.size || 3
  }

  /**
   * 更新
   */
  update(dt) {
    // 移动（不受 gameSpeed 影响，保持视觉效果一致）
    const speedFactor = dt / 16.67
    this.x += this.vx * speedFactor
    this.y += this.vy * speedFactor

    // 生命值衰减
    this.life -= speedFactor

    if (this.life <= 0) {
      this.isDead = true
    }
  }

  /**
   * 渲染
   */
  render(ctx) {
    const alpha = this.life / this.maxLife

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

export default Particle
