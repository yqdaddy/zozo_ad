/**
 * 数学塔防游戏核心引擎
 */

const Game = {
    // 游戏状态
    state: {
        lives: 20,
        gold: 100,
        wave: 1,
        score: 0,
        isPaused: false,
        isGameOver: false,
        gameSpeed: 1,
        selectedTower: null,
        questionsAnswered: 0,
        questionsCorrect: 0,
        enemiesKilled: 0
    },

    // 游戏配置
    config: {
        gridSize: 40,
        cols: 10,
        rows: 12,
        baseGold: 100,
        goldPerWave: 50,
        difficultyScale: 0.1
    },

    // 画布相关
    canvas: null,
    ctx: null,
    canvasWidth: 0,
    canvasHeight: 0,

    // 游戏对象
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],

    // 路径
    path: [],
    pathGrid: [],

    // 防御塔类型配置
    towerTypes: {
        archer: {
            name: '弓箭塔',
            emoji: '🏹',
            cost: 50,
            damage: 15,
            range: 100,
            fireRate: 800,
            projectileSpeed: 8,
            projectileColor: '#8B4513',
            color: '#8B4513',
            description: '攻速快，伤害低'
        },
        magic: {
            name: '魔法塔',
            emoji: '✨',
            cost: 80,
            damage: 25,
            range: 80,
            fireRate: 1200,
            projectileSpeed: 6,
            projectileColor: '#9C27B0',
            color: '#9C27B0',
            splash: 40,
            description: '范围攻击'
        },
        cannon: {
            name: '炮塔',
            emoji: '💣',
            cost: 100,
            damage: 50,
            range: 90,
            fireRate: 2000,
            projectileSpeed: 5,
            projectileColor: '#333',
            color: '#555',
            description: '伤害高，攻速慢'
        },
        ice: {
            name: '冰冻塔',
            emoji: '❄️',
            cost: 70,
            damage: 10,
            range: 85,
            fireRate: 1000,
            projectileSpeed: 7,
            projectileColor: '#00BCD4',
            color: '#00BCD4',
            slowEffect: 0.5,
            slowDuration: 2000,
            description: '减速敌人'
        }
    },

    // 敌人类型配置
    enemyTypes: {
        basic: {
            name: '小怪',
            emoji: '👾',
            health: 50,
            speed: 1,
            gold: 10,
            color: '#4CAF50'
        },
        fast: {
            name: '快速怪',
            emoji: '💨',
            health: 30,
            speed: 2,
            gold: 15,
            color: '#03A9F4'
        },
        tank: {
            name: '坦克怪',
            emoji: '🛡️',
            health: 150,
            speed: 0.5,
            gold: 25,
            color: '#795548'
        },
        boss: {
            name: 'BOSS',
            emoji: '👹',
            health: 500,
            speed: 0.3,
            gold: 100,
            color: '#F44336'
        }
    },

    /**
     * 初始化游戏（仅绑定事件，不计算尺寸）
     */
    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.bindEvents();

        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            if (this.canvas.offsetParent !== null) {
                this.resizeCanvas();
            }
        });
    },

    /**
     * 初始化画布（在游戏界面显示后调用）
     */
    initCanvas() {
        this.resizeCanvas();
        this.generatePath();
    },

    /**
     * 调整画布大小
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const header = document.querySelector('.game-header');
        const towerBar = document.querySelector('.tower-bar');

        const headerHeight = header ? header.offsetHeight : 50;
        const towerBarHeight = towerBar ? towerBar.offsetHeight : 80;

        // 获取容器尺寸，设置最小值防止出错
        this.canvasWidth = Math.max(container.clientWidth || 320, 320);
        this.canvasHeight = Math.max((container.clientHeight || 480) - headerHeight - towerBarHeight, 200);

        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;

        // 重新计算网格大小，确保最小值
        this.config.gridSize = Math.max(Math.floor(this.canvasWidth / this.config.cols), 20);
        this.config.rows = Math.max(Math.floor(this.canvasHeight / this.config.gridSize), 5);

        // 重新生成路径
        if (this.path.length > 0) {
            this.generatePath();
        }
    },

    /**
     * 生成敌人路径
     */
    generatePath() {
        const { cols, rows, gridSize } = this.config;
        this.path = [];
        this.pathGrid = Array(rows).fill(null).map(() => Array(cols).fill(false));

        // 生成S形路径
        let currentRow = 0;
        let currentCol = 0;
        let direction = 1; // 1: 右, -1: 左

        // 起点
        this.path.push({ x: 0, y: gridSize / 2 });

        while (currentRow < rows - 1) {
            // 水平移动
            while ((direction === 1 && currentCol < cols - 1) || (direction === -1 && currentCol > 0)) {
                this.pathGrid[currentRow][currentCol] = true;
                this.path.push({
                    x: currentCol * gridSize + gridSize / 2,
                    y: currentRow * gridSize + gridSize / 2
                });
                currentCol += direction;
            }
            this.pathGrid[currentRow][currentCol] = true;
            this.path.push({
                x: currentCol * gridSize + gridSize / 2,
                y: currentRow * gridSize + gridSize / 2
            });

            // 向下移动两行
            if (currentRow < rows - 1) {
                currentRow++;
                this.pathGrid[currentRow][currentCol] = true;
                this.path.push({
                    x: currentCol * gridSize + gridSize / 2,
                    y: currentRow * gridSize + gridSize / 2
                });

                if (currentRow < rows - 1) {
                    currentRow++;
                    this.pathGrid[currentRow][currentCol] = true;
                    this.path.push({
                        x: currentCol * gridSize + gridSize / 2,
                        y: currentRow * gridSize + gridSize / 2
                    });
                }
            }

            direction *= -1; // 改变方向
        }

        // 终点
        this.path.push({
            x: this.path[this.path.length - 1].x,
            y: this.canvasHeight
        });
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        // 画布点击事件
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.handleCanvasClick({
                clientX: touch.clientX,
                clientY: touch.clientY,
                target: this.canvas
            });
        });
    },

    /**
     * 处理画布点击
     */
    handleCanvasClick(e) {
        if (this.state.isPaused || this.state.isGameOver) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const gridX = Math.floor(x / this.config.gridSize);
        const gridY = Math.floor(y / this.config.gridSize);

        // 检查是否点击在路径上
        if (this.pathGrid[gridY] && this.pathGrid[gridY][gridX]) {
            return; // 不能在路径上建塔
        }

        // 检查是否已有塔
        const existingTower = this.towers.find(t =>
            t.gridX === gridX && t.gridY === gridY
        );

        if (existingTower) {
            // 点击已有塔，显示升级选项
            this.selectTower(existingTower);
        } else if (this.state.selectedTower) {
            // 建造新塔
            this.tryBuildTower(gridX, gridY, this.state.selectedTower);
        }
    },

    /**
     * 选择防御塔类型
     */
    selectTowerType(type) {
        const towerConfig = this.towerTypes[type];
        if (!towerConfig) return;

        if (this.state.gold >= towerConfig.cost) {
            this.state.selectedTower = type;
            UI.updateTowerSelection(type);
        } else {
            UI.showMessage('金币不足！', 'warning');
        }
    },

    /**
     * 尝试建造防御塔
     */
    tryBuildTower(gridX, gridY, towerType) {
        const config = this.towerTypes[towerType];
        if (this.state.gold < config.cost) {
            UI.showMessage('金币不足！', 'warning');
            return;
        }

        // 获取建塔难度（根据当前波数）
        const difficulty = Math.min(3, Math.ceil(this.state.wave / 3));

        // 显示数学题
        UI.showMathQuestion(difficulty, (correct) => {
            if (correct) {
                this.buildTower(gridX, gridY, towerType);
                UI.showMessage('建造成功！', 'success');
            } else {
                UI.showMessage('答错了，建造失败', 'error');
            }
        });
    },

    /**
     * 建造防御塔
     */
    buildTower(gridX, gridY, type) {
        const config = this.towerTypes[type];
        const tower = {
            id: Date.now(),
            type: type,
            gridX: gridX,
            gridY: gridY,
            x: gridX * this.config.gridSize + this.config.gridSize / 2,
            y: gridY * this.config.gridSize + this.config.gridSize / 2,
            level: 1,
            damage: config.damage,
            range: config.range,
            fireRate: config.fireRate,
            lastFire: 0,
            target: null,
            ...config
        };

        this.towers.push(tower);
        this.state.gold -= config.cost;
        UI.updateGold(this.state.gold);
        this.state.selectedTower = null;
        UI.updateTowerSelection(null);
    },

    /**
     * 选择已存在的塔（用于升级）
     */
    selectTower(tower) {
        // 显示升级选项
        const upgradeCost = Math.floor(tower.cost * tower.level * 0.7);

        if (this.state.gold < upgradeCost) {
            UI.showMessage('金币不足，无法升级', 'warning');
            return;
        }

        const difficulty = Math.min(3, tower.level + 1);
        UI.showMathQuestion(difficulty, (correct) => {
            if (correct) {
                this.upgradeTower(tower);
            } else {
                UI.showMessage('答错了，升级失败', 'error');
            }
        });
    },

    /**
     * 升级防御塔
     */
    upgradeTower(tower) {
        const upgradeCost = Math.floor(tower.cost * tower.level * 0.7);
        tower.level++;
        tower.damage = Math.floor(tower.damage * 1.3);
        tower.range = Math.floor(tower.range * 1.1);
        tower.fireRate = Math.floor(tower.fireRate * 0.9);
        this.state.gold -= upgradeCost;
        UI.updateGold(this.state.gold);
        UI.showMessage(`升级到 ${tower.level} 级！`, 'success');
    },

    /**
     * 开始新波次
     */
    startWave() {
        this.state.waveInProgress = true;
        const waveConfig = this.getWaveConfig(this.state.wave);
        this.spawnEnemies(waveConfig);
    },

    /**
     * 获取波次配置
     */
    getWaveConfig(wave) {
        const config = {
            enemies: [],
            delay: 1000
        };

        // 基础敌人数量随波数增加
        const baseCount = 3 + Math.floor(wave * 1.5);

        // 添加基础敌人
        for (let i = 0; i < baseCount; i++) {
            config.enemies.push('basic');
        }

        // 第3波后加入快速敌人
        if (wave >= 3) {
            const fastCount = Math.floor(wave / 2);
            for (let i = 0; i < fastCount; i++) {
                config.enemies.push('fast');
            }
        }

        // 第5波后加入坦克敌人
        if (wave >= 5) {
            const tankCount = Math.floor(wave / 3);
            for (let i = 0; i < tankCount; i++) {
                config.enemies.push('tank');
            }
        }

        // 每10波一个BOSS
        if (wave % 10 === 0) {
            config.enemies.push('boss');
        }

        // 打乱顺序
        config.enemies = MathQuestions.shuffleArray(config.enemies);

        return config;
    },

    /**
     * 生成敌人
     */
    spawnEnemies(waveConfig) {
        let delay = 0;
        const spawnDelay = waveConfig.delay;
        const totalEnemies = waveConfig.enemies.length;
        let spawnedCount = 0;

        waveConfig.enemies.forEach((type, index) => {
            setTimeout(() => {
                if (!this.state.isGameOver && !this.state.isPaused) {
                    this.spawnEnemy(type);
                }
                spawnedCount++;
                // 所有敌人生成完毕后，标记波次生成完成
                if (spawnedCount >= totalEnemies) {
                    this.state.waveInProgress = false;
                }
            }, delay);
            delay += spawnDelay;
        });
    },

    /**
     * 生成单个敌人
     */
    spawnEnemy(type) {
        // 检查路径是否已生成
        if (!this.path || this.path.length === 0) {
            console.warn('Path not generated yet');
            return;
        }

        const config = this.enemyTypes[type];
        const waveMultiplier = 1 + (this.state.wave - 1) * this.config.difficultyScale;

        const enemy = {
            id: Date.now() + Math.random(),
            type: type,
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
        };

        this.enemies.push(enemy);
    },

    /**
     * 游戏主循环
     */
    gameLoop(timestamp) {
        if (this.state.isGameOver) return;

        if (!this.state.isPaused) {
            this.update(timestamp);
        }
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    },

    /**
     * 更新游戏状态
     */
    update(timestamp) {
        // 更新敌人
        this.updateEnemies();

        // 更新防御塔
        this.updateTowers(timestamp);

        // 更新子弹
        this.updateProjectiles();

        // 更新粒子效果
        this.updateParticles();

        // 检查波次是否完成
        this.checkWaveComplete();
    },

    /**
     * 更新敌人
     */
    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // 检查减速效果
            if (enemy.slowUntil > Date.now()) {
                enemy.speed = enemy.baseSpeed * 0.5;
            } else {
                enemy.speed = enemy.baseSpeed;
            }

            // 移动敌人
            if (enemy.pathIndex < this.path.length - 1) {
                const target = this.path[enemy.pathIndex + 1];
                const dx = target.x - enemy.x;
                const dy = target.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < enemy.speed * this.state.gameSpeed * 2) {
                    enemy.pathIndex++;
                } else {
                    enemy.x += (dx / dist) * enemy.speed * this.state.gameSpeed;
                    enemy.y += (dy / dist) * enemy.speed * this.state.gameSpeed;
                }
            } else {
                // 敌人到达终点
                this.state.lives--;
                UI.updateLives(this.state.lives);
                this.enemies.splice(i, 1);

                if (this.state.lives <= 0) {
                    this.gameOver(false);
                }
                continue;
            }

            // 检查敌人是否死亡
            if (enemy.health <= 0) {
                this.state.gold += enemy.gold;
                this.state.enemiesKilled++;
                UI.updateGold(this.state.gold);
                this.createDeathParticles(enemy.x, enemy.y, enemy.color);
                this.enemies.splice(i, 1);
            }
        }
    },

    /**
     * 更新防御塔
     */
    updateTowers(timestamp) {
        this.towers.forEach(tower => {
            // 寻找目标
            let target = null;
            let minDist = tower.range;

            this.enemies.forEach(enemy => {
                const dist = Math.sqrt(
                    Math.pow(enemy.x - tower.x, 2) +
                    Math.pow(enemy.y - tower.y, 2)
                );
                if (dist < minDist) {
                    minDist = dist;
                    target = enemy;
                }
            });

            tower.target = target;

            // 发射子弹
            if (target && timestamp - tower.lastFire > tower.fireRate / this.state.gameSpeed) {
                this.fireProjectile(tower, target);
                tower.lastFire = timestamp;
            }
        });
    },

    /**
     * 发射子弹
     */
    fireProjectile(tower, target) {
        const projectile = {
            id: Date.now() + Math.random(),
            x: tower.x,
            y: tower.y,
            targetId: target.id,
            damage: tower.damage,
            speed: tower.projectileSpeed,
            color: tower.projectileColor,
            splash: tower.splash || 0,
            slowEffect: tower.slowEffect || 0,
            slowDuration: tower.slowDuration || 0
        };

        this.projectiles.push(projectile);
    },

    /**
     * 更新子弹
     */
    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            const target = this.enemies.find(e => e.id === proj.targetId);

            if (!target) {
                this.projectiles.splice(i, 1);
                continue;
            }

            const dx = target.x - proj.x;
            const dy = target.y - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 10) {
                // 命中目标
                target.health -= proj.damage;

                // 减速效果
                if (proj.slowEffect) {
                    target.slowUntil = Date.now() + proj.slowDuration;
                }

                // 溅射伤害
                if (proj.splash) {
                    this.enemies.forEach(enemy => {
                        if (enemy.id !== target.id) {
                            const splashDist = Math.sqrt(
                                Math.pow(enemy.x - target.x, 2) +
                                Math.pow(enemy.y - target.y, 2)
                            );
                            if (splashDist < proj.splash) {
                                enemy.health -= proj.damage * 0.5;
                            }
                        }
                    });
                }

                this.createHitParticles(proj.x, proj.y, proj.color);
                this.projectiles.splice(i, 1);
            } else {
                // 移动子弹
                proj.x += (dx / dist) * proj.speed * this.state.gameSpeed;
                proj.y += (dy / dist) * proj.speed * this.state.gameSpeed;
            }
        }
    },

    /**
     * 创建命中粒子效果
     */
    createHitParticles(x, y, color) {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 20,
                color: color,
                size: 3
            });
        }
    },

    /**
     * 创建死亡粒子效果
     */
    createDeathParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30,
                color: color,
                size: 5
            });
        }
    },

    /**
     * 更新粒子
     */
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.size *= 0.95;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    },

    /**
     * 检查波次是否完成
     */
    checkWaveComplete() {
        if (this.enemies.length === 0 && !this.state.waveInProgress) {
            // 波次完成
            this.state.wave++;
            this.state.gold += this.config.goldPerWave;
            UI.updateWave(this.state.wave);
            UI.updateGold(this.state.gold);
            UI.showMessage(`第 ${this.state.wave} 波来袭！`, 'info');

            // 短暂延迟后开始下一波
            setTimeout(() => {
                if (!this.state.isGameOver) {
                    this.startWave();
                }
            }, 2000);
        }
    },

    /**
     * 渲染游戏画面
     */
    render() {
        const { ctx, canvasWidth, canvasHeight } = this;

        // 清空画布
        ctx.fillStyle = '#2d5016';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 绘制网格
        this.renderGrid();

        // 绘制路径
        this.renderPath();

        // 绘制防御塔
        this.renderTowers();

        // 绘制敌人
        this.renderEnemies();

        // 绘制子弹
        this.renderProjectiles();

        // 绘制粒子
        this.renderParticles();

        // 绘制选中塔的范围
        if (this.state.selectedTower) {
            this.renderPlacementPreview();
        }
    },

    /**
     * 绘制网格
     */
    renderGrid() {
        const { ctx, config } = this;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        for (let i = 0; i <= config.cols; i++) {
            ctx.beginPath();
            ctx.moveTo(i * config.gridSize, 0);
            ctx.lineTo(i * config.gridSize, this.canvasHeight);
            ctx.stroke();
        }

        for (let i = 0; i <= config.rows; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * config.gridSize);
            ctx.lineTo(this.canvasWidth, i * config.gridSize);
            ctx.stroke();
        }
    },

    /**
     * 绘制路径
     */
    renderPath() {
        const { ctx, path, config } = this;

        if (path.length < 2) return;

        // 绘制路径背景
        ctx.fillStyle = '#8B7355';
        for (let row = 0; row < this.pathGrid.length; row++) {
            for (let col = 0; col < this.pathGrid[row].length; col++) {
                if (this.pathGrid[row][col]) {
                    ctx.fillRect(
                        col * config.gridSize + 2,
                        row * config.gridSize + 2,
                        config.gridSize - 4,
                        config.gridSize - 4
                    );
                }
            }
        }

        // 绘制起点和终点标记
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.arc(path[0].x, path[0].y, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#F44336';
        ctx.beginPath();
        ctx.arc(path[path.length - 1].x, path[path.length - 1].y, 10, 0, Math.PI * 2);
        ctx.fill();
    },

    /**
     * 绘制防御塔
     */
    renderTowers() {
        const { ctx, config } = this;

        this.towers.forEach(tower => {
            const size = config.gridSize - 10;

            // 绘制塔底座
            ctx.fillStyle = tower.color;
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, size / 2, 0, Math.PI * 2);
            ctx.fill();

            // 绘制等级指示
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(tower.level, tower.x, tower.y - size / 2 - 5);

            // 绘制emoji
            ctx.font = `${size * 0.6}px Arial`;
            ctx.textBaseline = 'middle';
            ctx.fillText(tower.emoji, tower.x, tower.y);

            // 如果有目标，绘制瞄准线
            if (tower.target) {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(tower.x, tower.y);
                ctx.lineTo(tower.target.x, tower.target.y);
                ctx.stroke();
            }
        });
    },

    /**
     * 绘制敌人
     */
    renderEnemies() {
        const { ctx } = this;

        this.enemies.forEach(enemy => {
            const size = 25;

            // 绘制敌人
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, size / 2, 0, Math.PI * 2);
            ctx.fill();

            // 绘制emoji
            ctx.font = `${size * 0.7}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(enemy.emoji, enemy.x, enemy.y);

            // 绘制血条
            const healthBarWidth = 30;
            const healthBarHeight = 4;
            const healthPercent = enemy.health / enemy.maxHealth;

            ctx.fillStyle = '#333';
            ctx.fillRect(
                enemy.x - healthBarWidth / 2,
                enemy.y - size / 2 - 10,
                healthBarWidth,
                healthBarHeight
            );

            ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336';
            ctx.fillRect(
                enemy.x - healthBarWidth / 2,
                enemy.y - size / 2 - 10,
                healthBarWidth * healthPercent,
                healthBarHeight
            );

            // 绘制减速效果
            if (enemy.slowUntil > Date.now()) {
                ctx.fillStyle = 'rgba(0, 188, 212, 0.5)';
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, size / 2 + 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    },

    /**
     * 绘制子弹
     */
    renderProjectiles() {
        const { ctx } = this;

        this.projectiles.forEach(proj => {
            ctx.fillStyle = proj.color;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    /**
     * 绘制粒子
     */
    renderParticles() {
        const { ctx } = this;

        this.particles.forEach(p => {
            ctx.globalAlpha = p.life / 30;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    },

    /**
     * 绘制放置预览
     */
    renderPlacementPreview() {
        const { ctx, config } = this;
        const towerConfig = this.towerTypes[this.state.selectedTower];

        // 高亮可放置的格子
        for (let row = 0; row < this.pathGrid.length; row++) {
            for (let col = 0; col < this.pathGrid[row].length; col++) {
                if (!this.pathGrid[row][col]) {
                    const hasTower = this.towers.some(t => t.gridX === col && t.gridY === row);
                    if (!hasTower) {
                        ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
                        ctx.fillRect(
                            col * config.gridSize + 2,
                            row * config.gridSize + 2,
                            config.gridSize - 4,
                            config.gridSize - 4
                        );
                    }
                }
            }
        }
    },

    /**
     * 开始游戏
     */
    start() {
        this.resetGame();
        UI.showScreen('game-screen');

        // 延迟初始化画布，确保游戏屏幕已显示
        requestAnimationFrame(() => {
            this.initCanvas();
            this.startWave();
            this.gameLoop(0);
        });
    },

    /**
     * 重置游戏
     */
    resetGame() {
        this.state = {
            lives: 20,
            gold: 100,
            wave: 0,
            score: 0,
            isPaused: false,
            isGameOver: false,
            gameSpeed: 1,
            selectedTower: null,
            questionsAnswered: 0,
            questionsCorrect: 0,
            enemiesKilled: 0,
            waveInProgress: false
        };

        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];

        UI.updateLives(this.state.lives);
        UI.updateGold(this.state.gold);
        UI.updateWave(1);
    },

    /**
     * 暂停游戏
     */
    pause() {
        this.state.isPaused = true;
        UI.showModal('pause-modal');
    },

    /**
     * 继续游戏
     */
    resume() {
        this.state.isPaused = false;
        UI.hideModal('pause-modal');
    },

    /**
     * 游戏结束
     */
    gameOver(win) {
        this.state.isGameOver = true;

        const accuracy = this.state.questionsAnswered > 0
            ? Math.round((this.state.questionsCorrect / this.state.questionsAnswered) * 100)
            : 0;

        UI.showGameOver({
            win: win,
            wave: this.state.wave,
            enemiesKilled: this.state.enemiesKilled,
            questionsCorrect: this.state.questionsCorrect,
            accuracy: accuracy
        });
    },

    /**
     * 切换游戏速度
     */
    toggleSpeed() {
        this.state.gameSpeed = this.state.gameSpeed === 1 ? 2 : 1;
        return this.state.gameSpeed;
    }
};
