# 中国艺术史学者名录

一个面向中国艺术史研究方向的学者信息检索网站，收录国内外高校中与中国艺术史、艺术考古、视觉文化、博物馆研究等方向相关的教授与研究者。

网站以中国传统视觉风格为基础，提供地区筛选、关键词搜索、多维度筛选、学者详情查看等功能，方便快速了解不同高校和地区的中国艺术史研究力量。

## 功能特点

- 国内外中国艺术史相关学者名录展示
- 按地区、职称、机构类型、研究方向等条件筛选
- 支持关键词搜索学者、学校与研究方向
- 学者详情弹窗，展示职称、机构、方向与简介
- 移动端适配，支持手机浏览
- 中国传统山水与纸本文献风格界面

## 技术栈

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- Lucide React

## 本地运行

进入前端项目目录：

```bash
cd app
```

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

### 前端如何连接后台

本项目现在有两类数据来源：

- 学者主数据：`/admin` 通过 Vite 本地接口 `/api/admin/professors` 修改 `app/src/data/professors.json`。这个接口只在 `npm run dev` 运行时存在。
- 用户互动数据：登录、评论、评分、点赞、通知等通过 CloudBase 写入云端集合。

本地开发时，页面左上角会显示当前连接状态：

- `云端后台`：CloudBase 已连接，互动数据会写入后台。
- `本地模式`：互动数据只保存在浏览器 localStorage，不会进入后台。
- `后台异常`：已尝试连接 CloudBase，但环境 ID、安全域名、匿名登录或集合权限存在问题。

本地连接 CloudBase 需要 `app/.env.local`：

```bash
VITE_CLOUDBASE_ENV=arthistory-d1gqlnmrc0c1ec226
VITE_ENABLE_CLOUDBASE=true
```

修改 `.env.local` 后必须重启 `npm run dev`。

线上 CloudBase 静态托管站点不需要 `VITE_ENABLE_CLOUDBASE`；只要不是 `localhost`，前端会默认启用 CloudBase。若线上显示 `登录异常` 或 `数据异常`，优先检查：

- CloudBase 控制台是否开启匿名登录。
- Web 安全域名/安全来源是否包含静态托管域名和自定义域名。
- `ratings`、`comments`、`comment_votes`、`users`、`notifications` 等集合是否存在，并允许当前匿名身份执行需要的读写操作。
- 生产构建时的 `VITE_CLOUDBASE_ENV` 是否是目标环境 ID。Vite 环境变量会在构建时写入静态文件，不是部署后运行时再读取。

构建生产版本：

```bash
npm run build
```

本地数据维护后台：

```text
http://localhost:3000/admin
```

## 项目结构

```text
app/
  src/
    components/    通用组件
    data/          学者数据
    lib/           工具函数与服务
    pages/         页面组件
    sections/      首页区块
    types/         TypeScript 类型
```

## 说明

本项目仍在持续整理和更新中。学者信息、研究方向与机构归类会根据后续资料继续修订。

## 数据维护

- 学者外部链接录入规范见 [docs/professor-links.md](/Users/mastercao/Desktop/国内外艺术学教授网站/docs/professor-links.md)
