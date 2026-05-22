# WorkBuddy 协作操作指南

这份文档给之后在 `国内外艺术学教授网站-workbuddy` 文件夹里操作时使用。

## 1. 记住两个文件夹的分工

正式版文件夹：

```bash
/Users/mastercao/Desktop/国内外艺术学教授网站
```

WorkBuddy 试验版文件夹：

```bash
/Users/mastercao/Desktop/国内外艺术学教授网站-workbuddy
```

建议：

- 平时让 WorkBuddy 只打开 `国内外艺术学教授网站-workbuddy`
- 不要让 WorkBuddy 去改正式版文件夹
- 正式版 `main` 由 Codex 帮你合并和推送更稳

## 2. 每次让 WorkBuddy 开始前

先进入 WorkBuddy 文件夹：

```bash
cd "/Users/mastercao/Desktop/国内外艺术学教授网站-workbuddy"
```

确认当前分支：

```bash
git status
```

你应该看到类似：

```text
On branch workbuddy/test
```

如果看到 `main`，先停下来，不要继续改，问 Codex。

## 3. 让 WorkBuddy 修改时

可以直接跟 WorkBuddy 说：

```text
请只在当前文件夹里修改，不要切换分支，不要操作正式版文件夹。
```

WorkBuddy 改完后，先看它改了哪些文件：

```bash
git status
```

再看具体改动：

```bash
git diff
```

如果只是想快速看文件列表：

```bash
git diff --stat
```

## 4. WorkBuddy 改完后提交

确认改动没问题后，在 WorkBuddy 文件夹运行：

```bash
git add .
git commit -m "WorkBuddy update"
```

如果想写得具体一点，可以把提交信息换成：

```bash
git commit -m "Update scholar page layout"
```

或：

```bash
git commit -m "Improve search and filters"
```

提交完成后，再检查一次：

```bash
git status
```

如果看到：

```text
nothing to commit, working tree clean
```

说明 WorkBuddy 这边已经保存好了。

## 5. 让 Codex 合并回正式版

WorkBuddy 提交后，告诉 Codex：

```text
WorkBuddy 已经在 workbuddy/test 提交好了，请帮我检查并合并回 main。
```

Codex 会帮你：

- 检查 WorkBuddy 改了什么
- 处理冲突
- 合并进正式版 `main`
- 推送到 GitHub

## 6. 如果你想自己合并回 main

WorkBuddy 的提交只会留在 `workbuddy/test` 分支，不会自动进正式版 `main`。如果你确认 WorkBuddy 的提交可以进入正式版，可以按下面流程操作。

先进入正式版文件夹：

```bash
cd "/Users/mastercao/Desktop/国内外艺术学教授网站"
```

确认自己在 `main`：

```bash
git status
```

你应该看到类似：

```text
On branch main
Your branch is up to date with 'origin/main'.
```

然后合并 WorkBuddy 分支：

```bash
git merge workbuddy/test
```

如果弹出 `vi` 编辑器，显示类似：

```text
Merge branch 'workbuddy/test'
```

不用改内容，按下面顺序保存退出：

```text
Esc
:wq
Enter
```

注意：按 `Esc` 通常不会有任何显示，这是正常的。按完后直接输入 `:wq` 再回车即可。

如果 merge 时提示：

```text
The following untracked working tree files would be overwritten by merge
```

说明正式版文件夹里有一个 Git 没跟踪的同名本地文件挡住了合并。确认这个文件不用保留后，可以删除它再重新合并，例如：

```bash
rm "GITHUB-提交上传指南.md"
git merge workbuddy/test
```

合并完成后检查状态：

```bash
git status
```

如果看到类似：

```text
Your branch is ahead of 'origin/main' by 1 commit.
```

说明本地 `main` 已经合并好了，只差上传 GitHub。执行：

```bash
git push
```

推送完成后，GitHub 上的 `main` 才会包含 WorkBuddy 的改动。

## 7. 让 WorkBuddy 重新变成 main 的样子

如果你想放弃 WorkBuddy 试验版里的改动，让 `workbuddy/test` 完全回到 `main` 当前的状态，可以在 WorkBuddy 文件夹里运行：

```bash
cd "/Users/mastercao/Desktop/国内外艺术学教授网站-workbuddy"
git status
git reset --hard main
```

这个操作的意思是：

- `workbuddy/test` 会直接指向 `main` 当前所在的提交
- WorkBuddy 文件夹里的代码内容会变得和 `main` 一模一样
- WorkBuddy 里没有提交的修改会被清掉
- WorkBuddy 分支上原本独立于 `main` 的提交，不会再挂在 `workbuddy/test` 这条分支线上

运行前一定先看：

```bash
git status
```

如果 `git status` 里有你还想保留的修改，先不要执行 `git reset --hard main`，先问 Codex。

运行后如果终端出现类似：

```text
HEAD is now at c47f072 UI改动以及移动端适配
```

说明覆盖已经完成。再运行一次：

```bash
git status
```

如果看到：

```text
nothing to commit, working tree clean
```

说明 WorkBuddy 已经干净地同步成 `main` 的状态。

## 8. 不建议你自己做的事

暂时不建议你自己运行这些命令：

```bash
git merge
git rebase
git reset --hard
git checkout main
```

这些命令不是不能用，而是新手阶段容易把分支和文件夹弄混。需要时让 Codex 帮你做。

例外情况：如果你明确就是想“用 `main` 覆盖 WorkBuddy”，并且已经确认 WorkBuddy 里的未提交修改都不要了，可以按第 7 节执行 `git reset --hard main`。

## 9. 如果出错了怎么办

先不要乱试命令，运行：

```bash
git status
```

然后把终端截图发给 Codex。

如果你想确认自己在哪个文件夹：

```bash
pwd
```

如果你想确认有哪些 worktree：

```bash
git worktree list
```

## 10. 最常用命令合集

进入 WorkBuddy 文件夹：

```bash
cd "/Users/mastercao/Desktop/国内外艺术学教授网站-workbuddy"
```

看当前状态：

```bash
git status
```

看改了哪些内容：

```bash
git diff
```

提交 WorkBuddy 的修改：

```bash
git add .
git commit -m "WorkBuddy update"
```

确认提交干净：

```bash
git status
```

用 `main` 覆盖 WorkBuddy：

```bash
git reset --hard main
```
