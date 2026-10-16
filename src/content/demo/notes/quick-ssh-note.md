---
id: quick-ssh-note
title: SSH 快速备忘
summary: 生成密钥、配置免密登录、常用的端口转发与代理选项。三分钟能抄完的命令清单。
category: 计算机
tags: [SSH, 运维]
date: 2024-05-06
visibility: public
status: published
---

## 生成密钥

```bash
ssh-keygen -t ed25519 -C "note@example.com"
```

## 免密登录与常用操作

### 免密登录

把公钥追加到目标机器的 `~/.ssh/authorized_keys`，本地则用 `ssh-agent` 或 `-i` 指定私钥。

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host
```

### 常用转发

```bash
# 本地端口转发：本机 8080 → 远端内网 80
ssh -L 8080:internal-host:80 user@host

# 动态代理（SOCKS5）
ssh -D 1080 user@host

# 跳板机：本地直连内网服务
ssh -J jump-user@gateway user@internal-host
```

### 连接保活

在 `~/.ssh/config` 中设置：

```
ServerAliveInterval 60
ServerAliveCountMax 3
```

**小结**：记住 `-L`、`-D`、`-J` 三个转发参数，八成场景够用。