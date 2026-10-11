---
id: deep-learning-review
title: 深度学习复习（2024 春）
summary: 课程期末前整理的复习提纲：反向传播的链式法则推导、常见激活函数对比、过拟合的三种正则手段、SGD 与 Adam 的核心区别。一篇能快速过一遍重点的总结。
tags: [深度学习, 复习]
date: 2024-06-10
visibility: public
---

- 反向传播本质是链式法则的图算法：前向算损失，反向按拓扑序累积梯度
- 激活函数对比：ReLU 解决梯度消失但可能 dead；GELU 平滑近似；tanh 适合小网络
- 正则三件套：L2 权重衰减、Dropout、早停；BN 不视为正则（归因于 xavier/msra 初始化更好）
- SGD 收敛慢、噪声大；Adam 自适应学习率兼顾稀疏梯度，但泛化上 SGD+Momentum 常更稳
- 训练技巧：学习率 warmup、余弦退火、梯度裁剪对 RNN 是必需品