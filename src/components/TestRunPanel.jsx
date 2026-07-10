import React, { useMemo, useState } from 'react'
import { Card, Select, Button, Space, Divider, Typography, Tag, Table, Empty, Alert } from 'antd'
import { PlayCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { calculateEquipmentIts, calculateObjectIts } from '../engine/calculate.js'
import ResultBreakdown from './ResultBreakdown.jsx'
import { categoryFor } from '../engine/scale.js'
import { objects, tms, tmcs } from '../data/mockAssets.js'

const { Text, Title } = Typography

export default function TestRunPanel({ transformerTemplate, objectTemplate }) {
  const equipmentOptions = tmcs
    .filter((t) => t.tmcType === 'transformer')
    .map((t) => ({ value: t.id, label: t.name }))

  const [selectedEquipment, setSelectedEquipment] = useState(equipmentOptions[0]?.value)
  const [lastResult, setLastResult] = useState(null)
  const [lastIsTrial, setLastIsTrial] = useState(true)
  const [history, setHistory] = useState([])

  const [objectResult, setObjectResult] = useState(null)

  const runEquipment = (trial) => {
    const result = calculateEquipmentIts(transformerTemplate, selectedEquipment)
    setLastResult(result)
    setLastIsTrial(trial)
    if (!trial) {
      const cat = categoryFor(result.score)
      setHistory((h) => [
        {
          date: new Date().toLocaleString('ru-RU'),
          equipment: equipmentOptions.find((e) => e.value === selectedEquipment)?.label,
          score: result.score,
          category: cat.label,
          color: cat.color,
        },
        ...h,
      ])
    }
  }

  const runObject = () => {
    const obj = objects[0]
    const tmsOfObject = tms.filter((t) => t.objectId === obj.id).map((t) => t.id)
    const result = calculateObjectIts(objectTemplate, obj.id, tmsOfObject, { transformer: transformerTemplate })
    setObjectResult(result)
  }

  const finalCategory = lastResult && lastResult.status === 'ok' ? categoryFor(lastResult.score) : null

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card size="small" title="Расчёт по единице оборудования">
        <Space wrap>
          <Select
            style={{ width: 320 }}
            options={equipmentOptions}
            value={selectedEquipment}
            onChange={setSelectedEquipment}
          />
          <Button icon={<PlayCircleOutlined />} onClick={() => runEquipment(true)}>
            Пробный расчёт
          </Button>
          <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => runEquipment(false)}>
            Официальный расчёт
          </Button>
        </Space>

        {lastResult && (
          <>
            <Divider />
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Tag color={lastIsTrial ? 'default' : 'green'}>
                  {lastIsTrial ? 'Пробный расчёт — в историю не пишется' : 'Официальный расчёт — записан в историю'}
                </Tag>
                {lastResult.status === 'ok' ? (
                  <Title level={4} style={{ margin: 0 }}>
                    ИТС = {lastResult.score.toFixed(1)}{' '}
                    <Tag color={finalCategory.color} style={{ color: '#fff' }}>
                      {finalCategory.label}
                    </Tag>
                  </Title>
                ) : (
                  <Alert type="warning" showIcon message="Не определено — недостаточно данных для расчёта" />
                )}
              </Space>
              <Text type="secondary">Детализация вклада каждого уровня (снизу вверх):</Text>
              <ResultBreakdown result={lastResult} />
            </Space>
          </>
        )}
      </Card>

      {history.length > 0 && (
        <Card size="small" title="История официальных расчётов (Значение ИТС)">
          <Table
            size="small"
            pagination={false}
            dataSource={history.map((h, i) => ({ ...h, key: i }))}
            columns={[
              { title: 'Дата расчёта', dataIndex: 'date' },
              { title: 'Оборудование', dataIndex: 'equipment' },
              { title: 'ИТС', dataIndex: 'score', render: (v) => v.toFixed(1) },
              {
                title: 'Категория',
                dataIndex: 'category',
                render: (v, r) => <Tag color={r.color} style={{ color: '#fff' }}>{v}</Tag>,
              },
            ]}
          />
        </Card>
      )}

      <Card size="small" title="Расчёт по объекту (технологическая цепочка)">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Text>Объект: {objects[0].name}</Text>
            <Button icon={<PlayCircleOutlined />} onClick={runObject}>
              Рассчитать ИТС объекта
            </Button>
          </Space>
          {objectResult ? (
            <>
              {objectResult.status === 'ok' && (
                <Title level={4}>
                  ИТС объекта = {objectResult.score.toFixed(1)}{' '}
                  <Tag color={categoryFor(objectResult.score).color} style={{ color: '#fff' }}>
                    {categoryFor(objectResult.score).label}
                  </Tag>
                </Title>
              )}
              <ResultBreakdown result={objectResult} />
            </>
          ) : (
            <Empty description="Ещё не рассчитано" />
          )}
        </Space>
      </Card>
    </Space>
  )
}
