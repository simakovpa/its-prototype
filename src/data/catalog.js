export const strategyOptions = [
  { value: 'MIN', label: 'MIN — минимум среди дочерних' },
  { value: 'SIMPLE_AVERAGE', label: 'Простое среднее' },
  { value: 'WEIGHTED_SUM', label: 'Взвешенная сумма' },
  { value: 'WEIGHTED_DEFICIT_INDEX', label: 'Взвешенный дефицит-индекс (баллы 0–4 → индекс 0–100)' },
  { value: 'WEIGHTED_BY_ATTRIBUTE', label: 'Взвешенное среднее по показателю приведения' },
  { value: 'THRESHOLD_SHARE_SWITCH', label: 'Условная свёртка по доле «плохих» элементов' },
]

export const sourceTypeOptions = [
  { value: 'measured', label: 'Измеряемый параметр (Испытания и измерения)' },
  { value: 'defect', label: 'Дефект (агрегат из Осмотры и дефекты)' },
  { value: 'passport', label: 'Паспортное значение (возраст)' },
]

export const comparisonMethodOptions = [
  { value: 'absolute', label: 'Абсолютное значение' },
  { value: 'trend_fo', label: 'Отклонение от исходного значения (Фо)' },
  { value: 'trend_n', label: 'Тренд по последним N значениям' },
]

export const missingDataOptions = [
  { value: 'exclude', label: 'Исключить, перенормировать веса' },
  { value: 'zero', label: 'Считать балл 0 (плохо)' },
]

export const materializationOptions = [
  { value: 'virtual', label: 'Виртуальный (параметры на самой ЕО)' },
  { value: 'materialized', label: 'Материализованный (ссылка на тип ТМЦ-сиблинга)' },
]

export const scaleKindOptions = [
  { value: 'numeric', label: 'Числовая (зоны Ф/Н)' },
  { value: 'categorical', label: 'Категориальная (значение → балл)' },
]
