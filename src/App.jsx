import React, { useState } from 'react'
import { Layout, Typography, Tabs, Select, Space, Tag, Button, Modal, Form, Input } from 'antd'
import { PlusOutlined, CopyOutlined, InboxOutlined, UndoOutlined } from '@ant-design/icons'
import MethodologyEditor from './components/MethodologyEditor.jsx'
import TestRunPanel from './components/TestRunPanel.jsx'
import LibraryPanel from './components/LibraryPanel.jsx'
import { initialMethodologies, levelOptions } from './data/methodologyTemplates.js'
import { newRootTemplate, nextId, cloneSubtree, cloneScale } from './utils/treeOps.js'
import { publishVersion } from './utils/versionOps.js'

const { Header, Content } = Layout
const { Title, Text } = Typography

function duplicateMethodologyEntity(source, name) {
  const id = nextId('meth')
  const clonedDraft = cloneSubtree(source.draft)
  return {
    id,
    name: name || `${source.name} (копия)`,
    level: source.level,
    assetType: source.assetType,
    status: 'active',
    draft: clonedDraft,
    versions: [
      {
        id: nextId('ver'),
        number: 1,
        publishedAt: new Date().toISOString(),
        note: `Скопировано из «${source.name}»`,
        template: cloneSubtree(clonedDraft),
        status: 'active',
      },
    ],
  }
}

export default function App() {
  const [methodologies, setMethodologies] = useState(initialMethodologies)
  const [editingId, setEditingId] = useState(initialMethodologies[0].id)
  const [newMethodModalOpen, setNewMethodModalOpen] = useState(false)
  const [form] = Form.useForm()

  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)
  const [duplicateName, setDuplicateName] = useState('')

  const [library, setLibrary] = useState({ nodes: [], scales: [] })

  const activeMethodology = methodologies.find((m) => m.id === editingId)

  const updateActiveDraft = (nextTemplate) => {
    setMethodologies((list) => list.map((m) => (m.id === editingId ? { ...m, draft: nextTemplate } : m)))
  }

  const handlePublishVersion = (note) => {
    setMethodologies((list) => list.map((m) => (m.id === editingId ? publishVersion(m, note, library) : m)))
  }

  const handleRestoreDraftFromVersion = (versionId) => {
    setMethodologies((list) =>
      list.map((m) => {
        if (m.id !== editingId) return m
        const v = m.versions.find((x) => x.id === versionId)
        if (!v) return m
        return { ...m, draft: cloneSubtree(v.template) }
      })
    )
  }

  const handleCreateMethodology = () => {
    form.validateFields().then((values) => {
      const id = nextId('meth')
      const newMethodology = {
        id,
        name: values.name,
        level: values.level,
        assetType: values.assetType,
        status: 'active',
        draft: newRootTemplate(values.name),
        versions: [],
      }
      setMethodologies((list) => [...list, newMethodology])
      setEditingId(id)
      setNewMethodModalOpen(false)
      form.resetFields()
    })
  }

  const handleDuplicateMethodology = () => {
    if (!activeMethodology || !duplicateName.trim()) return
    const newMethodology = duplicateMethodologyEntity(activeMethodology, duplicateName.trim())
    setMethodologies((list) => [...list, newMethodology])
    setEditingId(newMethodology.id)
    setDuplicateModalOpen(false)
    setDuplicateName('')
  }

  // Дублирование связанной методики при копировании узла с динамической
  // группой (стресс-тест, п.8) — та же простая операция дублирования, что и
  // «Дублировать методику», просто вызванная автоматически движком копирования.
  const handleDuplicateLinkedMethodology = (methodologyId) => {
    const source = methodologies.find((m) => m.id === methodologyId)
    if (!source) return null
    const newMethodology = duplicateMethodologyEntity(source)
    setMethodologies((list) => [...list, newMethodology])
    return newMethodology
  }

  const handleToggleArchiveMethodology = (id) => {
    setMethodologies((list) => list.map((m) => (m.id === id ? { ...m, status: m.status === 'archived' ? 'active' : 'archived' } : m)))
  }

  const handleSaveNodeToLibrary = (node, name, description) => {
    const id = nextId('libnode')
    setLibrary((lib) => ({ ...lib, nodes: [...lib.nodes, { id, name, description, status: 'active', node: cloneSubtree(node) }] }))
    return id
  }
  const handleSaveScaleToLibrary = (scale, name) => {
    const id = nextId('libscale')
    setLibrary((lib) => ({ ...lib, scales: [...lib.scales, { id, name, description: '', status: 'active', scale: cloneScale(scale) }] }))
    return id
  }
  const handleArchiveLibraryNode = (id) => setLibrary((lib) => ({ ...lib, nodes: lib.nodes.map((n) => (n.id === id ? { ...n, status: 'archived' } : n)) }))
  const handleArchiveLibraryScale = (id) => setLibrary((lib) => ({ ...lib, scales: lib.scales.map((s) => (s.id === id ? { ...s, status: 'archived' } : s)) }))
  const handleUpdateLibraryNode = (id, nextNode) => setLibrary((lib) => ({ ...lib, nodes: lib.nodes.map((n) => (n.id === id ? { ...n, node: nextNode } : n)) }))
  const handleUpdateLibraryScale = (id, nextScale) => setLibrary((lib) => ({ ...lib, scales: lib.scales.map((s) => (s.id === id ? { ...s, scale: nextScale } : s)) }))

  const editableOptions = methodologies.map((m) => ({
    value: m.id,
    label: `${m.name} — ${levelOptions.find((l) => l.value === m.level)?.label || m.level}${m.status === 'archived' ? ' (архив)' : ''}`,
  }))

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>Модуль ИТС — прототип шаблона расчёта</Title>
        <Tag color="green">Приказ №676 — демонстрационная методика</Tag>
      </Header>
      <Content style={{ padding: 24 }}>
        <Tabs
          defaultActiveKey="editor"
          items={[
            {
              key: 'editor',
              label: 'Шаблон расчёта ИТС',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Space wrap>
                    <Text>Редактируемая методика:</Text>
                    <Select style={{ width: 380 }} value={editingId} onChange={setEditingId} options={editableOptions} />
                    <Button icon={<PlusOutlined />} onClick={() => setNewMethodModalOpen(true)}>Добавить методику</Button>
                    <Button
                      icon={<CopyOutlined />}
                      disabled={!activeMethodology}
                      onClick={() => { setDuplicateName(activeMethodology ? `${activeMethodology.name} (копия)` : ''); setDuplicateModalOpen(true) }}
                    >
                      Дублировать методику
                    </Button>
                    {activeMethodology && (
                      <Button
                        icon={activeMethodology.status === 'archived' ? <UndoOutlined /> : <InboxOutlined />}
                        onClick={() => handleToggleArchiveMethodology(activeMethodology.id)}
                      >
                        {activeMethodology.status === 'archived' ? 'Разархивировать' : 'Архивировать методику'}
                      </Button>
                    )}
                  </Space>
                  {activeMethodology && (
                    <MethodologyEditor
                      template={activeMethodology.draft}
                      onChange={updateActiveDraft}
                      methodologies={methodologies}
                      currentMethodologyId={editingId}
                      library={library}
                      onSaveNodeToLibrary={handleSaveNodeToLibrary}
                      onSaveScaleToLibrary={handleSaveScaleToLibrary}
                      onDuplicateLinkedMethodology={handleDuplicateLinkedMethodology}
                      showVersioning
                      methodology={activeMethodology}
                      onPublishVersion={handlePublishVersion}
                      onRestoreDraftFromVersion={handleRestoreDraftFromVersion}
                    />
                  )}
                </Space>
              ),
            },
            {
              key: 'library',
              label: 'Библиотека',
              children: (
                <LibraryPanel
                  library={library}
                  methodologies={methodologies}
                  onArchiveNode={handleArchiveLibraryNode}
                  onArchiveScale={handleArchiveLibraryScale}
                  onCreateNode={(name, description, node) => handleSaveNodeToLibrary(node, name, description)}
                  onUpdateNode={handleUpdateLibraryNode}
                  onCreateScale={(name, scale) => handleSaveScaleToLibrary(scale, name)}
                  onUpdateScale={handleUpdateLibraryScale}
                  onSaveScaleToLibrary={handleSaveScaleToLibrary}
                />
              ),
            },
            {
              key: 'testrun',
              label: 'Тестовый / официальный расчёт',
              children: <TestRunPanel methodologies={methodologies} library={library} />,
            },
          ]}
        />
      </Content>

      <Modal title="Новая методика расчёта ИТС" open={newMethodModalOpen} onCancel={() => setNewMethodModalOpen(false)} onOk={handleCreateMethodology} okText="Создать">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Наименование" rules={[{ required: true, message: 'Укажите наименование' }]}>
            <Input placeholder="Например, Выключатель 110 кВ" />
          </Form.Item>
          <Form.Item name="level" label="Уровень применения" rules={[{ required: true }]} initialValue="equipment">
            <Select options={levelOptions} />
          </Form.Item>
          <Form.Item name="assetType" label="Тип актива (код)" rules={[{ required: true, message: 'Укажите код типа актива' }]} extra="Например: transformer, breaker, ps, tp, vl">
            <Input placeholder="breaker" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Дублировать методику" open={duplicateModalOpen} onCancel={() => setDuplicateModalOpen(false)} onOk={handleDuplicateMethodology} okButtonProps={{ disabled: !duplicateName.trim() }} okText="Создать копию">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">
            Создаст новую методику с независимой историей версий, взяв за основу текущий черновик «{activeMethodology?.name}».
            Связанные через динамические группы методики оборудования НЕ дублируются — копия продолжает
            ссылаться на те же самые методики, что и оригинал (удобно для параллельных методик — «внутренняя»/«надзорная» —
            общий фундамент, отдельные пороги наверху).
          </Text>
          <Input placeholder="Название новой методики" value={duplicateName} onChange={(e) => setDuplicateName(e.target.value)} />
        </Space>
      </Modal>
    </Layout>
  )
}
