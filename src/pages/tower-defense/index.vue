<template>
  <view class="game-container">
    <!-- 主菜单 -->
    <view v-if="screen === 'menu'" class="screen menu-screen">
      <view class="menu-content">
        <text class="title">🏰 数学塔防</text>
        <text class="subtitle">五年级上册</text>
        <view class="menu-buttons">
          <button class="btn btn-primary" @click="startGame('normal')">普通模式</button>
          <button class="btn btn-primary" @click="startGame('endless')">无尽模式</button>
          <button class="btn btn-secondary" @click="showHelp = true">游戏说明</button>
          <button class="btn btn-secondary" @click="goBack">返回首页</button>
        </view>
        <view class="knowledge-tags">
          <text class="tag">小数乘法</text>
          <text class="tag">小数除法</text>
          <text class="tag">简易方程</text>
          <text class="tag">多边形面积</text>
        </view>
        <view class="high-score" v-if="highScore > 0">
          <text>🏆 最高记录: 第 {{ highScore }} 波</text>
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
          <text class="mode-tag" v-if="gameMode === 'endless'">无尽</text>
        </view>
        <view class="info-right">
          <text class="btn-icon" @click="pauseGame">⏸️</text>
          <text class="btn-icon" @click="toggleSpeed">{{ state.gameSpeed }}x</text>
        </view>
      </view>

      <!-- 游戏画布 -->
      <view class="canvas-container" id="canvasContainer">
        <canvas
          id="gameCanvas"
          type="2d"
          class="game-canvas"
          @touchstart.stop.prevent="handleTouch"
        ></canvas>
      </view>

      <!-- 技能栏 -->
      <view class="skill-bar">
        <view
          class="skill-btn"
          :class="{ disabled: state.gold < 30, active: activeSkill === 'bomb' }"
          @click="useSkill('bomb')"
        >
          <text class="skill-icon">💥</text>
          <text class="skill-cost">30</text>
        </view>
        <view
          class="skill-btn"
          :class="{ disabled: state.gold < 40, active: activeSkill === 'freeze' }"
          @click="useSkill('freeze')"
        >
          <text class="skill-icon">🧊</text>
          <text class="skill-cost">40</text>
        </view>
        <view
          class="skill-btn"
          :class="{ disabled: state.gold < 50, active: activeSkill === 'heal' }"
          @click="useSkill('heal')"
        >
          <text class="skill-icon">💖</text>
          <text class="skill-cost">50</text>
        </view>
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
          <text class="tower-name">{{ tower.name }}</text>
          <text class="tower-cost">💰{{ tower.cost }}</text>
        </view>
      </view>
    </view>

    <!-- 数学题弹窗 -->
    <view v-if="showMathModal" class="modal">
      <view class="modal-content math-modal">
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
          <text class="help-text">阻止怪物到达终点！答对数学题建造防御塔消灭敌人。</text>
        </view>
        <view class="help-section">
          <text class="help-title">🎮 游戏模式</text>
          <text class="help-text">普通模式 - 通过10波获胜</text>
          <text class="help-text">无尽模式 - 看你能坚持多久</text>
        </view>
        <view class="help-section">
          <text class="help-title">🏗️ 如何建塔</text>
          <text class="help-text">1. 选择底部的塔类型</text>
          <text class="help-text">2. 点击地图上绿色区域</text>
          <text class="help-text">3. 答对数学题即可建造</text>
        </view>
        <view class="help-section">
          <text class="help-title">💡 防御塔类型</text>
          <text class="help-text">🏹 弓箭塔 - 攻速快，单体</text>
          <text class="help-text">✨ 魔法塔 - 范围攻击</text>
          <text class="help-text">💣 炮塔 - 高伤害</text>
          <text class="help-text">❄️ 冰冻塔 - 减速敌人</text>
          <text class="help-text">⚡ 雷电塔 - 连锁攻击</text>
        </view>
        <view class="help-section">
          <text class="help-title">🎯 技能说明</text>
          <text class="help-text">💥 炸弹 - 对区域敌人造成伤害</text>
          <text class="help-text">🧊 冰冻 - 冻结所有敌人3秒</text>
          <text class="help-text">💖 治愈 - 恢复5点生命</text>
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
      gameMode: 'normal',
      highScore: 0,

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
        waveInProgress: false,
        globalFreeze: 0
      },

      // 游戏配置
      config: {
        gridSize: 36,
        cols: 10,
        rows: 14
      },

      // Canvas 相关
      canvas: null,
      ctx: null,
      canvasWidth: 320,
      canvasHeight: 480,
      containerWidth: 320,
      containerHeight: 480,
      animationId: null,
      dpr: 1,
      isCanvasReady: false,

      // 游戏对象
      towers: [],
      enemies: [],
      projectiles: [],
      particles: [],
      path: [],
      pathGrid: [],

      // 防御塔选择
      selectedTower: null,
      activeSkill: null,
      towerList: [
        { type: 'archer', emoji: '🏹', cost: 50, name: '弓箭' },
        { type: 'magic', emoji: '✨', cost: 80, name: '魔法' },
        { type: 'cannon', emoji: '💣', cost: 100, name: '炮塔' },
        { type: 'ice', emoji: '❄️', cost: 70, name: '冰冻' },
        { type: 'lightning', emoji: '⚡', cost: 120, name: '雷电' }
      ],

      // 防御塔配置
      towerTypes: {
        archer: { damage: 20, rangeMultiplier: 2.5, fireRate: 500, projectileSpeed: 12, color: '#8B4513', projectileColor: '#FFD700' },
        magic: { damage: 25, rangeMultiplier: 2.2, fireRate: 900, projectileSpeed: 10, color: '#9C27B0', projectileColor: '#E040FB', splashMultiplier: 0.8 },
        cannon: { damage: 60, rangeMultiplier: 2.0, fireRate: 1400, projectileSpeed: 8, color: '#555', projectileColor: '#FF5722' },
        ice: { damage: 10, rangeMultiplier: 2.2, fireRate: 700, projectileSpeed: 10, color: '#00BCD4', projectileColor: '#80DEEA', slowEffect: 0.5, slowDuration: 2000 },
        lightning: { damage: 35, rangeMultiplier: 2.8, fireRate: 1000, projectileSpeed: 20, color: '#FFC107', projectileColor: '#FFEB3B', chainCount: 3 }
      },

      // 敌人配置 - 降低速度
      enemyTypes: {
        basic: { emoji: '👾', health: 50, speed: 0.5, gold: 10, color: '#4CAF50' },
        fast: { emoji: '💨', health: 30, speed: 1.0, gold: 15, color: '#03A9F4' },
        tank: { emoji: '🛡️', health: 150, speed: 0.25, gold: 25, color: '#795548' },
        healer: { emoji: '💚', health: 60, speed: 0.4, gold: 20, color: '#8BC34A', healAura: true },
        boss: { emoji: '👹', health: 400, speed: 0.2, gold: 100, color: '#F44336' },
        ghost: { emoji: '👻', health: 40, speed: 0.6, gold: 20, color: '#9E9E9E', phaseShift: true }
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

  mounted() {
    this.loadHighScore()
    // 监听窗口大小变化
    uni.onWindowResize(this.handleResize)
  },

  methods: {
    goBack() {
      uni.navigateBack()
    },

    handleResize() {
      // 仅在游戏界面且画布已就绪时重新计算
      if (this.screen !== 'game' || !this.isCanvasReady) return
      // 使用 resizeCanvas 而不是 adaptCanvas，因为需要更新游戏对象位置
      this.resizeCanvas()
    },

    // 窗口调整时重新计算画布
    resizeCanvas() {
      if (!this.canvas || !this.ctx) return

      const oldGridSize = this.config.gridSize

      const query = uni.createSelectorQuery().in(this)
      query.select('#canvasContainer').boundingClientRect()
      query.exec((res) => {
        if (!res || !res[0] || res[0].width <= 0) return

        const container = res[0]
        const containerW = Math.floor(container.width)
        const containerH = Math.floor(container.height)

        this.config.cols = 10
        this.config.gridSize = Math.floor(containerW / this.config.cols)
        this.config.rows = Math.floor(containerH / this.config.gridSize)

        this.canvasWidth = this.config.cols * this.config.gridSize
        this.canvasHeight = this.config.rows * this.config.gridSize

        // 更新画布尺寸
        this.canvas.style.width = this.canvasWidth + 'px'
        this.canvas.style.height = this.canvasHeight + 'px'
        this.canvas.width = this.canvasWidth * this.dpr
        this.canvas.height = this.canvasHeight * this.dpr
        this.ctx.setTransform(1, 0, 0, 1, 0, 0)
        this.ctx.scale(this.dpr, this.dpr)

        // 网格大小变化时更新游戏对象
        if (oldGridSize !== this.config.gridSize) {
          this.generatePath()
          this.towers.forEach(tower => {
            tower.x = tower.gridX * this.config.gridSize + this.config.gridSize / 2
            tower.y = tower.gridY * this.config.gridSize + this.config.gridSize / 2
          })
        }

        console.log('[Resize]', this.canvasWidth, 'x', this.canvasHeight)
      })
    },

    loadHighScore() {
      try {
        const score = uni.getStorageSync('towerDefenseHighScore')
        if (score) this.highScore = score
      } catch (e) {}
    },

    saveHighScore() {
      if (this.state.wave > this.highScore) {
        this.highScore = this.state.wave
        try {
          uni.setStorageSync('towerDefenseHighScore', this.highScore)
        } catch (e) {}
      }
    },

    getTowerName(type) {
      const tower = this.towerList.find(t => t.type === type)
      return tower ? tower.name : ''
    },

    startGame(mode) {
      this.gameMode = mode
      this.resetGame()
      this.screen = 'game'
      this.$nextTick(() => {
        setTimeout(() => this.initCanvas(), 150)
      })
    },

    resetGame() {
      this.state = {
        lives: this.gameMode === 'endless' ? 10 : 20,
        gold: this.gameMode === 'endless' ? 150 : 100,
        wave: 1,
        gameSpeed: 1,
        isPaused: false,
        isGameOver: false,
        questionsAnswered: 0,
        questionsCorrect: 0,
        enemiesKilled: 0,
        waveInProgress: false,
        globalFreeze: 0
      }
      this.towers = []
      this.enemies = []
      this.projectiles = []
      this.particles = []
      this.selectedTower = null
      this.activeSkill = null
      this.pendingBuild = null
      this.isCanvasReady = false
    },

    initCanvas() {
      this.isCanvasReady = false
      // 等待 DOM 完全渲染后初始化
      this.$nextTick(() => {
        setTimeout(() => this.setupCanvas(), 200)
      })
    },

    setupCanvas() {
      // 获取系统信息
      const sysInfo = uni.getSystemInfoSync()
      this.dpr = Math.min(sysInfo.pixelRatio || 2, 2) // 限制最大 DPR 为 2

      const query = uni.createSelectorQuery().in(this)
      query.select('#gameCanvas').fields({ node: true, size: true })
      query.select('#canvasContainer').boundingClientRect()
      query.exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          console.error('Canvas not found, retrying...')
          setTimeout(() => this.setupCanvas(), 200)
          return
        }

        const container = res[1]
        if (!container || container.width <= 0 || container.height <= 0) {
          console.error('Container not ready, retrying...')
          setTimeout(() => this.setupCanvas(), 200)
          return
        }

        this.canvas = res[0].node
        this.ctx = this.canvas.getContext('2d')

        // 使用容器的实际尺寸
        const containerW = Math.floor(container.width)
        const containerH = Math.floor(container.height)

        // 计算网格：固定 8 列
        this.config.cols = 10
        this.config.gridSize = Math.floor(containerW / this.config.cols)
        this.config.rows = Math.floor(containerH / this.config.gridSize)

        // 画布尺寸 = 网格数 × 网格大小
        this.canvasWidth = this.config.cols * this.config.gridSize
        this.canvasHeight = this.config.rows * this.config.gridSize

        // 设置 canvas 的 CSS 尺寸（逻辑像素）
        this.canvas.style.width = this.canvasWidth + 'px'
        this.canvas.style.height = this.canvasHeight + 'px'

        // 设置 canvas 的物理像素尺寸
        this.canvas.width = this.canvasWidth * this.dpr
        this.canvas.height = this.canvasHeight * this.dpr

        // 缩放绘图上下文
        this.ctx.scale(this.dpr, this.dpr)

        console.log('[Canvas] Size:', this.canvasWidth, 'x', this.canvasHeight,
          'Grid:', this.config.gridSize, 'Rows:', this.config.rows, 'Cols:', this.config.cols)

        this.isCanvasReady = true
        this.generatePath()
        this.startWave()
        this.gameLoop()
      })
    },

    generatePath() {
      const { cols, rows, gridSize } = this.config
      this.path = []
      this.pathGrid = []

      // 初始化网格
      for (let i = 0; i < rows; i++) {
        this.pathGrid.push(new Array(cols).fill(false))
      }

      // 生成S形路径（竖屏优化）
      let x = 0
      let y = 0
      let dir = 1

      // 起点从左上角开始
      this.path.push({ x: gridSize / 2, y: -gridSize / 2 }) // 入口在画布外

      while (y < rows) {
        // 标记当前位置
        if (y >= 0 && y < rows) {
          this.pathGrid[y][x] = true
          this.path.push({
            x: x * gridSize + gridSize / 2,
            y: y * gridSize + gridSize / 2
          })
        }

        // 水平移动
        if ((dir === 1 && x < cols - 1) || (dir === -1 && x > 0)) {
          x += dir
        } else {
          // 向下移动并转向
          y++
          if (y < rows) {
            this.pathGrid[y][x] = true
            this.path.push({
              x: x * gridSize + gridSize / 2,
              y: y * gridSize + gridSize / 2
            })
          }
          y++
          dir *= -1
        }
      }

      // 终点在画布下方
      this.path.push({
        x: this.path[this.path.length - 1].x,
        y: this.canvasHeight + gridSize / 2
      })

      console.log('Path generated:', this.path.length, 'points')
    },

    selectTower(type) {
      this.activeSkill = null
      const tower = this.towerList.find(t => t.type === type)
      if (tower && this.state.gold >= tower.cost) {
        this.selectedTower = this.selectedTower === type ? null : type
      } else {
        uni.showToast({ title: '金币不足', icon: 'none' })
      }
    },

    useSkill(skill) {
      this.selectedTower = null
      const costs = { bomb: 30, freeze: 40, heal: 50 }
      if (this.state.gold >= costs[skill]) {
        if (skill === 'freeze') {
          // 立即冻结所有敌人
          this.state.gold -= costs[skill]
          this.state.globalFreeze = Date.now() + 3000
          this.createGlobalEffect('#00BCD4')
          uni.showToast({ title: '所有敌人已冻结!', icon: 'none' })
        } else if (skill === 'heal') {
          this.state.gold -= costs[skill]
          this.state.lives = Math.min(this.state.lives + 5, this.gameMode === 'endless' ? 15 : 25)
          this.createGlobalEffect('#E91E63')
          uni.showToast({ title: '恢复5点生命!', icon: 'none' })
        } else {
          this.activeSkill = this.activeSkill === skill ? null : skill
        }
      } else {
        uni.showToast({ title: '金币不足', icon: 'none' })
      }
    },

    createGlobalEffect(color) {
      for (let i = 0; i < 30; i++) {
        this.particles.push({
          x: Math.random() * this.canvasWidth,
          y: Math.random() * this.canvasHeight,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 40,
          maxLife: 40,
          color: color,
          size: 8
        })
      }
    },

    handleTouch(e) {
      if (this.state.isPaused || this.state.isGameOver) return

      const touch = e.touches[0]
      if (!touch) return

      // 获取触摸坐标 - 优先使用 canvas 相对坐标
      let x, y

      // #ifdef H5
      // H5 环境使用 offsetX/offsetY 或计算相对位置
      if (typeof touch.offsetX === 'number') {
        x = touch.offsetX
        y = touch.offsetY
      } else if (e.currentTarget && e.currentTarget.getBoundingClientRect) {
        const rect = e.currentTarget.getBoundingClientRect()
        x = touch.clientX - rect.left
        y = touch.clientY - rect.top
      } else {
        x = touch.clientX
        y = touch.clientY
      }
      // #endif

      // #ifndef H5
      // 小程序环境使用 touch.x/y
      if (typeof touch.x === 'number' && typeof touch.y === 'number') {
        x = touch.x
        y = touch.y
      }
      // #endif

      // 确保坐标有效
      if (typeof x !== 'number' || typeof y !== 'number') {
        console.warn('Invalid touch coordinates')
        return
      }

      console.log('[Touch]', x, y, 'Grid:', Math.floor(x / this.config.gridSize), Math.floor(y / this.config.gridSize))

      // 使用技能
      if (this.activeSkill === 'bomb') {
        this.useBombAt(x, y)
        return
      }

      const gridX = Math.floor(x / this.config.gridSize)
      const gridY = Math.floor(y / this.config.gridSize)

      if (gridY < 0 || gridY >= this.config.rows || gridX < 0 || gridX >= this.config.cols) {
        return
      }

      if (this.pathGrid[gridY] && this.pathGrid[gridY][gridX]) {
        uni.showToast({ title: '不能在路径上建塔', icon: 'none', duration: 800 })
        return
      }

      const existingTower = this.towers.find(t => t.gridX === gridX && t.gridY === gridY)

      if (existingTower) {
        this.tryUpgradeTower(existingTower)
      } else if (this.selectedTower) {
        this.tryBuildTower(gridX, gridY)
      } else {
        uni.showToast({ title: '请先选择防御塔', icon: 'none', duration: 800 })
      }
    },

    useBombAt(x, y) {
      this.state.gold -= 30
      this.activeSkill = null

      // 创建爆炸效果
      const radius = this.config.gridSize * 1.5
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2
        this.particles.push({
          x: x + Math.cos(angle) * radius * 0.5,
          y: y + Math.sin(angle) * radius * 0.5,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          life: 30,
          maxLife: 30,
          color: '#FF5722',
          size: 8
        })
      }

      // 对范围内敌人造成伤害
      this.enemies.forEach(enemy => {
        const dist = Math.sqrt(Math.pow(enemy.x - x, 2) + Math.pow(enemy.y - y, 2))
        if (dist < radius) {
          enemy.health -= 80
        }
      })
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
          this.createBuildEffect(
            this.pendingBuild.gridX * this.config.gridSize + this.config.gridSize / 2,
            this.pendingBuild.gridY * this.config.gridSize + this.config.gridSize / 2
          )
        }
        this.pendingBuild = null
      })
    },

    buildTower(gridX, gridY) {
      const towerInfo = this.towerList.find(t => t.type === this.selectedTower)
      const config = this.towerTypes[this.selectedTower]
      const gridSize = this.config.gridSize

      const range = Math.floor(gridSize * (config.rangeMultiplier || 2))
      const splash = config.splashMultiplier ? Math.floor(gridSize * config.splashMultiplier) : 0

      const tower = {
        id: Date.now(),
        type: this.selectedTower,
        gridX,
        gridY,
        x: gridX * gridSize + gridSize / 2,
        y: gridY * gridSize + gridSize / 2,
        level: 1,
        cost: towerInfo.cost,
        emoji: towerInfo.emoji,
        lastFire: 0,
        target: null,
        angle: 0,
        damage: config.damage,
        range: range,
        fireRate: config.fireRate,
        projectileSpeed: config.projectileSpeed,
        color: config.color,
        projectileColor: config.projectileColor,
        splash: splash,
        slowEffect: config.slowEffect || 0,
        slowDuration: config.slowDuration || 0,
        chainCount: config.chainCount || 0
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
          life: 25,
          maxLife: 25,
          color: '#4CAF50',
          size: 5
        })
      }
    },

    tryUpgradeTower(tower) {
      if (tower.level >= 5) {
        uni.showToast({ title: '已达最高等级', icon: 'none' })
        return
      }
      const upgradeCost = Math.floor(tower.cost * tower.level * 0.6)
      if (this.state.gold < upgradeCost) {
        uni.showToast({ title: `升级需要 ${upgradeCost} 金币`, icon: 'none' })
        return
      }

      const difficulty = Math.min(3, tower.level + 1)
      this.showMathQuestion(difficulty, (correct) => {
        if (correct) {
          this.upgradeTower(tower, upgradeCost)
          this.createBuildEffect(tower.x, tower.y)
        }
      })
    },

    upgradeTower(tower, cost) {
      tower.level++
      tower.damage = Math.floor(tower.damage * 1.35)
      tower.range = Math.floor(tower.range * 1.1)
      tower.fireRate = Math.floor(tower.fireRate * 0.88)
      if (tower.splash) tower.splash = Math.floor(tower.splash * 1.1)
      if (tower.chainCount) tower.chainCount++
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

      if (Math.random() > 0.4 && difficulty <= 2) {
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
        this.feedback = '✓ 正确!'
        this.feedbackClass = 'correct'
      } else {
        this.feedback = `✗ 答案: ${this.currentQuestion.answer}`
        this.feedbackClass = 'wrong'
      }

      setTimeout(() => {
        this.closeMathModal()
        if (this.mathCallback) {
          this.mathCallback(isCorrect)
        }
      }, isCorrect ? 500 : 1000)
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
      const baseCount = 4 + Math.floor(wave * 1.5)

      // 基础敌人
      for (let i = 0; i < baseCount; i++) {
        enemies.push('basic')
      }

      // 快速敌人
      if (wave >= 2) {
        const fastCount = Math.floor(wave / 2)
        for (let i = 0; i < fastCount; i++) {
          enemies.push('fast')
        }
      }

      // 坦克敌人
      if (wave >= 3) {
        const tankCount = Math.floor((wave - 1) / 2)
        for (let i = 0; i < tankCount; i++) {
          enemies.push('tank')
        }
      }

      // 治疗敌人
      if (wave >= 4) {
        const healerCount = Math.floor(wave / 4)
        for (let i = 0; i < healerCount; i++) {
          enemies.push('healer')
        }
      }

      // 幽灵敌人
      if (wave >= 5) {
        const ghostCount = Math.floor(wave / 5)
        for (let i = 0; i < ghostCount; i++) {
          enemies.push('ghost')
        }
      }

      // Boss
      if (wave % 5 === 0) {
        enemies.push('boss')
      }

      return { enemies: shuffleArray(enemies), delay: Math.max(400, 700 - wave * 20) }
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
      const waveMultiplier = 1 + (this.state.wave - 1) * 0.2

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
        phaseShift: config.phaseShift || false,
        healAura: config.healAura || false,
        phaseTimer: 0,
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
      const globalFrozen = this.state.globalFreeze > now

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

      // 治疗光环效果
      this.enemies.forEach(healer => {
        if (healer.healAura) {
          this.enemies.forEach(enemy => {
            if (enemy.id !== healer.id) {
              const dist = Math.sqrt(Math.pow(enemy.x - healer.x, 2) + Math.pow(enemy.y - healer.y, 2))
              if (dist < this.config.gridSize * 1.5) {
                enemy.health = Math.min(enemy.maxHealth, enemy.health + 0.1)
              }
            }
          })
        }
      })

      // 更新敌人
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i]

        // 全局冻结或减速效果
        if (globalFrozen) {
          enemy.speed = 0
        } else if (enemy.slowUntil > now) {
          enemy.speed = enemy.baseSpeed * 0.4
        } else {
          enemy.speed = enemy.baseSpeed
        }

        // 幽灵相位移动
        if (enemy.phaseShift) {
          enemy.phaseTimer = (enemy.phaseTimer || 0) + 1
          if (enemy.phaseTimer % 120 < 60) {
            enemy.isPhased = true
          } else {
            enemy.isPhased = false
          }
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
          // 幽灵相位时无法被攻击
          if (enemy.isPhased) return

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

        if (!target || target.isPhased) {
          this.createHitEffect(proj.x, proj.y, proj.color)
          this.projectiles.splice(i, 1)
          continue
        }

        const dx = target.x - proj.x
        const dy = target.y - proj.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 15) {
          target.health -= proj.damage
          if (proj.slowEffect) {
            target.slowUntil = now + proj.slowDuration
          }
          if (proj.splash) {
            this.enemies.forEach(enemy => {
              if (enemy.id !== target.id && !enemy.isPhased) {
                const splashDist = Math.sqrt(Math.pow(enemy.x - target.x, 2) + Math.pow(enemy.y - target.y, 2))
                if (splashDist < proj.splash) {
                  enemy.health -= proj.damage * 0.5
                }
              }
            })
            this.createSplashEffect(target.x, target.y, proj.splash)
          }
          // 连锁攻击
          if (proj.chainCount > 0) {
            this.chainAttack(target, proj.damage * 0.7, proj.chainCount - 1, proj.color)
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
        // 检查胜利条件
        if (this.gameMode === 'normal' && this.state.wave >= 10) {
          this.gameOver(true)
          return
        }

        this.state.wave++
        this.state.gold += 20 + this.state.wave * 5
        this.state.waveInProgress = true

        setTimeout(() => {
          if (!this.state.isGameOver) {
            this.startWave()
          }
        }, 2000)
      }
    },

    chainAttack(source, damage, remaining, color) {
      if (remaining <= 0) return

      let nearestEnemy = null
      let minDist = this.config.gridSize * 2

      this.enemies.forEach(enemy => {
        if (enemy.id !== source.id && !enemy.isPhased) {
          const dist = Math.sqrt(Math.pow(enemy.x - source.x, 2) + Math.pow(enemy.y - source.y, 2))
          if (dist < minDist) {
            minDist = dist
            nearestEnemy = enemy
          }
        }
      })

      if (nearestEnemy) {
        nearestEnemy.health -= damage
        // 绘制连锁线
        this.particles.push({
          x: source.x,
          y: source.y,
          vx: 0,
          vy: 0,
          life: 8,
          maxLife: 8,
          color: color,
          size: 3,
          isChain: true,
          targetX: nearestEnemy.x,
          targetY: nearestEnemy.y
        })
        this.chainAttack(nearestEnemy, damage * 0.7, remaining - 1, color)
      }
    },

    fireProjectile(tower, target) {
      this.projectiles.push({
        id: Date.now() + Math.random(),
        x: tower.x,
        y: tower.y,
        targetId: target.id,
        damage: tower.damage,
        speed: tower.projectileSpeed || 10,
        color: tower.projectileColor || tower.color,
        splash: tower.splash || 0,
        slowEffect: tower.slowEffect || 0,
        slowDuration: tower.slowDuration || 0,
        chainCount: tower.chainCount || 0,
        size: tower.splash ? 6 : 4
      })
    },

    createHitEffect(x, y, color) {
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 2
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 12,
          maxLife: 12,
          color: color,
          size: 3
        })
      }
    },

    createDeathEffect(x, y, color) {
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 2 + Math.random() * 2
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 20,
          maxLife: 20,
          color: color,
          size: 5
        })
      }
    },

    createSplashEffect(x, y, radius) {
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2
        this.particles.push({
          x: x + Math.cos(angle) * radius * 0.3,
          y: y + Math.sin(angle) * radius * 0.3,
          vx: Math.cos(angle) * 1.5,
          vy: Math.sin(angle) * 1.5,
          life: 15,
          maxLife: 15,
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
      ctx.fillStyle = '#1a472a'
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

      // 绘制网格
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
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
      ctx.fillStyle = '#5D4037'
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (this.pathGrid[row] && this.pathGrid[row][col]) {
            ctx.fillRect(col * gridSize + 2, row * gridSize + 2, gridSize - 4, gridSize - 4)
          }
        }
      }

      // 绘制可放置区域
      if (this.selectedTower) {
        ctx.fillStyle = 'rgba(76, 175, 80, 0.35)'
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            if (!this.pathGrid[row] || !this.pathGrid[row][col]) {
              const hasTower = this.towers.some(t => t.gridX === col && t.gridY === row)
              if (!hasTower) {
                ctx.fillRect(col * gridSize + 3, row * gridSize + 3, gridSize - 6, gridSize - 6)
              }
            }
          }
        }
      }

      // 绘制炸弹瞄准区域
      if (this.activeSkill === 'bomb') {
        ctx.fillStyle = 'rgba(255, 87, 34, 0.3)'
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
      }

      // 绘制防御塔
      this.towers.forEach(tower => {
        const size = gridSize - 6

        // 攻击范围
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2)
        ctx.stroke()

        // 塔底座
        ctx.fillStyle = tower.color
        ctx.beginPath()
        ctx.arc(tower.x, tower.y, size / 2, 0, Math.PI * 2)
        ctx.fill()

        // 朝向指示
        if (tower.target) {
          ctx.strokeStyle = tower.projectileColor || '#fff'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(tower.x, tower.y)
          ctx.lineTo(
            tower.x + Math.cos(tower.angle) * (size / 2 + 4),
            tower.y + Math.sin(tower.angle) * (size / 2 + 4)
          )
          ctx.stroke()
        }

        // 塔 emoji
        ctx.font = `${size * 0.5}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(tower.emoji, tower.x, tower.y)

        // 等级
        if (tower.level > 1) {
          ctx.fillStyle = '#FFD700'
          ctx.font = 'bold 9px Arial'
          ctx.fillText(`Lv${tower.level}`, tower.x, tower.y - size / 2 - 5)
        }
      })

      // 绘制敌人
      this.enemies.forEach(enemy => {
        const size = gridSize * 0.55

        // 幽灵相位效果
        if (enemy.isPhased) {
          ctx.globalAlpha = 0.4
        }

        // 减速效果
        if (enemy.slowUntil > Date.now()) {
          ctx.fillStyle = 'rgba(0, 188, 212, 0.3)'
          ctx.beginPath()
          ctx.arc(enemy.x, enemy.y, size / 2 + 3, 0, Math.PI * 2)
          ctx.fill()
        }

        // 治疗光环
        if (enemy.healAura) {
          ctx.strokeStyle = 'rgba(139, 195, 74, 0.5)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(enemy.x, enemy.y, this.config.gridSize * 1.5, 0, Math.PI * 2)
          ctx.stroke()
        }

        // 敌人身体
        ctx.fillStyle = enemy.color
        ctx.beginPath()
        ctx.arc(enemy.x, enemy.y, size / 2, 0, Math.PI * 2)
        ctx.fill()

        // 敌人 emoji
        ctx.font = `${size * 0.65}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(enemy.emoji, enemy.x, enemy.y)

        ctx.globalAlpha = 1

        // 血条
        const hpWidth = size * 1.1
        const hpHeight = 3
        const hpX = enemy.x - hpWidth / 2
        const hpY = enemy.y - size / 2 - 6

        ctx.fillStyle = '#333'
        ctx.fillRect(hpX, hpY, hpWidth, hpHeight)

        const hpPercent = Math.max(0, enemy.health / enemy.maxHealth)
        ctx.fillStyle = hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.25 ? '#FFC107' : '#F44336'
        ctx.fillRect(hpX, hpY, hpWidth * hpPercent, hpHeight)
      })

      // 绘制子弹
      this.projectiles.forEach(proj => {
        ctx.fillStyle = proj.color
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // 绘制粒子
      this.particles.forEach(p => {
        const alpha = p.life / p.maxLife
        ctx.globalAlpha = alpha

        if (p.isChain) {
          ctx.strokeStyle = p.color
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.targetX, p.targetY)
          ctx.stroke()
        } else {
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      ctx.globalAlpha = 1

      // 全局冻结效果
      if (this.state.globalFreeze > Date.now()) {
        ctx.fillStyle = 'rgba(0, 188, 212, 0.1)'
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
      }
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
      this.state.gameSpeed = this.state.gameSpeed >= 2 ? 1 : this.state.gameSpeed + 0.5
    },

    restartGame() {
      this.showPauseModal = false
      this.showGameOverModal = false
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
      }
      this.startGame(this.gameMode)
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
      this.saveHighScore()

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
    }
  },

  onUnload() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    uni.offWindowResize(this.handleResize)
  }
}
</script>

<style scoped>
.game-container {
  width: 100%;
  height: 100vh;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  overflow: hidden;
}

.screen {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

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
  font-size: 52rpx;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
}

.subtitle {
  display: block;
  font-size: 26rpx;
  color: #888;
  margin-top: 12rpx;
  margin-bottom: 50rpx;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.btn {
  padding: 22rpx 50rpx;
  font-size: 30rpx;
  border: none;
  border-radius: 20rpx;
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
  gap: 12rpx;
  margin-bottom: 30rpx;
}

.tag {
  background: rgba(33, 150, 243, 0.2);
  color: #2196F3;
  padding: 10rpx 20rpx;
  border-radius: 24rpx;
  font-size: 22rpx;
}

.high-score {
  margin-top: 20rpx;
  color: #FFD700;
  font-size: 26rpx;
}

/* 游戏界面 */
.game-screen {
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 20rpx;
  padding-top: calc(12rpx + env(safe-area-inset-top));
  background: rgba(0, 0, 0, 0.7);
  flex-shrink: 0;
}

.info-left, .info-right {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.info-center {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.lives, .gold, .wave {
  font-size: 26rpx;
  font-weight: bold;
  color: #fff;
}

.mode-tag {
  font-size: 18rpx;
  background: #E91E63;
  color: white;
  padding: 2rpx 10rpx;
  border-radius: 10rpx;
}

.btn-icon {
  font-size: 32rpx;
  padding: 6rpx 10rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8rpx;
}

.canvas-container {
  flex: 1;
  overflow: hidden;
  background: #1a472a;
  min-height: 0;
}

.game-canvas {
  display: block;
  background: #1a472a;
}

.skill-bar {
  display: flex;
  justify-content: center;
  gap: 30rpx;
  padding: 10rpx;
  background: rgba(0, 0, 0, 0.6);
  flex-shrink: 0;
}

.skill-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8rpx 20rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12rpx;
  border: 2rpx solid transparent;
}

.skill-btn.active {
  border-color: #FF5722;
  background: rgba(255, 87, 34, 0.3);
}

.skill-btn.disabled {
  opacity: 0.4;
}

.skill-icon {
  font-size: 32rpx;
}

.skill-cost {
  font-size: 18rpx;
  color: #FFD700;
}

.tower-bar {
  display: flex;
  justify-content: space-around;
  padding: 10rpx 6rpx;
  padding-bottom: calc(10rpx + env(safe-area-inset-bottom));
  background: rgba(0, 0, 0, 0.8);
  flex-shrink: 0;
}

.tower-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8rpx 10rpx;
  background: #1a1a2e;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  min-width: 100rpx;
}

.tower-slot.selected {
  border-color: #4CAF50;
  background: rgba(76, 175, 80, 0.25);
}

.tower-slot.disabled {
  opacity: 0.4;
}

.tower-icon {
  font-size: 32rpx;
}

.tower-name {
  font-size: 18rpx;
  color: #fff;
  margin-top: 2rpx;
}

.tower-cost {
  font-size: 16rpx;
  color: #FFD700;
}

/* 模态框 */
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
  border-radius: 20rpx;
  padding: 36rpx;
  width: 85%;
  max-width: 580rpx;
  text-align: center;
}

.modal-title {
  display: block;
  font-size: 38rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 28rpx;
}

.modal-buttons {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-top: 28rpx;
}

/* 数学题 */
.math-modal {
  max-width: 620rpx;
}

.math-question {
  margin-bottom: 28rpx;
}

.question-type {
  display: inline-block;
  font-size: 22rpx;
  color: #2196F3;
  background: rgba(33, 150, 243, 0.15);
  padding: 6rpx 20rpx;
  border-radius: 24rpx;
  margin-bottom: 20rpx;
}

.question-text {
  display: block;
  font-size: 34rpx;
  font-weight: bold;
  color: #fff;
  line-height: 1.5;
}

.answer-area {
  margin-bottom: 14rpx;
}

.answer-input {
  width: 100%;
  padding: 20rpx;
  font-size: 34rpx;
  text-align: center;
  background: rgba(0, 0, 0, 0.3);
  border: 2rpx solid rgba(255, 255, 255, 0.2);
  border-radius: 14rpx;
  color: #fff;
}

.answer-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14rpx;
}

.option-btn {
  padding: 20rpx;
  font-size: 30rpx;
  background: rgba(255, 255, 255, 0.1);
  border: 2rpx solid rgba(255, 255, 255, 0.2);
  border-radius: 14rpx;
  color: #fff;
}

.option-btn.correct {
  background: rgba(76, 175, 80, 0.4);
  border-color: #4CAF50;
}

.option-btn.wrong {
  background: rgba(244, 67, 54, 0.4);
  border-color: #F44336;
}

.feedback {
  display: block;
  margin-top: 20rpx;
  font-size: 26rpx;
}

.feedback.correct {
  color: #4CAF50;
}

.feedback.wrong {
  color: #F44336;
}

/* 游戏统计 */
.game-stats {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 14rpx;
  padding: 20rpx;
  margin: 20rpx 0;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 26rpx;
}

.stat-row:last-child {
  border-bottom: none;
}

/* 帮助 */
.help-content {
  text-align: left;
  max-height: 70vh;
  overflow-y: auto;
}

.help-section {
  margin-bottom: 20rpx;
}

.help-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #4CAF50;
  margin-bottom: 10rpx;
}

.help-text {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 6rpx;
  line-height: 1.5;
}
</style>
