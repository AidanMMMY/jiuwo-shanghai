# Session Summary: Feature Improvement

**Session ID:** `a0dc0652-93ed-484b-a9d4-b4f477374212`  
**Date:** 2026-05-23  
**Source:** `~/.claude/projects/-Users-aidanliu-Documents-JIUWO-Shanghai/a0dc0652-93ed-484b-a9d4-b4f477374212.jsonl`（≈ 6800 行对话）

---

## 🔑 核心决策与实现摘要

### 1. Guestbook Stamps（留言本印章）
- **数据库**：Vercel Postgres 关闭，迁移到 **Neon**；代码从 `@vercel/postgres` 改为 `@neondatabase/serverless`
- **Stamp 设计**：从几何线描 SVG 改为 **实心剪影**（黑色填充 + 金色圆环），5 种动物（猪/熊/猴子/狗/狼），辨识度更高
- **邮件通知**：Resend 配置，需要 `RESEND_API_KEY` + 阿里云 DNS 添加 DKIM/SPF/DMARC 记录
- **部署修复**：`export const dynamic = 'force-dynamic'` 导致 404，改为 `export const revalidate = 60`（ISR）

### 2. 首页 Guestbook Hook 区域优化
- **可识别性**：增加 "GUESTBOOK" 标题和副标题，一眼能看出功能定位
- **点击跳转**：整个区域可点击跳转；点击 "Leave your own →" 跳转到 guestbook 并**自动展开留言面板**（`?write=1` 参数）
- **响应式布局**：桌面端 **2 列展示**（`grid-cols-2`），移动端单列；条目数 10 条（5+5）；两列间距加大
- **印章位置**：保持现有布局（印章放左下角或右下角）

### 3. Gallery 分类标签
- 4 个主题：**Our Friends / Photography / Jiuwo Stories / Our Life**
- 标签样式：**左上角圆角矩形**，`bg-black/40 backdrop-blur-sm`，`border-white/10`，`text-[#a0a0a0]`，字号 `text-[10px]`，`tracking-[0.15em]`
- **无彩色区分**，统一灰色调保持极简

### 4. Our Friends 社交媒体入口
- 相册明细页增加朋友社交账号（Instagram / 小红书）
- **实现方式**：社交图标（IG 图标/小红书文字标）放在相册信息区域，可点击跳转
- 已添加：Zack (IG+小红书)、Dex (IG)、PP (小红书)、Josh Hu (IG+小红书)

### 5. Hero 轮播图 Zoom 效果（❌ 已放弃）
- 尝试给轮播图照片添加持续 zoom-in 动画
- 多次调试后效果不连贯（fade 周期内非匀速放大、收尾停顿）
- **最终决定：退回所有 zoom 变更**

### 6. Gallery Lightbox 左右滑动
- 移动端 Lightbox 增加手势滑动切换
- **架构问题**：缺少过渡动画层、手势跟随层、惯性回弹层
- **当前状态**：基础滑动已实现但体验仍生硬，底层架构需大改才能彻底解决

### 7. 点赞功能
- **Journal 列表**：双击点赞（300ms 延迟判定）
- **相册缩略图**：右下角常驻小点赞按钮（心形+数字），单击打开 Lightbox，点击心形点赞
- **Lightbox 内**：底部独立 LikeButton，数据互通
- **问题修复**：点赞后数量不及时更新 → 修复状态同步逻辑

### 8. Hero 标题视觉升级
- **字体**：JIUWO 标题改用 **Playfair Display** 衬线体，`tracking-[0.12em]`
- **颜色**：纯白 → **金色渐变**（`#f5f5f0` → `#c9a227`）
- **阴影**：双层 `drop-shadow` 提升复杂背景上的可读性
- **入场动画**：J-I-U-W-O 逐字从下方 30px 滑入，间隔 90ms；副标题延迟 800ms 淡入
- **呼吸动画**：入场完成后 1.2s 开始 subtle opacity + scale 呼吸（周期 5s）
- **背景遮罩**：`bg-black/40` → `bg-black/55`
- **可访问性**：`prefers-reduced-motion: reduce` 降级为静态

### 9. 整体视觉优化（方向 3+4+5）
- **方向3（菜单分类导航）**：分类标题完整显示修复
- **方向4（精致 Lightbox）**：圆形关闭按钮、Back to Gallery 按钮修复
- **方向5（全局 micro-interaction）**：动态光效、过渡优化
- **其他**：Menu 分类锚点导航 scroll margin 增加避免被导航栏遮挡

### 10. 后续优化方向（讨论但被推迟/否决）

| 方向 | 状态 | 原因 |
|------|------|------|
| 多语言自动检测 | ❌ 推迟 | 当前手动切换足够 |
| Sanity CMS | ❌ 否决 | 用户坚持 JSON + 图片的 solo 维护方式 |
| 在线预约系统 | ❌ 推迟 | defer auth/booking |
| 深色/浅色主题切换 | ❌ 否决 | 品牌锁定纯黑背景 |
| 视频背景 Hero | ❌ 否决 | 与品牌克制感不符 |
| 调酒师个人页面 | ❌ 否决 | 当前团队规模不需要 |

---

## 📝 关键踩坑记录

1. **Vercel Postgres 关闭** → 被迫迁移到 Neon，需改 `@neondatabase/serverless`
2. **`force-dynamic` 导致 404** → ISR `revalidate = 60` 解决
3. **Hero zoom 效果多轮调试失败** → 最终全部回滚
4. **Lightbox 滑动体验差** → 底层架构缺失三要素（过渡/跟随/惯性），短期难以彻底解决
5. **Resend 邮件** → 需完整 DNS 配置（DKIM + SPF + DMARC）才能正常发送
