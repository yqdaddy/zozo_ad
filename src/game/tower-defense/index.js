/**
 * 数学塔防游戏 - 入口文件
 */
import { Game } from './core/Game.js'
import { GameLoop } from './core/GameLoop.js'
import { EventBus } from './core/EventBus.js'
import { Tower } from './entities/Tower.js'
import { Enemy } from './entities/Enemy.js'
import { Projectile } from './entities/Projectile.js'
import { Particle } from './entities/Particle.js'
import { PathSystem } from './systems/PathSystem.js'
import { ComboSystem } from './systems/ComboSystem.js'
import { DifficultySystem } from './systems/DifficultySystem.js'
import { AchievementSystem } from './systems/AchievementSystem.js'
import { TOWER_CONFIGS, TOWER_LIST, getUpgradedStats, getUpgradeCost } from './config/towers.js'
import { ENEMY_CONFIGS, getWaveEnemies, getEnemyStats } from './config/enemies.js'

export {
  Game,
  GameLoop,
  EventBus,
  Tower,
  Enemy,
  Projectile,
  Particle,
  PathSystem,
  ComboSystem,
  DifficultySystem,
  AchievementSystem,
  TOWER_CONFIGS,
  TOWER_LIST,
  getUpgradedStats,
  getUpgradeCost,
  ENEMY_CONFIGS,
  getWaveEnemies,
  getEnemyStats
}

export default Game
