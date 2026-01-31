/**
 * 实体基类
 */
export class Entity {
  constructor(game, x = 0, y = 0) {
    this.game = game
    this.x = x
    this.y = y
    this.isDead = false
    this.id = Date.now() + Math.random()
  }

  /**
   * 更新（子类实现）
   * @param {Number} dt - deltaTime (毫秒)
   */
  update(dt) {
    // 子类实现
  }

  /**
   * 渲染（子类实现）
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    // 子类实现
  }

  /**
   * 计算到另一实体的距离
   * @param {Entity} other
   */
  distanceTo(other) {
    const dx = this.x - other.x
    const dy = this.y - other.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 计算到点的距离
   */
  distanceToPoint(x, y) {
    const dx = this.x - x
    const dy = this.y - y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 标记为死亡（下一帧会被移除）
   */
  kill() {
    this.isDead = true
  }
}

export default Entity
