# WorkBuddy 最简操作指南

只记住一句话：

- `国内外艺术学教授网站` 是正式版
- `国内外艺术学教授网站-workbuddy` 是给 WorkBuddy 改的试验版

## 1. 开始前先确认

进入 WorkBuddy 文件夹：

```bash
cd "/Users/mastercao/Desktop/国内外艺术学教授网站-workbuddy"
git status
```

你应该看到：

```text
On branch workbuddy/test
```

如果不是 `workbuddy/test`，先停下来问 Codex。

## 2. 发给 WorkBuddy 的标准话术

直接发这类话：

```text
请只在当前文件夹里修改，不要切换分支，不要操作正式版文件夹。
只改我指定的数据文件或文档，不要改 UI、样式和组件逻辑。
如果有拿不准的地方，先停下来告诉我。
```

如果是补老师数据，再加一句：

```text
每次先改一小批，改完告诉我改了哪些老师。
```

## 3. WorkBuddy 改完后先检查

先看改了哪些文件：

```bash
git status
git diff --stat
git diff
```

如果只是数据补充，重点确认：

- 没有顺手改 UI
- 没有改到正式版文件夹
- 没有把数据结构改坏

## 4. 很重要：补数据后一定先构建

如果 WorkBuddy 改了 `app/src/data/professors.json` 这类数据文件，先在 WorkBuddy 文件夹里运行：

```bash
cd app
npm run build
```

如果这里报错，先不要提交，先把报错截图发给 Codex。

原因很简单：

- 老师数据经常是大段数组对象
- 少一个逗号、括号、`professors: [`，`localhost` 就会直接崩
- `npm run build` 能第一时间把这种问题抓出来

## 5. 没问题再提交

```bash
git add .
git commit -m "WorkBuddy update"
git status
```

如果看到：

```text
nothing to commit, working tree clean
```

说明 WorkBuddy 这边已经整理好了。

## 6. 合并回 main

最省事的方式是回来告诉 Codex：

```text
WorkBuddy 已经在 workbuddy/test 提交好了，请帮我检查并合并回 main。
```

## 7. 如果 WorkBuddy 里还有旧改动，不能直接同步 main

如果你在 WorkBuddy 文件夹运行：

```bash
git merge main
```

结果提示：

```text
Your local changes would be overwritten by merge
```

说明 WorkBuddy 里还有没处理完的本地改动。

这时不要乱试命令，先运行：

```bash
git status
git diff
```

然后把终端截图发给 Codex。

## 8. 想让 WorkBuddy 完全变成 main 的样子

前提：你确认 WorkBuddy 里未提交的改动都不要了。

```bash
cd "/Users/mastercao/Desktop/国内外艺术学教授网站-workbuddy"
git reset --hard main
git status
```

如果最后看到：

```text
nothing to commit, working tree clean
```

说明 WorkBuddy 已经和 `main` 完全一致。

## 9. 出错时只做这三件事

```bash
pwd
git status
git diff --stat
```

然后把结果或截图发给 Codex。
