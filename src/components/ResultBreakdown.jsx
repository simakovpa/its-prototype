import React, { useMemo } from 'react'
import { Tree, Tag, Typography, Space, Tooltip } from 'antd'
import { WarningOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { categoryFor } from '../engine/scale.js'

const { Text } = Typography

function ScoreTag({ result }) {
  if (result.status === 'excluded') return <Tag color="default">исключено</Tag>
  if (result.status === 'structurally_absent') return <Tag color="default">нет компонента</Tag>
  if (result.status === 'undetermined') return <Tag color="default">не определено</Tag>

  if (result.scaleKind === 'index') {
    const cat = categoryFor(result.score)
    return (
      <Tag color={cat.color} style={{ color: '#fff' }}>
        {result.score.toFixed(1)} — {cat.label}
      </Tag>
    )
  }
  // балльная шкала 0–4
  const ballColors = ['#cf1322', '#d46b08', '#d4b106', '#7cb305', '#237804']
  const idx = Math.max(0, Math.min(4, Math.round(result.score)))
  return (
    <Tag color={ballColors[idx]} style={{ color: '#fff' }}>
      балл {result.score}
    </Tag>
  )
}

function nodeTitle(result) {
  return (
    <span className="its-tree-node-label">
      <Text strong={result.kind === 'container'}>{result.name}</Text>
      <ScoreTag result={result} />
      {result.correctionFired && (
        <Tooltip title={result.correctionFired.description || 'Сработало правило коррекции'}>
          <Tag icon={<WarningOutlined />} color="volcano">
            коррекция
          </Tag>
        </Tooltip>
      )}
      {result.strategyMeta && (
        <Tag color="geekblue">
          выбрана: {result.strategyMeta.chosenStrategy} (доля плохих {(result.strategyMeta.share * 100).toFixed(0)}%)
        </Tag>
      )}
      {!!result.renormalizedFrom && (
        <Tooltip title="Часть дочерних элементов исключена — веса остальных перенормированы">
          <Tag icon={<QuestionCircleOutlined />}>перенормировано</Tag>
        </Tooltip>
      )}
      {result.note && (
        <Tooltip title={result.note}>
          <Tag color="default">почему?</Tag>
        </Tooltip>
      )}
      {result.factDisplay && <Text type="secondary">{result.factDisplay}</Text>}
    </span>
  )
}

function toTreeData(result) {
  return {
    key: result.id + Math.random().toString(36).slice(2, 7),
    title: nodeTitle(result),
    children: result.children && result.children.length ? result.children.map(toTreeData) : undefined,
  }
}

export default function ResultBreakdown({ result }) {
  const treeData = useMemo(() => (result ? [toTreeData(result)] : []), [result])
  if (!result) return null
  return <Tree treeData={treeData} defaultExpandAll blockNode selectable={false} />
}
