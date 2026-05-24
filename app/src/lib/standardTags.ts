export interface StandardTagDefinition {
  key: string;
  label: string;
  keywords: string[];
}

export const standardTagDefinitions: StandardTagDefinition[] = [
  { key: 'painting-history', label: '中国绘画史', keywords: ['绘画史', '中国绘画', '山水画', '花鸟画', '人物画', '文人画', '院体画', '版画'] },
  { key: 'calligraphy-history', label: '中国书法史', keywords: ['书法', '书道', '尺牍', '篆刻', '书论'] },
  { key: 'buddhist-art', label: '佛教美术', keywords: ['佛教', '石窟', '敦煌', '造像', '摩崖', '藏传佛教', '汉藏佛教', '西夏藏传'] },
  { key: 'tomb-art', label: '墓葬艺术', keywords: ['墓葬', '丧葬', '墓室', '壁画', '陵墓'] },
  { key: 'modern-art', label: '近现代美术', keywords: ['近现代', '近代', '现代', '20世纪', '民国', '都市', '摄影', '展览'] },
  { key: 'contemporary-art', label: '当代艺术', keywords: ['当代艺术', '当代', '策展', '装置', '行为艺术'] },
  { key: 'visual-culture', label: '视觉文化', keywords: ['视觉文化', '图像', '图像传播', '视觉叙事', '消费文化'] },
  { key: 'art-theory', label: '艺术理论', keywords: ['理论', '美学', '史学史', '方法论', '思想', '观念'] },
  { key: 'cross-cultural', label: '跨文化交流', keywords: ['跨文化', '交流', '东亚', '中日', '中西', '跨国', '海外藏', '丝路', '丝绸之路'] },
  { key: 'architecture-garden', label: '建筑与园林', keywords: ['建筑', '园林', '空间', '景观', '教堂', '纪念碑'] },
  { key: 'craft-art', label: '工艺美术', keywords: ['工艺', '陶瓷', '瓷器', '玉器', '青铜', '器物', '服饰', '茶文化', '非物质文化遗产'] },
  { key: 'art-archaeology', label: '美术考古', keywords: ['考古', '墓室', '出土', '遗址', '文物', '图像证史'] },
] as const

export const standardTagOptions = standardTagDefinitions.map((tag) => tag.label)
const standardTagLabelSet = new Set(standardTagOptions)

export function getStandardTagDefinition(key: string) {
  return standardTagDefinitions.find((tag) => tag.key === key) ?? null
}

export function matchesStandardTagLabel(label: string) {
  return standardTagLabelSet.has(label)
}

export function hasCustomStandardTag(standardTags: string[] | undefined) {
  return (standardTags ?? []).some((label) => !matchesStandardTagLabel(label))
}

export function getDisplayTags(standardTags: string[] | undefined, specialties: string[], limit?: number) {
  const tags = standardTags && standardTags.length > 0 ? standardTags : specialties
  return typeof limit === 'number' ? tags.slice(0, limit) : tags
}
