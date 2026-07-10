// Иммутабельные операции над рекурсивным деревом «Шаблона расчёта ИТС».
// Дерево — обычный вложенный JS-объект (см. methodologyTemplates.js).

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
  return {
    ...root,
    children: root.children.filter((c) => c.id !== id).map((c) => deleteNodeById(c, id)),
  }
}

export function addChildTo(root, parentId, newNode) {
  if (root.id === parentId) {
    return { ...root, children: [...(root.children || []), newNode] }
  }
  if (!root.children) return root
  return { ...root, children: root.children.map((c) => addChildTo(c, parentId, newNode)) }
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
