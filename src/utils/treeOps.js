// Иммутабельные операции над рекурсивным деревом «Шаблона расчёта ИТС».

let idCounter = 1
export function nextId(prefix) {
  idCounter += 1
  return `${prefix}-${Date.now()}-${idCounter}`
}

export function findNodeById(root, id) {
  if (root.id === id) return root
  for (const child of root.children || []) {
    const found = findNodeById(child, id)
    if (found) return found
  }
  return null
}

export function updateNodeById(root, id, updater) {
  if (root.id === id) return { ...root, ...updater(root) }
  if (!root.children) return root
  return { ...root, children: root.children.map((c) => updateNodeById(c, id, updater)) }
}

export function deleteNodeById(root, id) {
  if (!root.children) return root
  return { ...root, children: root.children.filter((c) => c.id !== id).map((c) => deleteNodeById(c, id)) }
}

export function addChildTo(root, parentId, newNode) {
  if (root.id === parentId) return { ...root, children: [...(root.children || []), newNode] }
  if (!root.children) return root
  return { ...root, children: root.children.map((c) => addChildTo(c, parentId, newNode)) }
}

// Простое клонирование поддерева с новыми id. Узлы-ссылки на библиотеку
// (kind: 'libraryRef') копируются как ссылки — это ожидаемое поведение,
// а не утечка связи (библиотека для того и существует). Узлы-динамические
// группы копируются "как есть" здесь; для копий, где связанная методика
// должна дублироваться, используйте cloneSubtreeWithMethodologyDuplication.
export function cloneSubtree(node) {
  const cloned = {
    ...node,
    id: nextId(node.kind === 'leaf' ? 'leaf' : node.kind === 'dynamicGroup' ? 'dyngroup' : node.kind === 'libraryRef' ? 'libref' : 'container'),
  }
  if (node.children) {
    cloned.children = node.children.map(cloneSubtree)
  }
  return cloned
}

// Клонирование с дублированием связанных методик у встреченных динамических
// групп (архитектурное решение по итогам стресс-теста, п.8): копия узла
// должна быть по-настоящему независимой, а не тайно продолжать указывать на
// исходную связанную методику.
export function cloneSubtreeWithMethodologyDuplication(node, duplicateLinkedMethodology) {
  const newMethodologies = []

  function walk(n) {
    const cloned = {
      ...n,
      id: nextId(n.kind === 'leaf' ? 'leaf' : n.kind === 'dynamicGroup' ? 'dyngroup' : n.kind === 'libraryRef' ? 'libref' : 'container'),
    }
    if (n.kind === 'dynamicGroup' && n.linkedMethodologyId) {
      const newMethodology = duplicateLinkedMethodology(n.linkedMethodologyId)
      if (newMethodology) {
        newMethodologies.push(newMethodology)
        cloned.linkedMethodologyId = newMethodology.id
        cloned.name = newMethodology.name
      }
    }
    if (n.children) {
      cloned.children = n.children.map(walk)
    }
    return cloned
  }

  const clonedNode = walk(node)
  return { clonedNode, newMethodologies }
}

// Возвращает true, если где-то в поддереве встречается динамическая группа.
export function subtreeContainsDynamicGroup(node) {
  if (node.kind === 'dynamicGroup') return true
  return (node.children || []).some(subtreeContainsDynamicGroup)
}

export function cloneScale(scale) {
  return JSON.parse(JSON.stringify(scale))
}

// Разрешает все узлы-ссылки на библиотеку в поддереве в конкретное
// содержимое соответствующей библиотечной записи — используется при
// публикации версии методики (стресс-тест, п.8.1): опубликованная версия
// не должна содержать незамороженных ссылок.
export function resolveLibraryRefsDeep(node, library) {
  if (node.kind === 'libraryRef') {
    const libItem = library.nodes.find((n) => n.id === node.libraryNodeId)
    if (!libItem) {
      // Библиотечная запись не найдена (например, архивирована и затем удалена
      // из демо-данных) — оставляем узел как пустой контейнер с пометкой.
      return { ...node, kind: 'container', strategy: 'MIN', children: [], name: `${node.name} (источник не найден)` }
    }
    const resolvedContent = resolveLibraryRefsDeep(libItem.node, library)
    return {
      ...resolvedContent,
      id: nextId('resolved'),
      name: node.name,
      weight: node.weight,
      critical: node.critical,
      resourceDefining: node.resourceDefining,
    }
  }
  if (!node.children) return node
  return { ...node, children: node.children.map((c) => resolveLibraryRefsDeep(c, library)) }
}

export function newRootTemplate(name) {
  return {
    id: nextId('root'),
    name: name || 'Новая методика',
    kind: 'container',
    strategy: 'WEIGHTED_SUM',
    weight: 1,
    critical: false,
    resourceDefining: false,
    materialization: { type: 'virtual' },
    correctionRules: [],
    children: [],
  }
}

export function newContainerNode(name) {
  return {
    id: nextId('container'),
    name: name || 'Новый узел',
    kind: 'container',
    strategy: 'MIN',
    weight: 1,
    critical: false,
    resourceDefining: false,
    materialization: { type: 'virtual' },
    correctionRules: [],
    children: [],
  }
}

export function newDynamicGroupNode(linkedMethodology) {
  return {
    id: nextId('dyngroup'),
    name: linkedMethodology.name,
    kind: 'dynamicGroup',
    linkedMethodologyId: linkedMethodology.id,
    strategy: 'WEIGHTED_BY_ATTRIBUTE',
    weight: 1,
    optional: true,
  }
}

export function newLibraryRefNode(libItem) {
  return {
    id: nextId('libref'),
    name: libItem.name,
    kind: 'libraryRef',
    libraryNodeId: libItem.id,
    weight: 1,
    critical: false,
    resourceDefining: false,
  }
}

export function newLeafNode(name) {
  return {
    id: nextId('leaf'),
    name: name || 'Новый параметр',
    kind: 'leaf',
    weight: 1,
    critical: false,
    resourceDefining: false,
    source: { type: 'passport' },
    comparisonMethod: 'absolute',
    missingDataBehavior: 'exclude',
    scale: { kind: 'numeric', zones: [{ score: 4 }] },
  }
}
