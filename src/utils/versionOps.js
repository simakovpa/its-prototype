// Версионирование методики — раздел 2.1 архитектурного документа.
// Методика = идентичность (id, name, level, assetType) + мутабельный черновик +
// список неизменяемых опубликованных версий (ровно одна из них имеет status 'active').

import { nextId } from './treeOps.js'

export function getActiveVersion(methodology) {
  return methodology.versions.find((v) => v.status === 'active') || null
}

export function getVersionById(methodology, versionId) {
  if (!versionId || versionId === 'draft') return null
  return methodology.versions.find((v) => v.id === versionId) || null
}

// Шаблон, который нужно использовать для расчёта: либо черновик, либо конкретная
// (в т.ч. архивная) опубликованная версия.
export function resolveTemplate(methodology, versionId) {
  if (!versionId || versionId === 'draft') return methodology.draft
  const v = getVersionById(methodology, versionId)
  return v ? v.template : methodology.draft
}

export function publishVersion(methodology, note) {
  const nextNumber = methodology.versions.length
    ? Math.max(...methodology.versions.map((v) => v.number)) + 1
    : 1
  const newVersion = {
    id: nextId('ver'),
    number: nextNumber,
    publishedAt: new Date().toISOString(),
    note: note || '',
    template: structuredClone ? structuredClone(methodology.draft) : JSON.parse(JSON.stringify(methodology.draft)),
    status: 'active',
  }
  return {
    ...methodology,
    versions: [...methodology.versions.map((v) => ({ ...v, status: 'archived' })), newVersion],
  }
}

export function versionLabel(methodology, versionId) {
  if (!versionId || versionId === 'draft') return 'Черновик (неопубликовано)'
  const v = getVersionById(methodology, versionId)
  if (!v) return '—'
  const date = new Date(v.publishedAt).toLocaleDateString('ru-RU')
  return `v${v.number} от ${date}${v.status === 'active' ? ' — действующая' : ' — архивная'}`
}
