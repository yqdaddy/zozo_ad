/**
 * 工具主控制器
 */
import { GameLoop } from './GameLoop.js'
import { EventBus } from './EventBus.js'
import { PathSystem } from '../systems/PathSystem.js'
import { ComboSystem } from '../systems/ComboSystem.js'
import { DifficultySystem } from '../systems/DifficultySystem.js'
import { AchievementSystem } from '../systems/AchievementSystem.js'
import { Tower } from '../entities/Tower.js'
import { Enemy } from '../entities/Enemy.js'
import { Projectile } from '../entities/Projectile.js'
import { Particle } from '../entities/Particle.js'
import { TOWER_CONFIGS } from '../config/towers.js'
import { getWaveEnemies, ENEMY_CONFIGS } from '../config/enemies.js'
import { shuffleArray } from '@/utils/math.js'

export class Game {
  constructor(canvasAdapter, config = {}) {
    // 核心依赖
    this.canvasAdapter = canvasAdapter
    this.ctx = canvasAdapter.ctx

    // 事件总线
    this.events = new EventBus()

    // 工具状态
    this.state = {
      lives: 20,
      gold: 100,
      wave: 1,
      gameSpeed: 1,
      score: 0,
      isPaused: false,
      isGameOver: false,
      questionsAnswered: 0,
      questionsCorrect: 0,
      enemiesKilled: 0,
      waveInProgress: false
    }

    // 实体集合
    this.towers = []
    this.enemies = []
    this.projectiles = []
    this.particles = []

    // 配置
    this.config = {
      gridSize: 40,
      cols: 8,
      rows: 10,
      ...config
    }

    // 选择的塔类型
    this.selectedTower = null

    // 子系统
    this.pathSystem = new PathSystem(this)
    this.comboSystem = new ComboSystem(this)
    this.difficultySystem = new DifficultySystem(this)
    this.achievementSystem = new AchievementSystem(this)

    // 工具循环
    this.gameLoop = new GameLoop(this)
  }

  /**
   * 初始化工具
   */
  init() {
    // 根据画布尺寸计算网格
    this.config.cols = 8
    this.config.gridSize = Math.floor(this.canvasAdapter.logicWidth / this.config.cols)
    this.config.rows = Math.floor(this.canvasAdapter.logicHeight / this.config.gridSize)

    // 调试日志
    console.log('=== Game 初始化 ===')
    console.log('canvasAdapter.logicWidth:', this.canvasAdapter.logicWidth)
    console.log('canvasAdapter.logicHeight:', this.canvasAdapter.logicHeight)
    console.log('cols:', this.config.cols)
    console.log('rows:', this.config.rows)
    console.log('gridSize:', this.config.gridSize)
    console.log('网格总宽度:', this.config.cols * this.config.gridSize)
    console.log('网格总高度:', this.config.rows * this.config.gridSize)
    console.log('===================')

    // 生成路径
    this.pathSystem.generate()

    // 初始渲染
    this.render()
  }

  /**
   * 开始工具
   */
  start() {
    this.reset()
    this.pathSystem.generate()
    this.startWave()
    this.gameLoop.start()
  }

  /**
   * 重置工具状态
   */
  reset() {
    this.state = {
      lives: 20,
      gold: 100,
      wave: 1,
      gameSpeed: 1,
      score: 0,
      isPaused: false,
      isGameOver: false,
      questionsAnswered: 0,
      questionsCorrect: 0,
      enemiesKilled: 0,
      waveInProgress: false
    }
    this.towers = []
    this.enemies = []
    this.projectiles = []
    this.particles = []
    this.selectedTower = null

    // 重置子系统
    this.comboSystem.resetCombo()
    this.difficultySystem.reset()
    this.achievementSystem.reset()

    this.events.emit('stateChange', this.state)
  }

  /**
   * 更新（每帧调用）
   */
  update(dt) {
    if (this.state.isPaused || this.state.isGameOver) return

    // 更新子系统
    this.comboSystem.update(dt)

    // 更新实体
    this.updateEntities(this.towers, dt)
    this.updateEntities(this.enemies, dt)
    this.updateEntities(this.projectiles, dt)
    this.updateEntities(this.particles, dt)

    // 检查波次完成
    this.checkWaveComplete()

    // 通知状态变化
    this.events.emit('stateChange', this.state)
  }

  /**
   * 更新实体集合
   */
  updateEntities(entities, dt) {
    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i]
      entity.update(dt)
      if (entity.isDead) {
        entities.splice(i, 1)
      }
    }
  }

  /**
   * 渲染（每帧调用）
   */
  render() {
    if (!this.ctx) return

    const ctx = this.ctx
    const { gridSize, cols, rows } = this.config
    const { logicWidth, logicHeight } = this.canvasAdapter

    // 清空画布
    ctx.fillStyle = '#2d5016'
    ctx.fillRect(0, 0, logicWidth, logicHeight)

    // 绘制网格
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath()
      ctx.moveTo(i * gridSize, 0)
      ctx.lineTo(i * gridSize, logicHeight)
      ctx.stroke()
    }
    for (let i = 0; i <= rows; i++) {
      ctx.beginPath()
      ctx.moveTo(0, i * gridSize)
      ctx.lineTo(logicWidth, i * gridSize)
      ctx.stroke()
    }

    // 绘制路径
    this.pathSystem.render(ctx)

    // 绘制可放置预览
    if (this.selectedTower) {
      ctx.fillStyle = 'rgba(76, 175, 80, 0.4)'
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (!this.pathSystem.isOnPath(col, row)) {
            const hasTower = this.towers.some(t => t.gridX === col && t.gridY === row)
            if (!hasTower) {
              ctx.fillRect(
                col * gridSize + 2,
                row * gridSize + 2,
                gridSize - 4,
                gridSize - 4
              )
            }
          }
        }
      }
    }

    // 绘制实体
    this.towers.forEach(t => t.render(ctx))
    this.enemies.forEach(e => e.render(ctx))
    this.projectiles.forEach(p => p.render(ctx))
    this.particles.forEach(p => p.render(ctx))

    // 绘制连击显示
    this.comboSystem.render(ctx)
  }

  /**
   * 处理触摸事件
   */
  handleTouch(x, y) {
    if (this.state.isPaused || this.state.isGameOver) return

    const { gridSize } = this.config
    const gridX = Math.floor(x / gridSize)
    const gridY = Math.floor(y / gridSize)

    // 边界检查
    if (gridY < 0 || gridY >= this.config.rows ||
        gridX < 0 || gridX >= this.config.cols) {
      return
    }

    // 检查是否在路径上
    if (this.pathSystem.isOnPath(gridX, gridY)) {
      this.events.emit('showToast', { title: '不能在路径上建塔', icon: 'none' })
      return
    }

    // 检查是否已有塔
    const existingTower = this.towers.find(t => t.gridX === gridX && t.gridY === gridY)

    if (existingTower) {
      this.tryUpgradeTower(existingTower)
    } else if (this.selectedTower) {
      this.tryBuildTower(gridX, gridY)
    } else {
      this.events.emit('showToast', { title: '请先选择防御塔', icon: 'none' })
    }
  }

  /**
   * 选择塔类型
   */
  selectTower(type) {
    const config = TOWER_CONFIGS[type]
    if (config && this.state.gold >= config.cost) {
      this.selectedTower = this.selectedTower === type ? null : type
      this.events.emit('towerSelected', { type: this.selectedTower })
    } else {
      this.events.emit('showToast', { title: '金币不足', icon: 'none' })
    }
  }

  /**
   * 尝试建造塔
   */
  tryBuildTower(gridX, gridY) {
    const config = TOWER_CONFIGS[this.selectedTower]
    if (this.state.gold < config.cost) {
      this.events.emit('showToast', { title: '金币不足', icon: 'none' })
      return
    }

    // 请求数学题
    const difficulty = this.difficultySystem.getQuestionDifficulty()
    this.events.emit('needMathQuestion', {
      difficulty,
      callback: (correct) => {
        this.state.questionsAnswered++
        this.achievementSystem.updateStat('questionsAnswered', this.state.questionsAnswered)

        if (correct) {
          this.state.questionsCorrect++
          this.achievementSystem.updateStat('correctCount', this.state.questionsCorrect)

          const multiplier = this.comboSystem.onCorrectAnswer()
          this.difficultySystem.recordAnswer(true)
          this.achievementSystem.updateStat('maxCombo', this.comboSystem.maxCombo)

          this.buildTower(gridX, gridY, multiplier)
          this.events.emit('showToast', { title: '建造成功！', icon: 'success' })
        } else {
          this.comboSystem.onWrongAnswer()
          this.difficultySystem.recordAnswer(false)
          this.achievementSystem.updateStat('wrongCount', v => v + 1)

          this.events.emit('showToast', { title: '答错了，建造失败', icon: 'none' })
        }
      }
    })
  }

  /**
   * 建造塔
   */
  buildTower(gridX, gridY, multiplier = 1) {
    const config = TOWER_CONFIGS[this.selectedTower]

    const tower = new Tower(this, gridX, gridY, this.selectedTower)
    this.towers.push(tower)

    // 扣除金币（考虑连击折扣）
    const actualCost = Math.floor(config.cost / multiplier)
    this.state.gold -= actualCost

    // 更新统计
    this.achievementSystem.updateStat('towersBuilt', v => v + 1)

    // 建造特效
    this.createBuildEffect(tower.x, tower.y)

    // 清除选择
    this.selectedTower = null
    this.events.emit('towerSelected', { type: null })
    this.events.emit('stateChange', this.state)
  }

  /**
   * 尝试升级塔
   */
  tryUpgradeTower(tower) {
    const upgradeCost = tower.getUpgradeCost()
    if (this.state.gold < upgradeCost) {
      this.events.emit('showToast', { title: `升级需要 ${upgradeCost} 金币`, icon: 'none' })
      return
    }

    const difficulty = this.difficultySystem.getQuestionDifficulty()
    this.events.emit('needMathQuestion', {
      difficulty,
      callback: (correct) => {
        this.state.questionsAnswered++
        this.achievementSystem.updateStat('questionsAnswered', this.state.questionsAnswered)

        if (correct) {
          this.state.questionsCorrect++
          this.achievementSystem.updateStat('correctCount', this.state.questionsCorrect)

          this.comboSystem.onCorrectAnswer()
          this.difficultySystem.recordAnswer(true)
          this.achievementSystem.updateStat('maxCombo', this.comboSystem.maxCombo)

          this.upgradeTower(tower, upgradeCost)
          this.events.emit('showToast', { title: `升级到 ${tower.level} 级！`, icon: 'success' })
        } else {
          this.comboSystem.onWrongAnswer()
          this.difficultySystem.recordAnswer(false)
          this.achievementSystem.updateStat('wrongCount', v => v + 1)

          this.events.emit('showToast', { title: '答错了，升级失败', icon: 'none' })
        }
      }
    })
  }

  /**
   * 升级塔
   */
  upgradeTower(tower, cost) {
    tower.upgrade()
    this.state.gold -= cost

    // 更新最高塔等级
    this.achievementSystem.updateStat('maxTowerLevel',
      Math.max(this.achievementSystem.sessionStats.maxTowerLevel, tower.level))

    // 升级特效
    this.createBuildEffect(tower.x, tower.y)
    this.events.emit('stateChange', this.state)
  }

  /**
   * 跳过题目
   */
  skipQuestion() {
    if (this.state.gold >= 20) {
      this.state.gold -= 20
      this.achievementSystem.updateStat('skipCount', v => v + 1)
      this.events.emit('stateChange', this.state)
      return true
    }
    return false
  }

  /**
   * 开始波次
   */
  startWave() {
    this.state.waveInProgress = true
    this.achievementSystem.updateStat('wave', this.state.wave)

    const enemies = getWaveEnemies(this.state.wave)
    const shuffled = shuffleArray(enemies)
    this.spawnEnemies(shuffled, 800)
  }

  /**
   * 生成敌人
   */
  spawnEnemies(enemyTypes, delay) {
    let spawnDelay = 0
    let spawnedCount = 0
    const totalEnemies = enemyTypes.length

    enemyTypes.forEach((type) => {
      setTimeout(() => {
        if (!this.state.isGameOver) {
          this.spawnEnemy(type)
        }
        spawnedCount++
        if (spawnedCount >= totalEnemies) {
          this.state.waveInProgress = false
        }
      }, spawnDelay)
      spawnDelay += delay
    })
  }

  /**
   * 生成单个敌人
   */
  spawnEnemy(type) {
    const enemy = new Enemy(this, type, this.pathSystem.getPath(), this.state.wave)
    this.enemies.push(enemy)
  }

  /**
   * 检查波次完成
   */
  checkWaveComplete() {
    if (this.enemies.length === 0 && !this.state.waveInProgress && !this.state.isGameOver) {
      this.state.wave++
      this.state.gold += 30 + this.state.wave * 10
      this.state.waveInProgress = true

      // 检查是否满血通过
      if (this.state.lives === 20) {
        this.achievementSystem.updateStat('perfectWaves', v => v + 1)
      }

      setTimeout(() => {
        if (!this.state.isGameOver) {
          this.events.emit('showToast', { title: `第 ${this.state.wave} 波来袭！`, icon: 'none' })
          this.startWave()
        }
      }, 2000)
    }
  }

  /**
   * 创建子弹
   */
  createProjectile(options) {
    const projectile = new Projectile(this, options)
    this.projectiles.push(projectile)
  }

  /**
   * 创建建造特效
   */
  createBuildEffect(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      this.particles.push(new Particle(this, {
        x, y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 30,
        color: '#4CAF50',
        size: 6
      }))
    }
  }

  /**
   * 创建命中特效
   */
  createHitEffect(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 2
      this.particles.push(new Particle(this, {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 15,
        color: color,
        size: 3
      }))
    }
  }

  /**
   * 创建死亡特效
   */
  createDeathEffect(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 3
      this.particles.push(new Particle(this, {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25,
        color: color,
        size: 5
      }))
    }
  }

  /**
   * 创建溅射特效
   */
  createSplashEffect(x, y, radius) {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2
      this.particles.push(new Particle(this, {
        x: x + Math.cos(angle) * radius * 0.5,
        y: y + Math.sin(angle) * radius * 0.5,
        vx: Math.cos(angle) * 1.5,
        vy: Math.sin(angle) * 1.5,
        life: 20,
        color: '#E040FB',
        size: 4
      }))
    }
  }

  /**
   * 暂停
   */
  pause() {
    this.state.isPaused = true
    this.gameLoop.pause()
    this.events.emit('stateChange', this.state)
  }

  /**
   * 恢复
   */
  resume() {
    this.state.isPaused = false
    this.gameLoop.resume()
    this.events.emit('stateChange', this.state)
  }

  /**
   * 切换速度
   */
  toggleSpeed() {
    this.state.gameSpeed = this.state.gameSpeed === 1 ? 2 : 1
    this.events.emit('stateChange', this.state)
    return this.state.gameSpeed
  }

  /**
   * 工具结束
   */
  gameOver(win = false) {
    this.state.isGameOver = true
    this.gameLoop.stop()

    // 计算结果
    const accuracy = this.state.questionsAnswered > 0
      ? Math.round((this.state.questionsCorrect / this.state.questionsAnswered) * 100)
      : 0

    const starResult = this.achievementSystem.calculateStars()

    const result = {
      win,
      wave: this.state.wave,
      enemiesKilled: this.state.enemiesKilled,
      questionsCorrect: this.state.questionsCorrect,
      questionsAnswered: this.state.questionsAnswered,
      accuracy,
      score: this.state.score,
      maxCombo: this.comboSystem.maxCombo,
      stars: starResult.stars,
      starDetails: starResult.details,
      newAchievements: this.achievementSystem.newlyUnlocked,
      encouragement: this.achievementSystem.getEncouragement()
    }

    this.events.emit('gameover', result)
    this.events.emit('stateChange', this.state)
  }

  /**
   * 销毁工具
   */
  destroy() {
    this.gameLoop.stop()
    this.comboSystem.destroy()
    this.events.clear()
  }
}

export default Game
