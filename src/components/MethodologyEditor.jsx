import React, { useMemo, useState } from 'react'
import { Tree, Button, Space, Row, Col, Card, Popconfirm, Tag, Empty } from 'antd'
import { PlusOutlined, DeleteOutlined, ApartmentOutlined, DatabaseOutlined } from '@ant-design/icons'
import NodeEditor from './NodeEditor.jsx'
import { updateNodeById, deleteNodeById, addChildTo, newContainerNode, newLeafNode } from '../utils/treeOps.js'
import { strategyOptions } from '../data/catalog.js'

function strategyLabel(code) {
  return strategyOptions.find((s) => s.value === code)?.value || code
}

function buildTreeData(node) {
  const isLeaf = node.kind === 'leaf' || node.kind === 'dynamicGroup'
  const badge =
    node.kind === 'leaf' ? (
      <Tag color="gold">параметр</Tag>
    ) : node.kind === 'dynamicGroup' ? (
      <Tag color="purple">динамическая группа</Tag>
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
    isLeafNode: node.kind === 'leaf',
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

export default function MethodologyEditor({ template, onChange }) {
  const [selectedId, setSelectedId] = useState(template.id)

  const treeData = useMemo(() => [buildTreeData(template)], [template])
  const selectedNode = useMemo(() => findNode(template, selectedId), [template, selectedId])

  const canHaveChildren = selectedNode && selectedNode.kind === 'container'

  const handleAddContainer = () => {
    if (!canHaveChildren) return
    const updated = addChildTo(template, selectedId, newContainerNode('Новый узел'))
    onChange(updated)
  }
  const handleAddLeaf = () => {
    if (!canHaveChildren) return
    const updated = addChildTo(template, selectedId, newLeafNode('Новый параметр'))
    onChange(updated)
  }
  const handleDelete = () => {
    if (selectedId === template.id) return
    const updated = deleteNodeById(template, selectedId)
    onChange(updated)
    setSelectedId(template.id)
  }
  const handleNodeEdit = (nextNode) => {
    const updated = updateNodeById(template, selectedId, () => nextNode)
    onChange(updated)
  }

  return (
    <Row gutter={16}>
      <Col span={11}>
        <Card
          size="small"
          title="Дерево шаблона расчёта"
          extra={
            <Space>
              <Button size="small" icon={<PlusOutlined />} disabled={!canHaveChildren} onClick={handleAddContainer}>
                Этап/Узел/Группа
              </Button>
              <Button size="small" icon={<PlusOutlined />} disabled={!canHaveChildren} onClick={handleAddLeaf}>
                Параметр
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
          {selectedNode ? <NodeEditor node={selectedNode} onChange={handleNodeEdit} /> : <Empty />}
        </Card>
      </Col>
    </Row>
  )
}
