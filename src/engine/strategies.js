// Каталог предустановленных стратегий свёртки. Каждая функция принимает
// массив активных дочерних элементов вида { score, weight, ...meta } и
// возвращает число — результат свёртки. Веса уже перенормированы вызывающим
// кодом (см. calculate.js) для активных (не исключённых) элементов.

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0)
}

export const strategies = {
  // Минимум среди дочерних значений — п.3.4 (группа параметров), п.3.11 (цепочка)
  MIN: (children) => Math.min(...children.map((c) => c.score)),

  // Простое среднее (равные веса) — формула (3), ЛЭП по сегментам
  SIMPLE_AVERAGE: (children) => sum(children.map((c) => c.score)) / children.length,

  // Взвешенная сумма — формула (2), оборудование из узлов
  WEIGHTED_SUM: (children) => sum(children.map((c) => c.score * c.weight)),

  // 100 − Σ(вес×(4−балл))/4 × 100 — формула (1), узел из баллов групп параметров (0–4 → 0–100)
  WEIGHTED_DEFICIT_INDEX: (children) => {
    const deficit = sum(children.map((c) => c.weight * (4 - c.score)))
    return 100 - (deficit / 4) * 100
  },

  // Взвешенное среднее по показателю приведения — формулы (4)/(5)
  WEIGHTED_BY_ATTRIBUTE: (children) => {
    const totalAttr = sum(children.map((c) => c.attributeValue ?? 0))
    if (totalAttr === 0) return sum(children.map((c) => c.score)) / children.length
    return sum(children.map((c) => c.score * (c.attributeValue ?? 0))) / totalAttr
  },

  // Условная свёртка по доле «плохих» элементов
  THRESHOLD_SHARE_SWITCH: (children, params) => {
    const { badThreshold = 40, badShare = 0.25, strategyIfExceeded = 'MIN', strategyIfNotExceeded = 'WEIGHTED_BY_ATTRIBUTE' } = params || {}
    const badCount = children.filter((c) => c.score <= badThreshold).length
    const share = badCount / children.length
    const chosen = share > badShare ? strategyIfExceeded : strategyIfNotExceeded
    return { result: strategies[chosen](children, params), chosenStrategy: chosen, share }
  },
}

// Применение правила коррекции поверх уже посчитанного результата контейнера.
// rule: { resultComparator: '>'|'<'|'>=', resultThreshold, requireCriticalChildBelow, action: {type:'setValue'|'capAt', value} }
export function applyCorrectionRule(rule, rawScore, children) {
  const cmp = {
    '>': (a, b) => a > b,
    '<': (a, b) => a < b,
    '>=': (a, b) => a >= b,
    '<=': (a, b) => a <= b,
  }[rule.resultComparator || '>']

  const resultConditionMet = rule.resultThreshold == null ? true : cmp(rawScore, rule.resultThreshold)

  let criticalConditionMet = true
  if (rule.requireCriticalChildBelow != null) {
    criticalConditionMet = children.some(
      (c) => c.critical && c.score <= rule.requireCriticalChildBelow
    )
  }

  if (resultConditionMet && criticalConditionMet) {
    if (rule.action?.type === 'setValue') return { fired: true, value: rule.action.value }
    if (rule.action?.type === 'capAt') return { fired: true, value: Math.min(rawScore, rule.action.value) }
  }
  return { fired: false, value: rawScore }
}
