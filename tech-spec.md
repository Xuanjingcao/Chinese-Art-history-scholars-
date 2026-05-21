# 技术规格 — 中国艺术史学者名录

基于用户上传的HTML页面进行React化改造，保留原有中国传统美学设计风格。

## 开发环境

- **框架**: React 19 + TypeScript + Vite
- **样式**: Tailwind CSS 3.4
- **已有项目**: /mnt/agents/output/app

## 依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| react | ^19.0.0 | UI 框架 |
| react-dom | ^19.0.0 | DOM 渲染 |
| gsap | ^3.12.0 | 入场动画 |
| lenis | ^1.1.0 | 平滑滚动 |

## 组件清单

### Section 组件
| 组件 | 用途 |
|------|------|
| Header | 头部：印章、标题、副标题 |
| StatsBar | 统计栏：学者总计/教授/副教授/地区覆盖 |
| FilterBar | 地区筛选按钮 + 搜索框 |
| ProfessorList | 学者列表（按地区→学校→卡片层级） |
| ProfessorModal | 学者详情弹窗（侧滑面板） |
| Footer | 页脚 |

### 可复用组件
| 组件 | 用途 |
|------|------|
| MountainBg | SVG山水背景 |
| SealMark | 印章标记 |
| BrushDivider | 毛笔分割线 |
| ProfCard | 学者卡片 |
| RegionSection | 地区区块 |
| UniversityGroup | 学校分组 |

### Hooks
| Hook | 用途 |
|------|------|
| useScrollAnimation | GSAP ScrollTrigger 入场动画 |

## 数据源

从用户HTML中提取48位学者数据，按以下结构：
- 5个地区：华北、华东、华南、北美、欧洲
- 每个地区包含若干学校
- 每个学校包含若干学者（教授/副教授）

## 动画实现

| 动画 | 方案 | 复杂度 |
|------|------|--------|
| 地区区块入场 | CSS animation fadeUp + stagger delay | 低 |
| 卡片悬停 | CSS transition | 低 |
| 筛选切换 | CSS display toggle | 低 |
| 弹窗滑入 | CSS transition translateX | 低 |
| 搜索实时过滤 | JS filter | 低 |

## 保留的设计特征

1. 色彩体系：--ink, --paper, --seal-red, --mountain, --water 等
2. 字体：Noto Serif SC, ZCOOL XiaoWei, Ma Shan Zheng
3. SVG山水背景（固定底部）
4. 噪点纹理叠加
5. 印章标记（朱红色，旋转8度）
6. 毛笔分割线
7. 教授/副教授标签颜色区分
8. 研究方向标签（金色边框）
9. 卡片悬停效果（上浮+阴影+顶部光条）
10. 圆形渐变装饰（卡片右下角）

## 新增功能

1. 点击学者卡片 → 弹出详情面板（姓名、职称、学校、研究方向、详细简介）
2. 平滑滚动（Lenis）
3. 右侧滚动进度条
4. 地区统计排行可视化
