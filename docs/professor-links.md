# 学者链接录入规范

这份文档用于规范学者外部链接的录入方式，方便人工维护，也方便 WorkBuddy 等自动化工具后续批量补充数据。

## 适用文件

- 学者数据主文件：`app/src/data/professors.json`
- 学者类型定义：`app/src/types/index.ts`

## 当前可用字段

每位学者对象目前支持以下链接字段：

- `profileLink`
  含义：学者个人主页、院校个人介绍页、教师主页，现阶段统一把原先的外部主页链接归到这个字段
- `cnkiLink`
  含义：知网作者主页
- `scholarLink`
  含义：Google Scholar 主页

## 推荐录入原则

- 优先使用明确字段，不要新增旧字段或临时兼容字段
- 一个老师可以同时拥有多个链接字段
- 没有对应链接时，字段直接省略，不要写空字符串
- 原来数据里的主页类链接，统一写入 `profileLink`

## 字段判断规则

- 教师主页、院校教师介绍页、个人学术主页，统一写入 `profileLink`
- 知网作者详情页，写入 `cnkiLink`
- Google Scholar 作者页，写入 `scholarLink`

## 展示顺序

前端当前按照下面顺序显示学术链接：

1. `profileLink`
2. `cnkiLink`
3. `scholarLink`

这意味着：

- 主页类链接统一走 `profileLink`
- 如果同时有个人主页和知网主页，会并列显示
- 如果同时有知网和 Google Scholar，也会并列显示

## 推荐文案对应关系

- `profileLink` -> `个人主页`
- `cnkiLink` -> `知网主页`
- `scholarLink` -> `Google Scholar`

## 示例

```ts
{
  id: 'p002',
  name: '黄小峰',
  nameEn: '',
  title: 'professor',
  university: '中央美术学院 · Central Academy of Fine Arts',
  specialties: ['中国古代美术史', '宋元明清绘画史', '宫廷艺术'],
  bio: '黄小峰，中央美术学院人文学院教授。',
  achievements: ['中央美术学院人文学院教授'],
  profileLink: 'https://i.cafa.edu.cn/sub_artist/fn/aintro/?ai=110971',
  cnkiLink: 'https://kns.cnki.net/kcms2/author/detail?...',
  publications: [],
}
```

如果同一位老师同时有主页、知网和 Google Scholar，可写成：

```ts
{
  profileLink: 'https://faculty.example.edu/huangxiaofeng',
  cnkiLink: 'https://kns.cnki.net/kcms2/author/detail?...',
  scholarLink: 'https://scholar.google.com/...',
}
```

## WorkBuddy 补数建议

- 先补中国老师的 `cnkiLink`
- 现有主页类链接统一使用 `profileLink`
- 不需要再区分 `schoolLink`
- 不要再写回旧字段 `link`

## 不建议的做法

- 不要把知网页写进 `profileLink`
- 不要写空值，如 `cnkiLink: ''`
- 不要新增 `schoolLink` 或旧字段 `link`
- 不要在没有把握时发明新字段名
