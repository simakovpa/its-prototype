import React, { useState } from 'react'
import { Layout, Typography, Tabs, Select, Space, Tag } from 'antd'
import MethodologyEditor from './components/MethodologyEditor.jsx'
import TestRunPanel from './components/TestRunPanel.jsx'
import { transformerMethodologyTemplate, objectMethodologyTemplate } from './data/methodologyTemplates.js'

const { Header, Content } = Layout
const { Title, Text } = Typography

export default function App() {
  const [transformerTemplate, setTransformerTemplate] = useState(transformerMethodologyTemplate)
  const [objectTemplate, setObjectTemplate] = useState(objectMethodologyTemplate)
  const [editingWhich, setEditingWhich] = useState('transformer')

  const activeTemplate = editingWhich === 'transformer' ? transformerTemplate : objectTemplate
  const setActiveTemplate = editingWhich === 'transformer' ? setTransformerTemplate : setObjectTemplate

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
                      style={{ width: 320 }}
                      value={editingWhich}
                      onChange={setEditingWhich}
                      options={[
                        { value: 'transformer', label: 'Оборудование: Силовой трансформатор' },
                        { value: 'object', label: 'Объект: Подстанция (технологическая цепочка)' },
                      ]}
                    />
                  </Space>
                  <MethodologyEditor template={activeTemplate} onChange={setActiveTemplate} />
                </Space>
              ),
            },
            {
              key: 'testrun',
              label: 'Тестовый / официальный расчёт',
              children: <TestRunPanel transformerTemplate={transformerTemplate} objectTemplate={objectTemplate} />,
            },
          ]}
        />
      </Content>
    </Layout>
  )
}
