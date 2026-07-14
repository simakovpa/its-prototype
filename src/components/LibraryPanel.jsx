import React from 'react'
import { Row, Col, Card, List, Tag, Popconfirm, Button, Empty, Typography, Space, Table } from 'antd'
import { DeleteOutlined, ApartmentOutlined, DatabaseOutlined, BgColorsOutlined } from '@ant-design/icons'

const { Text, Title, Paragraph } = Typography

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

export default function LibraryPanel({ library, onDeleteNode, onDeleteScale }) {
  return (
    <Row gutter={16}>
      <Col span={12}>
        <Card size="small" title={<Space><ApartmentOutlined /> Типовые узлы</Space>}>
          <Paragraph type="secondary">
            Готовые фрагменты дерева методики (Этап/Узел/Группа/Параметр вместе с содержимым),
            сохранённые из любой методики кнопкой «Сохранить в библиотеку». Используются через
            «Вставить из библиотеки» в редакторе методики — каждая вставка создаёт независимую
            копию, изменения в библиотеке на уже вставленные копии не влияют.
          </Paragraph>
          {library.nodes.length === 0 ? (
            <Empty description="Пока ничего не сохранено" />
          ) : (
            <List
              dataSource={library.nodes}
              renderItem={(item) => (
                <List.Item
                  actions={[
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
        <Card size="small" title={<Space><BgColorsOutlined /> Типовые шкалы</Space>}>
          <Paragraph type="secondary">
            Готовые шкалы оценки (зоны Ф/Н или категориальные), сохранённые из параметра любой
            методики. Используются через «Загрузить из библиотеки» в форме параметра.
          </Paragraph>
          {library.scales.length === 0 ? (
            <Empty description="Пока ничего не сохранено" />
          ) : (
            <List
              dataSource={library.scales}
              renderItem={(item) => (
                <List.Item
                  actions={[
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
  )
}
