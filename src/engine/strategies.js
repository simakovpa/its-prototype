function sum(arr) {
  return arr.reduce((a, b) => a + b, 0)
}

export const strategies = {
  MIN: (children) => Math.min(...children.map((c) => c.score)),

  SIMPLE_AVERAGE: (children) => sum(children.map((c) => c.score)) / children.length,

  WEIGHTED_SUM: (children) => sum(children.map((c) => c.score * c.weight)),

  WEIGHTED_DEFICIT_INDEX: (children) => {
    const deficit = sum(children.map((c) => c.weight * (4 - c.score)))
    return 100 - (deficit / 4) * 100
  },

  WEIGHTED_BY_ATTRIBUTE: (children) => {
    const totalAttr = sum(children.map((c) => c.attributeValue ?? 0))
    if (totalAttr === 0) return sum(children.map((c) => c.score)) / children.length
    return sum(children.map((c) => c.score * (c.attributeValue ?? 0))) / totalAttr
  },

  THRESHOLD_SHARE_SWITCH: (children, params) => {
    const { badThreshold = 40, badShare = 0.25, strategyIfExceeded = 'MIN', strategyIfNotExceeded = 'WEIGHTED_BY_ATTRIBUTE' } = params || {}
    const badCount = children.filter((c) => c.score <= badThreshold).length
    const share = badCount / children.length
    const chosen = share > badShare ? strategyIfExceeded : strategyIfNotExceeded
    return { result: strategies[chosen](children, params), chosenStrategy: chosen, share }
  },
}

// Проверяет правило коррекции против исходного результата свёртки (rawScore)
// и против ПОЛНОГО списка дочерних узлов, включая исключённых из свёртки —
// критический сигнал не должен теряться из-за отсутствия факта
// (стресс-тест, п.4). Вызывающий код (calculate.js) сам решает, какое из
// нескольких сработавших правил считать действующим (последнее — п.12).
export function checkCorrectionRule(rule, rawScore, allChildren) {
  const cmp = {
    '>': (a, b) => a > b,
    '<': (a, b) => a < b,
    '>=': (a, b) => a >= b,
    '<=': (a, b) => a <= b,
  }[rule.resultComparator || '>']

  const resultConditionMet = rule.resultThreshold == null ? true : cmp(rawScore, rule.resultThreshold)

  let criticalConditionMet = true
  if (rule.requireCriticalChildBelow != null) {
    criticalConditionMet = allChildren.some((c) => {
      if (!c.critical) return false
      // Критический потомок без факта (исключён/структурно отсутствует) сам по
      // себе является тревожным сигналом — его отсутствие не должно "прятать"
      // сработавшее правило коррекции (стресс-тест, п.4).
      if (c.score == null) return true
      return c.score <= rule.requireCriticalChildBelow
    })
  }

  if (resultConditionMet && criticalConditionMet) {
    if (rule.action?.type === 'setValue') return { fired: true, value: rule.action.value }
    if (rule.action?.type === 'capAt') return { fired: true, value: Math.min(rawScore, rule.action.value) }
  }
  return { fired: false, value: rawScore }
}
