/**
 * 敌人配置
 */
export const ENEMY_CONFIGS = {
  basic: {
    name: '小怪',
    emoji: '👾',
    health: 40,
    speed: 0.8,
    gold: 10,
    color: '#4CAF50'
  },
  fast: {
    name: '快速怪',
    emoji: '💨',
    health: 25,
    speed: 1.5,
    gold: 15,
    color: '#03A9F4'
  },
  tank: {
    name: '坦克怪',
    emoji: '🛡️',
    health: 100,
    speed: 0.4,
    gold: 25,
    color: '#795548'
  },
  boss: {
    name: 'Boss',
    emoji: '👹',
    health: 300,
    speed: 0.3,
    gold: 100,
    color: '#F44336'
  }
}

/**
 * 获取波次敌人配置
 * @param {Number} wave - 波次数
 */
export function getWaveEnemies(wave) {
  const enemies = []
  const baseCount = 3 + Math.floor(wave * 1.2)

  // 基础怪
  for (let i = 0; i < baseCount; i++) {
    enemies.push('basic')
  }

  // 第 2 波起加入快速怪
  if (wave >= 2) {
    const fastCount = Math.floor(wave / 2)
    for (let i = 0; i < fastCount; i++) {
      enemies.push('fast')
    }
  }

  // 第 4 波起加入坦克怪
  if (wave >= 4) {
    const tankCount = Math.floor(wave / 3)
    for (let i = 0; i < tankCount; i++) {
      enemies.push('tank')
    }
  }

  // 每 5 波出现 Boss
  if (wave % 5 === 0) {
    enemies.push('boss')
  }

  return enemies
}

/**
 * 获取敌人属性（考虑波次加成）
 * @param {String} type - 敌人类型
 * @param {Number} wave - 当前波次
 */
export function getEnemyStats(type, wave) {
  const base = ENEMY_CONFIGS[type]
  const waveMultiplier = 1 + (wave - 1) * 0.15

  return {
    ...base,
    health: Math.floor(base.health * waveMultiplier),
    maxHealth: Math.floor(base.health * waveMultiplier)
  }
}

export default ENEMY_CONFIGS
