# 学者链接录入规范

这份文档用于规范学者外部链接的录入方式，方便人工维护，也方便 WorkBuddy 等自动化工具后续批量补充数据。

## 适用文件

- 学者数据主文件：`app/src/data/professors.ts`
- 学者类型定义：`app/src/types/index.ts`

## 当前可用字段

每位学者对象目前支持以下链接字段：

- `schoolLink`
  含义：学校官网中的教师页、院系页、师资介绍页
- `profileLink`
  含义：学者个人主页、院校个人介绍页、个人学术主页
- `cnkiLink`
  含义：知网作者主页
- `scholarLink`
  含义：Google Scholar 主页
- `link`
  含义：历史兼容字段。老数据仍可使用，但新增数据不建议继续写入这个字段

## 推荐录入原则

- 优先使用明确字段，不要把所有网址都塞进 `link`
- 一个老师可以同时拥有多个链接字段
- 没有对应链接时，字段直接省略，不要写空字符串
- 如果只有一个外部链接，也优先判断它属于哪一类，再写入对应字段

## 字段判断规则

- 如果是学校官网里的教师介绍页、学院师资页，写入 `schoolLink`
- 如果是教师个人主页、实验室主页、学校中的个人专页，写入 `profileLink`
- 如果是知网作者详情页，写入 `cnkiLink`
- 如果是 Google Scholar 作者页，写入 `scholarLink`
- 只有在暂时无法判断链接类型、又需要先保留链接时，才临时写入 `link`

## 展示顺序

前端当前按照下面顺序显示学术链接：

1. `schoolLink`
2. `profileLink`
3. `link`（仅当 `profileLink` 缺失时作为兼容显示）
4. `cnkiLink`
5. `scholarLink`

这意味着：

- 新数据尽量写 `profileLink`，不要依赖 `link`
- 如果同时有学校官网和个人主页，两个都会显示
- 如果同时有个人主页和知网主页，也都会显示

## 推荐文案对应关系

- `schoolLink` -> `学校官网`
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

如果同一位老师同时有学校页、个人页和知网页，可写成：

```ts
{
  schoolLink: 'https://www.example.edu/faculty/huangxiaofeng',
  profileLink: 'https://faculty.example.edu/huangxiaofeng',
  cnkiLink: 'https://kns.cnki.net/kcms2/author/detail?...',
}
```

## WorkBuddy 补数建议

- 先补中国老师的 `cnkiLink`
- 如果原始数据里的 `link` 实际上是学校官网教师页，可逐步迁移到 `schoolLink`
- 如果原始数据里的 `link` 明显是个人页，可逐步迁移到 `profileLink`
- 不要求一次性全量迁移，允许新旧字段并存

## 不建议的做法

- 不要把知网页写进 `profileLink`
- 不要把学校院系首页写成 `个人主页`
- 不要写空值，如 `cnkiLink: ''`
- 不要一次性批量替换所有 `link` 而不做分类判断
