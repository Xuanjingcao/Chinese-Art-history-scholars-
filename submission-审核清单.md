# Submission 审核清单

适用场景：低频人工审核用户补充，不单独搭建安全版后端。

## 超短版

1. 把 `submissions` 权限临时改成：

```json
{
  "read": true,
  "create": true,
  "update": true,
  "delete": false
}
```

2. 打开 `http://localhost:3000/admin`
3. 刷新页面，进入“用户补充审核”
4. 写“管理员回复”
5. 点“采纳”或“未采纳”
6. 审核完把 `submissions` 权限改回 `PRIVATE`

## 详细版

1. 打开腾讯云 CloudBase 控制台。
2. 进入文档型数据库的 `submissions` 集合。
3. 打开“权限设置”。
4. 切到“安全规则”。
5. 临时改成：

```json
{
  "read": true,
  "create": true,
  "update": true,
  "delete": false
}
```

6. 保存规则。
7. 打开本地后台 `http://localhost:3000/admin`。
8. 刷新页面，确认“用户补充审核”里能看到待审核记录。
9. 填写“管理员回复”。
10. 点“采纳”或“未采纳”。
11. 确认右侧“最近已处理”出现刚处理的记录。
12. 回到 CloudBase 控制台。
13. 把 `submissions` 权限改回 `PRIVATE`。
14. 再保存一次。

## 提醒

- 审核期间不要关闭 `npm run dev` 的终端窗口，否则本地 `admin` 页面会断开。
- 审核做完后，一定记得把 `submissions` 权限收回到 `PRIVATE`。
- `PRIVATE` 状态下，用户仍然可以看到自己的提交，但前端 `admin` 看不到全部 submission，这是正常现象。
