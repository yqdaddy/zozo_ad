<template>
  <view class="game-container">
    <!-- 主菜单 -->
    <view v-if="screen === 'menu'" class="screen menu-screen">
      <view class="menu-content">
        <text class="title">🏰 数学塔防</text>
        <text class="subtitle">五年级上册</text>
        <view class="menu-buttons">
          <button class="btn btn-primary" @click="startGame">开始游戏</button>
          <button class="btn btn-secondary" @click="showHelp = true">游戏说明</button>
          <button class="btn btn-secondary" @click="goBack">返回首页</button>
        </view>
        <view class="knowledge-tags">
          <text class="tag">小数乘法</text>
          <text class="tag">小数除法</text>
          <text class="tag">简易方程</text>
          <text class="tag">多边形面积</text>
        </view>
      </view>
    </view>

    <!-- 游戏界面 -->
    <view v-if="screen === 'game'" class="screen game-screen">
      <!-- 顶部信息栏 -->
      <view class="game-header">
        <view class="info-left">
          <text class="lives">❤️ {{ state.lives }}</text>
          <text class="gold">💰 {{ state.gold }}</text>
        </view>
        <view class="info-center">
          <text class="wave">第 {{ state.wave }} 波</text>
        </view>
        <view class="info-right">
          <text class="btn-icon" @click="pauseGame">⏸️</text>
          <text class="btn-icon" @click="toggleSpeed">{{ state.gameSpeed === 1 ? '⏩' : '⏩⏩' }}</text>
        </view>
      </view>

      <!-- 游戏画布 -->
      <view class="canvas-wrapper">
        <canvas
          id="gameCanvas"
          type="2d"
          class="game-canvas"
          @touchstart="handleTouch"
          @click="handleClick"
        ></canvas>
      </view>

      <!-- 底部塔选择栏 -->
      <view class="tower-bar">
        <view
          v-for="tower in towerList"
          :key="tower.type"
          class="tower-slot"
          :class="{ selected: selectedTower === tower.type, disabled: state.gold < tower.cost }"
          @click="selectTower(tower.type)"
        >
          <text class="tower-icon">{{ tower.emoji }}</text>
          <text class="tower-cost">{{ tower.cost }}</text>
        </view>
      </view>
    </view>

    <!-- 数学题弹窗 -->
    <view v-if="showMathModal" class="modal" @click.self="closeMathModal">
      <view class="modal-content">
        <view class="math-question">
          <text class="question-type">{{ currentQuestion?.type }}</text>
          <text class="question-text">{{ currentQuestion?.question }}</text>
        </view>
        <view class="answer-area">
          <view v-if="showOptions" class="answer-options">
            <view
              v-for="(option, index) in answerOptions"
              :key="index"
              class="option-btn"
              :class="{ correct: feedback && option === currentQuestion?.answer, wrong: feedback && selectedOption === option && option !== currentQuestion?.answer }"
              @click="selectOption(option)"
            >
              <text>{{ option }}</text>
            </view>
          </view>
          <input
            v-else
            v-model="userAnswer"
            type="digit"
            class="answer-input"
            placeholder="输入答案"
            @confirm="submitAnswer"
          />
        </view>
        <view class="modal-buttons">
          <button v-if="!showOptions" class="btn btn-primary" @click="submitAnswer">确定</button>
          <button class="btn btn-secondary" @click="skipQuestion">跳过 (-20💰)</button>
        </view>
        <text v-if="feedback" class="feedback" :class="feedbackClass">{{ feedback }}</text>
      </view>
    </view>

    <!-- 暂停弹窗 -->
    <view v-if="showPauseModal" class="modal">
      <view class="modal-content">
        <text class="modal-title">游戏暂停</text>
        <view class="modal-buttons">
          <button class="btn btn-primary" @click="resumeGame">继续游戏</button>
          <button class="btn btn-secondary" @click="restartGame">重新开始</button>
          <button class="btn btn-secondary" @click="quitGame">返回菜单</button>
        </view>
      </view>
    </view>

    <!-- 游戏结束弹窗 -->
    <view v-if="showGameOverModal" class="modal">
      <view class="modal-content">
        <text class="modal-title">{{ gameResult.win ? '🎉 胜利！' : '💔 游戏结束' }}</text>
        <view class="game-stats">
          <view class="stat-row">
            <text>通过波数</text>
            <text>{{ gameResult.wave }}</text>
          </view>
          <view class="stat-row">
            <text>消灭敌人</text>
            <text>{{ gameResult.enemiesKilled }}</text>
          </view>
          <view class="stat-row">
            <text>答对题目</text>
            <text>{{ gameResult.questionsCorrect }}</text>
          </view>
          <view class="stat-row">
            <text>正确率</text>
            <text>{{ gameResult.accuracy }}%</text>
          </view>
        </view>
        <view class="modal-buttons">
          <button class="btn btn-primary" @click="restartGame">再玩一次</button>
          <button class="btn btn-secondary" @click="shareResult">分享成绩</button>
          <button class="btn btn-secondary" @click="quitGame">返回菜单</button>
        </view>
      </view>
    </view>

    <!-- 帮助弹窗 -->
    <view v-if="showHelp" class="modal" @click.self="showHelp = false">
      <view class="modal-content help-content">
        <text class="modal-title">游戏说明</text>
        <view class="help-section">
          <text class="help-title">🎯 游戏目标</text>
          <text class="help-text">阻止怪物到达终点！答对数学题获得金币，建造防御塔消灭敌人。</text>
        </view>
        <view class="help-section">
          <text class="help-title">🏗️ 如何建塔</text>
          <text class="help-text">选择底部的塔类型，点击地图空地，答对数学题即可建造。</text>
        </view>
        <view class="help-section">
          <text class="help-title">💡 防御塔类型</text>
          <text class="help-text">🏹 弓箭塔 - 攻速快</text>
          <text class="help-text">✨ 魔法塔 - 范围攻击</text>
          <text class="help-text">💣 炮塔 - 高伤害</text>
          <text class="help-text">❄️ 冰冻塔 - 减速敌人</text>
        </view>
        <button class="btn btn-primary" @click="showHelp = false">知道了</button>
      </view>
    </view>
  </view>
</template>

<script>
import { generateRandomQuestion, generateOptions, checkAnswer, shuffleArray, DIFFICULTY } from '@/utils/math.js'

export default {
  data() {
    return {
      screen: 'menu', // menu, game
      showHelp: false,
      showMathModal: false,
      showPauseModal: false,
      showGameOverModal: false,

      // 游戏状态
      state: {
        lives: 20,
        gold: 100,
        wave: 1,
        gameSpeed: 1,
        isPaused: false,
        isGameOver: false,
        questionsAnswered: 0,
        questionsCorrect: 0,
        enemiesKilled: 0,
        waveInProgress: false
      },

      // 游戏配置
      config: {
        gridSize: 40,
        cols: 8,
        rows: 10
      },

      // Canvas 相关
      ctx: null,
      canvasWidth: 320,
      canvasHeight: 400,
      animationId: null,

      // 游戏对象
      towers: [],
      enemies: [],
      projectiles: [],
      particles: [],
      path: [],
      pathGrid: [],

      // 防御塔选择
      selectedTower: null,
      towerList: [
        { type: 'archer', emoji: '🏹', cost: 50, name: '弓箭塔' },
        { type: 'magic', emoji: '✨', cost: 80, name: '魔法塔' },
        { type: 'cannon', emoji: '💣', cost: 100, name: '炮塔' },
        { type: 'ice', emoji: '❄️', cost: 70, name: '冰冻塔' }
      ],

      // 防御塔配置
      towerTypes: {
        archer: { damage: 15, range: 100, fireRate: 800, projectileSpeed: 8, color: '#8B4513' },
        magic: { damage: 25, range: 80, fireRate: 1200, projectileSpeed: 6, color: '#9C27B0', splash: 40 },
        cannon: { damage: 50, range: 90, fireRate: 2000, projectileSpeed: 5, color: '#555' },
        ice: { damage: 10, range: 85, fireRate: 1000, projectileSpeed: 7, color: '#00BCD4', slowEffect: 0.5, slowDuration: 2000 }
      },

      // 敌人配置
      enemyTypes: {
        basic: { emoji: '👾', health: 50, speed: 1, gold: 10, color: '#4CAF50' },
        fast: { emoji: '💨', health: 30, speed: 2, gold: 15, color: '#03A9F4' },
        tank: { emoji: '🛡️', health: 150, speed: 0.5, gold: 25, color: '#795548' },
        boss: { emoji: '👹', health: 500, speed: 0.3, gold: 100, color: '#F44336' }
      },

      // 数学题相关
      currentQuestion: null,
      userAnswer: '',
      answerOptions: [],
      showOptions: false,
      feedback: '',
      feedbackClass: '',
      selectedOption: null,
      mathCallback: null,

      // 游戏结果
      gameResult: {
        win: false,
        wave: 0,
        enemiesKilled: 0,
        questionsCorrect: 0,
        accuracy: 0
      }
    }
  },

  methods: {
    // 返回首页
    goBack() {
      uni.navigateBack()
    },

    // 开始游戏
    startGame() {
      this.resetGame()
      this.screen = 'game'
      this.$nextTick(() => {
        this.initCanvas()
      })
    },

    // 重置游戏
    resetGame() {
      this.state = {
        lives: 20,
        gold: 100,
        wave: 1,
        gameSpeed: 1,
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
    },

    // 初始化 Canvas
    initCanvas() {
      const query = uni.createSelectorQuery().in(this)
      query.select('#gameCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) {
            console.error('Canvas not found')
            return
          }

          const canvas = res[0].node
          const ctx = canvas.getContext('2d')

          const dpr = uni.getSystemInfoSync().pixelRatio
          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          ctx.scale(dpr, dpr)

          this.ctx = ctx
          this.canvasWidth = res[0].width
          this.canvasHeight = res[0].height

          // 计算网格
          this.config.gridSize = Math.floor(this.canvasWidth / this.config.cols)
          this.config.rows = Math.floor(this.canvasHeight / this.config.gridSize)

          // 生成路径
          this.generatePath()

          // 开始游戏
          this.startWave()
          this.gameLoop()
        })
    },

    // 生成路径
    generatePath() {
      const { cols, rows, gridSize } = this.config
      this.path = []
      this.pathGrid = Array(rows).fill(null).map(() => Array(cols).fill(false))

      let currentRow = 0
      let currentCol = 0
      let direction = 1

      this.path.push({ x: 0, y: gridSize / 2 })

      while (currentRow < rows - 1) {
        while ((direction === 1 && currentCol < cols - 1) || (direction === -1 && currentCol > 0)) {
          this.pathGrid[currentRow][currentCol] = true
          this.path.push({
            x: currentCol * gridSize + gridSize / 2,
            y: currentRow * gridSize + gridSize / 2
          })
          currentCol += direction
        }
        this.pathGrid[currentRow][currentCol] = true
        this.path.push({
          x: currentCol * gridSize + gridSize / 2,
          y: currentRow * gridSize + gridSize / 2
        })

        if (currentRow < rows - 1) {
          currentRow++
          if (currentRow < rows) {
            this.pathGrid[currentRow][currentCol] = true
            this.path.push({
              x: currentCol * gridSize + gridSize / 2,
              y: currentRow * gridSize + gridSize / 2
            })
          }

          if (currentRow < rows - 1) {
            currentRow++
            if (currentRow < rows) {
              this.pathGrid[currentRow][currentCol] = true
              this.path.push({
                x: currentCol * gridSize + gridSize / 2,
                y: currentRow * gridSize + gridSize / 2
              })
            }
          }
        }
        direction *= -1
      }

      this.path.push({
        x: this.path[this.path.length - 1]?.x || 0,
        y: this.canvasHeight
      })
    },

    // 选择防御塔
    selectTower(type) {
      const tower = this.towerList.find(t => t.type === type)
      if (tower && this.state.gold >= tower.cost) {
        this.selectedTower = type
      } else {
        uni.showToast({ title: '金币不足', icon: 'none' })
      }
    },

    // 处理画布点击
    handleClick(e) {
      if (this.state.isPaused || this.state.isGameOver) return

      const rect = e.currentTarget
      const x = e.detail.x
      const y = e.detail.y

      const gridX = Math.floor(x / this.config.gridSize)
      const gridY = Math.floor(y / this.config.gridSize)

      if (gridY >= 0 && gridY < this.pathGrid.length && gridX >= 0 && gridX < this.pathGrid[0]?.length) {
        if (this.pathGrid[gridY][gridX]) return

        const existingTower = this.towers.find(t => t.gridX === gridX && t.gridY === gridY)

        if (existingTower) {
          this.tryUpgradeTower(existingTower)
        } else if (this.selectedTower) {
          this.tryBuildTower(gridX, gridY)
        }
      }
    },

    // 处理触摸事件（移动端）
    handleTouch(e) {
      if (this.state.isPaused || this.state.isGameOver) return

      const touch = e.touches[0]
      const x = touch.x
      const y = touch.y

      const gridX = Math.floor(x / this.config.gridSize)
      const gridY = Math.floor(y / this.config.gridSize)

      if (gridY >= 0 && gridY < this.pathGrid.length && gridX >= 0 && gridX < this.pathGrid[0]?.length) {
        if (this.pathGrid[gridY][gridX]) return

        const existingTower = this.towers.find(t => t.gridX === gridX && t.gridY === gridY)

        if (existingTower) {
          this.tryUpgradeTower(existingTower)
        } else if (this.selectedTower) {
          this.tryBuildTower(gridX, gridY)
        }
      }
    },

    // 尝试建造防御塔
    tryBuildTower(gridX, gridY) {
      const towerInfo = this.towerList.find(t => t.type === this.selectedTower)
      if (this.state.gold < towerInfo.cost) {
        uni.showToast({ title: '金币不足', icon: 'none' })
        return
      }

      const difficulty = Math.min(3, Math.ceil(this.state.wave / 3))
      this.showMathQuestion(difficulty, (correct) => {
        if (correct) {
          this.buildTower(gridX, gridY)
          uni.showToast({ title: '建造成功', icon: 'success' })
        } else {
          uni.showToast({ title: '答错了，建造失败', icon: 'none' })
        }
      })
    },

    // 建造防御塔
    buildTower(gridX, gridY) {
      const towerInfo = this.towerList.find(t => t.type === this.selectedTower)
      const config = this.towerTypes[this.selectedTower]

      const tower = {
        id: Date.now(),
        type: this.selectedTower,
        gridX,
        gridY,
        x: gridX * this.config.gridSize + this.config.gridSize / 2,
        y: gridY * this.config.gridSize + this.config.gridSize / 2,
        level: 1,
        cost: towerInfo.cost,
        emoji: towerInfo.emoji,
        lastFire: 0,
        target: null,
        ...config
      }

      this.towers.push(tower)
      this.state.gold -= towerInfo.cost
      this.selectedTower = null
    },

    // 尝试升级防御塔
    tryUpgradeTower(tower) {
      const upgradeCost = Math.floor(tower.cost * tower.level * 0.7)
      if (this.state.gold < upgradeCost) {
        uni.showToast({ title: '金币不足', icon: 'none' })
        return
      }

      const difficulty = Math.min(3, tower.level + 1)
      this.showMathQuestion(difficulty, (correct) => {
        if (correct) {
          this.upgradeTower(tower, upgradeCost)
          uni.showToast({ title: `升级到 ${tower.level} 级`, icon: 'success' })
        } else {
          uni.showToast({ title: '答错了，升级失败', icon: 'none' })
        }
      })
    },

    // 升级防御塔
    upgradeTower(tower, cost) {
      tower.level++
      tower.damage = Math.floor(tower.damage * 1.3)
      tower.range = Math.floor(tower.range * 1.1)
      tower.fireRate = Math.floor(tower.fireRate * 0.9)
      this.state.gold -= cost
    },

    // 显示数学题
    showMathQuestion(difficulty, callback) {
      this.state.isPaused = true
      this.mathCallback = callback
      this.currentQuestion = generateRandomQuestion(difficulty)
      this.state.questionsAnswered++

      this.userAnswer = ''
      this.feedback = ''
      this.feedbackClass = ''
      this.selectedOption = null

      // 50% 概率显示选择题
      if (Math.random() > 0.5 && difficulty <= 2) {
        this.showOptions = true
        this.answerOptions = generateOptions(this.currentQuestion.answer)
      } else {
        this.showOptions = false
        this.answerOptions = []
      }

      this.showMathModal = true
    },

    // 选择选项
    selectOption(option) {
      if (this.feedback) return
      this.selectedOption = option
      this.checkMathAnswer(option.toString())
    },

    // 提交答案
    submitAnswer() {
      if (!this.userAnswer) return
      this.checkMathAnswer(this.userAnswer)
    },

    // 检查答案
    checkMathAnswer(answer) {
      const isCorrect = checkAnswer(answer, this.currentQuestion.answer)

      if (isCorrect) {
        this.state.questionsCorrect++
        this.feedback = '✓ 回答正确！'
        this.feedbackClass = 'correct'
      } else {
        this.feedback = `✗ 答案是 ${this.currentQuestion.answer}`
        this.feedbackClass = 'wrong'
      }

      setTimeout(() => {
        this.closeMathModal()
        if (this.mathCallback) {
          this.mathCallback(isCorrect)
        }
      }, isCorrect ? 800 : 1500)
    },

    // 跳过题目
    skipQuestion() {
      if (this.state.gold >= 20) {
        this.state.gold -= 20
        this.closeMathModal()
        if (this.mathCallback) {
          this.mathCallback(true)
        }
      } else {
        uni.showToast({ title: '金币不足', icon: 'none' })
      }
    },

    // 关闭数学题弹窗
    closeMathModal() {
      this.showMathModal = false
      this.state.isPaused = false
    },

    // 开始波次
    startWave() {
      this.state.waveInProgress = true
      const waveConfig = this.getWaveConfig(this.state.wave)
      this.spawnEnemies(waveConfig)
    },

    // 获取波次配置
    getWaveConfig(wave) {
      const enemies = []
      const baseCount = 3 + Math.floor(wave * 1.5)

      for (let i = 0; i < baseCount; i++) {
        enemies.push('basic')
      }

      if (wave >= 3) {
        const fastCount = Math.floor(wave / 2)
        for (let i = 0; i < fastCount; i++) {
          enemies.push('fast')
        }
      }

      if (wave >= 5) {
        const tankCount = Math.floor(wave / 3)
        for (let i = 0; i < tankCount; i++) {
          enemies.push('tank')
        }
      }

      if (wave % 10 === 0) {
        enemies.push('boss')
      }

      return { enemies: shuffleArray(enemies), delay: 1000 }
    },

    // 生成敌人
    spawnEnemies(waveConfig) {
      let delay = 0
      const totalEnemies = waveConfig.enemies.length
      let spawnedCount = 0

      waveConfig.enemies.forEach((type) => {
        setTimeout(() => {
          if (!this.state.isGameOver && !this.state.isPaused) {
            this.spawnEnemy(type)
          }
          spawnedCount++
          if (spawnedCount >= totalEnemies) {
            this.state.waveInProgress = false
          }
        }, delay)
        delay += waveConfig.delay
      })
    },

    // 生成单个敌人
    spawnEnemy(type) {
      if (!this.path || this.path.length === 0) return

      const config = this.enemyTypes[type]
      const waveMultiplier = 1 + (this.state.wave - 1) * 0.1

      const enemy = {
        id: Date.now() + Math.random(),
        type,
        x: this.path[0].x,
        y: this.path[0].y,
        health: Math.floor(config.health * waveMultiplier),
        maxHealth: Math.floor(config.health * waveMultiplier),
        speed: config.speed,
        baseSpeed: config.speed,
        gold: config.gold,
        pathIndex: 0,
        slowUntil: 0,
        ...config
      }

      this.enemies.push(enemy)
    },

    // 游戏主循环
    gameLoop() {
      if (this.state.isGameOver) return

      if (!this.state.isPaused) {
        this.update()
      }
      this.render()

      this.animationId = setTimeout(() => this.gameLoop(), 1000 / 60)
    },

    // 更新游戏状态
    update() {
      const now = Date.now()

      // 更新敌人
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i]

        // 减速效果
        if (enemy.slowUntil > now) {
          enemy.speed = enemy.baseSpeed * 0.5
        } else {
          enemy.speed = enemy.baseSpeed
        }

        // 移动敌人
        if (enemy.pathIndex < this.path.length - 1) {
          const target = this.path[enemy.pathIndex + 1]
          const dx = target.x - enemy.x
          const dy = target.y - enemy.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < enemy.speed * this.state.gameSpeed * 2) {
            enemy.pathIndex++
          } else {
            enemy.x += (dx / dist) * enemy.speed * this.state.gameSpeed
            enemy.y += (dy / dist) * enemy.speed * this.state.gameSpeed
          }
        } else {
          this.state.lives--
          this.enemies.splice(i, 1)
          if (this.state.lives <= 0) {
            this.gameOver(false)
          }
          continue
        }

        // 敌人死亡
        if (enemy.health <= 0) {
          this.state.gold += enemy.gold
          this.state.enemiesKilled++
          this.enemies.splice(i, 1)
        }
      }

      // 更新防御塔
      this.towers.forEach(tower => {
        let target = null
        let minDist = tower.range

        this.enemies.forEach(enemy => {
          const dist = Math.sqrt(Math.pow(enemy.x - tower.x, 2) + Math.pow(enemy.y - tower.y, 2))
          if (dist < minDist) {
            minDist = dist
            target = enemy
          }
        })

        tower.target = target

        if (target && now - tower.lastFire > tower.fireRate / this.state.gameSpeed) {
          this.fireProjectile(tower, target)
          tower.lastFire = now
        }
      })

      // 更新子弹
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i]
        const target = this.enemies.find(e => e.id === proj.targetId)

        if (!target) {
          this.projectiles.splice(i, 1)
          continue
        }

        const dx = target.x - proj.x
        const dy = target.y - proj.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 10) {
          target.health -= proj.damage
          if (proj.slowEffect) {
            target.slowUntil = now + proj.slowDuration
          }
          if (proj.splash) {
            this.enemies.forEach(enemy => {
              if (enemy.id !== target.id) {
                const splashDist = Math.sqrt(Math.pow(enemy.x - target.x, 2) + Math.pow(enemy.y - target.y, 2))
                if (splashDist < proj.splash) {
                  enemy.health -= proj.damage * 0.5
                }
              }
            })
          }
          this.projectiles.splice(i, 1)
        } else {
          proj.x += (dx / dist) * proj.speed * this.state.gameSpeed
          proj.y += (dy / dist) * proj.speed * this.state.gameSpeed
        }
      }

      // 检查波次完成
      if (this.enemies.length === 0 && !this.state.waveInProgress) {
        this.state.wave++
        this.state.gold += 50
        uni.showToast({ title: `第 ${this.state.wave} 波来袭！`, icon: 'none' })
        setTimeout(() => {
          if (!this.state.isGameOver) {
            this.startWave()
          }
        }, 2000)
        this.state.waveInProgress = true
      }
    },

    // 发射子弹
    fireProjectile(tower, target) {
      this.projectiles.push({
        id: Date.now() + Math.random(),
        x: tower.x,
        y: tower.y,
        targetId: target.id,
        damage: tower.damage,
        speed: tower.projectileSpeed || 8,
        color: tower.color,
        splash: tower.splash || 0,
        slowEffect: tower.slowEffect || 0,
        slowDuration: tower.slowDuration || 0
      })
    },

    // 渲染游戏
    render() {
      if (!this.ctx) return

      const ctx = this.ctx
      const { gridSize, cols, rows } = this.config

      // 清空画布
      ctx.fillStyle = '#2d5016'
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

      // 绘制网格
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      for (let i = 0; i <= cols; i++) {
        ctx.beginPath()
        ctx.moveTo(i * gridSize, 0)
        ctx.lineTo(i * gridSize, this.canvasHeight)
        ctx.stroke()
      }
      for (let i = 0; i <= rows; i++) {
        ctx.beginPath()
        ctx.moveTo(0, i * gridSize)
        ctx.lineTo(this.canvasWidth, i * gridSize)
        ctx.stroke()
      }

      // 绘制路径
      ctx.fillStyle = '#8B7355'
      for (let row = 0; row < this.pathGrid.length; row++) {
        for (let col = 0; col < (this.pathGrid[row]?.length || 0); col++) {
          if (this.pathGrid[row][col]) {
            ctx.fillRect(col * gridSize + 2, row * gridSize + 2, gridSize - 4, gridSize - 4)
          }
        }
      }

      // 绘制防御塔
      this.towers.forEach(tower => {
        const size = gridSize - 10
        ctx.fillStyle = tower.color
        ctx.beginPath()
        ctx.arc(tower.x, tower.y, size / 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#FFD700'
        ctx.font = 'bold 12px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(tower.level.toString(), tower.x, tower.y - size / 2 - 5)

        ctx.font = `${size * 0.6}px Arial`
        ctx.textBaseline = 'middle'
        ctx.fillText(tower.emoji, tower.x, tower.y)
      })

      // 绘制敌人
      this.enemies.forEach(enemy => {
        const size = 25
        ctx.fillStyle = enemy.color
        ctx.beginPath()
        ctx.arc(enemy.x, enemy.y, size / 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.font = `${size * 0.7}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(enemy.emoji, enemy.x, enemy.y)

        // 血条
        const healthBarWidth = 30
        const healthBarHeight = 4
        const healthPercent = enemy.health / enemy.maxHealth

        ctx.fillStyle = '#333'
        ctx.fillRect(enemy.x - healthBarWidth / 2, enemy.y - size / 2 - 10, healthBarWidth, healthBarHeight)

        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336'
        ctx.fillRect(enemy.x - healthBarWidth / 2, enemy.y - size / 2 - 10, healthBarWidth * healthPercent, healthBarHeight)
      })

      // 绘制子弹
      this.projectiles.forEach(proj => {
        ctx.fillStyle = proj.color
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2)
        ctx.fill()
      })

      // 绘制可放置预览
      if (this.selectedTower) {
        for (let row = 0; row < this.pathGrid.length; row++) {
          for (let col = 0; col < (this.pathGrid[row]?.length || 0); col++) {
            if (!this.pathGrid[row][col]) {
              const hasTower = this.towers.some(t => t.gridX === col && t.gridY === row)
              if (!hasTower) {
                ctx.fillStyle = 'rgba(76, 175, 80, 0.3)'
                ctx.fillRect(col * gridSize + 2, row * gridSize + 2, gridSize - 4, gridSize - 4)
              }
            }
          }
        }
      }
    },

    // 暂停游戏
    pauseGame() {
      this.state.isPaused = true
      this.showPauseModal = true
    },

    // 继续游戏
    resumeGame() {
      this.state.isPaused = false
      this.showPauseModal = false
    },

    // 切换速度
    toggleSpeed() {
      this.state.gameSpeed = this.state.gameSpeed === 1 ? 2 : 1
    },

    // 重新开始
    restartGame() {
      this.showPauseModal = false
      this.showGameOverModal = false
      if (this.animationId) {
        clearTimeout(this.animationId)
      }
      this.startGame()
    },

    // 退出游戏
    quitGame() {
      this.showPauseModal = false
      this.showGameOverModal = false
      if (this.animationId) {
        clearTimeout(this.animationId)
      }
      this.screen = 'menu'
    },

    // 游戏结束
    gameOver(win) {
      this.state.isGameOver = true
      const accuracy = this.state.questionsAnswered > 0
        ? Math.round((this.state.questionsCorrect / this.state.questionsAnswered) * 100)
        : 0

      this.gameResult = {
        win,
        wave: this.state.wave,
        enemiesKilled: this.state.enemiesKilled,
        questionsCorrect: this.state.questionsCorrect,
        accuracy
      }

      this.showGameOverModal = true
    },

    // 分享结果
    shareResult() {
      const text = `🏰 我在【数学塔防】中坚守了 ${this.gameResult.wave} 波！答题正确率 ${this.gameResult.accuracy}%！快来挑战吧！`

      // #ifdef H5
      if (navigator.share) {
        navigator.share({ title: '数学塔防', text, url: window.location.href })
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
        uni.showToast({ title: '已复制，快去分享吧', icon: 'none' })
      }
      // #endif

      // #ifdef MP-WEIXIN
      uni.showToast({ title: '长按保存并分享', icon: 'none' })
      // #endif
    }
  },

  onUnload() {
    if (this.animationId) {
      clearTimeout(this.animationId)
    }
  }
}
</script>

<style scoped>
.game-container {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.screen {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 菜单样式 */
.menu-screen {
  justify-content: center;
  align-items: center;
}

.menu-content {
  text-align: center;
  padding: 40rpx;
}

.title {
  display: block;
  font-size: 56rpx;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: #a0a0a0;
  margin-top: 16rpx;
  margin-bottom: 60rpx;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 40rpx;
}

.btn {
  padding: 24rpx 60rpx;
  font-size: 32rpx;
  border: none;
  border-radius: 24rpx;
  font-weight: bold;
}

.btn-primary {
  background: linear-gradient(135deg, #4CAF50, #388E3C);
  color: white;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 2rpx solid rgba(255, 255, 255, 0.2);
}

.knowledge-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16rpx;
}

.tag {
  background: rgba(33, 150, 243, 0.2);
  color: #2196F3;
  padding: 12rpx 24rpx;
  border-radius: 30rpx;
  font-size: 24rpx;
}

/* 游戏界面样式 */
.game-screen {
  height: 100vh;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background: rgba(0, 0, 0, 0.5);
}

.info-left, .info-right {
  display: flex;
  gap: 24rpx;
  align-items: center;
}

.lives, .gold, .wave {
  font-size: 28rpx;
  font-weight: bold;
  color: #ffffff;
}

.btn-icon {
  font-size: 40rpx;
  padding: 8rpx;
}

.canvas-wrapper {
  flex: 1;
  width: 100%;
}

.game-canvas {
  width: 100%;
  height: 100%;
}

.tower-bar {
  display: flex;
  justify-content: space-around;
  padding: 16rpx;
  background: rgba(0, 0, 0, 0.7);
}

.tower-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #16213e;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  min-width: 100rpx;
}

.tower-slot.selected {
  border-color: #4CAF50;
}

.tower-slot.disabled {
  opacity: 0.5;
}

.tower-icon {
  font-size: 48rpx;
}

.tower-cost {
  font-size: 24rpx;
  color: #FFD700;
  margin-top: 8rpx;
}

/* 模态框样式 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background: #16213e;
  border-radius: 24rpx;
  padding: 40rpx;
  width: 85%;
  max-width: 600rpx;
  text-align: center;
}

.modal-title {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 32rpx;
}

.modal-buttons {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 32rpx;
}

/* 数学题样式 */
.math-question {
  margin-bottom: 32rpx;
}

.question-type {
  display: inline-block;
  font-size: 24rpx;
  color: #2196F3;
  background: rgba(33, 150, 243, 0.1);
  padding: 8rpx 24rpx;
  border-radius: 30rpx;
  margin-bottom: 24rpx;
}

.question-text {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #ffffff;
  line-height: 1.5;
}

.answer-area {
  margin-bottom: 16rpx;
}

.answer-input {
  width: 100%;
  padding: 24rpx;
  font-size: 36rpx;
  text-align: center;
  background: rgba(0, 0, 0, 0.3);
  border: 2rpx solid rgba(255, 255, 255, 0.2);
  border-radius: 16rpx;
  color: #ffffff;
}

.answer-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.option-btn {
  padding: 24rpx;
  font-size: 32rpx;
  background: rgba(255, 255, 255, 0.1);
  border: 2rpx solid rgba(255, 255, 255, 0.2);
  border-radius: 16rpx;
  color: #ffffff;
}

.option-btn.correct {
  background: rgba(76, 175, 80, 0.3);
  border-color: #4CAF50;
}

.option-btn.wrong {
  background: rgba(244, 67, 54, 0.3);
  border-color: #F44336;
}

.feedback {
  display: block;
  margin-top: 24rpx;
  font-size: 28rpx;
}

.feedback.correct {
  color: #4CAF50;
}

.feedback.wrong {
  color: #F44336;
}

/* 游戏统计 */
.game-stats {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16rpx;
  padding: 24rpx;
  margin: 24rpx 0;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-size: 28rpx;
}

.stat-row:last-child {
  border-bottom: none;
}

/* 帮助内容 */
.help-content {
  text-align: left;
  max-height: 70vh;
  overflow-y: auto;
}

.help-section {
  margin-bottom: 24rpx;
}

.help-title {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #4CAF50;
  margin-bottom: 12rpx;
}

.help-text {
  display: block;
  font-size: 26rpx;
  color: #a0a0a0;
  margin-bottom: 8rpx;
}
</style>
