# Vercel 免费额度优化记录（2025-06-18）

## 背景

Vercel Dashboard 于 2025-06-18 显示 jiuwo-shanghai 项目超出免费资源额度：

- **Image Optimization - Transformations**: 5.3K / 5K（已超额）
- **Speed Insights Data Points**: 10K / 10K（已超额）
- **Image Optimization - Cache Writes**: 69K / 100K（接近上限）
- **Fluid Active CPU**: 2h 27m / 4h（接近上限）

## 根因分析

1. **图片优化**：项目使用 Next.js 内置 `next/image` 组件共 11 处，全部走 Vercel 内置图片优化。
2. **双格式配置**：`next.config.ts` 同时启用 `avif` 与 `webp`，每次请求可能产生多份转换。
3. **尺寸档位过多**：`deviceSizes` 8 档 + `imageSizes` 8 档，命中变体多。
4. **缓存时间短**：`minimumCacheTTL: 86400` 仅 1 天，重复访问易产生新的转换。
5. **Speed Insights 全量采样**：`app/layout.tsx` 中 `<SpeedInsights />` 未限制采样率，所有会话都上报 Web Vitals 数据。

## 本次变更（方案 A：保守降级）

### 1. 降低 Speed Insights 采样率

文件：`app/layout.tsx`

- 将 `<SpeedInsights />` 改为 `<SpeedInsights sampleRate={0.1} />`
- 仅收集 10% 会话的 Web Vitals 数据，保留性能监控能力

### 2. 收紧图片优化配置

文件：`next.config.ts`

| 配置项 | 变更前 | 变更后 | 理由 |
|---|---|---|---|
| `formats` | `['image/avif', 'image/webp']` | `['image/webp']` | 去掉 avif，减少转换次数；webp 兼容性已足够 |
| `deviceSizes` | `[640, 750, 828, 1080, 1200, 1920, 2048, 3840]` | `[640, 1080, 1920, 3840]` | 从 8 档减为 4 档，覆盖常用断点 |
| `imageSizes` | `[16, 32, 48, 64, 96, 128, 256, 384]` | `[64, 128, 384]` | 从 8 档减为 3 档，覆盖 icon/小图/大图 |
| `minimumCacheTTL` | `86400`（1 天） | `31536000`（1 年） | 延长缓存，降低重复转换 |

## 预期效果

- **Image Transformations**：预计降至原来的 1/4 ~ 1/3。
- **Speed Insights Data Points**：预计降至约 1K/月（按 10% 采样）。
- **Cache Writes**：因 TTL 延长，重复写入减少。
- **Fluid CPU**：图片处理减少后，边缘 CPU 用量同步下降。

## 风险与回滚

- **显示风险低**：仅调整响应式图片尺寸档位和格式，不改动 UI 组件。
- **画质影响**：webp 与 avif 在酒吧场景图片中差异几乎不可感知；尺寸档位减少后，大屏幕上仍会有 1920/3840 两档保证清晰度。
- **回滚方式**：直接恢复 `next.config.ts` 与 `app/layout.tsx` 的原始配置即可。

## 后续建议

若月底仍接近限额，可考虑：

- 方案 B：对 logo、OG 图、菜单图等不需要响应式的图片加 `unoptimized` 属性，彻底跳过 Vercel 图片优化。
- 长期：升级到 Vercel Pro（$20/月/成员），或迁移图片优化到 Cloudflare Images / R2。

---

记录时间：2025-06-18
操作人：Claude Code
关联文件：`next.config.ts`、`app/layout.tsx`
