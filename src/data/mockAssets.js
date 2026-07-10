// Моковые данные дерева активов: Объект → ТМ → ТМЦ, плюс журнал дефектов
// и протоколы измерений. Имитирует то, что в реальной системе отдаётся
// смежными модулями («Инвентаризация», «Осмотры и дефекты», «Испытания и измерения»).

export const objects = [
  { id: 'obj-ps-severnaya', name: 'ПС Северная 110/10 кВ', type: 'ПС' },
]

export const tms = [
  { id: 'tm-t1', objectId: 'obj-ps-severnaya', parentTmId: null, name: 'Силовой трансформатор Т-1' },
  { id: 'tm-t2', objectId: 'obj-ps-severnaya', parentTmId: null, name: 'Силовой трансформатор Т-2' },
]

// ТМЦ — единицы оборудования (ЕО). tmcType используется методикой для привязки узлов/шаблонов.
export const tmcs = [
  {
    id: 'tmc-t1',
    tmId: 'tm-t1',
    kind: 'equipment',
    tmcType: 'transformer',
    nomenclatureId: 'nom-tdtn-40000-110',
    serialNumber: '2003-1187',
    commissioningDate: '2003-06-15',
    name: 'Трансформатор Т-1',
  },
  {
    id: 'tmc-t1-bushing',
    tmId: 'tm-t1',
    kind: 'equipment',
    tmcType: 'bushing',
    nomenclatureId: 'nom-vvbo-110',
    serialNumber: 'B-2015-04',
    commissioningDate: '2015-09-01',
    name: 'Ввод ВВБО-110 (Т-1)',
  },
  {
    id: 'tmc-t2',
    tmId: 'tm-t2',
    kind: 'equipment',
    tmcType: 'transformer',
    nomenclatureId: 'nom-tdtn-63000-110',
    serialNumber: '2019-0231',
    commissioningDate: '2019-04-10',
    name: 'Трансформатор Т-2',
  },
  {
    id: 'tmc-t2-bushing',
    tmId: 'tm-t2',
    kind: 'equipment',
    tmcType: 'bushing',
    nomenclatureId: 'nom-vvbo-110',
    serialNumber: 'B-2019-11',
    commissioningDate: '2019-04-10',
    name: 'Ввод ВВБО-110 (Т-2)',
  },
]

// Журнал дефектов («Осмотры и дефекты»). Привязка — к ТМЦ напрямую (kind: 'ЕО') или к ТМ.
export const defects = [
  {
    id: 'defect-1',
    targetKind: 'tmc',
    targetId: 'tmc-t1',
    typeId: 'def-bak-crack',
    status: 'open',
    openedDate: '2025-11-02',
  },
  {
    id: 'defect-2',
    targetKind: 'tmc',
    targetId: 'tmc-t1',
    typeId: 'def-winding-geometry',
    status: 'open',
    openedDate: '2026-02-18',
  },
  {
    id: 'defect-3',
    targetKind: 'tmc',
    targetId: 'tmc-t1',
    typeId: 'def-contact-overheat',
    status: 'closed',
    openedDate: '2024-05-01',
  },
]

// Протоколы измерений («Испытания и измерения»). Несколько точек по времени — для тренда.
export const measurements = [
  // Т-1 — старое оборудование, показатели ухудшаются
  { id: 'm-1', tmcId: 'tmc-t1', measuredParamId: 'mp-tg-delta', value: 1.8, date: '2015-10-01', protocolStatus: 'signed' },
  { id: 'm-2', tmcId: 'tmc-t1', measuredParamId: 'mp-tg-delta', value: 2.4, date: '2021-05-14', protocolStatus: 'signed' },
  { id: 'm-3', tmcId: 'tmc-t1', measuredParamId: 'mp-tg-delta', value: 3.1, date: '2026-03-20', protocolStatus: 'signed' },

  { id: 'm-4', tmcId: 'tmc-t1', measuredParamId: 'mp-no-load-losses', value: 34.0, date: '2015-10-01', protocolStatus: 'signed' },
  { id: 'm-5', tmcId: 'tmc-t1', measuredParamId: 'mp-no-load-losses', value: 39.5, date: '2026-03-20', protocolStatus: 'signed' },

  { id: 'm-6', tmcId: 'tmc-t1', measuredParamId: 'mp-oil-moisture', value: 0.018, date: '2026-03-20', protocolStatus: 'signed' },

  // Т-2 — новое оборудование, всё в норме
  { id: 'm-7', tmcId: 'tmc-t2', measuredParamId: 'mp-tg-delta', value: 0.6, date: '2019-05-01', protocolStatus: 'signed' },
  { id: 'm-8', tmcId: 'tmc-t2', measuredParamId: 'mp-tg-delta', value: 0.65, date: '2026-01-10', protocolStatus: 'signed' },

  { id: 'm-9', tmcId: 'tmc-t2', measuredParamId: 'mp-no-load-losses', value: 41.0, date: '2019-05-01', protocolStatus: 'signed' },
  { id: 'm-10', tmcId: 'tmc-t2', measuredParamId: 'mp-no-load-losses', value: 41.4, date: '2026-01-10', protocolStatus: 'signed' },

  { id: 'm-11', tmcId: 'tmc-t2', measuredParamId: 'mp-oil-moisture', value: 0.006, date: '2026-01-10', protocolStatus: 'signed' },
]

export const today = new Date('2026-07-09')
