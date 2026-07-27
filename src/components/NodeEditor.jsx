import React, { useState } from 'react'
import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Divider,
  Button,
  Space,
  Typography,
  Empty,
  Tag,
} from 'antd'
import { PlusOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons'
import {
  strategyOptions,
  subStrategyOptions,
  sourceTypeOptions,
  comparisonMethodOptions,
  missingDataOptions,
  materializationOptions,
  scaleKindOptions,
} from '../data/catalog.js'
import { measuredParams, defectTypes } from '../data/dictionaries.js'
import { cloneScale } from '../utils/treeOps.js'

const { Text, Title } = Typography

export function NumericZonesEditor({ zones, onChange }) {
  const update = (idx, patch) => {
    const next = zones.slice()
    next[idx] = { ...next[idx], ...patch }
    onChange(next)
  }
  const remove = (idx) => onChange(zones.filter((_, i) => i !== idx))
  const add = () => onChange([...zones, { score: 0 }])

  return (
    <div>
      {zones.map((z, idx) => (
        <Space key={idx} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
          <InputNumber placeholder="от" value={z.min} onChange={(v) => update(idx, { min: v })} style={{ width: 80 }} />
          <Switch size="small" checked={!!z.minInclusive} onChange={(v) => update(idx, { minInclusive: v })} checkedChildren="[вкл" unCheckedChildren="(искл" />
          <InputNumber placeholder="до" value={z.max} onChange={(v) => update(idx, { max: v })} style={{ width: 80 }} />
          <Switch size="small" checked={!!z.maxInclusive} onChange={(v) => update(idx, { maxInclusive: v })} checkedChildren="вкл]" unCheckedChildren="искл)" />
          <Text type="secondary">→ балл</Text>
          <InputNumber min={0} max={4} value={z.score} onChange={(v) => update(idx, { score: v })} style={{ width: 60 }} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(idx)} />
        </Space>
      ))}
      <Button size="small" icon={<PlusOutlined />} onClick={add}>Добавить зону</Button>
    </div>
  )
}

export function CategoricalMapEditor({ map, onChange }) {
  const update = (idx, patch) => {
    const next = map.slice()
    next[idx] = { ...next[idx], ...patch }
    onChange(next)
  }
  const remove = (idx) => onChange(map.filter((_, i) => i !== idx))
  const add = () => onChange([...map, { value: '', score: 0 }])

  return (
    <div>
      {map.map((m, idx) => (
        <Space key={idx} style={{ display: 'flex', marginBottom: 8 }}>
          <Input placeholder="значение (например, Имеется)" value={m.value} onChange={(e) => update(idx, { value: e.target.value })} style={{ width: 200 }} />
          <Text type="secondary">→ балл</Text>
          <InputNumber min={0} max={4} value={m.score} onChange={(v) => update(idx, { score: v })} style={{ width: 60 }} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(idx)} />
        </Space>
      ))}
      <Button size="small" icon={<PlusOutlined />} onClick={add}>Добавить значение</Button>
    </div>
  )
}

export default function NodeEditor({ node, onChange, methodologies = [], library, onSaveScaleToLibrary, onUnlinkLibraryRef }) {
  const [scaleLibName, setScaleLibName] = useState('')

  if (!node) {
    return <Empty description="Выберите узел дерева слева" style={{ marginTop: 60 }} />
  }

  const patch = (p) => onChange({ ...node, ...p })

  if (node.kind === 'dynamicGroup') {
    const linked = methodologies.find((m) => m.id === node.linkedMethodologyId)
    return (
      <div>
        <Title level={5} style={{ marginTop: 0 }}>
          {node.name} <Tag color="purple">Динамическая группа оборудования</Tag>
        </Title>
        <Text type="secondary">
          Связана с методикой: <Text strong>{linked ? linked.name : '(не найдена)'}</Text>
          {linked && ` — тип актива «${linked.assetType}»`}. Состав группы и ИТС каждого экземпляра
          определяются на расчёте автоматически по действующей версии связанной методики.
        </Text>
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Space size="large">
            <Form.Item label="Вес (в рамках родителя)">
              <InputNumber min={0} max={1} step={0.05} value={node.weight} onChange={(v) => patch({ weight: v })} />
            </Form.Item>
            <Form.Item label="Необязательное звено (при наличии)">
              <Switch checked={!!node.optional} onChange={(v) => patch({ optional: v })} />
            </Form.Item>
          </Space>
        </Form>
      </div>
    )
  }

  if (node.kind === 'libraryRef') {
    const libItem = library?.nodes?.find((n) => n.id === node.libraryNodeId)
    return (
      <div>
        <Title level={5} style={{ marginTop: 0 }}>
          {node.name} <Tag color="cyan" icon={<LinkOutlined />}>Ссылка на библиотеку</Tag>
        </Title>
        <Text type="secondary">
          Ссылается на типовой узел библиотеки: <Text strong>{libItem ? libItem.name : '(запись не найдена)'}</Text>.
          В черновике всегда отражает текущее содержимое библиотечной записи; при публикации версии
          методики будет разрешена в конкретное содержимое.
        </Text>
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Space size="large">
            <Form.Item label="Вес (в рамках родителя)">
              <InputNumber min={0} max={1} step={0.05} value={node.weight} onChange={(v) => patch({ weight: v })} />
            </Form.Item>
            <Form.Item label="Критический">
              <Switch checked={!!node.critical} onChange={(v) => patch({ critical: v })} />
            </Form.Item>
          </Space>
          <Button onClick={() => onUnlinkLibraryRef?.(node.id)}>Отвязать (превратить в независимую копию)</Button>
        </Form>
      </div>
    )
  }

  return (
    <div>
      <Title level={5} style={{ marginTop: 0 }}>
        {node.name} <Tag>{node.kind === 'leaf' ? 'Параметр' : 'Контейнер (Этап/Узел/Группа)'}</Tag>
      </Title>

      <Form layout="vertical">
        <Form.Item label="Наименование">
          <Input value={node.name} onChange={(e) => patch({ name: e.target.value })} />
        </Form.Item>

        <Space size="large">
          <Form.Item label="Вес (в рамках родителя)">
            <InputNumber min={0} max={1} step={0.05} value={node.weight} onChange={(v) => patch({ weight: v })} />
          </Form.Item>
          <Form.Item label="Критический">
            <Switch checked={!!node.critical} onChange={(v) => patch({ critical: v })} />
          </Form.Item>
          <Form.Item label="Ресурсоопределяющий">
            <Switch checked={!!node.resourceDefining} onChange={(v) => patch({ resourceDefining: v })} />
          </Form.Item>
        </Space>

        {node.kind === 'container' && (
          <>
            <Divider orientation="left" plain>Свёртка</Divider>
            <Form.Item label="Стратегия свёртки">
              <Select style={{ width: 420 }} options={strategyOptions} value={node.strategy} onChange={(v) => patch({ strategy: v })} />
            </Form.Item>

            {node.strategy === 'THRESHOLD_SHARE_SWITCH' && (
              <Space direction="vertical" style={{ marginBottom: 16 }}>
                <Space size="large">
                  <Form.Item label="Порог «плохого» результата" style={{ marginBottom: 0 }}>
                    <InputNumber value={node.strategyParams?.badThreshold ?? 40} onChange={(v) => patch({ strategyParams: { ...node.strategyParams, badThreshold: v } })} />
                  </Form.Item>
                  <Form.Item label="Пороговая доля (0–1)" style={{ marginBottom: 0 }}>
                    <InputNumber min={0} max={1} step={0.05} value={node.strategyParams?.badShare ?? 0.25} onChange={(v) => patch({ strategyParams: { ...node.strategyParams, badShare: v } })} />
                  </Form.Item>
                </Space>
                <Space size="large">
                  <Form.Item label="Стратегия А (если доля превышена)" style={{ marginBottom: 0 }}>
                    <Select style={{ width: 260 }} options={subStrategyOptions} value={node.strategyParams?.strategyIfExceeded ?? 'MIN'} onChange={(v) => patch({ strategyParams: { ...node.strategyParams, strategyIfExceeded: v } })} />
                  </Form.Item>
                  <Form.Item label="Стратегия Б (иначе)" style={{ marginBottom: 0 }}>
                    <Select style={{ width: 260 }} options={subStrategyOptions} value={node.strategyParams?.strategyIfNotExceeded ?? 'WEIGHTED_BY_ATTRIBUTE'} onChange={(v) => patch({ strategyParams: { ...node.strategyParams, strategyIfNotExceeded: v } })} />
                  </Form.Item>
                </Space>
                <Text type="secondary">Сама «Условная свёртка» не предлагается как стратегия А/Б — во избежание вложенности в саму себя.</Text>
              </Space>
            )}

            <Divider orientation="left" plain>Материализация</Divider>
            <Form.Item label="Тип узла">
              <Select style={{ width: 420 }} options={materializationOptions} value={node.materialization?.type || 'virtual'} onChange={(v) => patch({ materialization: { ...node.materialization, type: v } })} />
            </Form.Item>
            {node.materialization?.type === 'materialized' && (
              <Form.Item label="Тип ТМЦ-сиблинга">
                <Input style={{ width: 300 }} placeholder="например, bushing" value={node.materialization?.assetType} onChange={(e) => patch({ materialization: { ...node.materialization, assetType: e.target.value } })} />
              </Form.Item>
            )}

            <Divider orientation="left" plain>Правила коррекции</Divider>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Каждое правило проверяется против исходного результата свёртки; критический потомок без данных тоже засчитывается.
            </Text>
            {(node.correctionRules || []).map((rule, idx) => (
              <Space key={rule.id || idx} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                <Text type="secondary">если результат</Text>
                <Select size="small" style={{ width: 70 }} value={rule.resultComparator} options={['>', '<', '>=', '<='].map((o) => ({ value: o, label: o }))}
                  onChange={(v) => { const rules = node.correctionRules.slice(); rules[idx] = { ...rule, resultComparator: v }; patch({ correctionRules: rules }) }} />
                <InputNumber size="small" value={rule.resultThreshold}
                  onChange={(v) => { const rules = node.correctionRules.slice(); rules[idx] = { ...rule, resultThreshold: v }; patch({ correctionRules: rules }) }} />
                <Text type="secondary">и есть критический потомок с баллом ≤</Text>
                <InputNumber size="small" value={rule.requireCriticalChildBelow}
                  onChange={(v) => { const rules = node.correctionRules.slice(); rules[idx] = { ...rule, requireCriticalChildBelow: v }; patch({ correctionRules: rules }) }} />
                <Text type="secondary">→ зафиксировать</Text>
                <InputNumber size="small" value={rule.action?.value}
                  onChange={(v) => { const rules = node.correctionRules.slice(); rules[idx] = { ...rule, action: { type: 'capAt', value: v } }; patch({ correctionRules: rules }) }} />
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => patch({ correctionRules: node.correctionRules.filter((_, i) => i !== idx) })} />
              </Space>
            ))}
            <Button size="small" icon={<PlusOutlined />} onClick={() => patch({ correctionRules: [...(node.correctionRules || []), { id: `rule-${Date.now()}`, resultComparator: '>', resultThreshold: 26, requireCriticalChildBelow: 25, action: { type: 'capAt', value: 26 } }] })}>
              Добавить правило
            </Button>
          </>
        )}

        {node.kind === 'leaf' && (
          <>
            <Divider orientation="left" plain>Источник данных</Divider>
            <Form.Item label="Тип источника">
              <Select style={{ width: 420 }} options={sourceTypeOptions} value={node.source?.type} onChange={(v) => patch({ source: { type: v } })} />
            </Form.Item>

            {node.source?.type === 'measured' && (
              <>
                <Form.Item label="Измеряемый параметр">
                  <Select style={{ width: 420 }} options={measuredParams.map((p) => ({ value: p.id, label: `${p.name} (${p.unit})` }))} value={node.source?.measuredParamId} onChange={(v) => patch({ source: { ...node.source, measuredParamId: v } })} />
                </Form.Item>
                <Form.Item label="Способ сопоставления">
                  <Select style={{ width: 420 }} options={comparisonMethodOptions} value={node.comparisonMethod} onChange={(v) => patch({ comparisonMethod: v })} />
                </Form.Item>
                {node.comparisonMethod === 'trend_n' && (
                  <Form.Item label="N последних значений">
                    <InputNumber min={2} max={10} value={node.trendN || 3} onChange={(v) => patch({ trendN: v })} />
                  </Form.Item>
                )}
              </>
            )}

            {node.source?.type === 'defect' && (
              <Form.Item label="Учитываемые типы дефектов">
                <Select mode="multiple" style={{ width: 420 }} options={defectTypes.map((d) => ({ value: d.id, label: d.name }))} value={node.source?.defectTypeIds || []} onChange={(v) => patch({ source: { ...node.source, defectTypeIds: v } })} />
              </Form.Item>
            )}

            <Form.Item label="Поведение при отсутствии факта">
              <Select style={{ width: 420 }} options={missingDataOptions} value={node.missingDataBehavior} onChange={(v) => patch({ missingDataBehavior: v })} />
            </Form.Item>

            <Divider orientation="left" plain>Шкала оценки</Divider>
            {library?.scales?.length > 0 && (
              <Form.Item label="Загрузить из библиотеки">
                <Select style={{ width: 420 }} placeholder="Выбрать готовую шкалу…" options={library.scales.map((s) => ({ value: s.id, label: s.name }))} value={undefined}
                  onChange={(id) => { const found = library.scales.find((s) => s.id === id); if (found) patch({ scale: cloneScale(found.scale) }) }} />
              </Form.Item>
            )}
            <Form.Item label="Тип шкалы">
              <Select style={{ width: 420 }} options={scaleKindOptions} value={node.scale?.kind}
                onChange={(v) => patch({ scale: v === 'numeric' ? { kind: 'numeric', zones: [{ score: 4 }] } : { kind: 'categorical', map: [{ value: '', score: 4 }] } })} />
            </Form.Item>
            {node.scale?.kind === 'numeric' ? (
              <NumericZonesEditor zones={node.scale.zones || []} onChange={(zones) => patch({ scale: { ...node.scale, zones } })} />
            ) : (
              <CategoricalMapEditor map={node.scale?.map || []} onChange={(map) => patch({ scale: { ...node.scale, map } })} />
            )}
            {onSaveScaleToLibrary && (
              <Space style={{ marginTop: 12 }}>
                <Input size="small" placeholder="Название для библиотеки" value={scaleLibName} onChange={(e) => setScaleLibName(e.target.value)} style={{ width: 260 }} />
                <Button size="small" disabled={!scaleLibName.trim()} onClick={() => { onSaveScaleToLibrary(node.scale, scaleLibName.trim()); setScaleLibName('') }}>
                  Сохранить шкалу в библиотеку
                </Button>
              </Space>
            )}
          </>
        )}
      </Form>
    </div>
  )
}
