import React, { useMemo, useState } from 'react'
import { Tree, Button, Space, Row, Col, Card, Popconfirm, Tag, Empty, Modal, Select, Typography } from 'antd'
import { PlusOutlined, DeleteOutlined, ApartmentOutlined, DatabaseOutlined, LinkOutlined, CopyOutlined } from '@ant-design/icons'
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

export default function MethodologyEditor({ template, onChange, methodologies = [], currentMethodologyId }) {
  const [selectedId, setSelectedId] = useState(template.id)
  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [copySourceMethodologyId, setCopySourceMethodologyId] = useState(null)
  const [copySourceNodeId, setCopySourceNodeId] = useState(null)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkMethodologyId, setLinkMethodologyId] = useState(null)

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
              <Button size="small" icon={<CopyOutlined />} disabled={!canHaveChildren} onClick={() => setCopyModalOpen(true)}>
                Вставить из другой методики
              </Button>
              <Button size="small" icon={<LinkOutlined />} disabled={!canHaveChildren} onClick={() => setLinkModalOpen(true)}>
                Добавить группу оборудования
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
            <NodeEditor node={selectedNode} onChange={handleNodeEdit} methodologies={methodologies} />
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
            Дальше копию можно свободно редактировать — связи с оригиналом не будет.
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
            Создаёт динамическую группу: на расчёте система сама найдёт все единицы этого типа на объекте,
            посчитает их ИТС по выбранной методике оборудования и свернёт взвешенным средним по показателю приведения.
            Ничего настраивать заново не нужно.
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
    </Row>
  )
}
