// Единый механизм обхода графа связей — используется для трёх задач:
// проверка циклов при связывании методик (п.1), проверка циклов при вставке
// ссылки на библиотеку (п.9), распространение индикатора «Требуется
// пересчёт» транзитивно через связанные методики (п.15).

function collectLinkedMethodologyIds(node, acc = []) {
  if (node.kind === 'dynamicGroup' && node.linkedMethodologyId) acc.push(node.linkedMethodologyId)
  ;(node.children || []).forEach((c) => collectLinkedMethodologyIds(c, acc))
  return acc
}

function collectLibraryRefIds(node, acc = []) {
  if (node.kind === 'libraryRef' && node.libraryNodeId) acc.push(node.libraryNodeId)
  ;(node.children || []).forEach((c) => collectLibraryRefIds(c, acc))
  return acc
}

// Добавление динамической группы sourceId -> targetId создаст цикл, если
// targetId уже (транзитивно) ссылается обратно на sourceId.
export function wouldCreateMethodologyCycle(methodologies, sourceId, targetId) {
  if (sourceId === targetId) return true
  const visited = new Set()
  const stack = [targetId]
  while (stack.length) {
    const current = stack.pop()
    if (current === sourceId) return true
    if (visited.has(current)) continue
    visited.add(current)
    const m = methodologies.find((x) => x.id === current)
    if (!m) continue
    collectLinkedMethodologyIds(m.draft).forEach((id) => stack.push(id))
  }
  return false
}

// Вставка ссылки sourceLibraryNodeId -> targetLibraryNodeId (внутри
// редактируемого библиотечного узла) создаст цикл, если targetLibraryNodeId
// уже (транзитивно) ссылается обратно на sourceLibraryNodeId. Если
// sourceLibraryNodeId не задан (вставка идёт в обычную методику, не в
// библиотечный узел) — цикл в принципе невозможен, проверка не нужна.
export function wouldCreateLibraryCycle(library, sourceLibraryNodeId, targetLibraryNodeId) {
  if (!sourceLibraryNodeId) return false
  if (sourceLibraryNodeId === targetLibraryNodeId) return true
  const visited = new Set()
  const stack = [targetLibraryNodeId]
  while (stack.length) {
    const current = stack.pop()
    if (current === sourceLibraryNodeId) return true
    if (visited.has(current)) continue
    visited.add(current)
    const item = library.nodes.find((x) => x.id === current)
    if (!item) continue
    collectLibraryRefIds(item.node).forEach((id) => stack.push(id))
  }
  return false
}

// Все методики, которые (прямо или транзитивно, через цепочку динамических
// групп) используют changedMethodologyId — для распространения индикатора
// «Требуется пересчёт» после публикации новой версии.
export function findTransitiveDependentMethodologies(methodologies, changedMethodologyId) {
  const dependents = new Set()
  let frontier = [changedMethodologyId]
  while (frontier.length) {
    const next = []
    for (const m of methodologies) {
      if (dependents.has(m.id)) continue
      const linked = collectLinkedMethodologyIds(m.draft)
      if (frontier.some((id) => linked.includes(id))) {
        dependents.add(m.id)
        next.push(m.id)
      }
    }
    frontier = next
  }
  return methodologies.filter((m) => dependents.has(m.id))
}
