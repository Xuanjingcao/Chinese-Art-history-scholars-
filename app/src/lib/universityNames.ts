const overseasUniversityMeta: Record<string, { nameEn: string; country: string }> = {
  '台湾师范大学': { nameEn: 'National Taiwan Normal University', country: '中国' },
  '东京大学': { nameEn: 'The University of Tokyo', country: '日本' },
  '东北大学': { nameEn: 'Tohoku University', country: '日本' },
  '九州大学': { nameEn: 'Kyushu University', country: '日本' },
  '京都大学': { nameEn: 'Kyoto University', country: '日本' },
  '学习院大学': { nameEn: 'Gakushuin University', country: '日本' },
  '实践女子大学': { nameEn: "Jissen Women's University", country: '日本' },
  '早稻田大学': { nameEn: 'Waseda University', country: '日本' },
  '筑波大学': { nameEn: 'University of Tsukuba', country: '日本' },
  '花园大学': { nameEn: 'Hanazono University', country: '日本' },
  '不列颠哥伦比亚大学': { nameEn: 'University of British Columbia', country: '加拿大' },
  '乔治城大学': { nameEn: 'Georgetown University', country: '美国' },
  '加州大学伯克利分校': { nameEn: 'UC Berkeley', country: '美国' },
  '加州大学圣塔芭芭拉分校': { nameEn: 'UC Santa Barbara', country: '美国' },
  '加州大学圣迭戈分校': { nameEn: 'UC San Diego', country: '美国' },
  '加州大学戴维斯分校': { nameEn: 'UC Davis', country: '美国' },
  '加州大学欧文分校': { nameEn: 'UC Irvine', country: '美国' },
  '加州大学洛杉矶分校': { nameEn: 'UCLA', country: '美国' },
  '北卡罗来纳大学教堂山分校': { nameEn: 'UNC Chapel Hill', country: '美国' },
  '南加州大学': { nameEn: 'University of Southern California', country: '美国' },
  '卡尔顿大学': { nameEn: 'Carleton University', country: '加拿大' },
  '哈佛大学': { nameEn: 'Harvard University', country: '美国' },
  '哥伦比亚大学': { nameEn: 'Columbia University', country: '美国' },
  '圣托马斯大学': { nameEn: 'University of St. Thomas', country: '美国' },
  '埃默里大学': { nameEn: 'Emory University', country: '美国' },
  '多伦多大学': { nameEn: 'University of Toronto', country: '加拿大' },
  '威斯康星大学麦迪逊分校': { nameEn: 'UW-Madison', country: '美国' },
  '宾夕法尼亚大学': { nameEn: 'University of Pennsylvania', country: '美国' },
  '巴纳德学院 / 哥伦比亚大学': { nameEn: 'Barnard College / Columbia University', country: '美国' },
  '布兰迪斯大学': { nameEn: 'Brandeis University', country: '美国' },
  '康考迪亚大学': { nameEn: 'Concordia University', country: '加拿大' },
  '弗吉尼亚大学': { nameEn: 'University of Virginia', country: '美国' },
  '普林斯顿大学': { nameEn: 'Princeton University', country: '美国' },
  '杜克大学': { nameEn: 'Duke University', country: '美国' },
  '波士顿学院': { nameEn: 'Boston College', country: '美国' },
  '纽约大学': { nameEn: 'New York University', country: '美国' },
  '芝加哥大学': { nameEn: 'University of Chicago', country: '美国' },
  '莱斯大学': { nameEn: 'Rice University', country: '美国' },
  '阿尔伯塔大学': { nameEn: 'University of Alberta', country: '加拿大' },
  '霍巴特和威廉史密斯学院': { nameEn: 'Hobart and William Smith Colleges', country: '美国' },
  '麦吉尔大学': { nameEn: 'McGill University', country: '加拿大' },
  '伦敦大学亚非学院': { nameEn: 'SOAS University of London', country: '英国' },
  '慕尼黑大学': { nameEn: 'LMU Munich', country: '德国' },
  '柏林自由大学': { nameEn: 'Free University of Berlin', country: '德国' },
  '汉堡大学': { nameEn: 'University of Hamburg', country: '德国' },
  '海德堡大学': { nameEn: 'Heidelberg University', country: '德国' },
  '牛津大学': { nameEn: 'University of Oxford', country: '英国' },
  '索邦大学': { nameEn: 'Sorbonne University', country: '法国' },
  '维也纳大学': { nameEn: 'University of Vienna', country: '奥地利' },
  '考陶德艺术学院': { nameEn: 'The Courtauld Institute of Art', country: '英国' },
  '莱顿大学': { nameEn: 'Leiden University', country: '荷兰' },
  '里尔大学': { nameEn: 'University of Lille', country: '法国' },
  '鲁汶大学': { nameEn: 'KU Leuven', country: '比利时' },
};

function splitMixedUniversityName(name: string) {
  const latinIndex = name.search(/[A-Za-z]/)
  if (latinIndex <= 0) {
    return null
  }

  const nameZh = name.slice(0, latinIndex).trim().replace(/[·•,，;；:：/|]+$/g, '').trim()
  const nameEn = name.slice(latinIndex).trim().replace(/^[·•,，;；:：/|]+/g, '').trim()

  if (!nameZh || !nameEn) {
    return null
  }

  return { nameZh, nameEn }
}

export function getUniversityNameParts(name: string) {
  const trimmedName = name.trim()
  const [nameZhRaw, nameEnRaw] = trimmedName.split(' · ')
  const explicitZh = nameZhRaw?.trim() ?? trimmedName
  const explicitEn = nameEnRaw?.trim()

  if (!explicitEn && /[A-Za-z]/.test(trimmedName) && !/[\u3400-\u9fff]/.test(trimmedName)) {
    return { nameZh: '', nameEn: trimmedName }
  }

  const mixed = !explicitEn ? splitMixedUniversityName(trimmedName) : null
  const nameZh = mixed?.nameZh || explicitZh
  const nameEn = explicitEn || mixed?.nameEn || overseasUniversityMeta[nameZh]?.nameEn || ''

  return { nameZh, nameEn }
}

export function getCanonicalUniversityKey(name: string) {
  const { nameZh, nameEn } = getUniversityNameParts(name)
  return (nameZh.trim() || nameEn.trim()).toLocaleLowerCase('en-US')
}

export function getUniversityCountry(name: string) {
  return overseasUniversityMeta[getUniversityNameParts(name).nameZh]?.country ?? '其他'
}

export function getUniversityDisplayName(name: string) {
  const { nameZh, nameEn } = getUniversityNameParts(name)
  if (nameZh && nameEn) return `${nameZh} · ${nameEn}`
  return nameZh || nameEn
}
