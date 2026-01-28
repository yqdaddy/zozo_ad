<template>
  <view class="page">
    <!-- 菜单界面 -->
    <view v-if="screen === 'menu'" class="menu">
      <view class="menu-box">
        <text class="menu-title">🏰 数学塔防</text>
        <text class="menu-sub">五年级上册</text>
        <button class="btn-start" @click="startGame('normal')">开始游戏</button>
        <button class="btn-back" @click="goBack">返回</button>
      </view>
    </view>

    <!-- 游戏界面 -->
    <view v-if="screen === 'game'" class="game">
      <!-- 顶部状态栏 -->
      <view class="top-bar">
        <text class="stat">❤️{{ lives }}</text>
        <text class="stat">💰{{ gold }}</text>
        <text class="stat">🌊{{ wave }}</text>
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

    <!-- 数学题弹窗 -->
    <view v-if="showQuestion" class="modal">
      <view class="modal-box">
        <text class="q-text">{{ question.text }}</text>
        <view class="q-options">
          <view
            v-for="(opt, i) in question.options"
            :key="i"
            class="q-opt"
            @click="answer(opt)"
          >{{ opt }}</view>
        </view>
      </view>
    </view>

    <!-- 游戏结束 -->
    <view v-if="gameOver" class="modal">
      <view class="modal-box">
        <text class="modal-title">{{ win ? '🎉 胜利!' : '💀 失败' }}</text>
        <text class="modal-info">通过 {{ wave }} 波</text>
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

      // 画布
      canvas: null,
      ctx: null,
      canvasW: 300,
      canvasH: 400,
      dpr: 1,

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

      // 游戏对象
      path: [],
      pathSet: new Set(),
      towers: [],
      enemies: [],
      bullets: [],

      // 选择
      selectedTower: null,

      // 数学题
      showQuestion: false,
      question: { text: '', answer: 0, options: [] },
      pendingTower: null,

      // 塔定义
      towerDefs: [
        { type: 'archer', icon: '🏹', cost: 40, damage: 15, range: 3, rate: 800 },
        { type: 'magic', icon: '✨', cost: 60, damage: 25, range: 2.5, rate: 1200 },
        { type: 'cannon', icon: '💣', cost: 80, damage: 50, range: 2, rate: 1500 },
        { type: 'ice', icon: '❄️', cost: 50, damage: 10, range: 2.5, rate: 1000, slow: 0.5 }
      ],

      // 敌人定义
      enemyDefs: {
        normal: { hp: 40, speed: 0.8, reward: 10, color: '#4CAF50' },
        fast: { hp: 25, speed: 1.5, reward: 15, color: '#2196F3' },
        tank: { hp: 100, speed: 0.4, reward: 25, color: '#795548' },
        boss: { hp: 300, speed: 0.3, reward: 80, color: '#f44336' }
      }
    }
  },

  methods: {
    goBack() {
      uni.navigateBack()
    },

    startGame() {
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
      this.selectedTower = null

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

        // 设置画布
        this.canvas.width = this.canvasW * this.dpr
        this.canvas.height = this.canvasH * this.dpr
        this.ctx.scale(this.dpr, this.dpr)

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
      if (this.pathSet.has(key)) return
      if (this.towers.some(t => t.col === col && t.row === row)) return

      if (this.selectedTower) {
        const def = this.towerDefs.find(t => t.type === this.selectedTower)
        if (def && this.gold >= def.cost) {
          this.pendingTower = { col, row, def }
          this.askQuestion()
        }
      }
    },

    askQuestion() {
      const a = Math.floor(Math.random() * 10) + 1
      const b = Math.floor(Math.random() * 10) + 1
      const ops = ['+', '-', '×']
      const op = ops[Math.floor(Math.random() * ops.length)]

      let answer
      if (op === '+') answer = a + b
      else if (op === '-') answer = Math.max(a, b) - Math.min(a, b)
      else answer = a * b

      const text = op === '-' ? `${Math.max(a,b)} ${op} ${Math.min(a,b)} = ?` : `${a} ${op} ${b} = ?`

      const options = [answer]
      while (options.length < 4) {
        const wrong = answer + Math.floor(Math.random() * 10) - 5
        if (wrong !== answer && wrong > 0 && !options.includes(wrong)) {
          options.push(wrong)
        }
      }
      options.sort(() => Math.random() - 0.5)

      this.question = { text, answer, options }
      this.showQuestion = true
      this.paused = true
    },

    answer(opt) {
      this.showQuestion = false
      this.paused = false

      if (opt === this.question.answer && this.pendingTower) {
        const { col, row, def } = this.pendingTower
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
          lastFire: 0
        })
        this.gold -= def.cost
        this.selectedTower = null
      }
      this.pendingTower = null
    },

    spawnWave() {
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
            slowUntil: 0
          })
        }, delay)
        delay += 800
      }
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

      // 更新敌人
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i]

        // 减速效果
        e.speed = e.slowUntil > now ? e.baseSpeed * 0.4 : e.baseSpeed

        // 移动
        if (e.pathIdx < this.path.length - 1) {
          const target = this.path[e.pathIdx + 1]
          const dx = target.x - e.x
          const dy = target.y - e.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < e.speed * 2) {
            e.pathIdx++
          } else {
            e.x += (dx / dist) * e.speed
            e.y += (dy / dist) * e.speed
          }
        } else {
          // 到达终点
          this.lives--
          this.enemies.splice(i, 1)
          if (this.lives <= 0) {
            this.endGame(false)
          }
          continue
        }

        // 死亡
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
          if (t.slow) {
            target.slowUntil = now + 2000
          }
          t.lastFire = now

          // 子弹效果
          this.bullets.push({
            x: t.x, y: t.y,
            tx: target.x, ty: target.y,
            life: 10
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
      if (this.enemies.length === 0 && !this.gameOver) {
        if (this.wave >= 10) {
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

      // 清空
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
      })

      // 敌人
      this.enemies.forEach(e => {
        const r = cs * 0.3

        ctx.fillStyle = e.color
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
      this.startGame()
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

/* 菜单 */
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

.btn-back {
  width: 300rpx;
  padding: 24rpx;
  font-size: 32rpx;
  background: rgba(255,255,255,0.1);
  color: #fff;
  border: none;
  border-radius: 16rpx;
}

/* 游戏 */
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
  padding: 12rpx 24rpx;
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
  font-size: 40rpx;
}

.tower-cost {
  font-size: 22rpx;
  color: #FFD700;
  margin-top: 4rpx;
}

/* 弹窗 */
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
  width: 80%;
  max-width: 500rpx;
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
  margin-bottom: 30rpx;
}

.q-text {
  display: block;
  font-size: 40rpx;
  color: #fff;
  margin-bottom: 30rpx;
  font-weight: bold;
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
}
</style>
