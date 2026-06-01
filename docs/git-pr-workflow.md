# Git 工作流程：直接 Push vs Pull Request (PR)

> 保存时间：2026-06-01  
> 适用场景：JIUWO 网站项目单人维护时的代码提交策略

---

## Pull Request (PR) 是什么

PR = **Pull Request（拉取请求）**

GitHub 上的一个协作功能，本质是**"请求把分支 A 的代码合并到分支 B"**的提案。

```
本地开发分支:  feature/spotlight-events
                       ↓ 发起 Pull Request
GitHub 目标分支:       main
                       ↓ 确认无误后点击 Merge
main 分支就包含了你的新代码 → Vercel 自动部署
```

---

## 为什么要用 PR

| 优势 | 说明 |
|------|------|
| **代码审查 (review)** | 在 GitHub 网页上逐行查看所有改动，确认没有错误 |
| **讨论留痕** | 如果有问题，可以在 PR 里留言，修改后再合并 |
| **随时回滚** | 合并后发现有问题，可以一键 revert |
| **预览部署** | Vercel 会给每个 PR 自动生成预览链接，合并前就能看到实际效果 |
| **安全缓冲** | 不会直接把可能有问题的代码推到生产环境 |

---

## 两种方式对比

| 方式 | 操作步骤 | 风险 |
|------|---------|------|
| **直接 merge + push** | `git merge` → `git push origin main` | 一旦 push，Vercel 自动部署到线上。如果有 bug，线上直接受影响 |
| **先 PR 再 merge** | push 分支 → GitHub 创建 PR → review → 点 Merge | 有 review 和预览缓冲，确认无误后再上线 |

---

## 单人维护时 PR 的价值

虽然 JIUWO 是你一个人维护，没有"团队协作"的需求，但 PR 仍然有实用价值：

1. **GitHub 网页看 diff** — 比在终端看 `git diff` 直观得多
2. **Vercel 预览链接** — 每个 PR 自动生成一个独立 URL，可以在合并前看到实际效果
3. **合并前最后一道检查** — 防止手误提交不应该上线的代码

---

## 常用命令速查

```bash
# 查看当前分支
git branch

# 创建并切换到新分支
git checkout -b feature/xxx

# 推送到 GitHub（首次 push 新分支）
git push -u origin feature/xxx

# 推送已有分支的更新
git push

# 创建 PR（在 GitHub 网页上操作，或使用 gh CLI）
gh pr create --title "feat: xxx" --body "描述"

# 合并 PR（在 GitHub 网页上点击 Merge，或使用 gh CLI）
gh pr merge
```

---

## 本次项目的分支状态

| 分支 | 状态 | 说明 |
|------|------|------|
| `main` | 线上版本 | Vercel 自动部署 |
| `feature/spotlight-events` | 已 push 到 GitHub | 包含 DrinkSpotlight + EventCalendar 功能 |

GitHub 分支链接：https://github.com/AidanMMMY/jiuwo-shanghai/tree/feature/spotlight-events

如需创建 PR：https://github.com/AidanMMMY/jiuwo-shanghai/pull/new/feature/spotlight-events
