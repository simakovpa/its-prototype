import React, { useMemo, useState } from 'react'
import { Tree, Button, Space, Row, Col, Card, Popconfirm, Tag, Empty, Modal, Select, Typography, Input, List, Alert, Radio } from 'antd'
import { PlusOutlined, DeleteOutlined, ApartmentOutlined, DatabaseOutlined, LinkOutlined, CopyOutlined, SaveOutlined, ImportOutlined, TagsOutlined, HistoryOutlined } from '@ant-design/icons'
import NodeEditor from './NodeEditor.jsx'
import {
  updateNodeById,
  deleteNodeById,
  addChildTo,
  newContainerNode,
  newLeafNode,
  newDynamicGroupNode,
  newLibraryRefNode,
  cloneSubtree,
  cloneSubtreeWithMethodologyDuplication,
  subtreeContainsDynamicGroup,
} from '../utils/treeOps.js'
import { strategyOptions } from '../data/catalog.js'
import { versionLabel } from '../utils/versionOps.js'
import { validateWeights } from '../utils/versionOps.js'
import { wouldCreateMethodologyCycle, wouldCreateLibraryCycle, findTransitiveDependentMethodologies } from '../utils/graphOps.js'

const { Text } = Typography
const { TextArea } = Input

function strategyLabel(code) {
  return strategyOptions.find((s) => s.value === code)?.value || code
}

function buildTreeData(node) {
  const badge =
    node.kind === 'leaf' ? (
      <Tag color="gold">параметр</Tag>
    ) : node.kind === 'dynamicGroup' ? (
      <Tag color="purple" icon={<LinkOutlined />}>связана: {node.linkedMethodologyId}</Tag>
    ) : node.kind === 'libraryRef' ? (
      <Tag color="cyan" icon={<LinkOutlined />}>библиотека: {node.libraryNodeId}</Tag>
    ) : (
      <Tag color="blue">{strategyLabel(node.strategy)}</Tag>
    )
  return {
    key: node.id,
    title: (
      <span className="its-tree-node-label">
        {node.kind === 'leaf' ? <DatabaseOutlined /> : <ApartmentOutlined />}
        <span>{node.name}</span>
        {badge}
        {node.weight != null && node.kind !== 'leaf' ? <Tag>{`вес ${node.weight}`}</Tag> : null}
      </span>
    ),
    children: node.children ? node.children.map(buildTreeData) : undefined,
  }
}

function findNode(root, id) {
  if (root.id === id) return root
  for (const c of root.children || []) {
    const f = findNode(c, id)
    if (f) return f
  }
  return null
}

export default function MethodologyEditor({
  template,
  onChange,
  methodologies = [],
  currentMethodologyId,
  library,
  onSaveNodeToLibrary,
  onSaveScaleToLibrary,
  onDuplicateLinkedMethodology,
  showVersioning = false,
  methodology,
  onPublishVersion,
  onRestoreDraftFromVersion,
  currentLibraryNodeId = null,
}) {
  const [selectedId, setSelectedId] = useState(template.id)
  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [copySourceMethodologyId, setCopySourceMethodologyId] = useState(null)
  const [copySourceNodeId, setCopySourceNodeId] = useState(null)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkMethodologyId, setLinkMethodologyId] = useState(null)
  const [linkError, setLinkError] = useState(null)
  const [saveLibModalOpen, setSaveLibModalOpen] = useState(false)
  const [saveLibName, setSaveLibName] = useState('')
  const [saveLibDescription, setSaveLibDescription] = useState('')
  const [insertLibModalOpen, setInsertLibModalOpen] = useState(false)
  const [insertLibMode, setInsertLibMode] = useState('copy')
  const [insertLibError, setInsertLibError] = useState(null)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [publishNote, setPublishNote] = useState('')
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [weightWarnings, setWeightWarnings] = useState([])
  const [dependentsNotice, setDependentsNotice] = useState(null)

  const treeData = useMemo(() => [buildTreeData(template)], [template])
  const selectedNode = useMemo(() => findNode(template, selectedId), [template, selectedId])
  const canHaveChildren = selectedNode && selectedNode.kind === 'container'

  const otherMethodologies = methodologies.filter((m) => m.id !== currentMethodologyId && m.status !== 'archived')
  const copySourceMethodology = otherMethodologies.find((m) => m.id === copySourceMethodologyId)
  const linkableMethodologies = otherMethodologies.filter((m) => m.level === 'equipment' || m.level === 'tm')

  const handleAddContainer = () => canHaveChildren && onChange(addChildTo(template, selectedId, newContainerNode('Новый узел')))
  const handleAddLeaf = () => canHaveChildren && onChange(addChildTo(template, selectedId, newLeafNode('Новый параметр')))
  const handleDelete = () => {
    if (selectedId === template.id) return
    onChange(deleteNodeById(template, selectedId))
    setSelectedId(template.id)
  }
  const handleNodeEdit = (nextNode) => onChange(updateNodeById(template, selectedId, () => nextNode))

  // Копирование узла: если поддерево содержит динамическую группу, связанная
  // методика дублируется вместе с копией (стресс-тест, п.8) — иначе копия не
  // была бы по-настоящему независимой.
  const performClone = (sourceNode) => {
    if (subtreeContainsDynamicGroup(sourceNode) && onDuplicateLinkedMethodology) {
      const { clonedNode } = cloneSubtreeWithMethodologyDuplication(sourceNode, onDuplicateLinkedMethodology)
      return clonedNode
    }
    return cloneSubtree(sourceNode)
  }

  const handleConfirmCopy = () => {
    const sourceRoot = copySourceMethodology?.template ?? copySourceMethodology?.draft
    if (!sourceRoot || !copySourceNodeId) return
    const sourceNode = findNode(copySourceMethodology.draft, copySourceNodeId)
    if (!sourceNode) return
    onChange(addChildTo(template, selectedId, performClone(sourceNode)))
    setCopyModalOpen(false)
    setCopySourceMethodologyId(null)
    setCopySourceNodeId(null)
  }

  const handleConfirmLink = () => {
    const linked = linkableMethodologies.find((m) => m.id === linkMethodologyId)
    if (!linked) return
    if (wouldCreateMethodologyCycle(methodologies, currentMethodologyId, linked.id)) {
      setLinkError(`Связь с «${linked.name}» образует цикл (эта методика уже связана с текущей, прямо или транзитивно) — операция заблокирована.`)
      return
    }
    onChange(addChildTo(template, selectedId, newDynamicGroupNode(linked)))
    setLinkModalOpen(false)
    setLinkMethodologyId(null)
    setLinkError(null)
  }

  const handleConfirmSaveToLibrary = () => {
    if (!selectedNode || !saveLibName.trim()) return
    onSaveNodeToLibrary(selectedNode, saveLibName.trim(), saveLibDescription.trim())
    setSaveLibModalOpen(false)
    setSaveLibName('')
    setSaveLibDescription('')
  }

  const handleInsertFromLibrary = (libItem) => {
    if (insertLibMode === 'reference') {
      if (wouldCreateLibraryCycle(library, currentLibraryNodeId, libItem.id)) {
        setInsertLibError(`Ссылка на «${libItem.name}» образует цикл среди библиотечных узлов — операция заблокирована.`)
        return
      }
      onChange(addChildTo(template, selectedId, newLibraryRefNode(libItem)))
    } else {
      onChange(addChildTo(template, selectedId, cloneSubtree(libItem.node)))
    }
    setInsertLibModalOpen(false)
    setInsertLibError(null)
  }

  const handleUnlinkLibraryRef = (nodeId) => {
    const refNode = findNode(template, nodeId)
    const libItem = library?.nodes?.find((n) => n.id === refNode?.libraryNodeId)
    if (!libItem) return
    const concreteCopy = { ...cloneSubtree(libItem.node), id: refNode.id, weight: refNode.weight, critical: refNode.critical }
    onChange(updateNodeById(template, nodeId, () => concreteCopy))
  }

  const openPublishModal = () => {
    setWeightWarnings(validateWeights(template))
    setPublishModalOpen(true)
  }

  const handleConfirmPublish = () => {
    onPublishVersion(publishNote.trim())
    setPublishModalOpen(false)
    setPublishNote('')
    if (currentMethodologyId) {
      const dependents = findTransitiveDependentMethodologies(methodologies, currentMethodologyId)
      if (dependents.length > 0) setDependentsNotice(dependents)
    }
  }

  const activeVersion = methodology?.versions?.find((v) => v.status === 'active')

  return (
    <>
      {showVersioning && methodology && (
        <Alert
          style={{ marginBottom: 12 }}
          type="info"
          message={
            <Space wrap>
              <Text strong>Черновик редактируется.</Text>
              <Text type="secondary">
                Действующая версия: {activeVersion ? versionLabel(methodology, activeVersion.id) : 'ещё не публиковалась'}
              </Text>
              <Button size="small" type="primary" icon={<TagsOutlined />} onClick={openPublishModal}>Опубликовать версию</Button>
              <Button size="small" icon={<HistoryOutlined />} onClick={() => setHistoryModalOpen(true)}>История версий ({methodology.versions.length})</Button>
            </Space>
          }
        />
      )}
      <Row gutter={16}>
        <Col span={11}>
          <Card
            size="small"
            title="Дерево шаблона расчёта"
            extra={
              <Space wrap>
                <Button size="small" icon={<PlusOutlined />} disabled={!canHaveChildren} onClick={handleAddContainer}>Этап/Узел/Группа</Button>
                <Button size="small" icon={<PlusOutlined />} disabled={!canHaveChildren} onClick={handleAddLeaf}>Параметр</Button>
                <Button size="small" icon={<ImportOutlined />} disabled={!canHaveChildren} onClick={() => setInsertLibModalOpen(true)}>Вставить из библиотеки</Button>
                <Button size="small" icon={<CopyOutlined />} disabled={!canHaveChildren} onClick={() => setCopyModalOpen(true)}>Вставить из другой методики</Button>
                <Button size="small" icon={<LinkOutlined />} disabled={!canHaveChildren} onClick={() => setLinkModalOpen(true)}>Добавить группу оборудования</Button>
                <Button
                  size="small"
                  icon={<SaveOutlined />}
                  disabled={!selectedNode || selectedId === template.id}
                  onClick={() => { setSaveLibName(selectedNode?.name || ''); setSaveLibModalOpen(true) }}
                >
                  Сохранить в библиотеку
                </Button>
                <Popconfirm title="Удалить узел вместе с содержимым?" onConfirm={handleDelete} disabled={selectedId === template.id}>
                  <Button size="small" danger icon={<DeleteOutlined />} disabled={selectedId === template.id}>Удалить</Button>
                </Popconfirm>
              </Space>
            }
          >
            <Tree treeData={treeData} selectedKeys={[selectedId]} onSelect={(keys) => keys.length && setSelectedId(keys[0])} defaultExpandAll blockNode />
          </Card>
        </Col>
        <Col span={13}>
          <Card size="small" title="Свойства выбранного узла">
            {selectedNode ? (
              <NodeEditor
                node={selectedNode}
                onChange={handleNodeEdit}
                methodologies={methodologies}
                library={library}
                onSaveScaleToLibrary={onSaveScaleToLibrary}
                onUnlinkLibraryRef={handleUnlinkLibraryRef}
              />
            ) : (
              <Empty />
            )}
          </Card>
        </Col>

        <Modal title="Вставить копию узла из другой методики" open={copyModalOpen} onCancel={() => setCopyModalOpen(false)} onOk={handleConfirmCopy} okButtonProps={{ disabled: !copySourceNodeId }} okText="Вставить копию" width={640}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">
              Узел будет скопирован целиком (со всеми дочерними) в выбранный узел «{selectedNode?.name}» текущей методики.
              Если внутри есть динамическая группа — связанная методика тоже дублируется, чтобы копия была по-настоящему независимой.
            </Text>
            <Select style={{ width: '100%' }} placeholder="Методика-источник" options={otherMethodologies.map((m) => ({ value: m.id, label: `${m.name} (${m.level})` }))} value={copySourceMethodologyId}
              onChange={(v) => { setCopySourceMethodologyId(v); setCopySourceNodeId(null) }} />
            {copySourceMethodology && (
              <Tree treeData={[buildTreeData(copySourceMethodology.draft)]} selectedKeys={copySourceNodeId ? [copySourceNodeId] : []} onSelect={(keys) => keys.length && setCopySourceNodeId(keys[0])} defaultExpandAll blockNode />
            )}
          </Space>
        </Modal>

        <Modal
          title="Добавить группу однотипного оборудования"
          open={linkModalOpen}
          onCancel={() => { setLinkModalOpen(false); setLinkError(null) }}
          onOk={handleConfirmLink}
          okButtonProps={{ disabled: !linkMethodologyId }}
          okText="Добавить"
          width={560}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">
              Создаёт динамическую группу: система сама найдёт все единицы этого типа на объекте, посчитает их
              ИТС по действующей версии выбранной методики и свернёт взвешенным средним по показателю приведения.
            </Text>
            <Select style={{ width: '100%' }} placeholder="Методика оборудования/ТМ для связывания" options={linkableMethodologies.map((m) => ({ value: m.id, label: `${m.name} (${m.assetType})` }))} value={linkMethodologyId}
              onChange={(v) => { setLinkMethodologyId(v); setLinkError(null) }} />
            {linkError && <Alert type="error" showIcon message={linkError} />}
          </Space>
        </Modal>

        <Modal title="Сохранить узел в библиотеку" open={saveLibModalOpen} onCancel={() => setSaveLibModalOpen(false)} onOk={handleConfirmSaveToLibrary} okButtonProps={{ disabled: !saveLibName.trim() }} okText="Сохранить">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">Сохраняется независимая копия узла «{selectedNode?.name}» вместе со всем содержимым.</Text>
            <Input placeholder="Название в библиотеке" value={saveLibName} onChange={(e) => setSaveLibName(e.target.value)} />
            <TextArea placeholder="Описание (необязательно)" value={saveLibDescription} onChange={(e) => setSaveLibDescription(e.target.value)} rows={2} />
          </Space>
        </Modal>

        <Modal
          title="Вставить из библиотеки"
          open={insertLibModalOpen}
          onCancel={() => { setInsertLibModalOpen(false); setInsertLibError(null) }}
          footer={null}
          width={640}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio.Group value={insertLibMode} onChange={(e) => setInsertLibMode(e.target.value)}>
              <Radio value="copy">Вставить как копию (независима)</Radio>
              <Radio value="reference">Вставить как ссылку (отражает изменения библиотеки до публикации версии)</Radio>
            </Radio.Group>
            {insertLibError && <Alert type="error" showIcon message={insertLibError} />}
            {(!library?.nodes || library.nodes.length === 0) ? (
              <Empty description="В библиотеке пока нет сохранённых узлов" />
            ) : (
              <List
                dataSource={library.nodes.filter((n) => n.status !== 'archived')}
                renderItem={(item) => (
                  <List.Item actions={[<Button key="ins" size="small" onClick={() => handleInsertFromLibrary(item)}>Вставить</Button>]}>
                    <div>
                      <Text strong>{item.name}</Text>
                      {item.description && <div><Text type="secondary">{item.description}</Text></div>}
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Space>
        </Modal>

        {showVersioning && (
          <>
            <Modal title="Опубликовать версию методики" open={publishModalOpen} onCancel={() => setPublishModalOpen(false)} onOk={handleConfirmPublish} okText="Опубликовать">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">
                  Текущий черновик будет заморожен как версия v{(methodology?.versions?.length || 0) + 1} и станет действующей.
                  Все ссылки на библиотеку будут разрешены в конкретное содержимое. Предыдущая действующая версия перейдёт в архивные.
                </Text>
                {weightWarnings.length > 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    message="Сумма весов не равна 1 у некоторых узлов"
                    description={
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {weightWarnings.map((w) => (
                          <li key={w.nodeId}>«{w.nodeName}»: сумма весов = {w.sum.toFixed(2)}</li>
                        ))}
                      </ul>
                    }
                  />
                )}
                <TextArea placeholder="Что изменилось в этой версии (необязательно)" value={publishNote} onChange={(e) => setPublishNote(e.target.value)} rows={2} />
              </Space>
            </Modal>

            <Modal title="История версий" open={historyModalOpen} onCancel={() => setHistoryModalOpen(false)} footer={null} width={640}>
              <List
                dataSource={[...(methodology?.versions || [])].sort((a, b) => b.number - a.number)}
                renderItem={(v) => (
                  <List.Item actions={[<Button key="restore" size="small" onClick={() => { onRestoreDraftFromVersion(v.id); setHistoryModalOpen(false) }}>Восстановить в черновик</Button>]}>
                    <Space direction="vertical" size={0}>
                      <Space>
                        <Text strong>v{v.number}</Text>
                        <Tag color={v.status === 'active' ? 'green' : 'default'}>{v.status === 'active' ? 'действующая' : 'архивная'}</Tag>
                        <Text type="secondary">{new Date(v.publishedAt).toLocaleString('ru-RU')}</Text>
                      </Space>
                      {v.note && <Text type="secondary">{v.note}</Text>}
                    </Space>
                  </List.Item>
                )}
              />
            </Modal>

            <Modal title="Публикация также затронет" open={!!dependentsNotice} onCancel={() => setDependentsNotice(null)} footer={<Button onClick={() => setDependentsNotice(null)}>Понятно</Button>}>
              <Text type="secondary">
                Следующие методики связаны с этой (прямо или транзитивно) через динамические группы — активы, где они
                применяются, будут помечены «Требуется пересчёт»:
              </Text>
              <ul>
                {(dependentsNotice || []).map((m) => <li key={m.id}>{m.name}</li>)}
              </ul>
            </Modal>
          </>
        )}
      </Row>
    </>
  )
}
