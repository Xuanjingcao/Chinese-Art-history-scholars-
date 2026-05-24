export const standardTagOptions = [
  '中国绘画史',
  '中国书法史',
  '佛教美术',
  '墓葬艺术',
  '近现代美术',
  '当代艺术',
  '视觉文化',
  '艺术理论',
  '跨文化交流',
  '建筑与园林',
  '工艺美术',
  '美术考古',
] as const

export function getDisplayTags(standardTags: string[] | undefined, specialties: string[], limit?: number) {
  const tags = standardTags && standardTags.length > 0 ? standardTags : specialties
  return typeof limit === 'number' ? tags.slice(0, limit) : tags
}
