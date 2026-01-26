/**
 * 数学题库 - 五年级上册
 * 知识点：小数乘法、小数除法、简易方程、多边形面积
 */

// 难度级别
export const DIFFICULTY = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3
}

// 题目类型
export const TYPES = {
  DECIMAL_MULTIPLY: '小数乘法',
  DECIMAL_DIVIDE: '小数除法',
  EQUATION: '简易方程',
  AREA: '多边形面积'
}

/**
 * 生成随机小数（保留指定位数）
 */
export function randomDecimal(min, max, decimals = 1) {
  const num = Math.random() * (max - min) + min
  return parseFloat(num.toFixed(decimals))
}

/**
 * 生成随机整数
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 四舍五入到指定小数位
 */
export function round(num, decimals = 2) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

/**
 * 打乱数组
 */
export function shuffleArray(array) {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

/**
 * 生成小数乘法题目
 */
export function generateDecimalMultiply(difficulty) {
  let a, b

  switch (difficulty) {
    case DIFFICULTY.EASY:
      a = randomDecimal(0.1, 9.9, 1)
      b = randomInt(2, 9)
      break
    case DIFFICULTY.MEDIUM:
      a = randomDecimal(0.1, 9.9, 1)
      b = randomDecimal(0.1, 9.9, 1)
      break
    case DIFFICULTY.HARD:
      a = randomDecimal(0.01, 9.99, 2)
      b = randomDecimal(0.1, 9.9, 1)
      break
  }

  const answer = round(a * b, 3)

  return {
    type: TYPES.DECIMAL_MULTIPLY,
    question: `${a} × ${b} = ?`,
    answer: answer,
    hint: '提示：先忽略小数点计算，再确定小数点位置',
    difficulty: difficulty
  }
}

/**
 * 生成小数除法题目
 */
export function generateDecimalDivide(difficulty) {
  let a, b, answer

  switch (difficulty) {
    case DIFFICULTY.EASY:
      b = randomInt(2, 9)
      answer = randomDecimal(0.5, 9.5, 1)
      a = round(b * answer, 1)
      break
    case DIFFICULTY.MEDIUM:
      b = randomInt(2, 9)
      answer = randomDecimal(0.1, 9.9, 1)
      a = round(b * answer, 2)
      break
    case DIFFICULTY.HARD:
      b = randomDecimal(0.2, 5, 1)
      answer = randomDecimal(1, 10, 1)
      a = round(b * answer, 2)
      break
  }

  return {
    type: TYPES.DECIMAL_DIVIDE,
    question: `${a} ÷ ${b} = ?`,
    answer: answer,
    hint: '提示：把除数转化成整数再计算',
    difficulty: difficulty
  }
}

/**
 * 生成简易方程题目
 */
export function generateEquation(difficulty) {
  let x, a, b, question, answer

  switch (difficulty) {
    case DIFFICULTY.EASY:
      x = randomInt(1, 50)
      a = randomInt(1, 30)
      if (Math.random() > 0.5) {
        b = x + a
        question = `x + ${a} = ${b}，求 x = ?`
        answer = x
      } else {
        b = x + a
        question = `x - ${a} = ${x}，求 x = ?`
        answer = x + a
      }
      break
    case DIFFICULTY.MEDIUM:
      a = randomInt(2, 9)
      x = randomInt(2, 20)
      if (Math.random() > 0.5) {
        b = a * x
        question = `${a} × x = ${b}，求 x = ?`
        answer = x
      } else {
        x = a * randomInt(2, 10)
        b = x / a
        question = `x ÷ ${a} = ${b}，求 x = ?`
        answer = x
      }
      break
    case DIFFICULTY.HARD:
      a = randomInt(2, 5)
      x = randomInt(2, 15)
      b = randomInt(1, 20)
      const c = a * x + b
      question = `${a}x + ${b} = ${c}，求 x = ?`
      answer = x
      break
  }

  return {
    type: TYPES.EQUATION,
    question: question,
    answer: answer,
    hint: '提示：通过移项和运算找出未知数的值',
    difficulty: difficulty
  }
}

/**
 * 生成多边形面积题目
 */
export function generateArea(difficulty) {
  let question, answer, shape

  switch (difficulty) {
    case DIFFICULTY.EASY:
      if (Math.random() > 0.5) {
        const length = randomInt(3, 12)
        const width = randomInt(2, 10)
        question = `长方形的长是${length}cm，宽是${width}cm，面积是多少cm²？`
        answer = length * width
        shape = '长方形'
      } else {
        const side = randomInt(3, 12)
        question = `正方形的边长是${side}cm，面积是多少cm²？`
        answer = side * side
        shape = '正方形'
      }
      break
    case DIFFICULTY.MEDIUM:
      if (Math.random() > 0.5) {
        const base = randomInt(4, 15)
        const height = randomInt(3, 12)
        question = `平行四边形的底是${base}cm，高是${height}cm，面积是多少cm²？`
        answer = base * height
        shape = '平行四边形'
      } else {
        const base = randomInt(4, 16)
        const height = randomInt(2, 12)
        const actualBase = base % 2 === 0 ? base : base + 1
        question = `三角形的底是${actualBase}cm，高是${height}cm，面积是多少cm²？`
        answer = (actualBase * height) / 2
        shape = '三角形'
      }
      break
    case DIFFICULTY.HARD:
      const top = randomInt(3, 10)
      const bottom = randomInt(top + 2, 18)
      const height = randomInt(2, 10)
      const sum = top + bottom
      question = `梯形的上底是${top}cm，下底是${bottom}cm，高是${height}cm，面积是多少cm²？`
      answer = ((top + bottom) * height) / 2
      shape = '梯形'
      break
  }

  return {
    type: TYPES.AREA,
    question: question,
    answer: answer,
    hint: getAreaHint(shape),
    difficulty: difficulty
  }
}

/**
 * 获取面积公式提示
 */
function getAreaHint(shape) {
  const hints = {
    '长方形': '长方形面积 = 长 × 宽',
    '正方形': '正方形面积 = 边长 × 边长',
    '平行四边形': '平行四边形面积 = 底 × 高',
    '三角形': '三角形面积 = 底 × 高 ÷ 2',
    '梯形': '梯形面积 = (上底 + 下底) × 高 ÷ 2'
  }
  return hints[shape] || ''
}

/**
 * 随机生成题目
 */
export function generateRandomQuestion(difficulty) {
  const generators = [
    generateDecimalMultiply,
    generateDecimalDivide,
    generateEquation,
    generateArea
  ]
  const randomGenerator = generators[Math.floor(Math.random() * generators.length)]
  return randomGenerator(difficulty)
}

/**
 * 生成选择题选项
 */
export function generateOptions(correctAnswer, count = 4) {
  const options = [correctAnswer]
  const isDecimal = !Number.isInteger(correctAnswer)

  while (options.length < count) {
    let wrongAnswer
    const variation = Math.random()

    if (variation < 0.25) {
      wrongAnswer = isDecimal
        ? round(correctAnswer + (Math.random() - 0.5) * 2, 2)
        : correctAnswer + randomInt(-5, 5)
    } else if (variation < 0.5) {
      wrongAnswer = Math.random() > 0.5
        ? round(correctAnswer * 2, 2)
        : round(correctAnswer / 2, 2)
    } else if (variation < 0.75) {
      wrongAnswer = isDecimal
        ? round(correctAnswer * 10, 2)
        : correctAnswer * 10
    } else {
      wrongAnswer = isDecimal
        ? round(correctAnswer * (0.5 + Math.random()), 2)
        : randomInt(1, Math.max(correctAnswer * 2, 10))
    }

    if (wrongAnswer !== correctAnswer && wrongAnswer > 0 && !options.includes(wrongAnswer)) {
      options.push(wrongAnswer)
    }
  }

  return shuffleArray(options)
}

/**
 * 验证答案
 */
export function checkAnswer(userAnswer, correctAnswer, tolerance = 0.01) {
  const user = parseFloat(userAnswer)
  if (isNaN(user)) return false
  return Math.abs(user - correctAnswer) < tolerance
}
