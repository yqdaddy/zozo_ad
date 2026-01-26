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
      <view class="game-header safe-area-top">
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
      <view class="canvas-wrapper" id="canvasWrapper">
        <canvas
          id="gameCanvas"
          type="2d"
          class="game-canvas"
          :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
          @touchstart.stop.prevent="handleTouch"
        ></canvas>
      </view>

      <!-- 提示信息 -->
      <view v-if="!selectedTower" class="tip-bar">
        <text class="tip-text">👇 选择下方防御塔，点击绿色区域建造</text>
      </view>
      <view v-else class="tip-bar selected-tip">
        <text class="tip-text">✅ 已选择 {{ getTowerName(selectedTower) }}，点击绿色区域建造</text>
      </view>

      <!-- 底部塔选择栏 -->
      <view class="tower-bar safe-area-bottom">
        <view
          v-for="tower in towerList"
          :key="tower.type"
          class="tower-slot"
          :class="{ selected: selectedTower === tower.type, disabled: state.gold < tower.cost }"
          @click="selectTower(tower.type)"
        >
          <text class="tower-icon">{{ tower.emoji }}</text>
          <text class="tower-name">{{ tower.name }}</text>
          <text class="tower-cost">💰{{ tower.cost }}</text>
        </view>
      </view>
    </view>

    <!-- 数学题弹窗 -->
    <view v-if="showMathModal" class="modal">
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
          <text class="help-text">1. 选择底部的塔类型</text>
          <text class="help-text">2. 点击地图上绿色区域</text>
          <text class="help-text">3. 答对数学题即可建造</text>
        </view>
        <view class="help-section">
          <text class="help-title">💡 防御塔类型</text>
          <text class="help-text">🏹 弓箭塔 - 攻速快，单体伤害</text>
          <text class="help-text">✨ 魔法塔 - 范围攻击，群伤</text>
          <text class="help-text">💣 炮塔 - 高伤害，攻速慢</text>
          <text class="help-text">❄️ 冰冻塔 - 减速敌人</text>
        </view>
        <button class="btn btn-primary" @click="showHelp = false">知道了</button>
      </view>
    </view>
  </view>
</template>

<script>
import { generateRandomQuestion, generateOptions, checkAnswer, shuffleArray } from '@/utils/math.js'

export default {
  data() {
    return {
      screen: 'menu',
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
      canvas: null,
      ctx: null,
      canvasWidth: 320,
      canvasHeight: 400,
      animationId: null,
      dpr: 1,

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
        archer: { damage: 15, range: 80, fireRate: 600, projectileSpeed: 10, color: '#8B4513', projectileColor: '#FFD700' },
        magic: { damage: 20, range: 70, fireRate: 1000, projectileSpeed: 8, color: '#9C27B0', projectileColor: '#E040FB', splash: 30 },
        cannon: { damage: 40, range: 75, fireRate: 1500, projectileSpeed: 6, color: '#555', projectileColor: '#FF5722' },
        ice: { damage: 8, range: 70, fireRate: 800, projectileSpeed: 9, color: '#00BCD4', projectileColor: '#80DEEA', slowEffect: 0.5, slowDuration: 2000 }
      },

      // 敌人配置
      enemyTypes: {
        basic: { emoji: '👾', health: 40, speed: 0.8, gold: 10, color: '#4CAF50' },
        fast: { emoji: '💨', health: 25, speed: 1.5, gold: 15, color: '#03A9F4' },
        tank: { emoji: '🛡️', health: 100, speed: 0.4, gold: 25, color: '#795548' },
        boss: { emoji: '👹', health: 300, speed: 0.3, gold: 100, color: '#F44336' }
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
      },

      // 建造位置
      pendingBuild: null
    }
  },

  methods: {
    goBack() {
      uni.navigateBack()
    },

    getTowerName(type) {
      const tower = this.towerList.find(t => t.type === type)
      return tower ? tower.name : ''
    },

    startGame() {
      this.resetGame()
      this.screen = 'game'
      this.$nextTick(() => {
        setTimeout(() => this.initCanvas(), 100)
      })
    },

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
      this.pendingBuild = null
    },

    initCanvas() {
      // 获取系统信息
      const sysInfo = uni.getSystemInfoSync()
      this.dpr = sysInfo.pixelRatio || 2

      // 计算画布尺寸
      const screenWidth = sysInfo.windowWidth
      const screenHeight = sysInfo.windowHeight
      const headerHeight = 50
      const tipHeight = 40
      const towerBarHeight = 90
      const safeBottom = sysInfo.safeAreaInsets?.bottom || 0

      this.canvasWidth = screenWidth
      this.canvasHeight = screenHeight - headerHeight - tipHeight - towerBarHeight - safeBottom - 20

      // 计算网格
      this.config.cols = 8
      this.config.gridSize = Math.floor(this.canvasWidth / this.config.cols)
      this.config.rows = Math.floor(this.canvasHeight / this.config.gridSize)

      this.$nextTick(() => {
        const query = uni.createSelectorQuery().in(this)
        query.select('#gameCanvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (!res || !res[0] || !res[0].node) {
              console.error('Canvas not found, retrying...')
              setTimeout(() => this.initCanvas(), 200)
              return
            }

            this.canvas = res[0].node
            this.ctx = this.canvas.getContext('2d')

            this.canvas.width = this.canvasWidth * this.dpr
            this.canvas.height = this.canvasHeight * this.dpr
            this.ctx.scale(this.dpr, this.dpr)

            this.generatePath()
            this.startWave()
            this.gameLoop()
          })
      })
    },

    generatePath() {
      const { cols, rows, gridSize } = this.config
      this.path = []
      this.pathGrid = []

      for (let i = 0; i < rows; i++) {
        this.pathGrid.push(new Array(cols).fill(false))
      }

      let currentRow = 0
      let currentCol = 0
      let direction = 1

      // 起点
      this.path.push({ x: gridSize / 2, y: gridSize / 2 })
      this.pathGrid[0][0] = true

      while (currentRow < rows - 1) {
        // 水平移动
        while ((direction === 1 && currentCol < cols - 1) || (direction === -1 && currentCol > 0)) {
          currentCol += direction
          if (currentRow < rows && currentCol >= 0 && currentCol < cols) {
            this.pathGrid[currentRow][currentCol] = true
            this.path.push({
              x: currentCol * gridSize + gridSize / 2,
              y: currentRow * gridSize + gridSize / 2
            })
          }
        }

        // 向下移动
        for (let i = 0; i < 2 && currentRow < rows - 1; i++) {
          currentRow++
          if (currentRow < rows) {
            this.pathGrid[currentRow][currentCol] = true
            this.path.push({
              x: currentCol * gridSize + gridSize / 2,
              y: currentRow * gridSize + gridSize / 2
            })
          }
        }
        direction *= -1
      }

      // 终点
      this.path.push({
        x: this.path[this.path.length - 1].x,
        y: this.canvasHeight + 20
      })
    },

    selectTower(type) {
      const tower = this.towerList.find(t => t.type === type)
      if (tower && this.state.gold >= tower.cost) {
        this.selectedTower = this.selectedTower === type ? null : type
        uni.showToast({
          title: this.selectedTower ? `已选择${tower.name}` : '取消选择',
          icon: 'none',
          duration: 1000
        })
      } else {
        uni.showToast({ title: '金币不足', icon: 'none' })
      }
    },

    handleTouch(e) {
      if (this.state.isPaused || this.state.isGameOver) return

      const touch = e.touches[0]
      if (!touch) return

      // 获取触摸坐标（相对于画布）
      let x, y

      // #ifdef H5
      const rect = e.currentTarget.getBoundingClientRect ?
        e.currentTarget.getBoundingClientRect() :
        { left: 0, top: 0 }
      x = touch.clientX - rect.left
      y = touch.clientY - rect.top
      // #endif

      // #ifndef H5
      x = touch.x
      y = touch.y
      // #endif

      const gridX = Math.floor(x / this.config.gridSize)
      const gridY = Math.floor(y / this.config.gridSize)

      // 边界检查
      if (gridY < 0 || gridY >= this.pathGrid.length || gridX < 0 || gridX >= this.config.cols) {
        return
      }

      // 检查是否在路径上
      if (this.pathGrid[gridY] && this.pathGrid[gridY][gridX]) {
        uni.showToast({ title: '不能在路径上建塔', icon: 'none', duration: 1000 })
        return
      }

      // 检查是否已有塔
      const existingTower = this.towers.find(t => t.gridX === gridX && t.gridY === gridY)

      if (existingTower) {
        this.tryUpgradeTower(existingTower)
      } else if (this.selectedTower) {
        this.tryBuildTower(gridX, gridY)
      } else {
        uni.showToast({ title: '请先选择防御塔', icon: 'none', duration: 1000 })
      }
    },

    tryBuildTower(gridX, gridY) {
      const towerInfo = this.towerList.find(t => t.type === this.selectedTower)
      if (this.state.gold < towerInfo.cost) {
        uni.showToast({ title: '金币不足', icon: 'none' })
        return
      }

      this.pendingBuild = { gridX, gridY, type: this.selectedTower }
      const difficulty = Math.min(3, Math.ceil(this.state.wave / 3))

      this.showMathQuestion(difficulty, (correct) => {
        if (correct && this.pendingBuild) {
          this.buildTower(this.pendingBuild.gridX, this.pendingBuild.gridY)
          // 建造成功特效
          this.createBuildEffect(
            this.pendingBuild.gridX * this.config.gridSize + this.config.gridSize / 2,
            this.pendingBuild.gridY * this.config.gridSize + this.config.gridSize / 2
          )
          uni.showToast({ title: '建造成功！', icon: 'success' })
        } else {
          uni.showToast({ title: '答错了，建造失败', icon: 'none' })
        }
        this.pendingBuild = null
      })
    },

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
        angle: 0,
        ...config
      }

      this.towers.push(tower)
      this.state.gold -= towerInfo.cost
      this.selectedTower = null
    },

    createBuildEffect(x, y) {
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          life: 30,
          maxLife: 30,
          color: '#4CAF50',
          size: 6
        })
      }
    },

    tryUpgradeTower(tower) {
      const upgradeCost = Math.floor(tower.cost * tower.level * 0.7)
      if (this.state.gold < upgradeCost) {
        uni.showToast({ title: `升级需要 ${upgradeCost} 金币`, icon: 'none' })
        return
      }

      const difficulty = Math.min(3, tower.level + 1)
      this.showMathQuestion(difficulty, (correct) => {
        if (correct) {
          this.upgradeTower(tower, upgradeCost)
          this.createBuildEffect(tower.x, tower.y)
          uni.showToast({ title: `升级到 ${tower.level} 级！`, icon: 'success' })
        } else {
          uni.showToast({ title: '答错了，升级失败', icon: 'none' })
        }
      })
    },

    upgradeTower(tower, cost) {
      tower.level++
      tower.damage = Math.floor(tower.damage * 1.3)
      tower.range = Math.floor(tower.range * 1.1)
      tower.fireRate = Math.floor(tower.fireRate * 0.9)
      this.state.gold -= cost
    },

    showMathQuestion(difficulty, callback) {
      this.state.isPaused = true
      this.mathCallback = callback
      this.currentQuestion = generateRandomQuestion(difficulty)
      this.state.questionsAnswered++

      this.userAnswer = ''
      this.feedback = ''
      this.feedbackClass = ''
      this.selectedOption = null

      if (Math.random() > 0.5 && difficulty <= 2) {
        this.showOptions = true
        this.answerOptions = generateOptions(this.currentQuestion.answer)
      } else {
        this.showOptions = false
        this.answerOptions = []
      }

      this.showMathModal = true
    },

    selectOption(option) {
      if (this.feedback) return
      this.selectedOption = option
      this.checkMathAnswer(option.toString())
    },

    submitAnswer() {
      if (!this.userAnswer) return
      this.checkMathAnswer(this.userAnswer)
    },

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
      }, isCorrect ? 600 : 1200)
    },

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

    closeMathModal() {
      this.showMathModal = false
      this.state.isPaused = false
    },

    startWave() {
      this.state.waveInProgress = true
      const waveConfig = this.getWaveConfig(this.state.wave)
      this.spawnEnemies(waveConfig)
    },

    getWaveConfig(wave) {
      const enemies = []
      const baseCount = 3 + Math.floor(wave * 1.2)

      for (let i = 0; i < baseCount; i++) {
        enemies.push('basic')
      }

      if (wave >= 2) {
        const fastCount = Math.floor(wave / 2)
        for (let i = 0; i < fastCount; i++) {
          enemies.push('fast')
        }
      }

      if (wave >= 4) {
        const tankCount = Math.floor(wave / 3)
        for (let i = 0; i < tankCount; i++) {
          enemies.push('tank')
        }
      }

      if (wave % 5 === 0) {
        enemies.push('boss')
      }

      return { enemies: shuffleArray(enemies), delay: 800 }
    },

    spawnEnemies(waveConfig) {
      let delay = 0
      const totalEnemies = waveConfig.enemies.length
      let spawnedCount = 0

      waveConfig.enemies.forEach((type) => {
        setTimeout(() => {
          if (!this.state.isGameOver) {
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

    spawnEnemy(type) {
      if (!this.path || this.path.length === 0) return

      const config = this.enemyTypes[type]
      const waveMultiplier = 1 + (this.state.wave - 1) * 0.15

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

    gameLoop() {
      if (this.state.isGameOver) return

      if (!this.state.isPaused) {
        this.update()
      }
      this.render()

      this.animationId = requestAnimationFrame(() => this.gameLoop())
    },

    update() {
      const now = Date.now()

      // 更新粒子
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life--
        if (p.life <= 0) {
          this.particles.splice(i, 1)
        }
      }

      // 更新敌人
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i]

        if (enemy.slowUntil > now) {
          enemy.speed = enemy.baseSpeed * 0.5
        } else {
          enemy.speed = enemy.baseSpeed
        }

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

        if (enemy.health <= 0) {
          this.state.gold += enemy.gold
          this.state.enemiesKilled++
          this.createDeathEffect(enemy.x, enemy.y, enemy.color)
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

        if (target) {
          tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x)

          if (now - tower.lastFire > tower.fireRate / this.state.gameSpeed) {
            this.fireProjectile(tower, target)
            tower.lastFire = now
          }
        }
      })

      // 更新子弹
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i]
        const target = this.enemies.find(e => e.id === proj.targetId)

        if (!target) {
          this.createHitEffect(proj.x, proj.y, proj.color)
          this.projectiles.splice(i, 1)
          continue
        }

        const dx = target.x - proj.x
        const dy = target.y - proj.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 12) {
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
            this.createSplashEffect(target.x, target.y, proj.splash)
          }
          this.createHitEffect(proj.x, proj.y, proj.color)
          this.projectiles.splice(i, 1)
        } else {
          proj.x += (dx / dist) * proj.speed * this.state.gameSpeed
          proj.y += (dy / dist) * proj.speed * this.state.gameSpeed
        }
      }

      // 检查波次完成
      if (this.enemies.length === 0 && !this.state.waveInProgress && !this.state.isGameOver) {
        this.state.wave++
        this.state.gold += 30 + this.state.wave * 10
        this.state.waveInProgress = true

        setTimeout(() => {
          if (!this.state.isGameOver) {
            uni.showToast({ title: `第 ${this.state.wave} 波来袭！`, icon: 'none' })
            this.startWave()
          }
        }, 2000)
      }
    },

    fireProjectile(tower, target) {
      this.projectiles.push({
        id: Date.now() + Math.random(),
        x: tower.x,
        y: tower.y,
        targetId: target.id,
        damage: tower.damage,
        speed: tower.projectileSpeed || 8,
        color: tower.projectileColor || tower.color,
        splash: tower.splash || 0,
        slowEffect: tower.slowEffect || 0,
        slowDuration: tower.slowDuration || 0,
        size: tower.splash ? 6 : 4
      })
    },

    createHitEffect(x, y, color) {
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 2
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 15,
          maxLife: 15,
          color: color,
          size: 3
        })
      }
    },

    createDeathEffect(x, y, color) {
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 2 + Math.random() * 3
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 25,
          maxLife: 25,
          color: color,
          size: 5
        })
      }
    },

    createSplashEffect(x, y, radius) {
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2
        this.particles.push({
          x: x + Math.cos(angle) * radius * 0.5,
          y: y + Math.sin(angle) * radius * 0.5,
          vx: Math.cos(angle) * 1.5,
          vy: Math.sin(angle) * 1.5,
          life: 20,
          maxLife: 20,
          color: '#E040FB',
          size: 4
        })
      }
    },

    render() {
      if (!this.ctx) return

      const ctx = this.ctx
      const { gridSize, cols, rows } = this.config

      // 清空画布
      ctx.fillStyle = '#2d5016'
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

      // 绘制网格
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
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
      ctx.fillStyle = '#6B5344'
      for (let row = 0; row < this.pathGrid.length; row++) {
        for (let col = 0; col < cols; col++) {
          if (this.pathGrid[row] && this.pathGrid[row][col]) {
            ctx.fillRect(col * gridSize + 1, row * gridSize + 1, gridSize - 2, gridSize - 2)
          }
        }
      }

      // 绘制可放置预览
      if (this.selectedTower) {
        ctx.fillStyle = 'rgba(76, 175, 80, 0.4)'
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            if (!this.pathGrid[row] || !this.pathGrid[row][col]) {
              const hasTower = this.towers.some(t => t.gridX === col && t.gridY === row)
              if (!hasTower) {
                ctx.fillRect(col * gridSize + 2, row * gridSize + 2, gridSize - 4, gridSize - 4)
              }
            }
          }
        }
      }

      // 绘制防御塔
      this.towers.forEach(tower => {
        const size = gridSize - 8

        // 攻击范围（选中时显示）
        if (this.selectedTower === null) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
          ctx.beginPath()
          ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2)
          ctx.stroke()
        }

        // 塔底座
        ctx.fillStyle = tower.color
        ctx.beginPath()
        ctx.arc(tower.x, tower.y, size / 2, 0, Math.PI * 2)
        ctx.fill()

        // 塔的朝向指示
        if (tower.target) {
          ctx.strokeStyle = tower.projectileColor || '#fff'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(tower.x, tower.y)
          ctx.lineTo(
            tower.x + Math.cos(tower.angle) * (size / 2 + 5),
            tower.y + Math.sin(tower.angle) * (size / 2 + 5)
          )
          ctx.stroke()
        }

        // 塔的 emoji
        ctx.font = `${size * 0.55}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(tower.emoji, tower.x, tower.y)

        // 等级标识
        if (tower.level > 1) {
          ctx.fillStyle = '#FFD700'
          ctx.font = 'bold 10px Arial'
          ctx.fillText(`Lv${tower.level}`, tower.x, tower.y - size / 2 - 6)
        }
      })

      // 绘制敌人
      this.enemies.forEach(enemy => {
        const size = gridSize * 0.6

        // 减速效果光环
        if (enemy.slowUntil > Date.now()) {
          ctx.fillStyle = 'rgba(0, 188, 212, 0.3)'
          ctx.beginPath()
          ctx.arc(enemy.x, enemy.y, size / 2 + 4, 0, Math.PI * 2)
          ctx.fill()
        }

        // 敌人身体
        ctx.fillStyle = enemy.color
        ctx.beginPath()
        ctx.arc(enemy.x, enemy.y, size / 2, 0, Math.PI * 2)
        ctx.fill()

        // 敌人 emoji
        ctx.font = `${size * 0.7}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(enemy.emoji, enemy.x, enemy.y)

        // 血条背景
        const hpWidth = size * 1.2
        const hpHeight = 4
        const hpX = enemy.x - hpWidth / 2
        const hpY = enemy.y - size / 2 - 8

        ctx.fillStyle = '#333'
        ctx.fillRect(hpX, hpY, hpWidth, hpHeight)

        // 血条
        const hpPercent = Math.max(0, enemy.health / enemy.maxHealth)
        ctx.fillStyle = hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.25 ? '#FFC107' : '#F44336'
        ctx.fillRect(hpX, hpY, hpWidth * hpPercent, hpHeight)
      })

      // 绘制子弹
      this.projectiles.forEach(proj => {
        // 子弹拖尾
        ctx.fillStyle = proj.color + '66'
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, proj.size + 2, 0, Math.PI * 2)
        ctx.fill()

        // 子弹本体
        ctx.fillStyle = proj.color
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // 绘制粒子特效
      this.particles.forEach(p => {
        const alpha = p.life / p.maxLife
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
    },

    pauseGame() {
      this.state.isPaused = true
      this.showPauseModal = true
    },

    resumeGame() {
      this.state.isPaused = false
      this.showPauseModal = false
    },

    toggleSpeed() {
      this.state.gameSpeed = this.state.gameSpeed === 1 ? 2 : 1
      uni.showToast({ title: `${this.state.gameSpeed}x 速度`, icon: 'none', duration: 800 })
    },

    restartGame() {
      this.showPauseModal = false
      this.showGameOverModal = false
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
      }
      this.startGame()
    },

    quitGame() {
      this.showPauseModal = false
      this.showGameOverModal = false
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
      }
      this.screen = 'menu'
    },

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

    shareResult() {
      const text = `🏰 我在【数学塔防】中坚守了 ${this.gameResult.wave} 波！答题正确率 ${this.gameResult.accuracy}%！快来挑战吧！`

      // #ifdef H5
      if (navigator.clipboard) {
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
      cancelAnimationFrame(this.animationId)
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

.safe-area-top {
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
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
  overflow: hidden;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 24rpx;
  background: rgba(0, 0, 0, 0.6);
  min-height: 50px;
}

.info-left, .info-right {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.lives, .gold, .wave {
  font-size: 28rpx;
  font-weight: bold;
  color: #ffffff;
}

.btn-icon {
  font-size: 36rpx;
  padding: 8rpx;
}

.canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.game-canvas {
  background: #2d5016;
}

.tip-bar {
  padding: 12rpx 24rpx;
  background: rgba(0, 0, 0, 0.5);
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tip-bar.selected-tip {
  background: rgba(76, 175, 80, 0.3);
}

.tip-text {
  font-size: 24rpx;
  color: #a0a0a0;
}

.selected-tip .tip-text {
  color: #4CAF50;
}

.tower-bar {
  display: flex;
  justify-content: space-around;
  padding: 12rpx 8rpx;
  background: rgba(0, 0, 0, 0.8);
  min-height: 90px;
}

.tower-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 16rpx;
  background: #16213e;
  border-radius: 16rpx;
  border: 3rpx solid transparent;
  min-width: 140rpx;
  transition: all 0.2s;
}

.tower-slot.selected {
  border-color: #4CAF50;
  background: rgba(76, 175, 80, 0.2);
  transform: scale(1.05);
}

.tower-slot.disabled {
  opacity: 0.4;
}

.tower-icon {
  font-size: 40rpx;
}

.tower-name {
  font-size: 20rpx;
  color: #ffffff;
  margin-top: 4rpx;
}

.tower-cost {
  font-size: 20rpx;
  color: #FFD700;
  margin-top: 4rpx;
}

/* 模态框样式 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
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
  font-size: 36rpx;
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
  line-height: 1.6;
}
</style>
