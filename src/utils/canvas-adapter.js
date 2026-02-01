/**
 * uni-app Canvas 标准适配器
 * 解决多平台尺寸适配和坐标转换问题
 */
export class CanvasAdapter {
  constructor() {
    this.canvas = null
    this.ctx = null
    this.dpr = 1

    // 逻辑尺寸（用于工具计算）
    this.logicWidth = 0
    this.logicHeight = 0

    // CSS 显示尺寸（用于样式设置）
    this.cssWidth = 0
    this.cssHeight = 0

    // Canvas 物理像素尺寸
    this.physicalWidth = 0
    this.physicalHeight = 0

    // 坐标转换比例
    this.scaleX = 1
    this.scaleY = 1

    // 初始化状态
    this.initialized = false
  }

  /**
   * 初始化 Canvas（统一入口）
   * @param {Object} component - Vue 组件实例 (this)
   * @param {String} canvasId - Canvas 的 id
   * @param {Object} options - 配置项
   */
  async init(component, canvasId, options = {}) {
    const {
      // 是否填满可用空间
      fillContainer = true,
      // 最大重试次数
      maxRetries = 10,
      // 重试间隔（毫秒）
      retryInterval = 50,
      // 期望的尺寸（如果传入则使用，避免从 DOM 获取不准确）
      width = 0,
      height = 0
    } = options

    // 1. 获取 DPR
    // H5 环境：uni-app Canvas 2D 已自动处理 DPR，设置为 1 避免双重缩放
    // 小程序/App 环境：需要手动处理 DPR
    const isH5 = typeof window !== 'undefined' && typeof document !== 'undefined'
    this.isH5 = isH5
    if (isH5) {
      // H5 环境：不进行 DPR 缩放，uni-app 已处理
      this.dpr = 1
    } else {
      // 小程序/App 环境：使用 uni API
      const sysInfo = uni.getSystemInfoSync()
      this.dpr = sysInfo.pixelRatio || 2
    }

    // 2. 计算可用空间
    if (width > 0 && height > 0) {
      // 使用传入的期望尺寸
      this.cssWidth = width
      this.cssHeight = height
    } else {
      // 从 DOM 获取容器尺寸
      const containerInfo = await this._getContainerSize(component, canvasId, maxRetries, retryInterval)
      if (!containerInfo) {
        throw new Error('Canvas container not found')
      }
      this.cssWidth = containerInfo.width
      this.cssHeight = containerInfo.height
    }

    // 3. 计算逻辑尺寸（保持宽高比或填满）
    if (fillContainer) {
      this.logicWidth = this.cssWidth
      this.logicHeight = this.cssHeight
    }

    // 4. 计算物理像素尺寸
    this.physicalWidth = Math.floor(this.cssWidth * this.dpr)
    this.physicalHeight = Math.floor(this.cssHeight * this.dpr)

    // 5. 获取 Canvas 节点并配置（带重试）
    await this._setupCanvasWithRetry(component, canvasId, maxRetries, retryInterval)

    // 6. 计算坐标转换比例
    this._updateScale()

    this.initialized = true

    return {
      ctx: this.ctx,
      width: this.logicWidth,
      height: this.logicHeight,
      cssWidth: this.cssWidth,
      cssHeight: this.cssHeight
    }
  }

  /**
   * 获取容器尺寸（带重试）
   */
  _getContainerSize(component, canvasId, maxRetries, retryInterval) {
    return new Promise((resolve) => {
      let retries = 0

      const tryGetSize = () => {
        const query = uni.createSelectorQuery().in(component)
        query.select(`#${canvasId}`)
          .boundingClientRect()
          .exec((res) => {
            if (res && res[0] && res[0].width > 0) {
              resolve({
                width: res[0].width,
                height: res[0].height
              })
            } else if (retries < maxRetries) {
              retries++
              setTimeout(tryGetSize, retryInterval)
            } else {
              resolve(null)
            }
          })
      }

      tryGetSize()
    })
  }

  /**
   * 设置 Canvas 节点（带重试）
   */
  _setupCanvasWithRetry(component, canvasId, maxRetries, retryInterval) {
    return new Promise((resolve, reject) => {
      let retries = 0

      const trySetup = () => {
        const query = uni.createSelectorQuery().in(component)
        query.select(`#${canvasId}`)
          .fields({ node: true, size: true })
          .exec((res) => {
            if (res && res[0] && res[0].node) {
              this.canvas = res[0].node
              this.ctx = this.canvas.getContext('2d')

              // 设置物理像素尺寸
              this.canvas.width = this.physicalWidth
              this.canvas.height = this.physicalHeight

              // 应用 DPR 缩放
              this.ctx.scale(this.dpr, this.dpr)

              resolve()
            } else if (retries < maxRetries) {
              retries++
              setTimeout(trySetup, retryInterval)
            } else {
              reject(new Error('Canvas node not found after retries'))
            }
          })
      }

      trySetup()
    })
  }

  /**
   * 更新坐标转换比例
   */
  _updateScale() {
    this.scaleX = this.logicWidth / this.cssWidth
    this.scaleY = this.logicHeight / this.cssHeight
  }

  /**
   * 核心方法：将触摸坐标转换为 Canvas 逻辑坐标
   * @param {Object} touch - 触摸事件对象
   * @param {Object} event - 原始事件
   * @returns {Object} { x, y } 逻辑坐标
   */
  touchToLogic(touch, event) {
    let x, y

    // 使用运行时检测而非条件编译（.js文件中条件编译可能不生效）
    const isH5 = typeof window !== 'undefined' && typeof document !== 'undefined'

    if (isH5) {
      // H5 环境
      const rect = event.currentTarget.getBoundingClientRect
        ? event.currentTarget.getBoundingClientRect()
        : { left: 0, top: 0, width: this.cssWidth, height: this.cssHeight }

      // 计算相对于 Canvas 的位置
      x = touch.clientX - rect.left
      y = touch.clientY - rect.top

      // 转换为逻辑坐标（考虑 CSS 尺寸与逻辑尺寸的比例）
      x = x * (this.logicWidth / rect.width)
      y = y * (this.logicHeight / rect.height)
    } else {
      // 小程序环境 - touch.x/y 是相对于组件的坐标
      x = touch.x * this.scaleX
      y = touch.y * this.scaleY
    }

    return { x, y }
  }

  /**
   * 清空画布
   * @param {String} color - 背景色
   */
  clear(color = '#000') {
    this.ctx.fillStyle = color
    this.ctx.fillRect(0, 0, this.logicWidth, this.logicHeight)
  }

  /**
   * 处理窗口尺寸变化
   */
  async handleResize(component, canvasId) {
    const containerInfo = await this._getContainerSize(component, canvasId, 3, 50)
    if (!containerInfo) return false

    // 如果尺寸变化不大，忽略
    if (Math.abs(containerInfo.width - this.cssWidth) < 10 &&
      Math.abs(containerInfo.height - this.cssHeight) < 10) {
      return false
    }

    this.cssWidth = containerInfo.width
    this.cssHeight = containerInfo.height
    this.logicWidth = this.cssWidth
    this.logicHeight = this.cssHeight
    this.physicalWidth = Math.floor(this.cssWidth * this.dpr)
    this.physicalHeight = Math.floor(this.cssHeight * this.dpr)

    this.canvas.width = this.physicalWidth
    this.canvas.height = this.physicalHeight
    this.ctx.scale(this.dpr, this.dpr)

    this._updateScale()
    return true
  }
}

export default CanvasAdapter
