import { nextId, resolveLibraryRefsDeep } from './treeOps.js'

export function getActiveVersion(methodology) {
  return methodology.versions.find((v) => v.status === 'active') || null
}

export function getVersionById(methodology, versionId) {
  if (!versionId || versionId === 'draft') return null
  return methodology.versions.find((v) => v.id === versionId) || null
}

export function resolveTemplate(methodology, versionId) {
  if (!versionId || versionId === 'draft') return methodology.draft
  const v = getVersionById(methodology, versionId)
  return v ? v.template : methodology.draft
}

function deepClone(x) {
  return structuredClone ? structuredClone(x) : JSON.parse(JSON.stringify(x))
}

// Проверка суммы весов дочерних узлов на каждом уровне дерева (стресс-тест,
// п.11) — не блокирует публикацию, только предупреждает.
export function validateWeights(tree, tolerance = 0.01) {
  const warnings = []
  function walk(node) {
    if (node.kind !== 'container' || !node.children || node.children.length === 0) return
    const sum = node.children.reduce((acc, c) => acc + (c.weight ?? 0), 0)
    if (Math.abs(sum - 1) > tolerance) {
      warnings.push({ nodeId: node.id, nodeName: node.name, sum })
    }
    node.children.forEach(walk)
  }
  walk(tree)
  return warnings
}

// Публикация версии: разрешает ссылки библиотеки в конкретное содержимое
// (стресс-тест, п.8.1) и замораживает снимок черновика.
export function publishVersion(methodology, note, library) {
  const nextNumber = methodology.versions.length ? Math.max(...methodology.versions.map((v) => v.number)) + 1 : 1
  const resolvedDraft = library ? resolveLibraryRefsDeep(methodology.draft, library) : deepClone(methodology.draft)
  const newVersion = {
    id: nextId('ver'),
    number: nextNumber,
    publishedAt: new Date().toISOString(),
    note: note || '',
    template: deepClone(resolvedDraft),
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
