# GitHub 提交上传指南

这份文档用于记录：改完代码后，如何把变化保存到 Git，并上传到 GitHub。

## 1. 先确认你在哪个文件夹

如果你是在 WorkBuddy 试验版里操作，先进入这个文件夹：

```bash
cd "/Users/mastercao/Desktop/国内外艺术学教授网站-workbuddy"
```

确认当前路径：

```bash
pwd
```

你应该看到：

```text
/Users/mastercao/Desktop/国内外艺术学教授网站-workbuddy
```

确认当前分支：

```bash
git status
```

你应该看到类似：

```text
On branch workbuddy/test
```

如果你是在正式版文件夹里操作，路径应该是：

```bash
cd "/Users/mastercao/Desktop/国内外艺术学教授网站"
```

正式版分支应该是：

```text
On branch main
```

## 2. 看看改了哪些文件

每次提交前，先运行：

```bash
git status
```

它会告诉你哪些文件被修改、新增或删除。

如果想看具体改了什么：

```bash
git diff
```

如果只想看改动文件列表：

```bash
git diff --stat
```

## 3. 把改动加入本次提交

确认这些改动都要保存后，运行：

```bash
git add .
```

这一步的意思是：

```text
把当前文件夹里的改动加入“准备提交”的清单。
```

它还没有真正保存成一个 Git 版本，只是先放进提交清单。

## 4. 创建一次 commit

运行：

```bash
git commit -m "Update project"
```

这一步的意思是：

```text
把刚才 git add 的改动，正式保存成一个 Git 版本。
```

建议把 `"Update project"` 换成更清楚的说明，比如：

```bash
git commit -m "Improve homepage layout"
```

或：

```bash
git commit -m "Add scholar search filters"
```

或：

```bash
git commit -m "Fix mobile styles"
```

## 5. 提交后再检查一次

运行：

```bash
git status
```

如果看到：

```text
nothing to commit, working tree clean
```

说明当前文件夹里的改动已经被 commit 保存好了。

## 6. 上传到 GitHub

### 正式版 main 的上传方式

如果你在正式版文件夹：

```bash
cd "/Users/mastercao/Desktop/国内外艺术学教授网站"
```

并且当前分支是 `main`，上传到 GitHub：

```bash
git push
```

成功时会看到类似：

```text
main -> main
```

这代表 GitHub 上的正式版已经更新。

### WorkBuddy 分支的上传方式

如果你在 WorkBuddy 文件夹：

```bash
cd "/Users/mastercao/Desktop/国内外艺术学教授网站-workbuddy"
```

并且当前分支是 `workbuddy/test`，一般不建议新手自己直接上传。

推荐做法是：

```text
WorkBuddy 改完并 commit 后，告诉 Codex 帮你检查、合并、上传。
```

如果你确实想把 WorkBuddy 分支也上传到 GitHub，运行：

```bash
git push -u origin workbuddy/test
```

上传后，GitHub 上会出现一个新分支：

```text
workbuddy/test
```

但 GitHub 默认显示的仍然是：

```text
main
```

## 7. 推荐给你的日常流程

### WorkBuddy 改完后

在 WorkBuddy 文件夹里运行：

```bash
cd "/Users/mastercao/Desktop/国内外艺术学教授网站-workbuddy"
git status
git add .
git commit -m "WorkBuddy update"
git status
```

然后告诉 Codex：

```text
WorkBuddy 已经提交好了，请帮我检查并合并回 main，然后上传到 GitHub。
```

### Codex 或你自己在正式版改完后

在正式版文件夹里运行：

```bash
cd "/Users/mastercao/Desktop/国内外艺术学教授网站"
git status
git add .
git commit -m "Update project"
git push
```

## 8. 如果 push 时要输入账号密码

如果终端问：

```text
Username for 'https://github.com':
```

填：

```text
Xuanjingcao
```

如果终端问：

```text
Password for 'https://Xuanjingcao@github.com':
```

不要填 GitHub 登录密码。

这里要粘贴你在 GitHub 创建的 token。

粘贴时终端通常不会显示任何字符，这是正常的。粘贴后直接按回车。

## 9. 常见问题

### 看到 failed to connect to github.com

这通常是网络问题。可以等一会儿再运行：

```bash
git push
```

### 看到 Permission denied 或 403

这通常是 GitHub token 权限问题。把报错截图发给 Codex。

### 不知道自己在哪个分支

运行：

```bash
git status
```

### 不知道自己在哪个文件夹

运行：

```bash
pwd
```

## 10. 最小命令合集

WorkBuddy 改完后保存：

```bash
cd "/Users/mastercao/Desktop/国内外艺术学教授网站-workbuddy"
git status
git add .
git commit -m "WorkBuddy update"
git status
```

正式版改完后上传：

```bash
cd "/Users/mastercao/Desktop/国内外艺术学教授网站"
git status
git add .
git commit -m "Update project"
git push
```

