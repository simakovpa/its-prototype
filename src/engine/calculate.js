import { strategies, applyCorrectionRule } from './strategies.js'
import { evaluateNumericScale, evaluateCategoricalScale } from './scale.js'
import {
  getMeasuredSeries,
  getOpenDefectCount,
  getAgeUsagePercent,
  getRatedPower,
} from './dataSources.js'
import { tmcs } from '../data/mockAssets.js'

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0)
}

// ---------- Лист дерева методики: Параметр ----------
function evaluateLeaf(node, ctx) {
  const base = {
    id: node.id,
    name: node.name,
    kind: 'leaf',
    weight: node.weight,
    critical: !!node.critical,
    resourceDefining: !!node.resourceDefining,
  }

  let fact = null
  let factDisplay = null

  if (node.source.type === 'measured') {
    const series = getMeasuredSeries(ctx.targetTmcId, node.source.measuredParamId)
    if (series.length > 0) {
      if (node.comparisonMethod === 'trend_fo') {
        const baseline = series[0].value
        const last = series[series.length - 1].value
        fact = ((last - baseline) / baseline) * 100
        factDisplay = `тренд к Фо: ${fact.toFixed(1)}% (Фо=${baseline}, Ф=${last} от ${series[series.length - 1].date})`
      } else if (node.comparisonMethod === 'trend_n') {
        const n = node.trendN || 3
        const recent = series.slice(-n)
        if (recent.length >= 2) {
          const first = recent[0].value
          const last = recent[recent.length - 1].value
          fact = ((last - first) / first) * 100
          factDisplay = `тренд по ${recent.length} последним измерениям: ${fact.toFixed(1)}%`
        }
      } else {
        fact = series[series.length - 1].value
        factDisplay = `Ф = ${fact} (протокол от ${series[series.length - 1].date})`
      }
    }
  } else if (node.source.type === 'defect') {
    const count = getOpenDefectCount(ctx.targetTmcId, node.source.defectTypeIds)
    fact = count > 0 ? 'Имеется' : 'Отсутствует'
    factDisplay = `${fact} (открытых дефектов выбранных типов: ${count})`
  } else if (node.source.type === 'passport') {
    const pct = getAgeUsagePercent(ctx.targetTmcId)
    fact = pct
    factDisplay = pct != null ? `Возраст: ${pct.toFixed(0)}% от нормативного срока службы` : null
  }

  if (fact == null) {
    if (node.missingDataBehavior === 'zero') {
      return { ...base, status: 'ok', score: 0, scaleKind: 'ball', factDisplay: 'Нет факта → балл 0 (настроено как «плохо»)' }
    }
    return { ...base, status: 'excluded', score: null, factDisplay: 'Нет факта → параметр исключён, веса перенормированы' }
  }

  let score = null
  if (node.scale.kind === 'numeric') score = evaluateNumericScale(node.scale.zones, fact)
  else score = evaluateCategoricalScale(node.scale.map, fact)

  if (score == null) {
    return { ...base, status: 'excluded', score: null, factDisplay: `${factDisplay} — вне заданных зон норматива` }
  }

  return {
    ...base,
    status: 'ok',
    score,
    scaleKind: 'ball',
    factDisplay,
  }
}

// ---------- Контейнер: Этап / Узел / Группа / корень методики ----------
function evaluateContainer(node, ctx) {
  const base = {
    id: node.id,
    name: node.name,
    kind: 'container',
    weight: node.weight,
    critical: !!node.critical,
    resourceDefining: !!node.resourceDefining,
  }

  let effectiveCtx = ctx
  if (node.materialization?.type === 'materialized') {
    const sibling = tmcs.find(
      (t) => t.tmId === ctx.tmId && t.tmcType === node.materialization.assetType
    )
    if (!sibling) {
      return {
        ...base,
        status: 'structurally_absent',
        score: null,
        children: [],
        note: `Материализованный узел «${node.name}»: на ТМ не найдена ТМЦ типа «${node.materialization.assetType}» — исключён, вес перенормирован`,
      }
    }
    effectiveCtx = { ...ctx, targetTmcId: sibling.id }
  }

  const evaluatedChildren = node.children.map((child) => evaluateNode(child, effectiveCtx))
  const active = evaluatedChildren.filter((c) => c.status === 'ok')

  if (active.length === 0) {
    return { ...base, status: 'undetermined', score: null, children: evaluatedChildren }
  }

  const totalWeight = sum(active.map((c) => c.weight ?? 0))
  const normalized = active.map((c) => ({
    ...c,
    weight: totalWeight > 0 ? (c.weight ?? 0) / totalWeight : 1 / active.length,
  }))

  let rawScore
  let strategyMeta = null
  if (node.strategy === 'THRESHOLD_SHARE_SWITCH') {
    const r = strategies.THRESHOLD_SHARE_SWITCH(normalized, node.strategyParams)
    rawScore = r.result
    strategyMeta = { chosenStrategy: r.chosenStrategy, share: r.share }
  } else {
    rawScore = strategies[node.strategy](normalized, node.strategyParams)
  }

  let finalScore = rawScore
  let correctionFired = null
  for (const rule of node.correctionRules || []) {
    const r = applyCorrectionRule(rule, finalScore, normalized)
    if (r.fired) {
      finalScore = r.value
      correctionFired = rule
    }
  }

  const scaleKind = node.strategy === 'WEIGHTED_DEFICIT_INDEX' ? 'index' : normalized[0]?.scaleKind || 'ball'

  return {
    ...base,
    status: 'ok',
    score: finalScore,
    scaleKind,
    rawScore,
    strategyMeta,
    correctionFired,
    renormalizedFrom: evaluatedChildren.length !== active.length ? evaluatedChildren.length - active.length : 0,
    children: evaluatedChildren,
  }
}

export function evaluateNode(node, ctx) {
  return node.kind === 'leaf' ? evaluateLeaf(node, ctx) : evaluateContainer(node, ctx)
}

// Расчёт ИТС конкретной единицы оборудования по методике оборудования (шаблону).
export function calculateEquipmentIts(template, tmcId) {
  const tmc = tmcs.find((t) => t.id === tmcId)
  if (!tmc) throw new Error(`ТМЦ ${tmcId} не найдена`)
  const ctx = { targetTmcId: tmcId, tmId: tmc.tmId }
  return evaluateNode(template, ctx)
}

// Расчёт ИТС Объекта: динамически находит оборудование заданного типа среди
// ТМЦ, привязанных к ТМ этого объекта, считает их индивидуальный ИТС по
// соответствующей методике оборудования, дальше сворачивает тем же движком.
export function calculateObjectIts(objectTemplate, objectId, tmsOfObject, equipmentTemplatesByType) {
  function evalObjectNode(node) {
    if (node.kind === 'dynamicGroup') {
      const matchingTmcs = tmcs.filter(
        (t) => tmsOfObject.includes(t.tmId) && t.tmcType === node.assetType
      )
      if (matchingTmcs.length === 0) {
        return {
          id: node.id,
          name: node.name,
          kind: 'container',
          status: node.optional ? 'excluded' : 'undetermined',
          score: null,
          weight: node.weight,
          note: `Оборудование типа «${node.assetType}» на объекте не найдено`,
          children: [],
        }
      }
      const equipmentResults = matchingTmcs.map((t) => {
        const equipmentTemplate = equipmentTemplatesByType[t.tmcType]
        const result = calculateEquipmentIts(equipmentTemplate, t.id)
        return {
          ...result,
          name: `${node.name}: ${t.name}`,
          attributeValue: getRatedPower(t.id) ?? 1,
          weight: 1,
        }
      })
      const active = equipmentResults.filter((c) => c.status === 'ok')
      if (active.length === 0) {
        return { id: node.id, name: node.name, kind: 'container', status: 'undetermined', score: null, children: equipmentResults }
      }
      const score = strategies[node.strategy](active, node.strategyParams)
      return {
        id: node.id,
        name: node.name,
        kind: 'container',
        status: 'ok',
        score,
        scaleKind: 'index',
        weight: node.weight,
        children: equipmentResults,
      }
    }

    // обычный контейнер верхнего уровня (например, звено-цепочка root)
    const evaluatedChildren = node.children.map(evalObjectNode)
    const active = evaluatedChildren.filter((c) => c.status === 'ok')
    if (active.length === 0) {
      return { id: node.id, name: node.name, kind: 'container', status: 'undetermined', score: null, children: evaluatedChildren }
    }
    const totalWeight = sum(active.map((c) => c.weight ?? 1))
    const normalized = active.map((c) => ({ ...c, weight: totalWeight > 0 ? (c.weight ?? 1) / totalWeight : 1 / active.length }))
    const score = strategies[node.strategy](normalized, node.strategyParams)
    return { id: node.id, name: node.name, kind: 'container', status: 'ok', score, scaleKind: 'index', children: evaluatedChildren }
  }

  return evalObjectNode(objectTemplate)
}
