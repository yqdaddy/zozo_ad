<template>
  <view class="game-container">
    <!-- 主菜单 -->
    <view v-if="screen === 'menu'" class="screen menu-screen">
      <view class="menu-content">
        <text class="title">🏰 数学塔防</text>
        <text class="subtitle">五年级上册</text>
        <view class="menu-buttons">
          <button class="btn btn-primary" @click="startGame">开始工具</button>
          <button class="btn btn-secondary" @click="showHelp = true">工具说明</button>
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

    <!-- 工具界面 -->
    <view v-if="screen === 'game'" class="screen game-screen">
      <!-- 顶部信息栏 -->
      <view class="game-header safe-area-top">
        <view class="info-left">
          <text class="lives">❤️ {{ gameState.lives }}</text>
          <text class="gold">💰 {{ gameState.gold }}</text>
        </view>
        <view class="info-center">
          <text class="wave">第 {{ gameState.wave }} 波</text>
        </view>
        <view class="info-right">
          <text class="btn-icon" @click="pauseGame">⏸️</text>
          <text class="btn-icon" @click="toggleSpeed">{{ gameState.gameSpeed === 1 ? '⏩' : '⏩⏩' }}</text>
        </view>
      </view>

      <!-- 连击显示 -->
      <view v-if="comboInfo.combo >= 3" class="combo-display">
        <text class="combo-count">🔥 {{ comboInfo.combo }} 连击!</text>
        <text class="combo-multiplier">x{{ comboInfo.multiplier.toFixed(1) }} 奖励</text>
      </view>

      <!-- 工具画布 -->
      <view class="canvas-wrapper" id="canvasWrapper">
        <canvas
          id="gameCanvas"
          type="2d"
          class="game-canvas"
          :style="canvasStyle"
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
          :class="{ selected: selectedTower === tower.type, disabled: gameState.gold < tower.cost }"
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
        <text class="modal-title">工具暂停</text>
        <view class="modal-buttons">
          <button class="btn btn-primary" @click="resumeGame">继续工具</button>
          <button class="btn btn-secondary" @click="restartGame">重新开始</button>
          <button class="btn btn-secondary" @click="quitGame">返回菜单</button>
        </view>
      </view>
    </view>

    <!-- 工具结束弹窗 -->
    <view v-if="showGameOverModal" class="modal game-over-modal">
      <view class="modal-content">
        <text class="result-title">{{ gameResult.win ? '🎉 胜利！' : '💪 挑战结束' }}</text>

        <!-- 星级显示 -->
        <view class="star-rating">
          <text
            v-for="i in 3"
            :key="i"
            class="star"
            :class="{ active: i <= gameResult.stars }"
          >
            {{ i <= gameResult.stars ? '⭐' : '☆' }}
          </text>
        </view>

        <!-- 详细评价 -->
        <view class="rating-details">
          <text v-for="detail in gameResult.starDetails" :key="detail" class="detail-item">{{ detail }}</text>
        </view>

        <!-- 统计数据 -->
        <view class="stats-grid">
          <view class="stat-item">
            <text class="stat-value">{{ gameResult.wave }}</text>
            <text class="stat-label">波数</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ gameResult.accuracy }}%</text>
            <text class="stat-label">正确率</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ gameResult.maxCombo }}</text>
            <text class="stat-label">最高连击</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ gameResult.score }}</text>
            <text class="stat-label">得分</text>
          </view>
        </view>

        <!-- 新解锁的成就 -->
        <view v-if="gameResult.newAchievements && gameResult.newAchievements.length > 0" class="new-achievements">
          <text class="section-title">🏆 新成就解锁！</text>
          <view
            v-for="achievement in gameResult.newAchievements"
            :key="achievement.id"
            class="achievement-item"
          >
            <text class="achievement-icon">{{ achievement.icon }}</text>
            <view class="achievement-info">
              <text class="achievement-name">{{ achievement.name }}</text>
              <text class="achievement-desc">{{ achievement.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 激励语 -->
        <view class="encouragement">
          <text>{{ gameResult.encouragement }}</text>
        </view>

        <view class="modal-buttons">
          <button class="btn btn-primary" @click="restartGame">再来一局</button>
          <button class="btn btn-secondary" @click="shareResult">分享成绩</button>
          <button class="btn btn-secondary" @click="quitGame">返回菜单</button>
        </view>
      </view>
    </view>

    <!-- 帮助弹窗 -->
    <view v-if="showHelp" class="modal" @click.self="showHelp = false">
      <view class="modal-content help-content">
        <text class="modal-title">工具说明</text>
        <view class="help-section">
          <text class="help-title">🎯 工具目标</text>
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
        <view class="help-section">
          <text class="help-title">🔥 连击系统</text>
          <text class="help-text">连续答对题目可获得金币加成！</text>
          <text class="help-text">3连击 x1.2 | 5连击 x1.5 | 8连击 x2.0</text>
        </view>
        <button class="btn btn-primary" @click="showHelp = false">知道了</button>
      </view>
    </view>
  </view>
</template>

<script>
import { Game, TOWER_LIST } from '@/game/tower-defense/index.js'
import { CanvasAdapter } from '@/utils/canvas-adapter.js'
import { generateRandomQuestion, generateOptions, checkAnswer } from '@/utils/math.js'

export default {
  data() {
    return {
      screen: 'menu',
      showHelp: false,
      showMathModal: false,
      showPauseModal: false,
      showGameOverModal: false,

      // 工具实例
      game: null,
      canvasAdapter: null,

      // 工具状态（从 Game 同步）
      gameState: {
        lives: 20,
        gold: 100,
        wave: 1,
        gameSpeed: 1,
        isPaused: false,
        isGameOver: false
      },

      // 连击信息
      comboInfo: {
        combo: 0,
        multiplier: 1
      },

      // 塔列表
      towerList: TOWER_LIST,

      // 选中的塔
      selectedTower: null,

      // 画布尺寸
      canvasWidth: 320,
      canvasHeight: 400,

      // 数学题相关
      currentQuestion: null,
      userAnswer: '',
      answerOptions: [],
      showOptions: false,
      feedback: '',
      feedbackClass: '',
      selectedOption: null,
      mathCallback: null,

      // 工具结果
      gameResult: {
        win: false,
        wave: 0,
        enemiesKilled: 0,
        questionsCorrect: 0,
        accuracy: 0,
        maxCombo: 0,
        stars: 0,
        starDetails: [],
        newAchievements: [],
        encouragement: ''
      }
    }
  },

  computed: {
    canvasStyle() {
      return {
        width: this.canvasWidth + 'px',
        height: this.canvasHeight + 'px'
      }
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

    async startGame() {
      this.screen = 'game'
      await this.$nextTick()
      setTimeout(() => this.initGame(), 100)
    },

    async initGame() {
      try {
        // 计算画布尺寸
        const sysInfo = uni.getSystemInfoSync()
        const screenWidth = sysInfo.windowWidth
        const screenHeight = sysInfo.windowHeight
        const headerHeight = 50
        const tipHeight = 40
        const towerBarHeight = 90
        const safeBottom = sysInfo.safeAreaInsets?.bottom || 0

        this.canvasWidth = screenWidth
        this.canvasHeight = screenHeight - headerHeight - tipHeight - towerBarHeight - safeBottom - 20

        // 等待 DOM 更新，确保 Canvas 尺寸正确
        await this.$nextTick()
        // 额外等待一帧，确保浏览器完成布局
        await new Promise(resolve => setTimeout(resolve, 50))

        // 初始化 Canvas 适配器，传入期望尺寸避免获取不准确
        this.canvasAdapter = new CanvasAdapter()
        await this.canvasAdapter.init(this, 'gameCanvas', {
          fillContainer: true,
          width: this.canvasWidth,
          height: this.canvasHeight
        })

        // 创建工具实例
        this.game = new Game(this.canvasAdapter)

        // 监听工具事件
        this.setupGameEvents()

        // 初始化并启动工具
        this.game.init()
        this.game.start()
      } catch (error) {
        console.error('Game init failed:', error)
        setTimeout(() => this.initGame(), 200)
      }
    },

    setupGameEvents() {
      // 状态变化
      this.game.events.on('stateChange', (state) => {
        this.gameState = { ...state }
      })

      // 塔选择
      this.game.events.on('towerSelected', ({ type }) => {
        this.selectedTower = type
      })

      // 连击变化
      this.game.events.on('comboChange', (info) => {
        this.comboInfo = { ...info }
      })

      // 需要数学题
      this.game.events.on('needMathQuestion', ({ difficulty, callback }) => {
        this.showMathQuestion(difficulty, callback)
      })

      // Toast 提示
      this.game.events.on('showToast', ({ title, icon }) => {
        uni.showToast({ title, icon, duration: 1000 })
      })

      // 工具结束
      this.game.events.on('gameover', (result) => {
        this.gameResult = result
        this.showGameOverModal = true
      })

      // 成就解锁
      this.game.events.on('achievementUnlocked', (achievement) => {
        uni.showToast({
          title: `🏆 解锁: ${achievement.name}`,
          icon: 'none',
          duration: 2000
        })
      })
    },

    handleTouch(e) {
      if (!this.game || !this.canvasAdapter) return

      const touch = e.touches[0]
      if (!touch) return

      const { x, y } = this.canvasAdapter.touchToLogic(touch, e)
      this.game.handleTouch(x, y)
    },

    selectTower(type) {
      if (this.game) {
        this.game.selectTower(type)
      }
    },

    showMathQuestion(difficulty, callback) {
      this.game.pause()
      this.mathCallback = callback
      this.currentQuestion = generateRandomQuestion(difficulty)
      this.gameState.questionsAnswered++

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
      if (this.game && this.game.skipQuestion()) {
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
      if (this.game) {
        this.game.resume()
      }
    },

    pauseGame() {
      if (this.game) {
        this.game.pause()
        this.showPauseModal = true
      }
    },

    resumeGame() {
      this.showPauseModal = false
      if (this.game) {
        this.game.resume()
      }
    },

    toggleSpeed() {
      if (this.game) {
        const speed = this.game.toggleSpeed()
        uni.showToast({ title: `${speed}x 速度`, icon: 'none', duration: 800 })
      }
    },

    restartGame() {
      this.showPauseModal = false
      this.showGameOverModal = false
      if (this.game) {
        this.game.destroy()
      }
      this.comboInfo = { combo: 0, multiplier: 1 }
      this.selectedTower = null
      this.initGame()
    },

    quitGame() {
      this.showPauseModal = false
      this.showGameOverModal = false
      if (this.game) {
        this.game.destroy()
        this.game = null
      }
      this.screen = 'menu'
    },

    shareResult() {
      const text = `🏰 我在【数学塔防】中坚守了 ${this.gameResult.wave} 波！答题正确率 ${this.gameResult.accuracy}%！最高连击 ${this.gameResult.maxCombo}！快来挑战吧！`

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

  onHide() {
    if (this.game && !this.game.state.isGameOver) {
      this.game.pause()
    }
  },

  onShow() {
    // 页面显示时不自动恢复，让用户手动继续
  },

  onUnload() {
    if (this.game) {
      this.game.destroy()
      this.game = null
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

/* 工具界面样式 */
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

/* 连击显示 */
.combo-display {
  position: absolute;
  top: 100rpx;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, rgba(255, 102, 0, 0.9), rgba(255, 51, 51, 0.9));
  padding: 12rpx 32rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  z-index: 10;
  animation: combo-pulse 0.5s ease-in-out infinite;
}

@keyframes combo-pulse {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.05); }
}

.combo-count {
  font-size: 28rpx;
  font-weight: bold;
  color: #fff;
}

.combo-multiplier {
  font-size: 24rpx;
  color: #FFD700;
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

.modal-title, .result-title {
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

/* 工具结束样式 */
.star-rating {
  display: flex;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.star {
  font-size: 48rpx;
  color: #555;
}

.star.active {
  color: #FFD700;
  animation: star-pop 0.3s ease-out;
}

@keyframes star-pop {
  0% { transform: scale(0); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.rating-details {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 24rpx;
}

.detail-item {
  font-size: 24rpx;
  color: #a0a0a0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #4CAF50;
}

.stat-label {
  font-size: 24rpx;
  color: #a0a0a0;
  margin-top: 4rpx;
}

.new-achievements {
  background: rgba(255, 215, 0, 0.1);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #FFD700;
  margin-bottom: 16rpx;
}

.achievement-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 0;
}

.achievement-icon {
  font-size: 36rpx;
}

.achievement-info {
  text-align: left;
}

.achievement-name {
  display: block;
  font-size: 26rpx;
  font-weight: bold;
  color: #ffffff;
}

.achievement-desc {
  display: block;
  font-size: 22rpx;
  color: #a0a0a0;
}

.encouragement {
  padding: 20rpx;
  background: rgba(76, 175, 80, 0.1);
  border-radius: 16rpx;
  margin-bottom: 16rpx;
}

.encouragement text {
  font-size: 28rpx;
  color: #4CAF50;
  font-weight: bold;
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
