import React, { useState } from 'react'
import { Row, Col, Card, List, Tag, Popconfirm, Button, Empty, Typography, Space, Table, Modal, Input, Select, Alert } from 'antd'
import { DeleteOutlined, ApartmentOutlined, DatabaseOutlined, BgColorsOutlined, PlusOutlined, EditOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import MethodologyEditor from './MethodologyEditor.jsx'
import { NumericZonesEditor, CategoricalMapEditor } from './NodeEditor.jsx'
import { scaleKindOptions } from '../data/catalog.js'
import { newContainerNode } from '../utils/treeOps.js'

const { Text, Title, Paragraph } = Typography
const { TextArea } = Input

function nodeKindLabel(node) {
  if (node.kind === 'leaf') return 'Параметр'
  if (node.kind === 'dynamicGroup') return 'Динамическая группа'
  return 'Контейнер (Этап/Узел/Группа)'
}

function NodePreview({ node, depth = 0 }) {
  return (
    <div style={{ marginLeft: depth * 16 }}>
      <Space size={4}>
        {node.kind === 'leaf' ? <DatabaseOutlined /> : <ApartmentOutlined />}
        <Text>{node.name}</Text>
        <Tag>{nodeKindLabel(node)}</Tag>
        {node.kind !== 'leaf' && node.strategy && <Tag color="blue">{node.strategy}</Tag>}
      </Space>
      {node.children?.map((c) => (
        <NodePreview key={c.id} node={c} depth={depth + 1} />
      ))}
    </div>
  )
}

function ScalePreview({ scale }) {
  if (!scale) return null
  if (scale.kind === 'numeric') {
    return (
      <Table
        size="small"
        pagination={false}
        dataSource={(scale.zones || []).map((z, i) => ({ ...z, key: i }))}
        columns={[
          { title: 'от', dataIndex: 'min', render: (v, r) => (v == null ? '−∞' : `${r.minInclusive ? '[' : '('}${v}`) },
          { title: 'до', dataIndex: 'max', render: (v, r) => (v == null ? '+∞' : `${v}${r.maxInclusive ? ']' : ')'}`) },
          { title: 'балл', dataIndex: 'score' },
        ]}
      />
    )
  }
  return (
    <Table
      size="small"
      pagination={false}
      dataSource={(scale.map || []).map((m, i) => ({ ...m, key: i }))}
      columns={[
        { title: 'значение', dataIndex: 'value' },
        { title: 'балл', dataIndex: 'score' },
      ]}
    />
  )
}

export default function LibraryPanel({
  library,
  onDeleteNode,
  onDeleteScale,
  onCreateNode,
  onUpdateNode,
  onCreateScale,
  onUpdateScale,
  methodologies,
  onSaveScaleToLibrary,
}) {
  const [editingNodeId, setEditingNodeId] = useState(null)
  const [editingScaleId, setEditingScaleId] = useState(null)

  const [createNodeModalOpen, setCreateNodeModalOpen] = useState(false)
  const [newNodeName, setNewNodeName] = useState('')
  const [newNodeDescription, setNewNodeDescription] = useState('')

  const [createScaleModalOpen, setCreateScaleModalOpen] = useState(false)
  const [newScaleName, setNewScaleName] = useState('')

  const editingNode = library.nodes.find((n) => n.id === editingNodeId)
  const editingScale = library.scales.find((s) => s.id === editingScaleId)

  const handleCreateNode = () => {
    if (!newNodeName.trim()) return
    const id = onCreateNode(newNodeName.trim(), newNodeDescription.trim(), newContainerNode(newNodeName.trim()))
    setCreateNodeModalOpen(false)
    setNewNodeName('')
    setNewNodeDescription('')
    setEditingNodeId(id)
  }

  const handleCreateScale = () => {
    if (!newScaleName.trim()) return
    const id = onCreateScale(newScaleName.trim(), { kind: 'numeric', zones: [{ score: 4 }] })
    setCreateScaleModalOpen(false)
    setNewScaleName('')
    setEditingScaleId(id)
  }

  if (editingNode) {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => setEditingNodeId(null)}>
            К списку библиотеки
          </Button>
          <Title level={5} style={{ margin: 0 }}>
            Редактирование типового узла: {editingNode.name}
          </Title>
        </Space>
        <MethodologyEditor
          template={editingNode.node}
          onChange={(nextNode) => onUpdateNode(editingNode.id, nextNode)}
          methodologies={methodologies}
          currentMethodologyId={null}
          library={library}
          onSaveNodeToLibrary={() => {}}
          onSaveScaleToLibrary={onSaveScaleToLibrary}
        />
      </Space>
    )
  }

  if (editingScale) {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => setEditingScaleId(null)}>
            К списку библиотеки
          </Button>
          <Title level={5} style={{ margin: 0 }}>
            Редактирование типовой шкалы: {editingScale.name}
          </Title>
        </Space>
        <Card size="small" style={{ maxWidth: 640 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>Тип шкалы</Text>
            <Select
              style={{ width: 320 }}
              options={scaleKindOptions}
              value={editingScale.scale.kind}
              onChange={(v) =>
                onUpdateScale(editingScale.id, v === 'numeric' ? { kind: 'numeric', zones: [{ score: 4 }] } : { kind: 'categorical', map: [{ value: '', score: 4 }] })
              }
            />
            {editingScale.scale.kind === 'numeric' ? (
              <NumericZonesEditor zones={editingScale.scale.zones || []} onChange={(zones) => onUpdateScale(editingScale.id, { ...editingScale.scale, zones })} />
            ) : (
              <CategoricalMapEditor map={editingScale.scale.map || []} onChange={(map) => onUpdateScale(editingScale.id, { ...editingScale.scale, map })} />
            )}
          </Space>
        </Card>
      </Space>
    )
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Alert
        type="info"
        showIcon
        message="Как сюда что-то попадает"
        description={
          <>
            Два способа: (1) создать типовой узел/шкалу прямо здесь кнопкой «Создать» и настроить с нуля;
            (2) в редакторе методики выбрать уже настроенный узел (или шкалу параметра) и нажать «Сохранить в библиотеку».
            В обоих случаях сохраняется независимая копия — правки оригинала на неё не влияют, и наоборот.
          </>
        }
      />
      <Row gutter={16}>
        <Col span={12}>
          <Card
            size="small"
            title={<Space><ApartmentOutlined /> Типовые узлы</Space>}
            extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setCreateNodeModalOpen(true)}>Создать</Button>}
          >
            {library.nodes.length === 0 ? (
              <Empty description="Пока ничего не сохранено" />
            ) : (
              <List
                dataSource={library.nodes}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button key="edit" size="small" icon={<EditOutlined />} onClick={() => setEditingNodeId(item.id)}>
                        Редактировать
                      </Button>,
                      <Popconfirm key="del" title="Удалить из библиотеки?" onConfirm={() => onDeleteNode(item.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]}
                  >
                    <div style={{ width: '100%' }}>
                      <Title level={5} style={{ marginBottom: 0 }}>
                        {item.name}
                      </Title>
                      {item.description && <Text type="secondary">{item.description}</Text>}
                      <div style={{ marginTop: 8, background: '#fafafa', padding: 8, borderRadius: 4 }}>
                        <NodePreview node={item.node} />
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card
            size="small"
            title={<Space><BgColorsOutlined /> Типовые шкалы</Space>}
            extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setCreateScaleModalOpen(true)}>Создать</Button>}
          >
            {library.scales.length === 0 ? (
              <Empty description="Пока ничего не сохранено" />
            ) : (
              <List
                dataSource={library.scales}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button key="edit" size="small" icon={<EditOutlined />} onClick={() => setEditingScaleId(item.id)}>
                        Редактировать
                      </Button>,
                      <Popconfirm key="del" title="Удалить из библиотеки?" onConfirm={() => onDeleteScale(item.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]}
                  >
                    <div style={{ width: '100%' }}>
                      <Title level={5} style={{ marginBottom: 0 }}>
                        {item.name}{' '}
                        <Tag color={item.scale.kind === 'numeric' ? 'blue' : 'gold'}>
                          {item.scale.kind === 'numeric' ? 'числовая' : 'категориальная'}
                        </Tag>
                      </Title>
                      {item.description && <Text type="secondary">{item.description}</Text>}
                      <div style={{ marginTop: 8 }}>
                        <ScalePreview scale={item.scale} />
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="Создать типовой узел"
        open={createNodeModalOpen}
        onCancel={() => setCreateNodeModalOpen(false)}
        onOk={handleCreateNode}
        okButtonProps={{ disabled: !newNodeName.trim() }}
        okText="Создать и редактировать"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input placeholder="Название" value={newNodeName} onChange={(e) => setNewNodeName(e.target.value)} />
          <TextArea
            placeholder="Описание (необязательно)"
            value={newNodeDescription}
            onChange={(e) => setNewNodeDescription(e.target.value)}
            rows={2}
          />
        </Space>
      </Modal>

      <Modal
        title="Создать типовую шкалу"
        open={createScaleModalOpen}
        onCancel={() => setCreateScaleModalOpen(false)}
        onOk={handleCreateScale}
        okButtonProps={{ disabled: !newScaleName.trim() }}
        okText="Создать и редактировать"
      >
        <Input placeholder="Название" value={newScaleName} onChange={(e) => setNewScaleName(e.target.value)} />
      </Modal>
    </Space>
  )
}
