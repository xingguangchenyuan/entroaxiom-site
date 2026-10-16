---
id: git-workflow-cheatsheet
title: Git 日常工作流速查
summary: 个人项目够用的分支、提交、回滚与同步命令，加上几条避免丢东西的习惯。
category: 计算机
tags: [Git, 运维]
date: 2024-11-02
visibility: public
status: published
---

## 日常循环

```bash
git switch -c feature/xxx      # 新分支
git add -p                     # 分块暂存，顺便复查
git commit -m "说明做了什么"
git push -u origin feature/xxx
```

## 撤销与回滚

- 撤销未提交的改动：`git restore <file>`
- 撤销最近一次提交但保留改动：`git reset --soft HEAD~1`
- 回滚已推送的提交：`git revert <sha>`，不要改写公共历史

## 习惯

1. 提交前看一眼 `git diff --staged`
2. 大改动之前先开分支
3. 把 `.env` 与密钥写进 `.gitignore`
