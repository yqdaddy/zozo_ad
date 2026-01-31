/**
 * 连击系统 - 鼓励连续答对
 */
export class ComboSystem {
  constructor(game) {
    this.game = game

    // 连击状态
    this.combo = 0
    this.maxCombo = 0
    this.comboTimeout = null

    // 连击阈值和奖励
    this.milestones = [
      { combo: 3, bonus: 1.2, message: '🔥 连击 x3！' },
      { combo: 5, bonus: 1.5, message: '💥 超级连击 x5！' },
      { combo: 8, bonus: 2.0, message: '🌟 完美连击 x8！' },
      { combo: 12, bonus: 2.5, message: '⭐ 学霸模式！' }
    ]

    // 连击视觉效果
    this.comboDisplay = {
      text: '',
      alpha: 0,
      scale: 1,
      color: '#FFD700'
    }
  }

  /**
   * 答对题目
   */
  onCorrectAnswer() {
    this.combo++
    this.maxCombo = Math.max(this.maxCombo, this.combo)

    // 清除之前的超时
    if (this.comboTimeout) {
      clearTimeout(this.comboTimeout)
    }

    // 5秒内不答题，连击清零
    this.comboTimeout = setTimeout(() => {
      this.resetCombo()
    }, 5000)

    // 检查里程碑
    const milestone = this.getCurrentMilestone()
    if (milestone && this.combo === milestone.combo) {
      this.showMilestoneEffect(milestone)
    }

    // 触发事件
    this.game.events.emit('comboChange', {
      combo: this.combo,
      multiplier: this.getMultiplier()
    })

    return this.getMultiplier()
  }

  /**
   * 答错题目
   */
  onWrongAnswer() {
    if (this.combo >= 3) {
      this.showBreakEffect()
    }
    this.resetCombo()
  }

  /**
   * 获取当前倍率
   */
  getMultiplier() {
    for (let i = this.milestones.length - 1; i >= 0; i--) {
      if (this.combo >= this.milestones[i].combo) {
        return this.milestones[i].bonus
      }
    }
    return 1
  }

  /**
   * 获取当前里程碑
   */
  getCurrentMilestone() {
    for (let i = this.milestones.length - 1; i >= 0; i--) {
      if (this.combo >= this.milestones[i].combo) {
        return this.milestones[i]
      }
    }
    return null
  }

  /**
   * 重置连击
   */
  resetCombo() {
    this.combo = 0
    if (this.comboTimeout) {
      clearTimeout(this.comboTimeout)
      this.comboTimeout = null
    }
    this.game.events.emit('comboChange', { combo: 0, multiplier: 1 })
  }

  /**
   * 显示里程碑特效
   */
  showMilestoneEffect(milestone) {
    this.comboDisplay = {
      text: milestone.message,
      alpha: 1,
      scale: 1.5,
      color: this.getMilestoneColor(milestone.combo)
    }

    // 发送 UI 事件
    this.game.events.emit('showComboMilestone', milestone)
  }

  /**
   * 获取里程碑颜色
   */
  getMilestoneColor(combo) {
    if (combo >= 12) return '#FF00FF'  // 紫色
    if (combo >= 8) return '#FFD700'   // 金色
    if (combo >= 5) return '#FF6600'   // 橙色
    return '#FF3333'                    // 红色
  }

  /**
   * 显示连击中断特效
   */
  showBreakEffect() {
    this.game.events.emit('comboBreak', { combo: this.combo })
  }

  /**
   * 更新显示（用于渐变效果）
   */
  update(dt) {
    if (this.comboDisplay.alpha > 0) {
      this.comboDisplay.alpha -= dt / 1000
      this.comboDisplay.scale *= 0.98
    }
  }

  /**
   * 渲染连击显示
   */
  render(ctx) {
    const { logicWidth } = this.game.canvasAdapter

    // 连击计数
    if (this.combo >= 3) {
      ctx.save()
      ctx.font = 'bold 20px Arial'
      ctx.textAlign = 'center'
      ctx.fillStyle = this.getMilestoneColor(this.combo)
      ctx.globalAlpha = 0.9
      ctx.fillText(`🔥 ${this.combo} 连击！`, logicWidth / 2, 30)
      ctx.restore()
    }

    // 里程碑动画
    if (this.comboDisplay.alpha > 0) {
      const { logicHeight } = this.game.canvasAdapter

      ctx.save()
      ctx.globalAlpha = this.comboDisplay.alpha
      ctx.font = `bold ${24 * this.comboDisplay.scale}px Arial`
      ctx.textAlign = 'center'
      ctx.fillStyle = this.comboDisplay.color
      ctx.fillText(this.comboDisplay.text, logicWidth / 2, logicHeight / 2)
      ctx.restore()
    }
  }

  /**
   * 销毁
   */
  destroy() {
    if (this.comboTimeout) {
      clearTimeout(this.comboTimeout)
    }
  }
}

export default ComboSystem
