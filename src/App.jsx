import React, { useState } from 'react'
import { Layout, Typography, Tabs, Select, Space, Tag, Button, Modal, Form, Input } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import MethodologyEditor from './components/MethodologyEditor.jsx'
import TestRunPanel from './components/TestRunPanel.jsx'
import { initialMethodologies, levelOptions } from './data/methodologyTemplates.js'
import { newRootTemplate, nextId } from './utils/treeOps.js'

const { Header, Content } = Layout
const { Title, Text } = Typography

export default function App() {
  const [methodologies, setMethodologies] = useState(initialMethodologies)
  const [editingId, setEditingId] = useState(initialMethodologies[0].id)
  const [newMethodModalOpen, setNewMethodModalOpen] = useState(false)
  const [form] = Form.useForm()

  const activeMethodology = methodologies.find((m) => m.id === editingId)

  const updateActiveTemplate = (nextTemplate) => {
    setMethodologies((list) => list.map((m) => (m.id === editingId ? { ...m, template: nextTemplate } : m)))
  }

  const handleCreateMethodology = () => {
    form.validateFields().then((values) => {
      const id = nextId('meth')
      const newMethodology = {
        id,
        name: values.name,
        level: values.level,
        assetType: values.assetType,
        template: newRootTemplate(values.name),
      }
      setMethodologies((list) => [...list, newMethodology])
      setEditingId(id)
      setNewMethodModalOpen(false)
      form.resetFields()
    })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          Модуль ИТС — прототип шаблона расчёта
        </Title>
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
                  <Space>
                    <Text>Редактируемая методика:</Text>
                    <Select
                      style={{ width: 380 }}
                      value={editingId}
                      onChange={setEditingId}
                      options={methodologies.map((m) => ({
                        value: m.id,
                        label: `${m.name} — ${levelOptions.find((l) => l.value === m.level)?.label || m.level}`,
                      }))}
                    />
                    <Button icon={<PlusOutlined />} onClick={() => setNewMethodModalOpen(true)}>
                      Добавить методику
                    </Button>
                  </Space>
                  {activeMethodology && (
                    <MethodologyEditor
                      template={activeMethodology.template}
                      onChange={updateActiveTemplate}
                      methodologies={methodologies}
                      currentMethodologyId={editingId}
                    />
                  )}
                </Space>
              ),
            },
            {
              key: 'testrun',
              label: 'Тестовый / официальный расчёт',
              children: <TestRunPanel methodologies={methodologies} />,
            },
          ]}
        />
      </Content>

      <Modal
        title="Новая методика расчёта ИТС"
        open={newMethodModalOpen}
        onCancel={() => setNewMethodModalOpen(false)}
        onOk={handleCreateMethodology}
        okText="Создать"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Наименование" rules={[{ required: true, message: 'Укажите наименование' }]}>
            <Input placeholder="Например, Выключатель 110 кВ" />
          </Form.Item>
          <Form.Item name="level" label="Уровень применения" rules={[{ required: true }]} initialValue="equipment">
            <Select options={levelOptions} />
          </Form.Item>
          <Form.Item
            name="assetType"
            label="Тип актива (код)"
            rules={[{ required: true, message: 'Укажите код типа актива' }]}
            extra="Например: transformer, breaker, ps, tp, vl — код типа ТМЦ/ТМ/объекта, к которому применяется методика"
          >
            <Input placeholder="breaker" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}
