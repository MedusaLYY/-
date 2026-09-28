/** 机队档案。 */

export const FLEETS = [
  { id: 'FLT-PD', name: '浦东机队', district: '浦东新区', leader: '李建国', base: [121.54, 31.22] },
  { id: 'FLT-HQ', name: '虹桥机队', district: '闵行区', leader: '王磊', base: [121.3363, 31.1979] },
  { id: 'FLT-JD', name: '嘉定机队', district: '嘉定区', leader: '陈涛', base: [121.265, 31.375] },
  { id: 'FLT-CM', name: '崇明机队', district: '崇明区', leader: '赵敏', base: [121.4, 31.62] },
]

export const FLEET_OPTIONS = [
  { value: '', label: '全部机队' },
  ...FLEETS.map((fleet) => ({ value: fleet.id, label: fleet.name })),
]
