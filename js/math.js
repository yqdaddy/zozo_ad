/**
 * 数学题库 - 五年级上册
 * 知识点：小数乘法、小数除法、简易方程、多边形面积
 */

const MathQuestions = {
    // 难度级别
    DIFFICULTY: {
        EASY: 1,
        MEDIUM: 2,
        HARD: 3
    },

    // 题目类型
    TYPES: {
        DECIMAL_MULTIPLY: '小数乘法',
        DECIMAL_DIVIDE: '小数除法',
        EQUATION: '简易方程',
        AREA: '多边形面积'
    },

    /**
     * 生成随机小数（保留指定位数）
     */
    randomDecimal(min, max, decimals = 1) {
        const num = Math.random() * (max - min) + min;
        return parseFloat(num.toFixed(decimals));
    },

    /**
     * 生成随机整数
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * 四舍五入到指定小数位
     */
    round(num, decimals = 2) {
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    },

    /**
     * 生成小数乘法题目
     */
    generateDecimalMultiply(difficulty) {
        let a, b, answer;

        switch (difficulty) {
            case this.DIFFICULTY.EASY:
                // 简单：一位小数 × 整数
                a = this.randomDecimal(0.1, 9.9, 1);
                b = this.randomInt(2, 9);
                break;
            case this.DIFFICULTY.MEDIUM:
                // 中等：一位小数 × 一位小数
                a = this.randomDecimal(0.1, 9.9, 1);
                b = this.randomDecimal(0.1, 9.9, 1);
                break;
            case this.DIFFICULTY.HARD:
                // 困难：两位小数 × 一位小数
                a = this.randomDecimal(0.01, 9.99, 2);
                b = this.randomDecimal(0.1, 9.9, 1);
                break;
        }

        answer = this.round(a * b, 3);

        return {
            type: this.TYPES.DECIMAL_MULTIPLY,
            question: `${a} × ${b} = ?`,
            answer: answer,
            hint: `提示：先忽略小数点计算，再确定小数点位置`,
            difficulty: difficulty
        };
    },

    /**
     * 生成小数除法题目
     */
    generateDecimalDivide(difficulty) {
        let a, b, answer;

        switch (difficulty) {
            case this.DIFFICULTY.EASY:
                // 简单：整数 ÷ 整数 = 一位小数
                b = this.randomInt(2, 9);
                answer = this.randomDecimal(0.5, 9.5, 1);
                a = this.round(b * answer, 1);
                break;
            case this.DIFFICULTY.MEDIUM:
                // 中等：小数 ÷ 整数
                b = this.randomInt(2, 9);
                answer = this.randomDecimal(0.1, 9.9, 1);
                a = this.round(b * answer, 2);
                break;
            case this.DIFFICULTY.HARD:
                // 困难：小数 ÷ 小数
                b = this.randomDecimal(0.2, 5, 1);
                answer = this.randomDecimal(1, 10, 1);
                a = this.round(b * answer, 2);
                break;
        }

        return {
            type: this.TYPES.DECIMAL_DIVIDE,
            question: `${a} ÷ ${b} = ?`,
            answer: answer,
            hint: `提示：把除数转化成整数再计算`,
            difficulty: difficulty
        };
    },

    /**
     * 生成简易方程题目
     */
    generateEquation(difficulty) {
        let x, a, b, question, answer;

        switch (difficulty) {
            case this.DIFFICULTY.EASY:
                // 简单：x + a = b 或 x - a = b
                x = this.randomInt(1, 50);
                a = this.randomInt(1, 30);
                if (Math.random() > 0.5) {
                    b = x + a;
                    question = `x + ${a} = ${b}，求 x = ?`;
                } else {
                    b = x - a;
                    question = `x - ${a} = ${b}，求 x = ?`;
                    x = b + a; // 重新计算答案
                }
                answer = x;
                break;
            case this.DIFFICULTY.MEDIUM:
                // 中等：a × x = b 或 x ÷ a = b
                a = this.randomInt(2, 9);
                x = this.randomInt(2, 20);
                if (Math.random() > 0.5) {
                    b = a * x;
                    question = `${a} × x = ${b}，求 x = ?`;
                    answer = x;
                } else {
                    b = x / a;
                    if (Number.isInteger(b)) {
                        question = `x ÷ ${a} = ${b}，求 x = ?`;
                        answer = x;
                    } else {
                        // 确保整除
                        x = a * this.randomInt(2, 10);
                        b = x / a;
                        question = `x ÷ ${a} = ${b}，求 x = ?`;
                        answer = x;
                    }
                }
                break;
            case this.DIFFICULTY.HARD:
                // 困难：ax + b = c 或 ax - b = c
                a = this.randomInt(2, 5);
                x = this.randomInt(2, 15);
                b = this.randomInt(1, 20);
                const c = a * x + b;
                question = `${a}x + ${b} = ${c}，求 x = ?`;
                answer = x;
                break;
        }

        return {
            type: this.TYPES.EQUATION,
            question: question,
            answer: answer,
            hint: `提示：通过移项和运算找出未知数的值`,
            difficulty: difficulty
        };
    },

    /**
     * 生成多边形面积题目
     */
    generateArea(difficulty) {
        let question, answer, shape;

        switch (difficulty) {
            case this.DIFFICULTY.EASY:
                // 简单：长方形或正方形面积
                if (Math.random() > 0.5) {
                    const length = this.randomInt(3, 12);
                    const width = this.randomInt(2, 10);
                    question = `长方形的长是${length}cm，宽是${width}cm，面积是多少cm²？`;
                    answer = length * width;
                    shape = '长方形';
                } else {
                    const side = this.randomInt(3, 12);
                    question = `正方形的边长是${side}cm，面积是多少cm²？`;
                    answer = side * side;
                    shape = '正方形';
                }
                break;
            case this.DIFFICULTY.MEDIUM:
                // 中等：平行四边形或三角形面积
                if (Math.random() > 0.5) {
                    const base = this.randomInt(4, 15);
                    const height = this.randomInt(3, 12);
                    question = `平行四边形的底是${base}cm，高是${height}cm，面积是多少cm²？`;
                    answer = base * height;
                    shape = '平行四边形';
                } else {
                    const base = this.randomInt(4, 16);
                    const height = this.randomInt(2, 12);
                    // 确保面积是整数
                    const actualBase = base % 2 === 0 ? base : base + 1;
                    question = `三角形的底是${actualBase}cm，高是${height}cm，面积是多少cm²？`;
                    answer = (actualBase * height) / 2;
                    shape = '三角形';
                }
                break;
            case this.DIFFICULTY.HARD:
                // 困难：梯形面积
                const top = this.randomInt(3, 10);
                const bottom = this.randomInt(top + 2, 18);
                const height = this.randomInt(2, 10);
                // 确保面积是整数或简单小数
                const sum = top + bottom;
                const actualHeight = sum % 2 === 0 ? height : height * 2;
                const actualSum = sum % 2 === 0 ? sum : sum;
                question = `梯形的上底是${top}cm，下底是${bottom}cm，高是${sum % 2 === 0 ? height : height}cm，面积是多少cm²？`;
                answer = ((top + bottom) * (sum % 2 === 0 ? height : height)) / 2;
                shape = '梯形';
                break;
        }

        return {
            type: this.TYPES.AREA,
            question: question,
            answer: answer,
            hint: this.getAreaHint(shape),
            difficulty: difficulty
        };
    },

    /**
     * 获取面积公式提示
     */
    getAreaHint(shape) {
        const hints = {
            '长方形': '长方形面积 = 长 × 宽',
            '正方形': '正方形面积 = 边长 × 边长',
            '平行四边形': '平行四边形面积 = 底 × 高',
            '三角形': '三角形面积 = 底 × 高 ÷ 2',
            '梯形': '梯形面积 = (上底 + 下底) × 高 ÷ 2'
        };
        return hints[shape] || '';
    },

    /**
     * 根据类型和难度生成题目
     */
    generateQuestion(type, difficulty) {
        switch (type) {
            case this.TYPES.DECIMAL_MULTIPLY:
                return this.generateDecimalMultiply(difficulty);
            case this.TYPES.DECIMAL_DIVIDE:
                return this.generateDecimalDivide(difficulty);
            case this.TYPES.EQUATION:
                return this.generateEquation(difficulty);
            case this.TYPES.AREA:
                return this.generateArea(difficulty);
            default:
                return this.generateRandomQuestion(difficulty);
        }
    },

    /**
     * 随机生成题目
     */
    generateRandomQuestion(difficulty) {
        const types = [
            this.TYPES.DECIMAL_MULTIPLY,
            this.TYPES.DECIMAL_DIVIDE,
            this.TYPES.EQUATION,
            this.TYPES.AREA
        ];
        const randomType = types[Math.floor(Math.random() * types.length)];
        return this.generateQuestion(randomType, difficulty);
    },

    /**
     * 生成选择题选项
     */
    generateOptions(correctAnswer, count = 4) {
        const options = [correctAnswer];
        const isDecimal = !Number.isInteger(correctAnswer);

        while (options.length < count) {
            let wrongAnswer;
            const variation = Math.random();

            if (variation < 0.25) {
                // 接近正确答案的错误选项
                wrongAnswer = isDecimal
                    ? this.round(correctAnswer + (Math.random() - 0.5) * 2, 2)
                    : correctAnswer + this.randomInt(-5, 5);
            } else if (variation < 0.5) {
                // 两倍或一半
                wrongAnswer = Math.random() > 0.5
                    ? this.round(correctAnswer * 2, 2)
                    : this.round(correctAnswer / 2, 2);
            } else if (variation < 0.75) {
                // 小数点位置错误
                wrongAnswer = isDecimal
                    ? this.round(correctAnswer * 10, 2)
                    : correctAnswer * 10;
            } else {
                // 随机错误
                wrongAnswer = isDecimal
                    ? this.round(correctAnswer * (0.5 + Math.random()), 2)
                    : this.randomInt(1, correctAnswer * 2);
            }

            // 确保错误答案不等于正确答案且为正数
            if (wrongAnswer !== correctAnswer && wrongAnswer > 0 && !options.includes(wrongAnswer)) {
                options.push(wrongAnswer);
            }
        }

        // 打乱选项顺序
        return this.shuffleArray(options);
    },

    /**
     * 打乱数组
     */
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    },

    /**
     * 验证答案
     */
    checkAnswer(userAnswer, correctAnswer, tolerance = 0.01) {
        const user = parseFloat(userAnswer);
        if (isNaN(user)) return false;
        return Math.abs(user - correctAnswer) < tolerance;
    }
};

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MathQuestions;
}
