<template>
  <view class="page">
    <!-- 菜单界面 -->
    <view v-if="screen === 'menu'" class="menu">
      <view class="menu-box">
        <text class="menu-title">🏰 数学塔防</text>
        <text class="menu-sub">五年级上册</text>
        <view class="level-select">
          <text class="level-label">选择难度:</text>
          <view class="levels">
            <view
              v-for="(lv, i) in levels"
              :key="i"
              class="level-btn"
              :class="{ locked: i > unlockedLevel, selected: i === selectedLevel }"
              @click="selectLevel(i)"
            >
              <text class="level-icon">{{ i <= unlockedLevel ? lv.icon : '🔒' }}</text>
              <text class="level-name">{{ lv.name }}</text>
            </view>
          </view>
        </view>
        <button class="btn-start" @click="startGame('normal')">开始游戏</button>
        <button class="btn-endless" @click="startGame('endless')">无尽模式</button>
        <button class="btn-back" @click="goBack">返回</button>
      </view>
    </view>

    <!-- 游戏界面 -->
    <view v-if="screen === 'game'" class="game">
      <view class="top-bar">
        <text class="stat">❤️{{ lives }}</text>
        <text class="stat">💰{{ gold }}</text>
        <text class="stat">🌊{{ wave }}/{{ maxWave }}</text>
        <text class="btn-pause" @click="togglePause">{{ paused ? '▶️' : '⏸️' }}</text>
      </view>

      <view class="canvas-wrap" id="canvasWrap">
        <canvas
          id="gameCanvas"
          type="2d"
          class="canvas"
          :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
          @touchstart="onTouch"
        ></canvas>
      </view>

      <!-- 波次提示 -->
      <view v-if="showWaveHint" class="wave-hint" :class="{ 'fade-out': waveHintFading }">
        <text>第 {{ wave }} 波</text>
      </view>

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
    <view v-if="showTowerMenu" class="modal" @click.self="closeTowerMenu">
      <view class="modal-box tower-menu">
        <text class="modal-title">{{ selectedExistingTower.icon }} Lv.{{ selectedExistingTower.level }}</text>
        <view class="tower-stats">
          <text>伤害: {{ selectedExistingTower.damage }}</text>
          <text>射程: {{ Math.round(selectedExistingTower.range / cellSize) }}</text>
        </view>
        <view class="tower-actions">
          <button class="btn-upgrade" :disabled="gold < getUpgradeCost(selectedExistingTower)" @click="upgradeTower">
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
      <view class="modal-box question-box">
        <text class="q-type">{{ question.category }}</text>
        <text class="q-text">{{ question.text }}</text>

        <!-- 填空题 -->
        <view v-if="question.qType === 'fill'" class="fill-area">
          <input
            v-model="fillAnswer"
            type="digit"
            class="fill-input"
            placeholder="输入答案"
            :focus="true"
            @confirm="submitFill"
          />
          <button class="btn-submit" @click="submitFill">确定</button>
        </view>

        <!-- 选择题 -->
        <view v-if="question.qType === 'choice'" class="q-options">
          <view
            v-for="(opt, i) in question.options"
            :key="i"
            class="q-opt"
            :class="{
              correct: answerFeedback && opt === question.answer,
              wrong: answerFeedback && selectedAnswer === opt && opt !== question.answer
            }"
            @click="answerChoice(opt)"
          >{{ opt }}</view>
        </view>

        <!-- 判断题 -->
        <view v-if="question.qType === 'judge'" class="judge-btns">
          <button
            class="judge-btn correct-btn"
            :class="{ selected: answerFeedback && question.answer === true, wrong: answerFeedback && selectedAnswer === true && question.answer !== true }"
            @click="answerJudge(true)"
          >✓ 正确</button>
          <button
            class="judge-btn wrong-btn"
            :class="{ selected: answerFeedback && question.answer === false, wrong: answerFeedback && selectedAnswer === false && question.answer !== false }"
            @click="answerJudge(false)"
          >✗ 错误</button>
        </view>

        <text v-if="answerFeedback" class="feedback" :class="answerFeedback">
          {{ answerFeedback === 'correct' ? '✓ 回答正确！' : '✗ 回答错误，正确答案是 ' + question.answer }}
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
      selectedLevel: 0,
      unlockedLevel: 2,

      // 关卡配置
      levels: [
        { name: '入门', icon: '⭐', waves: 5, enemyMult: 0.7, goldStart: 120 },
        { name: '简单', icon: '⭐⭐', waves: 8, enemyMult: 0.85, goldStart: 100 },
        { name: '普通', icon: '⭐⭐⭐', waves: 10, enemyMult: 1, goldStart: 100 },
        { name: '困难', icon: '💀', waves: 12, enemyMult: 1.3, goldStart: 80 },
        { name: '地狱', icon: '👹', waves: 15, enemyMult: 1.6, goldStart: 60 }
      ],

      canvas: null,
      ctx: null,
      canvasW: 300,
      canvasH: 400,
      dpr: 1,
      savedCanvasW: 0,
      savedCanvasH: 0,
      savedCellSize: 0,
      savedRows: 0,

      cols: 10,
      rows: 12,
      cellSize: 30,

      lives: 20,
      gold: 100,
      wave: 1,
      maxWave: 10,
      paused: false,
      gameOver: false,
      win: false,
      animId: null,
      waveSpawning: false,

      // 波次提示
      showWaveHint: false,
      waveHintFading: false,

      path: [],
      pathSet: new Set(),
      towers: [],
      enemies: [],
      bullets: [],
      fortresses: [],
      effects: [], // 动画效果

      selectedTower: null,
      showTowerMenu: false,
      selectedExistingTower: null,

      showQuestion: false,
      question: { text: '', answer: 0, options: [], qType: 'choice', category: '' },
      pendingTower: null,
      pendingAction: null,
      answerFeedback: null,
      selectedAnswer: null,
      fillAnswer: '',

      totalQuestions: 0,
      correctAnswers: 0,

      towerDefs: [
        { type: 'archer', icon: '🏹', cost: 40, damage: 15, range: 3, rate: 800 },
        { type: 'magic', icon: '✨', cost: 60, damage: 25, range: 2.5, rate: 1200 },
        { type: 'cannon', icon: '💣', cost: 100, damage: 80, range: 2.5, rate: 2500 },
        { type: 'ice', icon: '❄️', cost: 50, damage: 10, range: 2.5, rate: 1000, freezeTime: 3000 },
        { type: 'fortress', icon: '🏯', cost: 30, onPath: true, hp: 5, blockTime: 3000 }
      ],

      // 敌人定义 - 多样化图标
      enemyTypes: {
        slime: { icon: '🟢', hp: 40, speed: 0.4, reward: 10 },
        bat: { icon: '🦇', hp: 25, speed: 0.7, reward: 12 },
        ghost: { icon: '👻', hp: 35, speed: 0.5, reward: 15 },
        spider: { icon: '🕷️', hp: 50, speed: 0.35, reward: 18 },
        skull: { icon: '💀', hp: 70, speed: 0.3, reward: 22 },
        demon: { icon: '👿', hp: 100, speed: 0.25, reward: 30 },
        dragon: { icon: '🐉', hp: 200, speed: 0.2, reward: 50 },
        boss: { icon: '👹', hp: 400, speed: 0.15, reward: 100 }
      },

      // 每波敌人配置
      waveConfig: [
        ['slime', 'slime', 'slime'],
        ['slime', 'slime', 'bat', 'slime'],
        ['slime', 'bat', 'bat', 'ghost'],
        ['bat', 'ghost', 'ghost', 'spider'],
        ['ghost', 'spider', 'spider', 'skull'],
        ['spider', 'skull', 'skull', 'demon'],
        ['skull', 'demon', 'demon', 'ghost'],
        ['demon', 'demon', 'dragon'],
        ['demon', 'dragon', 'dragon', 'skull'],
        ['dragon', 'dragon', 'boss']
      ]
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

    selectLevel(idx) {
      if (idx <= this.unlockedLevel) {
        this.selectedLevel = idx
      }
    },

    startGame(mode) {
      this.gameMode = mode
      this.screen = 'game'

      const level = this.levels[this.selectedLevel]
      this.maxWave = mode === 'endless' ? 999 : level.waves
      this.gold = level.goldStart

      this.lives = 20
      this.wave = 1
      this.paused = false
      this.gameOver = false
      this.win = false
      this.towers = []
      this.enemies = []
      this.bullets = []
      this.fortresses = []
      this.effects = []
      this.selectedTower = null
      this.showTowerMenu = false
      this.waveSpawning = false
      this.totalQuestions = 0
      this.correctAnswers = 0
      this.fillAnswer = ''
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

        if (this.savedCanvasW === 0) {
          const wrapW = Math.floor(wrap.width)
          const wrapH = Math.floor(wrap.height)
          this.cellSize = Math.floor(wrapW / this.cols)
          this.rows = Math.floor(wrapH / this.cellSize)
          this.canvasW = this.cols * this.cellSize
          this.canvasH = this.rows * this.cellSize
          this.savedCanvasW = this.canvasW
          this.savedCanvasH = this.canvasH
          this.savedCellSize = this.cellSize
          this.savedRows = this.rows
        } else {
          this.canvasW = this.savedCanvasW
          this.canvasH = this.savedCanvasH
          this.cellSize = this.savedCellSize
          this.rows = this.savedRows
        }

        this.canvas.width = this.canvasW * this.dpr
        this.canvas.height = this.canvasH * this.dpr
        this.ctx.setTransform(1, 0, 0, 1, 0, 0)
        this.ctx.scale(this.dpr, this.dpr)

        this.generatePath()
        this.showWaveAnnounce()
        this.gameLoop()
      })
    },

    showWaveAnnounce() {
      this.waveSpawning = true // 防止波次检查过早触发
      this.showWaveHint = true
      this.waveHintFading = false
      setTimeout(() => {
        this.waveHintFading = true
        setTimeout(() => {
          this.showWaveHint = false
          this.spawnWave()
        }, 500)
      }, 1500)
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
      let x = typeof touch.x === 'number' ? touch.x : (touch.offsetX || touch.clientX)
      let y = typeof touch.y === 'number' ? touch.y : (touch.offsetY || touch.clientY)

      const col = Math.floor(x / this.cellSize)
      const row = Math.floor(y / this.cellSize)

      if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return

      const key = `${col},${row}`
      const isPath = this.pathSet.has(key)

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
          if (!isPath || this.fortresses.some(f => f.col === col && f.row === row)) return
        } else {
          if (isPath || this.towers.some(t => t.col === col && t.row === row)) return
        }

        this.pendingTower = { col, row, def }
        this.pendingAction = 'build'
        this.askQuestion()
      }
    },

    getUpgradeCost(tower) {
      const baseDef = this.towerDefs.find(t => t.type === tower.type)
      return Math.floor(baseDef.cost * 0.6 * tower.level)
    },

    getSellPrice(tower) {
      const baseDef = this.towerDefs.find(t => t.type === tower.type)
      const totalCost = baseDef.cost + (tower.level - 1) * Math.floor(baseDef.cost * 0.6)
      return Math.floor(totalCost * 0.5)
    },

    upgradeTower() {
      if (this.gold < this.getUpgradeCost(this.selectedExistingTower)) return
      this.pendingAction = 'upgrade'
      this.askQuestion()
    },

    sellTower() {
      this.gold += this.getSellPrice(this.selectedExistingTower)
      const idx = this.towers.indexOf(this.selectedExistingTower)
      if (idx !== -1) this.towers.splice(idx, 1)
      this.closeTowerMenu()
    },

    closeTowerMenu() {
      this.showTowerMenu = false
      this.selectedExistingTower = null
    },

    // 生成题目
    askQuestion() {
      this.answerFeedback = null
      this.selectedAnswer = null
      this.fillAnswer = ''

      const types = ['fill', 'choice', 'judge']
      const qType = types[Math.floor(Math.random() * types.length)]

      let q
      if (qType === 'fill') {
        q = this.genFillQuestion()
      } else if (qType === 'choice') {
        q = this.genChoiceQuestion()
      } else {
        q = this.genJudgeQuestion()
      }

      this.question = q
      this.showQuestion = true
      this.paused = true
    },

    // 填空题 - 计算类
    genFillQuestion() {
      const types = [this.genCalcAdd, this.genCalcSub, this.genCalcMul, this.genCalcDiv, this.genEquation]
      const gen = types[Math.floor(Math.random() * types.length)]
      return gen.call(this)
    },

    genCalcAdd() {
      const a = (Math.floor(Math.random() * 90) + 10) / 10
      const b = (Math.floor(Math.random() * 90) + 10) / 10
      const answer = Math.round((a + b) * 10) / 10
      return { qType: 'fill', category: '小数加法', text: `${a} + ${b} = ?`, answer }
    },

    genCalcSub() {
      const a = (Math.floor(Math.random() * 90) + 50) / 10
      const b = (Math.floor(Math.random() * 40) + 10) / 10
      const answer = Math.round((a - b) * 10) / 10
      return { qType: 'fill', category: '小数减法', text: `${a} - ${b} = ?`, answer }
    },

    genCalcMul() {
      const a = (Math.floor(Math.random() * 40) + 10) / 10
      const b = Math.floor(Math.random() * 8) + 2
      const answer = Math.round(a * b * 10) / 10
      return { qType: 'fill', category: '小数乘法', text: `${a} × ${b} = ?`, answer }
    },

    genCalcDiv() {
      const b = Math.floor(Math.random() * 4) + 2
      const answer = (Math.floor(Math.random() * 30) + 10) / 10
      const a = Math.round(answer * b * 10) / 10
      return { qType: 'fill', category: '小数除法', text: `${a} ÷ ${b} = ?`, answer }
    },

    genEquation() {
      const x = Math.floor(Math.random() * 15) + 5
      const b = Math.floor(Math.random() * 10) + 3
      const c = x + b
      return { qType: 'fill', category: '解方程', text: `x + ${b} = ${c}，x = ?`, answer: x }
    },

    // 选择题 - 知识类
    genChoiceQuestion() {
      const types = [this.genAreaChoice, this.genFractionChoice, this.genUnitChoice, this.genAppChoice]
      const gen = types[Math.floor(Math.random() * types.length)]
      return gen.call(this)
    },

    genAreaChoice() {
      const shapes = [
        { name: '三角形', formula: '底×高÷2' },
        { name: '平行四边形', formula: '底×高' },
        { name: '梯形', formula: '(上底+下底)×高÷2' }
      ]
      const shape = shapes[Math.floor(Math.random() * shapes.length)]
      const wrongAnswers = shapes.filter(s => s.name !== shape.name).map(s => s.formula)
      wrongAnswers.push('底×高×2')
      const options = [shape.formula, ...wrongAnswers.slice(0, 3)].sort(() => Math.random() - 0.5)
      return { qType: 'choice', category: '面积公式', text: `${shape.name}的面积公式是？`, answer: shape.formula, options }
    },

    genFractionChoice() {
      const fractions = [
        { q: '1/2等于多少？', a: '0.5', opts: ['0.5', '0.2', '0.25', '0.15'] },
        { q: '1/4等于多少？', a: '0.25', opts: ['0.25', '0.4', '0.14', '0.5'] },
        { q: '3/4等于多少？', a: '0.75', opts: ['0.75', '0.34', '0.43', '0.7'] },
        { q: '1/5等于多少？', a: '0.2', opts: ['0.2', '0.5', '0.15', '0.25'] }
      ]
      const f = fractions[Math.floor(Math.random() * fractions.length)]
      return { qType: 'choice', category: '分数转小数', text: f.q, answer: f.a, options: f.opts.sort(() => Math.random() - 0.5) }
    },

    genUnitChoice() {
      const units = [
        { q: '1千米等于多少米？', a: '1000米', opts: ['1000米', '100米', '10000米', '10米'] },
        { q: '1公顷等于多少平方米？', a: '10000平方米', opts: ['10000平方米', '1000平方米', '100平方米', '100000平方米'] },
        { q: '1吨等于多少千克？', a: '1000千克', opts: ['1000千克', '100千克', '10000千克', '10千克'] }
      ]
      const u = units[Math.floor(Math.random() * units.length)]
      return { qType: 'choice', category: '单位换算', text: u.q, answer: u.a, options: u.opts.sort(() => Math.random() - 0.5) }
    },

    genAppChoice() {
      const apps = [
        { q: '小明买了3.5千克苹果，每千克4元，一共多少钱？', a: '14元', opts: ['14元', '12元', '7.5元', '16元'] },
        { q: '一块长方形地，长50米，宽30米，面积是多少？', a: '1500平方米', opts: ['1500平方米', '160平方米', '80平方米', '1000平方米'] }
      ]
      const a = apps[Math.floor(Math.random() * apps.length)]
      return { qType: 'choice', category: '应用题', text: a.q, answer: a.a, options: a.opts.sort(() => Math.random() - 0.5) }
    },

    // 判断题
    genJudgeQuestion() {
      const judges = [
        { q: '三角形的面积等于底×高÷2', a: true },
        { q: '平行四边形的面积等于底×高÷2', a: false },
        { q: '0.5×2=1', a: true },
        { q: '1/4=0.4', a: false },
        { q: '梯形的面积等于(上底+下底)×高÷2', a: true },
        { q: '1公顷=1000平方米', a: false },
        { q: '小数乘法中，积的小数位数等于两个因数小数位数之和', a: true },
        { q: '0除以任何数都等于0', a: false },
        { q: '3.6÷0.6=6', a: true },
        { q: '2.5×4=1', a: false }
      ]
      const j = judges[Math.floor(Math.random() * judges.length)]
      return { qType: 'judge', category: '判断题', text: j.q, answer: j.a }
    },

    // 提交填空答案
    submitFill() {
      if (!this.fillAnswer) return
      const userAns = parseFloat(this.fillAnswer)
      const isCorrect = Math.abs(userAns - this.question.answer) < 0.01
      this.processAnswer(isCorrect, userAns)
    },

    // 选择题答案
    answerChoice(opt) {
      if (this.answerFeedback) return
      const isCorrect = opt === this.question.answer
      this.selectedAnswer = opt
      this.processAnswer(isCorrect, opt)
    },

    // 判断题答案
    answerJudge(val) {
      if (this.answerFeedback) return
      const isCorrect = val === this.question.answer
      this.selectedAnswer = val
      this.processAnswer(isCorrect, val)
    },

    processAnswer(isCorrect, userAnswer) {
      this.totalQuestions++
      this.answerFeedback = isCorrect ? 'correct' : 'wrong'
      if (isCorrect) this.correctAnswers++

      setTimeout(() => {
        this.showQuestion = false
        this.paused = false
        this.answerFeedback = null

        if (isCorrect) {
          if (this.pendingAction === 'build' && this.pendingTower) {
            const { col, row, def } = this.pendingTower
            if (def.onPath) {
              this.fortresses.push({
                col, row,
                x: col * this.cellSize + this.cellSize / 2,
                y: row * this.cellSize + this.cellSize / 2,
                icon: def.icon, hp: def.hp, maxHp: def.hp, blockTime: def.blockTime
              })
            } else {
              this.towers.push({
                col, row,
                x: col * this.cellSize + this.cellSize / 2,
                y: row * this.cellSize + this.cellSize / 2,
                type: def.type, icon: def.icon, damage: def.damage,
                range: def.range * this.cellSize, rate: def.rate,
                freezeTime: def.freezeTime || 0, lastFire: 0, level: 1
              })
              // 建造动画
              this.addEffect(col * this.cellSize + this.cellSize / 2, row * this.cellSize + this.cellSize / 2, 'build')
            }
            this.gold -= def.cost
            this.selectedTower = null
          } else if (this.pendingAction === 'upgrade' && this.selectedExistingTower) {
            this.gold -= this.getUpgradeCost(this.selectedExistingTower)
            this.selectedExistingTower.level++
            this.selectedExistingTower.damage = Math.floor(this.selectedExistingTower.damage * 1.4)
            this.selectedExistingTower.range = Math.floor(this.selectedExistingTower.range * 1.1)
            this.addEffect(this.selectedExistingTower.x, this.selectedExistingTower.y, 'upgrade')
            this.closeTowerMenu()
          }
        }
        this.pendingTower = null
        this.pendingAction = null
      }, 1200)
    },

    // 添加动画效果
    addEffect(x, y, type) {
      this.effects.push({ x, y, type, life: 30, maxLife: 30 })
    },

    spawnWave() {
      if (this.gameOver) return

      const level = this.levels[this.selectedLevel]
      const mult = this.gameMode === 'endless' ? 1 + (this.wave - 1) * 0.1 : level.enemyMult

      // 获取本波敌人配置
      const waveIdx = Math.min(this.wave - 1, this.waveConfig.length - 1)
      let enemyList = [...this.waveConfig[waveIdx]]

      // 无尽模式额外敌人
      if (this.gameMode === 'endless' && this.wave > 10) {
        const extra = Math.floor((this.wave - 10) / 2)
        for (let i = 0; i < extra; i++) {
          enemyList.push(['demon', 'dragon', 'skull'][Math.floor(Math.random() * 3)])
        }
      }

      let delay = 0
      enemyList.forEach((type, i) => {
        setTimeout(() => {
          if (this.gameOver) return
          const def = this.enemyTypes[type]
          this.enemies.push({
            x: this.path[0].x,
            y: this.path[0].y,
            hp: Math.floor(def.hp * mult),
            maxHp: Math.floor(def.hp * mult),
            speed: def.speed,
            baseSpeed: def.speed,
            reward: Math.floor(def.reward * mult),
            icon: def.icon,
            pathIdx: 0,
            frozenUntil: 0,
            blockedUntil: 0,
            attackingFortress: null,
            scale: 1,
            hitFlash: 0
          })
        }, delay)
        delay += 1800 // 更长间隔
      })

      setTimeout(() => { this.waveSpawning = false }, delay)
    },

    gameLoop() {
      if (this.gameOver) return
      if (!this.paused) this.update()
      this.render()
      this.animId = requestAnimationFrame(() => this.gameLoop())
    },

    update() {
      const now = Date.now()

      // 更新效果
      for (let i = this.effects.length - 1; i >= 0; i--) {
        this.effects[i].life--
        if (this.effects[i].life <= 0) this.effects.splice(i, 1)
      }

      // 更新敌人
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i]

        if (e.hitFlash > 0) e.hitFlash--

        if (e.frozenUntil > now || e.blockedUntil > now) {
          if (e.blockedUntil > now && e.blockedUntil <= now + 16) {
            // 即将解除阻挡，破坏堡垒
            if (e.attackingFortress) {
              e.attackingFortress.hp--
              if (e.attackingFortress.hp <= 0) {
                const idx = this.fortresses.indexOf(e.attackingFortress)
                if (idx !== -1) this.fortresses.splice(idx, 1)
              }
              e.attackingFortress = null
            }
          }
          continue
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
          if (this.lives <= 0) this.endGame(false)
          continue
        }

        if (e.hp <= 0) {
          this.gold += e.reward
          this.addEffect(e.x, e.y, 'death')
          this.enemies.splice(i, 1)
        }
      }

      // 塔攻击
      this.towers.forEach(t => {
        if (now - t.lastFire < t.rate) return
        let target = null, minDist = t.range

        this.enemies.forEach(e => {
          const dist = Math.sqrt(Math.pow(e.x - t.x, 2) + Math.pow(e.y - t.y, 2))
          if (dist < minDist) { minDist = dist; target = e }
        })

        if (target) {
          target.hp -= t.damage
          target.hitFlash = 8
          if (t.freezeTime > 0) target.frozenUntil = now + t.freezeTime
          t.lastFire = now
          this.bullets.push({ x: t.x, y: t.y, tx: target.x, ty: target.y, life: t.type === 'cannon' ? 20 : 10 })
        }
      })

      // 更新子弹
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        if (--this.bullets[i].life <= 0) this.bullets.splice(i, 1)
      }

      // 波次检查
      if (this.enemies.length === 0 && !this.waveSpawning && !this.gameOver) {
        if (this.wave >= this.maxWave) {
          this.endGame(true)
        } else {
          this.wave++
          this.gold += 15 + this.wave * 2
          setTimeout(() => this.showWaveAnnounce(), 1500)
        }
      }
    },

    render() {
      if (!this.ctx) return
      const ctx = this.ctx
      const cs = this.cellSize

      // 背景
      ctx.fillStyle = '#1a472a'
      ctx.fillRect(0, 0, this.canvasW, this.canvasH)

      // 网格
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1
      for (let i = 0; i <= this.cols; i++) {
        ctx.beginPath(); ctx.moveTo(i * cs, 0); ctx.lineTo(i * cs, this.canvasH); ctx.stroke()
      }
      for (let i = 0; i <= this.rows; i++) {
        ctx.beginPath(); ctx.moveTo(0, i * cs); ctx.lineTo(this.canvasW, i * cs); ctx.stroke()
      }

      // 路径
      ctx.fillStyle = '#5D4037'
      this.pathSet.forEach(key => {
        const [col, row] = key.split(',').map(Number)
        ctx.fillRect(col * cs + 2, row * cs + 2, cs - 4, cs - 4)
      })

      // 可建造提示
      if (this.selectedTower) {
        const def = this.towerDefs.find(t => t.type === this.selectedTower)
        if (def) {
          ctx.fillStyle = def.onPath ? 'rgba(255, 193, 7, 0.4)' : 'rgba(76, 175, 80, 0.3)'
          if (def.onPath) {
            this.pathSet.forEach(key => {
              const [col, row] = key.split(',').map(Number)
              if (!this.fortresses.some(f => f.col === col && f.row === row)) {
                ctx.fillRect(col * cs + 2, row * cs + 2, cs - 4, cs - 4)
              }
            })
          } else {
            for (let r = 0; r < this.rows; r++) {
              for (let c = 0; c < this.cols; c++) {
                if (!this.pathSet.has(`${c},${r}`) && !this.towers.some(t => t.col === c && t.row === r)) {
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
        ctx.beginPath(); ctx.arc(f.x, f.y, cs * 0.4, 0, Math.PI * 2); ctx.fill()
        ctx.font = `${cs * 0.5}px Arial`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(f.icon, f.x, f.y)
        // 血条
        const hpW = cs * 0.6
        ctx.fillStyle = '#333'; ctx.fillRect(f.x - hpW / 2, f.y + cs * 0.35, hpW, 4)
        ctx.fillStyle = '#4CAF50'; ctx.fillRect(f.x - hpW / 2, f.y + cs * 0.35, hpW * (f.hp / f.maxHp), 4)
      })

      // 塔
      this.towers.forEach(t => {
        ctx.fillStyle = '#333'
        ctx.beginPath(); ctx.arc(t.x, t.y, cs * 0.35, 0, Math.PI * 2); ctx.fill()
        ctx.font = `${cs * 0.5}px Arial`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(t.icon, t.x, t.y)
        if (t.level > 1) {
          ctx.fillStyle = '#FFD700'
          ctx.font = `${cs * 0.22}px Arial`
          ctx.fillText(`Lv${t.level}`, t.x, t.y + cs * 0.38)
        }
      })

      // 敌人
      const now = Date.now()
      this.enemies.forEach(e => {
        const r = cs * 0.35

        // 冰冻效果
        if (e.frozenUntil > now) {
          ctx.fillStyle = 'rgba(100, 181, 246, 0.5)'
          ctx.beginPath(); ctx.arc(e.x, e.y, r + 4, 0, Math.PI * 2); ctx.fill()
        }

        // 攻击堡垒效果
        if (e.blockedUntil > now) {
          ctx.strokeStyle = '#FF5722'; ctx.lineWidth = 2
          ctx.beginPath(); ctx.arc(e.x, e.y, r + 6, 0, Math.PI * 2); ctx.stroke()
        }

        // 受击闪烁
        if (e.hitFlash > 0 && e.hitFlash % 2 === 0) {
          ctx.fillStyle = '#fff'
          ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill()
        }

        // 敌人图标
        ctx.font = `${cs * 0.55}px Arial`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(e.icon, e.x, e.y)

        // 血条
        const hpW = cs * 0.6
        ctx.fillStyle = '#333'; ctx.fillRect(e.x - hpW / 2, e.y - r - 6, hpW, 4)
        ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#4CAF50' : '#f44336'
        ctx.fillRect(e.x - hpW / 2, e.y - r - 6, hpW * Math.max(0, e.hp / e.maxHp), 4)
      })

      // 子弹
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2
      this.bullets.forEach(b => {
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.tx, b.ty); ctx.stroke()
      })

      // 动画效果
      this.effects.forEach(ef => {
        const progress = 1 - ef.life / ef.maxLife
        if (ef.type === 'death') {
          ctx.globalAlpha = 1 - progress
          ctx.fillStyle = '#FFD700'
          ctx.beginPath()
          ctx.arc(ef.x, ef.y, cs * 0.3 * (1 + progress), 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        } else if (ef.type === 'build' || ef.type === 'upgrade') {
          ctx.strokeStyle = ef.type === 'build' ? '#4CAF50' : '#2196F3'
          ctx.lineWidth = 3
          ctx.globalAlpha = 1 - progress
          ctx.beginPath()
          ctx.arc(ef.x, ef.y, cs * 0.5 * (1 + progress * 0.5), 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      })
    },

    togglePause() {
      this.paused = !this.paused
    },

    endGame(win) {
      this.gameOver = true
      this.win = win
      if (this.animId) cancelAnimationFrame(this.animId)
      // 解锁下一关
      if (win && this.selectedLevel === this.unlockedLevel && this.unlockedLevel < this.levels.length - 1) {
        this.unlockedLevel++
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
    if (this.animId) cancelAnimationFrame(this.animId)
  }
}
</script>

<style scoped>
.page { width: 100vw; height: 100vh; background: #1a1a2e; overflow: hidden; }

.menu { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
.menu-box { text-align: center; padding: 40rpx; }
.menu-title { display: block; font-size: 56rpx; font-weight: bold; color: #fff; margin-bottom: 10rpx; }
.menu-sub { display: block; font-size: 28rpx; color: #888; margin-bottom: 40rpx; }

.level-select { margin-bottom: 40rpx; }
.level-label { display: block; color: #aaa; font-size: 26rpx; margin-bottom: 16rpx; }
.levels { display: flex; justify-content: center; gap: 16rpx; flex-wrap: wrap; }
.level-btn { padding: 16rpx 20rpx; background: rgba(255,255,255,0.1); border-radius: 12rpx; border: 2rpx solid transparent; }
.level-btn.selected { border-color: #4CAF50; background: rgba(76, 175, 80, 0.3); }
.level-btn.locked { opacity: 0.4; }
.level-icon { display: block; font-size: 32rpx; }
.level-name { display: block; font-size: 22rpx; color: #fff; margin-top: 4rpx; }

.btn-start { width: 300rpx; padding: 24rpx; font-size: 32rpx; background: linear-gradient(135deg, #4CAF50, #388E3C); color: #fff; border: none; border-radius: 16rpx; margin-bottom: 20rpx; }
.btn-endless { width: 300rpx; padding: 24rpx; font-size: 32rpx; background: linear-gradient(135deg, #FF9800, #F57C00); color: #fff; border: none; border-radius: 16rpx; margin-bottom: 20rpx; }
.btn-back { width: 300rpx; padding: 24rpx; font-size: 32rpx; background: rgba(255,255,255,0.1); color: #fff; border: none; border-radius: 16rpx; }

.game { width: 100%; height: 100%; display: flex; flex-direction: column; }
.top-bar { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 24rpx; padding-top: calc(16rpx + env(safe-area-inset-top)); background: rgba(0,0,0,0.8); }
.stat { font-size: 28rpx; color: #fff; font-weight: bold; }
.btn-pause { font-size: 36rpx; padding: 8rpx 16rpx; }

.canvas-wrap { flex: 1; background: #1a472a; overflow: hidden; position: relative; }
.canvas { display: block; }

.wave-hint { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); padding: 30rpx 60rpx; border-radius: 20rpx; z-index: 50; transition: opacity 0.5s; }
.wave-hint.fade-out { opacity: 0; }
.wave-hint text { color: #FFD700; font-size: 48rpx; font-weight: bold; }

.tower-bar { display: flex; justify-content: space-around; padding: 16rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); background: rgba(0,0,0,0.9); }
.tower-btn { display: flex; flex-direction: column; align-items: center; padding: 12rpx 16rpx; background: rgba(255,255,255,0.1); border-radius: 12rpx; border: 3rpx solid transparent; }
.tower-btn.active { border-color: #4CAF50; background: rgba(76, 175, 80, 0.3); }
.tower-btn.disabled { opacity: 0.4; }
.tower-icon { font-size: 36rpx; }
.tower-cost { font-size: 20rpx; color: #FFD700; margin-top: 4rpx; }

.modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-box { background: #16213e; padding: 40rpx; border-radius: 20rpx; width: 88%; max-width: 600rpx; text-align: center; }
.modal-title { display: block; font-size: 44rpx; color: #fff; margin-bottom: 20rpx; }
.modal-info { display: block; font-size: 28rpx; color: #aaa; margin-bottom: 16rpx; }

.tower-menu .modal-title { font-size: 48rpx; margin-bottom: 16rpx; }
.tower-stats { display: flex; justify-content: space-around; margin-bottom: 24rpx; }
.tower-stats text { color: #aaa; font-size: 26rpx; }
.tower-actions { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.btn-upgrade { flex: 1; padding: 20rpx; font-size: 28rpx; background: linear-gradient(135deg, #2196F3, #1976D2); color: #fff; border: none; border-radius: 12rpx; }
.btn-upgrade:disabled { background: #666; opacity: 0.6; }
.btn-sell { flex: 1; padding: 20rpx; font-size: 28rpx; background: linear-gradient(135deg, #f44336, #D32F2F); color: #fff; border: none; border-radius: 12rpx; }
.btn-cancel { width: 100%; padding: 20rpx; font-size: 28rpx; background: rgba(255,255,255,0.1); color: #fff; border: none; border-radius: 12rpx; }

.question-box { max-width: 650rpx; }
.q-type { display: inline-block; font-size: 24rpx; color: #4CAF50; margin-bottom: 20rpx; background: rgba(76, 175, 80, 0.2); padding: 8rpx 24rpx; border-radius: 20rpx; }
.q-text { display: block; font-size: 34rpx; color: #fff; margin-bottom: 30rpx; font-weight: bold; line-height: 1.5; }

.fill-area { display: flex; gap: 16rpx; }
.fill-input { flex: 1; height: 80rpx; background: rgba(255,255,255,0.1); border: 2rpx solid #4CAF50; border-radius: 12rpx; color: #fff; font-size: 32rpx; text-align: center; }
.btn-submit { width: 160rpx; height: 80rpx; background: #4CAF50; color: #fff; border: none; border-radius: 12rpx; font-size: 28rpx; }

.q-options { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.q-opt { padding: 24rpx 16rpx; font-size: 28rpx; background: rgba(255,255,255,0.1); color: #fff; border-radius: 12rpx; line-height: 1.4; }
.q-opt.correct { background: rgba(76, 175, 80, 0.8); }
.q-opt.wrong { background: rgba(244, 67, 54, 0.8); }

.judge-btns { display: flex; gap: 24rpx; }
.judge-btn { flex: 1; padding: 28rpx; font-size: 32rpx; border: none; border-radius: 12rpx; color: #fff; }
.correct-btn { background: rgba(76, 175, 80, 0.3); border: 2rpx solid #4CAF50; }
.wrong-btn { background: rgba(244, 67, 54, 0.3); border: 2rpx solid #f44336; }
.judge-btn.selected { opacity: 1; }
.correct-btn.selected { background: rgba(76, 175, 80, 0.8); }
.wrong-btn.selected, .judge-btn.wrong { background: rgba(244, 67, 54, 0.8); }

.feedback { display: block; margin-top: 24rpx; font-size: 28rpx; font-weight: bold; line-height: 1.4; }
.feedback.correct { color: #4CAF50; }
.feedback.wrong { color: #f44336; }
</style>
