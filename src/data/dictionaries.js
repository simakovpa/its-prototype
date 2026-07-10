// Справочники — аналог общесистемных справочников (Номенклатура, Типы дефектов,
// Измеряемые параметры из модуля «Испытания и измерения»). В прототипе — моковые данные.

export const nomenclature = [
  {
    id: 'nom-tdtn-40000-110',
    name: 'ТДТН-40000/110',
    tmcType: 'transformer',
    ratedPowerMVA: 40,
    normativeServiceLifeYears: 25,
  },
  {
    id: 'nom-tdtn-63000-110',
    name: 'ТДТН-63000/110',
    tmcType: 'transformer',
    ratedPowerMVA: 63,
    normativeServiceLifeYears: 25,
  },
  {
    id: 'nom-vvbo-110',
    name: 'Ввод ВВБО-110',
    tmcType: 'bushing',
    normativeServiceLifeYears: 15,
  },
]

export const defectTypes = [
  { id: 'def-bak-crack', name: 'Трещина бака' },
  { id: 'def-winding-geometry', name: 'Нарушение геометрии обмотки' },
  { id: 'def-contact-overheat', name: 'Перегрев контактного соединения' },
  { id: 'def-oil-leak', name: 'Течь масла / разгерметизация' },
]

// Тип сравнения с нормой, как в справочнике «Измеряемый параметр» модуля «Испытания и измерения»
export const measuredParams = [
  { id: 'mp-tg-delta', name: 'tgδ изоляции обмоток', unit: '%', comparisonType: 'not_more' },
  { id: 'mp-winding-resistance', name: 'Сопротивление обмоток', unit: 'Ом', comparisonType: 'in_range' },
  { id: 'mp-no-load-losses', name: 'Потери холостого хода', unit: 'кВт', comparisonType: 'not_more' },
  { id: 'mp-oil-moisture', name: 'Влагосодержание масла', unit: '%', comparisonType: 'not_more' },
]

export const defectStatusesConsideredOpen = ['open', 'in_progress']
