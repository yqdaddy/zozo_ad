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

    <!-- 炮塔操作弹窗 -->
    <view v-if="showTowerMenu" class="modal">
      <view class="modal-box tower-menu">
        <text class="modal-title">{{ selectedExistingTower.icon }} Lv.{{ selectedExistingTower.level }}</text>
        <view class="tower-stats">
          <text>伤害: {{ selectedExistingTower.damage }}</text>
          <text>射程: {{ Math.round(selectedExistingTower.range / cellSize) }}</text>
        </view>
        <view class="tower-actions">
          <button
            class="btn-upgrade"
            :disabled="gold < getUpgradeCost(selectedExistingTower)"
            @click="upgradeTower"
          >
            升级 💰{{ getUpgradeCost(selectedExistingTower) }}
          </button>
          <button class="btn-sell" @click="sellTower">
            铲除 +💰{{ getSellPrice(selectedExistingTower) }}
          </button>
        </view>
        <button class="btn-cancel" @click="closeTowerMenu">取消</button>
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

      // 保存初始画布尺寸
      savedCanvasW: 0,
      savedCanvasH: 0,
      savedCellSize: 0,
      savedRows: 0,

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

      // 炮塔菜单
      showTowerMenu: false,
      selectedExistingTower: null,

      // 数学题
      showQuestion: false,
      question: { text: '', answer: 0, options: [], type: '' },
      pendingTower: null,
      pendingAction: null, // 'build', 'upgrade'
      answerFeedback: null,
      selectedAnswer: null,

      // 统计
      totalQuestions: 0,
      correctAnswers: 0,

      // 塔定义
      towerDefs: [
        { type: 'archer', icon: '🏹', cost: 40, damage: 15, range: 3, rate: 800 },
        { type: 'magic', icon: '✨', cost: 60, damage: 25, range: 2.5, rate: 1200 },
        { type: 'cannon', icon: '💣', cost: 100, damage: 80, range: 2.5, rate: 2500 }, // 更强更慢
        { type: 'ice', icon: '❄️', cost: 50, damage: 10, range: 2.5, rate: 1000, freezeTime: 3000 }, // 冰冻单个敌人3秒
        { type: 'fortress', icon: '🏯', cost: 30, onPath: true, hp: 5, blockTime: 3000 } // 血量增加到5
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
      this.showTowerMenu = false
      this.selectedExistingTower = null
      this.waveSpawning = false
      this.totalQuestions = 0
      this.correctAnswers = 0
      this.answerFeedback = null
      this.selectedAnswer = null
      this.pendingAction = null

      // 重置画布状态
      this.canvasReady = false
      this.savedCanvasW = 0

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

        // 只在首次计算尺寸，之后复用
        if (this.savedCanvasW === 0) {
          const wrapW = Math.floor(wrap.width)
          const wrapH = Math.floor(wrap.height)

          this.cellSize = Math.floor(wrapW / this.cols)
          this.rows = Math.floor(wrapH / this.cellSize)
          this.canvasW = this.cols * this.cellSize
          this.canvasH = this.rows * this.cellSize

          // 保存尺寸
          this.savedCanvasW = this.canvasW
          this.savedCanvasH = this.canvasH
          this.savedCellSize = this.cellSize
          this.savedRows = this.rows
        } else {
          // 复用保存的尺寸
          this.canvasW = this.savedCanvasW
          this.canvasH = this.savedCanvasH
          this.cellSize = this.savedCellSize
          this.rows = this.savedRows
        }

        // 设置画布
        this.canvas.width = this.canvasW * this.dpr
        this.canvas.height = this.canvasH * this.dpr
        this.ctx.setTransform(1, 0, 0, 1, 0, 0)
        this.ctx.scale(this.dpr, this.dpr)

        this.canvasReady = true

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
      if (this.paused || this.gameOver || this.showQuestion || this.showTowerMenu) return

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

      // 检查是否点击了已有的塔
      const existingTower = this.towers.find(t => t.col === col && t.row === row)
      if (existingTower) {
        this.selectedExistingTower = existingTower
        this.showTowerMenu = true
        this.selectedTower = null
        return
      }

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
        this.pendingAction = 'build'
        this.askQuestion()
      }
    },

    // 获取升级费用
    getUpgradeCost(tower) {
      const baseDef = this.towerDefs.find(t => t.type === tower.type)
      return Math.floor(baseDef.cost * 0.6 * tower.level)
    },

    // 获取出售价格
    getSellPrice(tower) {
      const baseDef = this.towerDefs.find(t => t.type === tower.type)
      const totalCost = baseDef.cost + (tower.level - 1) * Math.floor(baseDef.cost * 0.6)
      return Math.floor(totalCost * 0.5)
    },

    // 升级炮塔
    upgradeTower() {
      const cost = this.getUpgradeCost(this.selectedExistingTower)
      if (this.gold < cost) return

      this.pendingAction = 'upgrade'
      this.askQuestion()
    },

    // 出售炮塔
    sellTower() {
      const price = this.getSellPrice(this.selectedExistingTower)
      this.gold += price

      const idx = this.towers.indexOf(this.selectedExistingTower)
      if (idx !== -1) {
        this.towers.splice(idx, 1)
      }

      this.closeTowerMenu()
    },

    closeTowerMenu() {
      this.showTowerMenu = false
      this.selectedExistingTower = null
    },

    askQuestion() {
      this.answerFeedback = null
      this.selectedAnswer = null

      const questionTypes = [
        this.genDecimalMultiply,
        this.genDecimalDivide,
        this.genSimpleEquation,
        this.genAreaQuestion,
        this.genFractionBasic
      ]

      const generator = questionTypes[Math.floor(Math.random() * questionTypes.length)]
      const q = generator.call(this)

      this.question = q
      this.showQuestion = true
      this.paused = true
    },

    genDecimalMultiply() {
      const a = (Math.floor(Math.random() * 90) + 10) / 10
      const b = Math.floor(Math.random() * 9) + 2
      const answer = Math.round(a * b * 10) / 10
      const text = `${a} × ${b} = ?`
      return { type: '小数乘法', text, answer, options: this.genOptions(answer, true) }
    },

    genDecimalDivide() {
      const b = Math.floor(Math.random() * 4) + 2
      const answer = (Math.floor(Math.random() * 40) + 10) / 10
      const a = Math.round(answer * b * 10) / 10
      const text = `${a} ÷ ${b} = ?`
      return { type: '小数除法', text, answer, options: this.genOptions(answer, true) }
    },

    genSimpleEquation() {
      const answer = Math.floor(Math.random() * 20) + 5
      const b = Math.floor(Math.random() * 10) + 5
      const c = answer + b
      const text = `x + ${b} = ${c}，x = ?`
      return { type: '简易方程', text, answer, options: this.genOptions(answer, false) }
    },

    genAreaQuestion() {
      const types = ['rectangle', 'triangle', 'parallelogram']
      const type = types[Math.floor(Math.random() * types.length)]

      let text, answer
      if (type === 'rectangle') {
        const l = Math.floor(Math.random() * 8) + 3
        const w = Math.floor(Math.random() * 6) + 2
        answer = l * w
        text = `长方形：长${l}cm，宽${w}cm，面积=?cm²`
      } else if (type === 'triangle') {
        const base = Math.floor(Math.random() * 6) + 4
        const h = Math.floor(Math.random() * 4) + 2
        answer = (base * h) / 2
        text = `三角形：底${base}cm，高${h}cm，面积=?cm²`
      } else {
        const base = Math.floor(Math.random() * 6) + 3
        const h = Math.floor(Math.random() * 5) + 2
        answer = base * h
        text = `平行四边形：底${base}cm，高${h}cm，面积=?cm²`
      }
      return { type: '面积计算', text, answer, options: this.genOptions(answer, false) }
    },

    genFractionBasic() {
      const denominator = [2, 4, 5, 10][Math.floor(Math.random() * 4)]
      const numerator = Math.floor(Math.random() * (denominator - 1)) + 1
      const answer = Math.round((numerator / denominator) * 100) / 100
      const text = `${numerator}/${denominator} = ? (小数)`
      return { type: '分数转小数', text, answer, options: this.genOptions(answer, true) }
    },

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
      if (this.answerFeedback) return // 防止重复点击

      this.totalQuestions++
      this.selectedAnswer = opt

      const isCorrect = opt === this.question.answer
      this.answerFeedback = isCorrect ? 'correct' : 'wrong'

      if (isCorrect) {
        this.correctAnswers++
      }

      setTimeout(() => {
        this.showQuestion = false
        this.paused = false
        this.answerFeedback = null
        this.selectedAnswer = null

        if (isCorrect) {
          if (this.pendingAction === 'build' && this.pendingTower) {
            const { col, row, def } = this.pendingTower

            if (def.onPath) {
              this.fortresses.push({
                col, row,
                x: col * this.cellSize + this.cellSize / 2,
                y: row * this.cellSize + this.cellSize / 2,
                icon: def.icon,
                hp: def.hp,
                maxHp: def.hp,
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
                freezeTime: def.freezeTime || 0,
                lastFire: 0,
                level: 1
              })
            }
            this.gold -= def.cost
            this.selectedTower = null
          } else if (this.pendingAction === 'upgrade' && this.selectedExistingTower) {
            const cost = this.getUpgradeCost(this.selectedExistingTower)
            this.gold -= cost
            this.selectedExistingTower.level++
            this.selectedExistingTower.damage = Math.floor(this.selectedExistingTower.damage * 1.4)
            this.selectedExistingTower.range = Math.floor(this.selectedExistingTower.range * 1.1)
            this.closeTowerMenu()
          }
        }

        this.pendingTower = null
        this.pendingAction = null
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
            frozenUntil: 0, // 冰冻效果
            blockedUntil: 0,
            attackingFortress: null
          })
        }, delay)
        delay += 1500
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

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i]

        // 被冰冻：完全停止
        if (e.frozenUntil > now) {
          continue
        }

        // 被堡垒阻挡
        if (e.blockedUntil > now) {
          continue
        }

        // 堡垒破坏逻辑
        if (e.attackingFortress) {
          const fort = e.attackingFortress
          fort.hp--
          if (fort.hp <= 0) {
            const fortIdx = this.fortresses.indexOf(fort)
            if (fortIdx !== -1) {
              this.fortresses.splice(fortIdx, 1)
            }
          }
          e.attackingFortress = null
        }

        e.speed = e.baseSpeed

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

      // 塔攻击
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

          // 冰冻塔：冰冻单个敌人
          if (t.freezeTime > 0) {
            target.frozenUntil = now + t.freezeTime
          }

          t.lastFire = now

          this.bullets.push({
            x: t.x, y: t.y,
            tx: target.x, ty: target.y,
            life: t.type === 'cannon' ? 20 : 10 // 炮弹更慢
          })
        }
      })

      // 更新子弹
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        this.bullets[i].life--
        if (this.bullets[i].life <= 0) {
          this.bullets.splice(i, 1)
        }
      }

      // 波次检查
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

    render() {
      if (!this.ctx) return
      const ctx = this.ctx
      const cs = this.cellSize

      ctx.fillStyle = '#1a472a'
      ctx.fillRect(0, 0, this.canvasW, this.canvasH)

      // 网格
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

      // 路径
      ctx.fillStyle = '#5D4037'
      this.pathSet.forEach(key => {
        const [col, row] = key.split(',').map(Number)
        ctx.fillRect(col * cs + 2, row * cs + 2, cs - 4, cs - 4)
      })

      // 可建造区域提示
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

      // 堡垒
      this.fortresses.forEach(f => {
        ctx.fillStyle = '#8D6E63'
        ctx.beginPath()
        ctx.arc(f.x, f.y, cs * 0.4, 0, Math.PI * 2)
        ctx.fill()

        ctx.font = `${cs * 0.5}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(f.icon, f.x, f.y)

        // 堡垒血条
        const hpW = cs * 0.6
        const hpH = 4
        ctx.fillStyle = '#333'
        ctx.fillRect(f.x - hpW / 2, f.y + cs * 0.35, hpW, hpH)
        ctx.fillStyle = '#4CAF50'
        ctx.fillRect(f.x - hpW / 2, f.y + cs * 0.35, hpW * (f.hp / f.maxHp), hpH)
      })

      // 塔
      this.towers.forEach(t => {
        ctx.fillStyle = '#333'
        ctx.beginPath()
        ctx.arc(t.x, t.y, cs * 0.35, 0, Math.PI * 2)
        ctx.fill()

        ctx.font = `${cs * 0.5}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(t.icon, t.x, t.y)

        // 等级标识
        if (t.level > 1) {
          ctx.fillStyle = '#FFD700'
          ctx.font = `${cs * 0.25}px Arial`
          ctx.fillText(`Lv${t.level}`, t.x, t.y + cs * 0.35)
        }
      })

      // 敌人
      const now = Date.now()
      this.enemies.forEach(e => {
        const r = cs * 0.3

        // 被堡垒阻挡时显示攻击动画
        if (e.blockedUntil > now) {
          ctx.strokeStyle = '#FF5722'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(e.x, e.y, r + 4, 0, Math.PI * 2)
          ctx.stroke()
        }

        // 被冰冻时显示冰冻效果
        if (e.frozenUntil > now) {
          ctx.fillStyle = '#81D4FA'
          ctx.strokeStyle = '#03A9F4'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(e.x, e.y, r + 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }

        ctx.fillStyle = e.frozenUntil > now ? '#B3E5FC' : e.color
        ctx.beginPath()
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2)
        ctx.fill()

        // 血条
        const hpW = cs * 0.6
        const hpH = 4
        ctx.fillStyle = '#333'
        ctx.fillRect(e.x - hpW / 2, e.y - r - 8, hpW, hpH)
        ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#4CAF50' : '#f44336'
        ctx.fillRect(e.x - hpW / 2, e.y - r - 8, hpW * (e.hp / e.maxHp), hpH)
      })

      // 子弹
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 2
      this.bullets.forEach(b => {
        ctx.beginPath()
        ctx.moveTo(b.x, b.y)
        ctx.lineTo(b.tx, b.ty)
        ctx.stroke()
      })
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

.tower-menu .modal-title {
  font-size: 48rpx;
  margin-bottom: 16rpx;
}

.tower-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 24rpx;
}

.tower-stats text {
  color: #aaa;
  font-size: 26rpx;
}

.tower-actions {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.btn-upgrade {
  flex: 1;
  padding: 20rpx;
  font-size: 28rpx;
  background: linear-gradient(135deg, #2196F3, #1976D2);
  color: #fff;
  border: none;
  border-radius: 12rpx;
}

.btn-upgrade:disabled {
  background: #666;
  opacity: 0.6;
}

.btn-sell {
  flex: 1;
  padding: 20rpx;
  font-size: 28rpx;
  background: linear-gradient(135deg, #f44336, #D32F2F);
  color: #fff;
  border: none;
  border-radius: 12rpx;
}

.btn-cancel {
  width: 100%;
  padding: 20rpx;
  font-size: 28rpx;
  background: rgba(255,255,255,0.1);
  color: #fff;
  border: none;
  border-radius: 12rpx;
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
