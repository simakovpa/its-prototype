// Сопоставление факта со шкалой оценки — раздел 9.2/9.1 архитектурного документа.
// Числовая шкала: массив зон { min, minInclusive, max, maxInclusive, score }.
// Категориальная шкала: массив { value, score }.

export function evaluateNumericScale(zones, value) {
  for (const z of zones) {
    const minOk = z.min == null || (z.minInclusive ? value >= z.min : value > z.min)
    const maxOk = z.max == null || (z.maxInclusive ? value <= z.max : value < z.max)
    if (minOk && maxOk) return z.score
  }
  return null
}

export function evaluateCategoricalScale(map, value) {
  const entry = map.find((m) => m.value === value)
  return entry ? entry.score : null
}

// Категории технического состояния (раздел 9.3) — тоже зоны, но применяются
// к итоговому индексу 0–100, а не к сырому параметру.
export const defaultConditionCategories = [
  { min: 0, minInclusive: true, max: 25, maxInclusive: true, label: 'Критическое', color: '#cf1322' },
  { min: 25, minInclusive: false, max: 50, maxInclusive: true, label: 'Неудовлетворительное', color: '#d46b08' },
  { min: 50, minInclusive: false, max: 70, maxInclusive: true, label: 'Удовлетворительное', color: '#d4b106' },
  { min: 70, minInclusive: false, max: 85, maxInclusive: true, label: 'Хорошее', color: '#389e0d' },
  { min: 85, minInclusive: false, max: 100, maxInclusive: true, label: 'Очень хорошее', color: '#237804' },
]

export function categoryFor(value, categories = defaultConditionCategories) {
  if (value == null || Number.isNaN(value)) {
    return { label: 'Не определено', color: '#8c8c8c' }
  }
  const found = categories.find(
    (c) =>
      (c.min == null || (c.minInclusive ? value >= c.min : value > c.min)) &&
      (c.max == null || (c.maxInclusive ? value <= c.max : value < c.max))
  )
  return found || { label: 'Не определено', color: '#8c8c8c' }
}
