/**
 * UI 交互模块
 */

const UI = {
    // 当前显示的屏幕
    currentScreen: 'main-menu',

    // 数学题回调
    mathCallback: null,
    currentQuestion: null,

    /**
     * 初始化UI
     */
    init() {
        this.bindMenuEvents();
        this.bindGameEvents();
        this.bindModalEvents();
        this.generateLevelGrid();

        // 初始化游戏
        Game.init();
    },

    /**
     * 绑定菜单事件
     */
    bindMenuEvents() {
        // 开始游戏
        document.getElementById('btn-start').addEventListener('click', () => {
            Game.start();
        });

        // 选择关卡
        document.getElementById('btn-select-level').addEventListener('click', () => {
            this.showScreen('level-select');
        });

        // 游戏说明
        document.getElementById('btn-help').addEventListener('click', () => {
            this.showScreen('help-screen');
        });

        // 返回按钮
        document.querySelectorAll('.btn-back').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showScreen('main-menu');
            });
        });
    },

    /**
     * 绑定游戏事件
     */
    bindGameEvents() {
        // 暂停按钮
        document.getElementById('btn-pause').addEventListener('click', () => {
            Game.pause();
        });

        // 速度按钮
        document.getElementById('btn-speed').addEventListener('click', (e) => {
            const speed = Game.toggleSpeed();
            e.target.textContent = speed === 1 ? '⏩' : '⏩⏩';
        });

        // 防御塔选择
        document.querySelectorAll('.tower-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                const towerType = slot.dataset.tower;
                Game.selectTowerType(towerType);
            });
        });
    },

    /**
     * 绑定模态框事件
     */
    bindModalEvents() {
        // 数学题提交
        document.getElementById('btn-submit-answer').addEventListener('click', () => {
            this.submitAnswer();
        });

        // 答案输入框回车提交
        document.getElementById('answer-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitAnswer();
            }
        });

        // 跳过按钮
        document.getElementById('btn-skip').addEventListener('click', () => {
            this.skipQuestion();
        });

        // 暂停菜单按钮
        document.getElementById('btn-resume').addEventListener('click', () => {
            Game.resume();
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            this.hideModal('pause-modal');
            Game.start();
        });

        document.getElementById('btn-quit').addEventListener('click', () => {
            this.hideModal('pause-modal');
            Game.state.isGameOver = true;
            this.showScreen('main-menu');
        });

        // 游戏结束按钮
        document.getElementById('btn-retry').addEventListener('click', () => {
            this.hideModal('game-over-modal');
            Game.start();
        });

        document.getElementById('btn-share').addEventListener('click', () => {
            this.shareResult();
        });

        document.getElementById('btn-back-menu').addEventListener('click', () => {
            this.hideModal('game-over-modal');
            this.showScreen('main-menu');
        });
    },

    /**
     * 生成关卡选择网格
     */
    generateLevelGrid() {
        const grid = document.getElementById('level-grid');
        const totalLevels = 20;
        const unlockedLevels = this.getUnlockedLevels();

        grid.innerHTML = '';

        for (let i = 1; i <= totalLevels; i++) {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            btn.innerHTML = `
                <span class="level-num">${i}</span>
                <span class="stars">${this.getLevelStars(i)}</span>
            `;

            if (i > unlockedLevels) {
                btn.classList.add('locked');
                btn.innerHTML = `<span>🔒</span>`;
            } else {
                btn.addEventListener('click', () => {
                    this.startLevel(i);
                });
            }

            grid.appendChild(btn);
        }
    },

    /**
     * 获取已解锁的关卡数
     */
    getUnlockedLevels() {
        const saved = localStorage.getItem('mathTD_unlockedLevels');
        return saved ? parseInt(saved) : 3;
    },

    /**
     * 获取关卡星级
     */
    getLevelStars(level) {
        const saved = localStorage.getItem(`mathTD_level_${level}_stars`);
        const stars = saved ? parseInt(saved) : 0;
        return '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    },

    /**
     * 开始指定关卡
     */
    startLevel(level) {
        Game.state.wave = level - 1;
        Game.start();
    },

    /**
     * 显示屏幕
     */
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    },

    /**
     * 显示模态框
     */
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    /**
     * 隐藏模态框
     */
    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    /**
     * 显示数学题
     */
    showMathQuestion(difficulty, callback) {
        this.mathCallback = callback;
        this.currentQuestion = MathQuestions.generateRandomQuestion(difficulty);

        Game.state.questionsAnswered++;

        // 更新题目显示
        document.getElementById('question-type').textContent = this.currentQuestion.type;
        document.getElementById('question-text').textContent = this.currentQuestion.question;
        document.getElementById('answer-input').value = '';
        document.getElementById('feedback').textContent = '';
        document.getElementById('feedback').className = 'feedback';

        // 生成选择题选项（50%概率显示选择题）
        const optionsContainer = document.getElementById('answer-options');
        const answerInput = document.getElementById('answer-input');

        if (Math.random() > 0.5 && difficulty <= 2) {
            // 显示选择题
            answerInput.style.display = 'none';
            optionsContainer.style.display = 'grid';

            const options = MathQuestions.generateOptions(this.currentQuestion.answer);
            optionsContainer.innerHTML = '';

            options.forEach(option => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = option;
                btn.addEventListener('click', () => {
                    this.checkAnswer(option.toString());
                });
                optionsContainer.appendChild(btn);
            });
        } else {
            // 显示输入框
            answerInput.style.display = 'block';
            optionsContainer.style.display = 'none';
            setTimeout(() => answerInput.focus(), 100);
        }

        this.showModal('math-modal');
    },

    /**
     * 提交答案
     */
    submitAnswer() {
        const input = document.getElementById('answer-input');
        if (input.style.display !== 'none') {
            this.checkAnswer(input.value);
        }
    },

    /**
     * 检查答案
     */
    checkAnswer(userAnswer) {
        const feedback = document.getElementById('feedback');
        const isCorrect = MathQuestions.checkAnswer(userAnswer, this.currentQuestion.answer);

        if (isCorrect) {
            Game.state.questionsCorrect++;
            feedback.textContent = '✓ 回答正确！';
            feedback.className = 'feedback correct';

            // 高亮正确选项
            document.querySelectorAll('.option-btn').forEach(btn => {
                if (parseFloat(btn.textContent) === this.currentQuestion.answer) {
                    btn.classList.add('correct');
                }
            });

            setTimeout(() => {
                this.hideModal('math-modal');
                if (this.mathCallback) {
                    this.mathCallback(true);
                }
            }, 800);
        } else {
            feedback.textContent = `✗ 答案是 ${this.currentQuestion.answer}`;
            feedback.className = 'feedback wrong';

            // 高亮正确和错误选项
            document.querySelectorAll('.option-btn').forEach(btn => {
                const val = parseFloat(btn.textContent);
                if (val === this.currentQuestion.answer) {
                    btn.classList.add('correct');
                } else if (val === parseFloat(userAnswer)) {
                    btn.classList.add('wrong');
                }
            });

            // 输入框抖动效果
            document.getElementById('answer-input').classList.add('shake');
            setTimeout(() => {
                document.getElementById('answer-input').classList.remove('shake');
            }, 300);

            setTimeout(() => {
                this.hideModal('math-modal');
                if (this.mathCallback) {
                    this.mathCallback(false);
                }
            }, 1500);
        }
    },

    /**
     * 跳过题目
     */
    skipQuestion() {
        if (Game.state.gold >= 20) {
            Game.state.gold -= 20;
            this.updateGold(Game.state.gold);
            this.hideModal('math-modal');
            if (this.mathCallback) {
                this.mathCallback(true);
            }
        } else {
            this.showMessage('金币不足！', 'warning');
        }
    },

    /**
     * 更新生命值显示
     */
    updateLives(lives) {
        document.getElementById('lives').textContent = lives;
        if (lives <= 5) {
            document.getElementById('lives').parentElement.classList.add('pulse');
        }
    },

    /**
     * 更新金币显示
     */
    updateGold(gold) {
        document.getElementById('gold').textContent = gold;

        // 更新防御塔可购买状态
        document.querySelectorAll('.tower-slot').forEach(slot => {
            const towerType = slot.dataset.tower;
            const cost = Game.towerTypes[towerType].cost;
            if (gold < cost) {
                slot.classList.add('disabled');
            } else {
                slot.classList.remove('disabled');
            }
        });
    },

    /**
     * 更新波数显示
     */
    updateWave(wave) {
        document.getElementById('wave').textContent = wave;
    },

    /**
     * 更新防御塔选择状态
     */
    updateTowerSelection(selectedType) {
        document.querySelectorAll('.tower-slot').forEach(slot => {
            if (slot.dataset.tower === selectedType) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        });
    },

    /**
     * 显示消息提示
     */
    showMessage(text, type = 'info') {
        // 创建消息元素
        const msg = document.createElement('div');
        msg.className = `message message-${type}`;
        msg.textContent = text;
        msg.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : type === 'warning' ? '#FF9800' : '#2196F3'};
            color: white;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1000;
            animation: fadeInOut 2s ease;
        `;

        // 添加动画样式
        if (!document.getElementById('message-style')) {
            const style = document.createElement('style');
            style.id = 'message-style';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(msg);

        setTimeout(() => {
            msg.remove();
        }, 2000);
    },

    /**
     * 显示游戏结束
     */
    showGameOver(stats) {
        document.getElementById('game-result-title').textContent = stats.win ? '🎉 胜利！' : '💔 游戏结束';
        document.getElementById('final-wave').textContent = stats.wave;
        document.getElementById('enemies-killed').textContent = stats.enemiesKilled;
        document.getElementById('questions-correct').textContent = stats.questionsCorrect;
        document.getElementById('accuracy').textContent = stats.accuracy + '%';

        // 保存最高记录
        this.saveHighScore(stats);

        this.showModal('game-over-modal');
    },

    /**
     * 保存最高记录
     */
    saveHighScore(stats) {
        const highScore = localStorage.getItem('mathTD_highScore') || 0;
        if (stats.wave > highScore) {
            localStorage.setItem('mathTD_highScore', stats.wave);
        }

        // 解锁下一关
        const currentUnlocked = this.getUnlockedLevels();
        if (stats.wave > currentUnlocked) {
            localStorage.setItem('mathTD_unlockedLevels', Math.min(stats.wave, 20));
        }
    },

    /**
     * 分享结果
     */
    shareResult() {
        const wave = document.getElementById('final-wave').textContent;
        const accuracy = document.getElementById('accuracy').textContent;

        const shareText = `🏰 我在【数学塔防】中坚守了 ${wave} 波！答题正确率 ${accuracy}！快来挑战吧！`;

        // 尝试使用 Web Share API
        if (navigator.share) {
            navigator.share({
                title: '数学塔防 - 五年级上册',
                text: shareText,
                url: window.location.href
            }).catch(() => {
                this.copyToClipboard(shareText);
            });
        } else {
            this.copyToClipboard(shareText);
        }
    },

    /**
     * 复制到剪贴板
     */
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showMessage('已复制到剪贴板，快去分享吧！', 'success');
            });
        } else {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showMessage('已复制到剪贴板，快去分享吧！', 'success');
        }
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
