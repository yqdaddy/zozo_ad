<template>
  <view class="page">
    <!-- 菜单界面 -->
    <view v-if="screen === 'menu'" class="menu">
      <view class="menu-box">
        <text class="menu-title">🏰 数学塔防</text>
        <text class="menu-sub">五年级上册</text>
        <button class="btn-start" @click="startGame('normal')">普通模式</button>
        <button class="btn-endless" @click="startGame('endless')">无尽模式</button>
        <button class="btn-back" @click="goBack">返回</button>
      </view>
    </view>

    <!-- 游戏界面 -->
    <view v-if="screen === 'game'" class="game">
      <!-- 顶部状态栏 -->
      <view class="top-bar">
        <text class="stat">❤️{{ lives }}</text>
        <text class="stat">💰{{ gold }}</text>
        <text class="stat">🌊{{ wave }}{{ gameMode === 'endless' ? '' : '/10' }}</text>
        <text class="btn-pause" @click="togglePause">{{ paused ? '▶️' : '⏸️' }}</text>
      </view>

      <!-- 游戏画布 -->
      <view class="canvas-wrap" id="canvasWrap">
        <canvas
          id="gameCanvas"
          type="2d"
          class="canvas"
          :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
          @touchstart="onTouch"
        ></canvas>
      </view>

      <!-- 冰冻大招提示 -->
      <view v-if="freezeUltActive" class="ult-hint">
        <text>❄️ 全体冰冻中！</text>
      </view>

      <!-- 底部塔选择 -->
      <view class="tower-bar">
        <view
          v-for="t in towerDefs"
          :key="t.type"
          class="tower-btn"
          :class="{ active: selectedTower === t.type, disabled: gold < t.cost }"
          @click="selectTower(t.type)"
        >
          <text class="tower-icon">{{ t.icon }}</text>
          <text class="tower-cost">{{ t.cost }}</text>
        </view>
      </view>
    </view>

    <!-- 数学题弹窗 -->
    <view v-if="showQuestion" class="modal">
      <view class="modal-box">
        <text class="q-type">{{ question.type }}</text>
        <text class="q-text">{{ question.text }}</text>
        <view class="q-options">
          <view
            v-for="(opt, i) in question.options"
            :key="i"
            class="q-opt"
            :class="{
              correct: answerFeedback && opt === question.answer,
              wrong: answerFeedback && selectedAnswer === opt && opt !== question.answer
            }"
            @click="answer(opt)"
          >{{ opt }}</view>
        </view>
        <text v-if="answerFeedback" class="feedback" :class="answerFeedback">
          {{ answerFeedback === 'correct' ? '✓ 回答正确！' : '✗ 回答错误' }}
        </text>
      </view>
    </view>

    <!-- 游戏结束 -->
    <view v-if="gameOver" class="modal">
      <view class="modal-box">
        <text class="modal-title">{{ win ? '🎉 胜利!' : '💀 失败' }}</text>
        <text class="modal-info">通过 {{ wave }} 波</text>
        <text class="modal-info">正确率: {{ accuracy }}%</text>
        <button class="btn-start" @click="restart">再来一次</button>
        <button class="btn-back" @click="backToMenu">返回菜单</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      screen: 'menu',
      gameMode: 'normal',

      // 画布
      canvas: null,
      ctx: null,
      canvasW: 300,
      canvasH: 400,
      dpr: 1,
      canvasReady: false,

      // 网格配置
      cols: 10,
      rows: 12,
      cellSize: 30,

      // 游戏状态
      lives: 20,
      gold: 100,
      wave: 1,
      paused: false,
      gameOver: false,
      win: false,
      animId: null,
      waveSpawning: false,

      // 游戏对象
      path: [],
      pathSet: new Set(),
      towers: [],
      enemies: [],
      bullets: [],
      fortresses: [],

      // 选择
      selectedTower: null,

      // 数学题
      showQuestion: false,
      question: { text: '', answer: 0, options: [], type: '' },
      pendingTower: null,
      answerFeedback: null,
      selectedAnswer: null,

      // 统计
      totalQuestions: 0,
      correctAnswers: 0,

      // 冰冻大招
      freezeUltActive: false,
      freezeUltEndTime: 0,

      // 塔定义
      towerDefs: [
        { type: 'archer', icon: '🏹', cost: 40, damage: 15, range: 3, rate: 800 },
        { type: 'magic', icon: '✨', cost: 60, damage: 25, range: 2.5, rate: 1200 },
        { type: 'cannon', icon: '💣', cost: 80, damage: 50, range: 2, rate: 1500 },
        { type: 'ice', icon: '❄️', cost: 50, damage: 10, range: 2.5, rate: 1000, slow: 0.5 },
        { type: 'fortress', icon: '🏯', cost: 30, onPath: true, hp: 1, blockTime: 3000 }
      ],

      // 敌人定义
      enemyDefs: {
        normal: { hp: 40, speed: 0.4, reward: 10, color: '#4CAF50' },
        fast: { hp: 25, speed: 0.7, reward: 15, color: '#2196F3' },
        tank: { hp: 100, speed: 0.2, reward: 25, color: '#795548' },
        boss: { hp: 300, speed: 0.15, reward: 80, color: '#f44336' }
      }
    }
  },

  computed: {
    accuracy() {
      if (this.totalQuestions === 0) return 0
      return Math.round((this.correctAnswers / this.totalQuestions) * 100)
    }
  },

  methods: {
    goBack() {
      uni.navigateBack()
    },

    startGame(mode) {
      this.gameMode = mode
      this.screen = 'game'
      this.lives = 20
      this.gold = 100
      this.wave = 1
      this.paused = false
      this.gameOver = false
      this.win = false
      this.towers = []
      this.enemies = []
      this.bullets = []
      this.fortresses = []
      this.selectedTower = null
      this.waveSpawning = false
      this.freezeUltActive = false
      this.freezeUltEndTime = 0
      this.totalQuestions = 0
      this.correctAnswers = 0
      this.answerFeedback = null
      this.selectedAnswer = null

      // 重置画布状态以确保重新初始化
      this.canvasReady = false

      this.$nextTick(() => {
        setTimeout(() => this.initCanvas(), 100)
      })
    },

    initCanvas() {
      const query = uni.createSelectorQuery().in(this)
      query.select('#canvasWrap').boundingClientRect()
      query.select('#gameCanvas').fields({ node: true, size: true })
      query.exec((res) => {
        const wrap = res[0]
        const canvasRes = res[1]

        if (!wrap || !canvasRes || !canvasRes.node) {
          setTimeout(() => this.initCanvas(), 100)
          return
        }

        this.canvas = canvasRes.node
        this.ctx = this.canvas.getContext('2d')

        const sysInfo = uni.getSystemInfoSync()
        this.dpr = sysInfo.pixelRatio || 2
        if (this.dpr > 2) this.dpr = 2

        // 计算尺寸
        const wrapW = Math.floor(wrap.width)
        const wrapH = Math.floor(wrap.height)

        this.cellSize = Math.floor(wrapW / this.cols)
        this.rows = Math.floor(wrapH / this.cellSize)

        this.canvasW = this.cols * this.cellSize
        this.canvasH = this.rows * this.cellSize

        // 设置画布 - 重置变换以避免累积缩放
        this.canvas.width = this.canvasW * this.dpr
        this.canvas.height = this.canvasH * this.dpr
        this.ctx.setTransform(1, 0, 0, 1, 0, 0) // 重置变换
        this.ctx.scale(this.dpr, this.dpr)

        this.canvasReady = true

        console.log('Canvas:', this.canvasW, 'x', this.canvasH, 'Cell:', this.cellSize, 'Rows:', this.rows)

        this.generatePath()
        this.spawnWave()
        this.gameLoop()
      })
    },

    generatePath() {
      this.path = []
      this.pathSet = new Set()

      const cs = this.cellSize
      let x = 0, y = 0, dir = 1

      // 起点
      this.path.push({ x: cs / 2, y: -cs / 2 })

      while (y < this.rows) {
        const key = `${x},${y}`
        this.pathSet.add(key)
        this.path.push({ x: x * cs + cs / 2, y: y * cs + cs / 2 })

        if ((dir === 1 && x < this.cols - 1) || (dir === -1 && x > 0)) {
          x += dir
        } else {
          y++
          if (y < this.rows) {
            const key2 = `${x},${y}`
            this.pathSet.add(key2)
            this.path.push({ x: x * cs + cs / 2, y: y * cs + cs / 2 })
          }
          y++
          dir *= -1
        }
      }

      // 终点
      if (this.path.length > 0) {
        const last = this.path[this.path.length - 1]
        this.path.push({ x: last.x, y: this.canvasH + cs / 2 })
      }
    },

    selectTower(type) {
      const def = this.towerDefs.find(t => t.type === type)
      if (def && this.gold >= def.cost) {
        this.selectedTower = this.selectedTower === type ? null : type
      }
    },

    onTouch(e) {
      if (this.paused || this.gameOver || this.showQuestion) return

      const touch = e.touches[0]
      let x, y

      if (typeof touch.x === 'number') {
        x = touch.x
        y = touch.y
      } else {
        x = touch.offsetX || touch.clientX
        y = touch.offsetY || touch.clientY
      }

      const col = Math.floor(x / this.cellSize)
      const row = Math.floor(y / this.cellSize)

      if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return

      const key = `${col},${row}`
      const isPath = this.pathSet.has(key)

      if (this.selectedTower) {
        const def = this.towerDefs.find(t => t.type === this.selectedTower)
        if (!def || this.gold < def.cost) return

        if (def.onPath) {
          if (!isPath) return
          if (this.fortresses.some(f => f.col === col && f.row === row)) return
        } else {
          if (isPath) return
          if (this.towers.some(t => t.col === col && t.row === row)) return
        }

        this.pendingTower = { col, row, def }
        this.askQuestion()
      }
    },

    // 生成五年级上册难度的数学题
    askQuestion() {
      this.answerFeedback = null
      this.selectedAnswer = null

      const questionTypes = [
        this.genDecimalMultiply,    // 小数乘法
        this.genDecimalDivide,      // 小数除法
        this.genSimpleEquation,     // 简易方程
        this.genAreaQuestion,       // 面积计算
        this.genFractionBasic       // 分数基础
      ]

      const generator = questionTypes[Math.floor(Math.random() * questionTypes.length)]
      const q = generator.call(this)

      this.question = q
      this.showQuestion = true
      this.paused = true
    },

    // 小数乘法
    genDecimalMultiply() {
      const a = (Math.floor(Math.random() * 90) + 10) / 10 // 1.0 - 9.9
      const b = Math.floor(Math.random() * 9) + 2 // 2-10
      const answer = Math.round(a * b * 10) / 10
      const text = `${a} × ${b} = ?`
      return {
        type: '小数乘法',
        text,
        answer,
        options: this.genOptions(answer, true)
      }
    },

    // 小数除法
    genDecimalDivide() {
      const b = Math.floor(Math.random() * 4) + 2 // 2-5
      const answer = (Math.floor(Math.random() * 40) + 10) / 10 // 1.0-4.9
      const a = Math.round(answer * b * 10) / 10
      const text = `${a} ÷ ${b} = ?`
      return {
        type: '小数除法',
        text,
        answer,
        options: this.genOptions(answer, true)
      }
    },

    // 简易方程
    genSimpleEquation() {
      const answer = Math.floor(Math.random() * 20) + 5 // 5-24
      const b = Math.floor(Math.random() * 10) + 5 // 5-14
      const c = answer + b
      const text = `x + ${b} = ${c}，x = ?`
      return {
        type: '简易方程',
        text,
        answer,
        options: this.genOptions(answer, false)
      }
    },

    // 面积计算
    genAreaQuestion() {
      const types = ['rectangle', 'triangle', 'parallelogram']
      const type = types[Math.floor(Math.random() * types.length)]

      let text, answer
      if (type === 'rectangle') {
        const l = Math.floor(Math.random() * 8) + 3 // 3-10
        const w = Math.floor(Math.random() * 6) + 2 // 2-7
        answer = l * w
        text = `长方形：长${l}cm，宽${w}cm，面积=?cm²`
      } else if (type === 'triangle') {
        const base = Math.floor(Math.random() * 6) + 4 // 4-9 (偶数便于计算)
        const h = Math.floor(Math.random() * 4) + 2 // 2-5
        answer = (base * h) / 2
        text = `三角形：底${base}cm，高${h}cm，面积=?cm²`
      } else {
        const base = Math.floor(Math.random() * 6) + 3 // 3-8
        const h = Math.floor(Math.random() * 5) + 2 // 2-6
        answer = base * h
        text = `平行四边形：底${base}cm，高${h}cm，面积=?cm²`
      }

      return {
        type: '面积计算',
        text,
        answer,
        options: this.genOptions(answer, false)
      }
    },

    // 分数基础
    genFractionBasic() {
      const denominator = [2, 4, 5, 10][Math.floor(Math.random() * 4)]
      const numerator = Math.floor(Math.random() * (denominator - 1)) + 1
      const answer = Math.round((numerator / denominator) * 100) / 100
      const text = `${numerator}/${denominator} = ? (小数)`
      return {
        type: '分数转小数',
        text,
        answer,
        options: this.genOptions(answer, true)
      }
    },

    // 生成选项
    genOptions(answer, isDecimal) {
      const options = [answer]
      const range = isDecimal ? 2 : 10

      while (options.length < 4) {
        let wrong
        if (isDecimal) {
          wrong = Math.round((answer + (Math.random() * range * 2 - range)) * 10) / 10
        } else {
          wrong = answer + Math.floor(Math.random() * range * 2) - range
        }
        if (wrong !== answer && wrong > 0 && !options.includes(wrong)) {
          options.push(wrong)
        }
      }
      return options.sort(() => Math.random() - 0.5)
    },

    answer(opt) {
      this.totalQuestions++
      this.selectedAnswer = opt

      const isCorrect = opt === this.question.answer
      this.answerFeedback = isCorrect ? 'correct' : 'wrong'

      if (isCorrect) {
        this.correctAnswers++
      }

      // 延迟关闭弹窗，显示反馈
      setTimeout(() => {
        this.showQuestion = false
        this.paused = false
        this.answerFeedback = null
        this.selectedAnswer = null

        if (isCorrect && this.pendingTower) {
          const { col, row, def } = this.pendingTower

          if (def.onPath) {
            this.fortresses.push({
              col, row,
              x: col * this.cellSize + this.cellSize / 2,
              y: row * this.cellSize + this.cellSize / 2,
              icon: def.icon,
              hp: def.hp,
              blockTime: def.blockTime
            })
          } else {
            this.towers.push({
              col, row,
              x: col * this.cellSize + this.cellSize / 2,
              y: row * this.cellSize + this.cellSize / 2,
              type: def.type,
              icon: def.icon,
              damage: def.damage,
              range: def.range * this.cellSize,
              rate: def.rate,
              slow: def.slow || 0,
              lastFire: 0,
              shotCount: 0
            })
          }
          this.gold -= def.cost
          this.selectedTower = null
        }
        this.pendingTower = null
      }, 800)
    },

    spawnWave() {
      if (this.waveSpawning) return
      this.waveSpawning = true

      const count = 3 + this.wave * 2
      let delay = 0

      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          if (this.gameOver) return

          let type = 'normal'
          if (this.wave >= 3 && Math.random() < 0.2) type = 'fast'
          if (this.wave >= 5 && Math.random() < 0.15) type = 'tank'
          if (this.wave >= 7 && i === count - 1) type = 'boss'

          const def = this.enemyDefs[type]
          const mult = 1 + (this.wave - 1) * 0.15

          this.enemies.push({
            x: this.path[0].x,
            y: this.path[0].y,
            hp: Math.floor(def.hp * mult),
            maxHp: Math.floor(def.hp * mult),
            speed: def.speed,
            baseSpeed: def.speed,
            reward: def.reward,
            color: def.color,
            pathIdx: 0,
            slowUntil: 0,
            blockedUntil: 0,
            attackingFortress: null
          })
        }, delay)
        delay += 1500 // 增加敌人生成间隔：800 -> 1500
      }

      setTimeout(() => {
        this.waveSpawning = false
      }, delay)
    },

    gameLoop() {
      if (this.gameOver) return

      if (!this.paused) {
        this.update()
      }
      this.render()

      this.animId = requestAnimationFrame(() => this.gameLoop())
    },

    update() {
      const now = Date.now()

      if (this.freezeUltActive && now >= this.freezeUltEndTime) {
        this.freezeUltActive = false
      }

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i]

        if (this.freezeUltActive) {
          continue
        }

        if (e.blockedUntil > now) {
          continue
        }

        if (e.attackingFortress) {
          const fort = e.attackingFortress
          const fortIdx = this.fortresses.indexOf(fort)
          if (fortIdx !== -1) {
            this.fortresses.splice(fortIdx, 1)
          }
          e.attackingFortress = null
        }

        e.speed = e.slowUntil > now ? e.baseSpeed * 0.4 : e.baseSpeed

        if (e.pathIdx < this.path.length - 1) {
          const target = this.path[e.pathIdx + 1]
          const dx = target.x - e.x
          const dy = target.y - e.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < e.speed * 2) {
            e.pathIdx++

            const col = Math.floor(target.x / this.cellSize)
            const row = Math.floor(target.y / this.cellSize)
            const fort = this.fortresses.find(f => f.col === col && f.row === row)
            if (fort) {
              e.blockedUntil = now + fort.blockTime
              e.attackingFortress = fort
            }
          } else {
            e.x += (dx / dist) * e.speed
            e.y += (dy / dist) * e.speed
          }
        } else {
          this.lives--
          this.enemies.splice(i, 1)
          if (this.lives <= 0) {
            this.endGame(false)
          }
          continue
        }

        if (e.hp <= 0) {
          this.gold += e.reward
          this.enemies.splice(i, 1)
        }
      }

      this.towers.forEach(t => {
        if (now - t.lastFire < t.rate) return

        let target = null
        let minDist = t.range

        this.enemies.forEach(e => {
          const dist = Math.sqrt(Math.pow(e.x - t.x, 2) + Math.pow(e.y - t.y, 2))
          if (dist < minDist) {
            minDist = dist
            target = e
          }
        })

        if (target) {
          target.hp -= t.damage
          if (t.slow) {
            target.slowUntil = now + 2000
          }
          t.lastFire = now

          if (t.type === 'ice') {
            t.shotCount++
            if (t.shotCount >= 10) {
              t.shotCount = 0
              this.triggerFreezeUlt()
            }
          }

          this.bullets.push({
            x: t.x, y: t.y,
            tx: target.x, ty: target.y,
            life: 10
          })
        }
      })

      for (let i = this.bullets.length - 1; i >= 0; i--) {
        this.bullets[i].life--
        if (this.bullets[i].life <= 0) {
          this.bullets.splice(i, 1)
        }
      }

      if (this.enemies.length === 0 && !this.waveSpawning && !this.gameOver) {
        if (this.gameMode === 'normal' && this.wave >= 10) {
          this.endGame(true)
        } else {
          this.wave++
          this.gold += 20
          setTimeout(() => this.spawnWave(), 2000)
        }
      }
    },

    triggerFreezeUlt() {
      this.freezeUltActive = true
      this.freezeUltEndTime = Date.now() + 5000
    },

    render() {
      if (!this.ctx) return
      const ctx = this.ctx
      const cs = this.cellSize

      ctx.fillStyle = '#1a472a'
      ctx.fillRect(0, 0, this.canvasW, this.canvasH)

      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      for (let i = 0; i <= this.cols; i++) {
        ctx.beginPath()
        ctx.moveTo(i * cs, 0)
        ctx.lineTo(i * cs, this.canvasH)
        ctx.stroke()
      }
      for (let i = 0; i <= this.rows; i++) {
        ctx.beginPath()
        ctx.moveTo(0, i * cs)
        ctx.lineTo(this.canvasW, i * cs)
        ctx.stroke()
      }

      ctx.fillStyle = '#5D4037'
      this.pathSet.forEach(key => {
        const [col, row] = key.split(',').map(Number)
        ctx.fillRect(col * cs + 2, row * cs + 2, cs - 4, cs - 4)
      })

      if (this.selectedTower) {
        const def = this.towerDefs.find(t => t.type === this.selectedTower)
        if (def) {
          if (def.onPath) {
            ctx.fillStyle = 'rgba(255, 193, 7, 0.4)'
            this.pathSet.forEach(key => {
              const [col, row] = key.split(',').map(Number)
              if (!this.fortresses.some(f => f.col === col && f.row === row)) {
                ctx.fillRect(col * cs + 2, row * cs + 2, cs - 4, cs - 4)
              }
            })
          } else {
            ctx.fillStyle = 'rgba(76, 175, 80, 0.3)'
            for (let r = 0; r < this.rows; r++) {
              for (let c = 0; c < this.cols; c++) {
                const key = `${c},${r}`
                if (!this.pathSet.has(key) && !this.towers.some(t => t.col === c && t.row === r)) {
                  ctx.fillRect(c * cs + 2, r * cs + 2, cs - 4, cs - 4)
                }
              }
            }
          }
        }
      }

      this.fortresses.forEach(f => {
        ctx.fillStyle = '#8D6E63'
        ctx.beginPath()
        ctx.arc(f.x, f.y, cs * 0.4, 0, Math.PI * 2)
        ctx.fill()

        ctx.font = `${cs * 0.5}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(f.icon, f.x, f.y)
      })

      this.towers.forEach(t => {
        ctx.fillStyle = '#333'
        ctx.beginPath()
        ctx.arc(t.x, t.y, cs * 0.35, 0, Math.PI * 2)
        ctx.fill()

        ctx.font = `${cs * 0.5}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(t.icon, t.x, t.y)

        if (t.type === 'ice' && t.shotCount > 0) {
          const progress = t.shotCount / 10
          ctx.strokeStyle = '#00BCD4'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(t.x, t.y, cs * 0.42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress)
          ctx.stroke()
        }
      })

      this.enemies.forEach(e => {
        const r = cs * 0.3
        const now = Date.now()

        if (e.blockedUntil > now) {
          ctx.strokeStyle = '#FF5722'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(e.x, e.y, r + 4, 0, Math.PI * 2)
          ctx.stroke()
        }

        if (this.freezeUltActive) {
          ctx.fillStyle = '#B3E5FC'
        } else {
          ctx.fillStyle = e.color
        }
        ctx.beginPath()
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2)
        ctx.fill()

        const hpW = cs * 0.6
        const hpH = 4
        ctx.fillStyle = '#333'
        ctx.fillRect(e.x - hpW / 2, e.y - r - 8, hpW, hpH)
        ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#4CAF50' : '#f44336'
        ctx.fillRect(e.x - hpW / 2, e.y - r - 8, hpW * (e.hp / e.maxHp), hpH)
      })

      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 2
      this.bullets.forEach(b => {
        ctx.beginPath()
        ctx.moveTo(b.x, b.y)
        ctx.lineTo(b.tx, b.ty)
        ctx.stroke()
      })

      if (this.freezeUltActive) {
        ctx.fillStyle = 'rgba(100, 181, 246, 0.2)'
        ctx.fillRect(0, 0, this.canvasW, this.canvasH)
      }
    },

    togglePause() {
      this.paused = !this.paused
    },

    endGame(win) {
      this.gameOver = true
      this.win = win
      if (this.animId) {
        cancelAnimationFrame(this.animId)
      }
    },

    restart() {
      this.startGame(this.gameMode)
    },

    backToMenu() {
      this.screen = 'menu'
      this.gameOver = false
    }
  },

  onUnload() {
    if (this.animId) {
      cancelAnimationFrame(this.animId)
    }
  }
}
</script>

<style scoped>
.page {
  width: 100vw;
  height: 100vh;
  background: #1a1a2e;
  overflow: hidden;
}

.menu {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.menu-box {
  text-align: center;
  padding: 40rpx;
}

.menu-title {
  display: block;
  font-size: 56rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 10rpx;
}

.menu-sub {
  display: block;
  font-size: 28rpx;
  color: #888;
  margin-bottom: 60rpx;
}

.btn-start {
  width: 300rpx;
  padding: 24rpx;
  font-size: 32rpx;
  background: linear-gradient(135deg, #4CAF50, #388E3C);
  color: #fff;
  border: none;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.btn-endless {
  width: 300rpx;
  padding: 24rpx;
  font-size: 32rpx;
  background: linear-gradient(135deg, #FF9800, #F57C00);
  color: #fff;
  border: none;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.btn-back {
  width: 300rpx;
  padding: 24rpx;
  font-size: 32rpx;
  background: rgba(255,255,255,0.1);
  color: #fff;
  border: none;
  border-radius: 16rpx;
}

.game {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 24rpx;
  padding-top: calc(16rpx + env(safe-area-inset-top));
  background: rgba(0,0,0,0.8);
}

.stat {
  font-size: 28rpx;
  color: #fff;
  font-weight: bold;
}

.btn-pause {
  font-size: 36rpx;
  padding: 8rpx 16rpx;
}

.canvas-wrap {
  flex: 1;
  background: #1a472a;
  overflow: hidden;
}

.canvas {
  display: block;
}

.ult-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(33, 150, 243, 0.9);
  padding: 20rpx 40rpx;
  border-radius: 20rpx;
  z-index: 50;
}

.ult-hint text {
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
}

.tower-bar {
  display: flex;
  justify-content: space-around;
  padding: 16rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(0,0,0,0.9);
}

.tower-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 16rpx;
  background: rgba(255,255,255,0.1);
  border-radius: 12rpx;
  border: 3rpx solid transparent;
}

.tower-btn.active {
  border-color: #4CAF50;
  background: rgba(76, 175, 80, 0.3);
}

.tower-btn.disabled {
  opacity: 0.4;
}

.tower-icon {
  font-size: 36rpx;
}

.tower-cost {
  font-size: 20rpx;
  color: #FFD700;
  margin-top: 4rpx;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-box {
  background: #16213e;
  padding: 40rpx;
  border-radius: 20rpx;
  width: 85%;
  max-width: 560rpx;
  text-align: center;
}

.modal-title {
  display: block;
  font-size: 44rpx;
  color: #fff;
  margin-bottom: 20rpx;
}

.modal-info {
  display: block;
  font-size: 28rpx;
  color: #aaa;
  margin-bottom: 16rpx;
}

.q-type {
  display: block;
  font-size: 24rpx;
  color: #4CAF50;
  margin-bottom: 16rpx;
  background: rgba(76, 175, 80, 0.2);
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
}

.q-text {
  display: block;
  font-size: 36rpx;
  color: #fff;
  margin-bottom: 30rpx;
  font-weight: bold;
  line-height: 1.4;
}

.q-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.q-opt {
  padding: 24rpx;
  font-size: 32rpx;
  background: rgba(255,255,255,0.1);
  color: #fff;
  border-radius: 12rpx;
  transition: all 0.2s;
}

.q-opt.correct {
  background: rgba(76, 175, 80, 0.8);
  color: #fff;
}

.q-opt.wrong {
  background: rgba(244, 67, 54, 0.8);
  color: #fff;
}

.feedback {
  display: block;
  margin-top: 20rpx;
  font-size: 28rpx;
  font-weight: bold;
}

.feedback.correct {
  color: #4CAF50;
}

.feedback.wrong {
  color: #f44336;
}
</style>
