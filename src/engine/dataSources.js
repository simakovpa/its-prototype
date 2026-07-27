import { measurements, defects, tmcs, today } from '../data/mockAssets.js'
import { nomenclature, defectStatusesConsideredOpen } from '../data/dictionaries.js'

function getTmcById(tmcId) {
  return tmcs.find((t) => t.id === tmcId)
}

function getNomenclature(tmcId) {
  const tmc = getTmcById(tmcId)
  if (!tmc) return null
  return nomenclature.find((n) => n.id === tmc.nomenclatureId) || null
}

export function getMeasuredSeries(tmcId, measuredParamId) {
  return measurements
    .filter((m) => m.tmcId === tmcId && m.measuredParamId === measuredParamId && m.protocolStatus === 'signed')
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

export function getOpenDefectCount(targetTmcId, defectTypeIds) {
  return defects.filter(
    (d) =>
      d.targetKind === 'tmc' &&
      d.targetId === targetTmcId &&
      defectTypeIds.includes(d.typeId) &&
      defectStatusesConsideredOpen.includes(d.status)
  ).length
}

export function getAgeUsagePercent(tmcId) {
  const tmc = getTmcById(tmcId)
  const nom = getNomenclature(tmcId)
  if (!tmc || !nom || !nom.normativeServiceLifeYears) return null
  const ageYears = (today - new Date(tmc.commissioningDate)) / (365.25 * 24 * 3600 * 1000)
  return (ageYears / nom.normativeServiceLifeYears) * 100
}

// Возвращает null (не 0 и не произвольное число), если атрибут не заполнен —
// вызывающий код должен трактовать это как структурное отсутствие показателя
// приведения и исключать экземпляр с перенормировкой (стресс-тест, п.13).
export function getRatedPower(tmcId) {
  const nom = getNomenclature(tmcId)
  return nom?.ratedPowerMVA ?? null
}
