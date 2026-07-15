// «Шаблон расчёта ИТС» — конфигурация методики. Рекурсивное дерево из одной и той же
// сущности «Узел методики» (kind: 'container' | 'leaf'), см. разделы 1–9 архитектурного документа.
// Ниже — пример для силового трансформатора (по мотивам Приказа №676) и для объекта (ПС).

const scaleAbsoluteTgDelta = {
  kind: 'numeric',
  zones: [
    { max: 0.8, maxInclusive: false, score: 4 },
    { min: 0.8, minInclusive: true, max: 1.5, maxInclusive: false, score: 3 },
    { min: 1.5, minInclusive: true, max: 2.5, maxInclusive: false, score: 2 },
    { min: 2.5, minInclusive: true, max: 4, maxInclusive: false, score: 1 },
    { min: 4, minInclusive: true, score: 0 },
  ],
}

const scaleTrendNoLoadLosses = {
  kind: 'numeric',
  zones: [
    { max: 5, maxInclusive: true, score: 4 },
    { min: 5, minInclusive: false, max: 10, maxInclusive: true, score: 3 },
    { min: 10, minInclusive: false, max: 15, maxInclusive: true, score: 2 },
    { min: 15, minInclusive: false, max: 25, maxInclusive: true, score: 1 },
    { min: 25, minInclusive: false, score: 0 },
  ],
}

const scaleAgeUsage = {
  kind: 'numeric',
  zones: [
    { max: 50, maxInclusive: true, score: 4 },
    { min: 50, minInclusive: false, max: 70, maxInclusive: true, score: 3 },
    { min: 70, minInclusive: false, max: 90, maxInclusive: true, score: 2 },
    { min: 90, minInclusive: false, max: 110, maxInclusive: true, score: 1 },
    { min: 110, minInclusive: false, score: 0 },
  ],
}

const scaleDefectPresence = {
  kind: 'categorical',
  map: [
    { value: 'Отсутствует', score: 4 },
    { value: 'Имеется', score: 0 },
  ],
}

export const transformerMethodologyTemplate = {
  id: 'root-transformer',
  name: 'ИТС силового трансформатора',
  kind: 'container',
  strategy: 'WEIGHTED_SUM',
  correctionRules: [
    {
      id: 'corr-1',
      resultComparator: '>',
      resultThreshold: 26,
      requireCriticalChildBelow: 25,
      action: { type: 'capAt', value: 26 },
      description: 'Если электрическая часть в критическом состоянии — итоговый ИТС не выше 26 (п. 3.8 Методики)',
    },
  ],
  children: [
    {
      id: 'stage-age',
      name: 'Этап: Возраст',
      kind: 'container',
      strategy: 'WEIGHTED_SUM',
      weight: 0.15,
      children: [
        {
          id: 'node-obobshchenny',
          name: 'Обобщённый узел',
          kind: 'container',
          strategy: 'WEIGHTED_DEFICIT_INDEX',
          weight: 0.6,
          materialization: { type: 'virtual' },
          children: [
            {
              id: 'group-service-life',
              name: 'Срок службы',
              kind: 'container',
              strategy: 'MIN',
              weight: 1,
              children: [
                {
                  id: 'param-age',
                  name: 'Возраст относительно нормативного срока службы',
                  kind: 'leaf',
                  weight: 1,
                  critical: false,
                  source: { type: 'passport' },
                  comparisonMethod: 'absolute',
                  missingDataBehavior: 'exclude',
                  scale: scaleAgeUsage,
                },
              ],
            },
          ],
        },
        {
          id: 'node-bushing-age',
          name: 'Ввод (возраст)',
          kind: 'container',
          strategy: 'WEIGHTED_DEFICIT_INDEX',
          weight: 0.4,
          materialization: { type: 'materialized', assetType: 'bushing' },
          children: [
            {
              id: 'group-bushing-service-life',
              name: 'Срок службы ввода',
              kind: 'container',
              strategy: 'MIN',
              weight: 1,
              children: [
                {
                  id: 'param-bushing-age',
                  name: 'Возраст ввода относительно нормативного срока службы',
                  kind: 'leaf',
                  weight: 1,
                  critical: false,
                  source: { type: 'passport' },
                  comparisonMethod: 'absolute',
                  missingDataBehavior: 'exclude',
                  scale: scaleAgeUsage,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'stage-electrical',
      name: 'Этап: Электрическая часть',
      kind: 'container',
      strategy: 'WEIGHTED_SUM',
      weight: 0.55,
      critical: true,
      children: [
        {
          id: 'node-windings',
          name: 'Обмотки',
          kind: 'container',
          strategy: 'WEIGHTED_DEFICIT_INDEX',
          weight: 0.6,
          materialization: { type: 'virtual' },
          children: [
            {
              id: 'group-windings-state',
              name: 'Состояние обмоток',
              kind: 'container',
              strategy: 'MIN',
              weight: 1,
              children: [
                {
                  id: 'param-tg-delta',
                  name: 'tgδ изоляции обмоток',
                  kind: 'leaf',
                  weight: 0.5,
                  critical: true,
                  source: { type: 'measured', measuredParamId: 'mp-tg-delta' },
                  comparisonMethod: 'absolute',
                  missingDataBehavior: 'exclude',
                  scale: scaleAbsoluteTgDelta,
                },
                {
                  id: 'param-winding-defect',
                  name: 'Наличие дефектов (нарушение геометрии)',
                  kind: 'leaf',
                  weight: 0.5,
                  critical: true,
                  source: { type: 'defect', defectTypeIds: ['def-winding-geometry'] },
                  missingDataBehavior: 'exclude',
                  scale: scaleDefectPresence,
                },
              ],
            },
          ],
        },
        {
          id: 'node-magnetic-core',
          name: 'Магнитопровод',
          kind: 'container',
          strategy: 'WEIGHTED_DEFICIT_INDEX',
          weight: 0.4,
          materialization: { type: 'virtual' },
          children: [
            {
              id: 'group-core-state',
              name: 'Состояние магнитопровода',
              kind: 'container',
              strategy: 'MIN',
              weight: 1,
              children: [
                {
                  id: 'param-no-load-losses',
                  name: 'Потери холостого хода (тренд к Фо)',
                  kind: 'leaf',
                  weight: 1,
                  critical: false,
                  source: { type: 'measured', measuredParamId: 'mp-no-load-losses' },
                  comparisonMethod: 'trend_fo',
                  missingDataBehavior: 'exclude',
                  scale: scaleTrendNoLoadLosses,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'stage-mechanical',
      name: 'Этап: Механическая часть',
      kind: 'container',
      strategy: 'WEIGHTED_SUM',
      weight: 0.3,
      children: [
        {
          id: 'node-tank',
          name: 'Бак',
          kind: 'container',
          strategy: 'WEIGHTED_DEFICIT_INDEX',
          weight: 1,
          materialization: { type: 'virtual' },
          children: [
            {
              id: 'group-tank-state',
              name: 'Состояние бака',
              kind: 'container',
              strategy: 'MIN',
              weight: 1,
              children: [
                {
                  id: 'param-tank-defect',
                  name: 'Наличие дефектов (трещина / течь масла)',
                  kind: 'leaf',
                  weight: 1,
                  critical: true,
                  source: { type: 'defect', defectTypeIds: ['def-bak-crack', 'def-oil-leak'] },
                  missingDataBehavior: 'exclude',
                  scale: scaleDefectPresence,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

// Методика уровня Объекта — та же сущность, только звенья технологической
// цепочки резолвятся динамически на реальном составе оборудования объекта.
export const objectMethodologyTemplate = {
  id: 'root-object',
  name: 'ИТС объекта — технологическая цепочка',
  kind: 'container',
  strategy: 'MIN',
  children: [
    {
      id: 'chain-transformers',
      name: 'Силовые трансформаторы',
      kind: 'dynamicGroup',
      linkedMethodologyId: 'meth-transformer',
      strategy: 'WEIGHTED_BY_ATTRIBUTE',
      weight: 1,
      optional: false,
    },
  ],
}

// Реестр методик — то, чем пользователь управляет через кнопку «Добавить методику».
// Каждая запись знает, на каком уровне дерева активов и к какому типу актива она
// применяется — это и используется при построении динамических групп на уровне объекта.
function seedVersion(template, note) {
  return {
    id: `ver-seed-${Math.random().toString(36).slice(2, 8)}`,
    number: 1,
    publishedAt: '2026-01-15T09:00:00.000Z',
    note: note || 'Первая публикация',
    template,
    status: 'active',
  }
}

export const initialMethodologies = [
  {
    id: 'meth-transformer',
    name: 'Силовой трансформатор',
    level: 'equipment',
    assetType: 'transformer',
    draft: transformerMethodologyTemplate,
    versions: [seedVersion(transformerMethodologyTemplate, 'Методика по Приказу №676')],
  },
  {
    id: 'meth-ps',
    name: 'Подстанция (технологическая цепочка)',
    level: 'object',
    assetType: 'ps',
    draft: objectMethodologyTemplate,
    versions: [seedVersion(objectMethodologyTemplate, 'Методика по Приказу №676')],
  },
]

export const levelOptions = [
  { value: 'equipment', label: 'Оборудование (тип ТМЦ)' },
  { value: 'tm', label: 'Техническое место (тип ТМ)' },
  { value: 'object', label: 'Объект (тип объекта)' },
]
