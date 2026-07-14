import React, { useMemo, useState } from 'react'
import { Tree, Button, Space, Row, Col, Card, Popconfirm, Tag, Empty, Modal, Select, Typography, Input, List } from 'antd'
import { PlusOutlined, DeleteOutlined, ApartmentOutlined, DatabaseOutlined, LinkOutlined, CopyOutlined, SaveOutlined, ImportOutlined } from '@ant-design/icons'
import NodeEditor from './NodeEditor.jsx'
import {
  updateNodeById,
  deleteNodeById,
  addChildTo,
  newContainerNode,
  newLeafNode,
  newDynamicGroupNode,
  cloneSubtree,
} from '../utils/treeOps.js'
import { strategyOptions } from '../data/catalog.js'

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
      <Tag color="purple" icon={<LinkOutlined />}>
        связана: {node.linkedMethodologyId}
      </Tag>
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
}) {
  const [selectedId, setSelectedId] = useState(template.id)
  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [copySourceMethodologyId, setCopySourceMethodologyId] = useState(null)
  const [copySourceNodeId, setCopySourceNodeId] = useState(null)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkMethodologyId, setLinkMethodologyId] = useState(null)
  const [saveLibModalOpen, setSaveLibModalOpen] = useState(false)
  const [saveLibName, setSaveLibName] = useState('')
  const [saveLibDescription, setSaveLibDescription] = useState('')
  const [insertLibModalOpen, setInsertLibModalOpen] = useState(false)

  const treeData = useMemo(() => [buildTreeData(template)], [template])
  const selectedNode = useMemo(() => findNode(template, selectedId), [template, selectedId])
  const canHaveChildren = selectedNode && selectedNode.kind === 'container'

  const otherMethodologies = methodologies.filter((m) => m.id !== currentMethodologyId)
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

  const handleConfirmCopy = () => {
    const sourceRoot = copySourceMethodology?.template
    if (!sourceRoot || !copySourceNodeId) return
    const sourceNode = findNode(sourceRoot, copySourceNodeId)
    if (!sourceNode) return
    onChange(addChildTo(template, selectedId, cloneSubtree(sourceNode)))
    setCopyModalOpen(false)
    setCopySourceMethodologyId(null)
    setCopySourceNodeId(null)
  }

  const handleConfirmLink = () => {
    const linked = linkableMethodologies.find((m) => m.id === linkMethodologyId)
    if (!linked) return
    onChange(addChildTo(template, selectedId, newDynamicGroupNode(linked)))
    setLinkModalOpen(false)
    setLinkMethodologyId(null)
  }

  const handleConfirmSaveToLibrary = () => {
    if (!selectedNode || !saveLibName.trim()) return
    onSaveNodeToLibrary(selectedNode, saveLibName.trim(), saveLibDescription.trim())
    setSaveLibModalOpen(false)
    setSaveLibName('')
    setSaveLibDescription('')
  }

  const handleInsertFromLibrary = (libItem) => {
    onChange(addChildTo(template, selectedId, cloneSubtree(libItem.node)))
    setInsertLibModalOpen(false)
  }

  return (
    <Row gutter={16}>
      <Col span={11}>
        <Card
          size="small"
          title="Дерево шаблона расчёта"
          extra={
            <Space wrap>
              <Button size="small" icon={<PlusOutlined />} disabled={!canHaveChildren} onClick={handleAddContainer}>
                Этап/Узел/Группа
              </Button>
              <Button size="small" icon={<PlusOutlined />} disabled={!canHaveChildren} onClick={handleAddLeaf}>
                Параметр
              </Button>
              <Button size="small" icon={<ImportOutlined />} disabled={!canHaveChildren} onClick={() => setInsertLibModalOpen(true)}>
                Вставить из библиотеки
              </Button>
              <Button size="small" icon={<CopyOutlined />} disabled={!canHaveChildren} onClick={() => setCopyModalOpen(true)}>
                Вставить из другой методики
              </Button>
              <Button size="small" icon={<LinkOutlined />} disabled={!canHaveChildren} onClick={() => setLinkModalOpen(true)}>
                Добавить группу оборудования
              </Button>
              <Button
                size="small"
                icon={<SaveOutlined />}
                disabled={!selectedNode || selectedId === template.id}
                onClick={() => {
                  setSaveLibName(selectedNode?.name || '')
                  setSaveLibModalOpen(true)
                }}
              >
                Сохранить в библиотеку
              </Button>
              <Popconfirm title="Удалить узел вместе с содержимым?" onConfirm={handleDelete} disabled={selectedId === template.id}>
                <Button size="small" danger icon={<DeleteOutlined />} disabled={selectedId === template.id}>
                  Удалить
                </Button>
              </Popconfirm>
            </Space>
          }
        >
          <Tree
            treeData={treeData}
            selectedKeys={[selectedId]}
            onSelect={(keys) => keys.length && setSelectedId(keys[0])}
            defaultExpandAll
            blockNode
          />
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
            />
          ) : (
            <Empty />
          )}
        </Card>
      </Col>

      <Modal
        title="Вставить копию узла из другой методики"
        open={copyModalOpen}
        onCancel={() => setCopyModalOpen(false)}
        onOk={handleConfirmCopy}
        okButtonProps={{ disabled: !copySourceNodeId }}
        okText="Вставить копию"
        width={640}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">
            Узел будет скопирован целиком (со всеми дочерними) в выбранный узел «{selectedNode?.name}» текущей методики.
          </Text>
          <Select
            style={{ width: '100%' }}
            placeholder="Методика-источник"
            options={otherMethodologies.map((m) => ({ value: m.id, label: `${m.name} (${m.level})` }))}
            value={copySourceMethodologyId}
            onChange={(v) => {
              setCopySourceMethodologyId(v)
              setCopySourceNodeId(null)
            }}
          />
          {copySourceMethodology && (
            <Tree
              treeData={[buildTreeData(copySourceMethodology.template)]}
              selectedKeys={copySourceNodeId ? [copySourceNodeId] : []}
              onSelect={(keys) => keys.length && setCopySourceNodeId(keys[0])}
              defaultExpandAll
              blockNode
            />
          )}
        </Space>
      </Modal>

      <Modal
        title="Добавить группу однотипного оборудования"
        open={linkModalOpen}
        onCancel={() => setLinkModalOpen(false)}
        onOk={handleConfirmLink}
        okButtonProps={{ disabled: !linkMethodologyId }}
        okText="Добавить"
        width={560}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">
            Создаёт динамическую группу: система сама найдёт все единицы этого типа на объекте,
            посчитает их ИТС по выбранной методике и свернёт взвешенным средним по показателю приведения.
          </Text>
          <Select
            style={{ width: '100%' }}
            placeholder="Методика оборудования/ТМ для связывания"
            options={linkableMethodologies.map((m) => ({ value: m.id, label: `${m.name} (${m.assetType})` }))}
            value={linkMethodologyId}
            onChange={setLinkMethodologyId}
          />
        </Space>
      </Modal>

      <Modal
        title="Сохранить узел в библиотеку"
        open={saveLibModalOpen}
        onCancel={() => setSaveLibModalOpen(false)}
        onOk={handleConfirmSaveToLibrary}
        okButtonProps={{ disabled: !saveLibName.trim() }}
        okText="Сохранить"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">
            Сохраняется независимая копия узла «{selectedNode?.name}» вместе со всем содержимым.
            Дальнейшие изменения самого узла в методике на копию в библиотеке не повлияют.
          </Text>
          <Input placeholder="Название в библиотеке" value={saveLibName} onChange={(e) => setSaveLibName(e.target.value)} />
          <TextArea
            placeholder="Описание (необязательно) — где и для чего уместно использовать"
            value={saveLibDescription}
            onChange={(e) => setSaveLibDescription(e.target.value)}
            rows={2}
          />
        </Space>
      </Modal>

      <Modal
        title="Вставить из библиотеки"
        open={insertLibModalOpen}
        onCancel={() => setInsertLibModalOpen(false)}
        footer={null}
        width={640}
      >
        {library.nodes.length === 0 ? (
          <Empty description="В библиотеке пока нет сохранённых узлов" />
        ) : (
          <List
            dataSource={library.nodes}
            renderItem={(item) => (
              <List.Item actions={[<Button key="ins" size="small" onClick={() => handleInsertFromLibrary(item)}>Вставить</Button>]}>
                <div>
                  <Text strong>{item.name}</Text>
                  {item.description && (
                    <div>
                      <Text type="secondary">{item.description}</Text>
                    </div>
                  )}
                </div>
              </List.Item>
            )}
          />
        )}
      </Modal>
    </Row>
  )
}
