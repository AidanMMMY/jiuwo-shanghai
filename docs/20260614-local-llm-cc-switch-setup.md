# 本地大模型 + CC Switch + Claude Code 配置备忘

> 创建时间：2026-06-14  
> 适用环境：macOS / Apple Silicon / Ollama / CC Switch v3.12.2 / Claude Code CLI

---

## 一、整体链路

```
VS Code（终端运行 claude / Claude Code 扩展）
        ↓
Claude Code CLI
        ↓
CC Switch 本地代理（127.0.0.1:15721）
        ↓
Ollama（127.0.0.1:11434）
        ↓
本地模型
```

说明：Claude Code 使用 Anthropic API 协议，Ollama 只提供 OpenAI 兼容接口，所以需要 CC Switch 的本地代理做协议转换。

---

## 二、已下载/计划下载的本地模型

| 模型名 | 参数 | 原生上下文 | 建议用途 |
|--------|------|-----------|---------|
| `deepseek-r1:70b` | 70B | 128K | 推理、复杂问题 |
| `qwen2.5-coder:32b` | 32B | 128K | 代码补全、快速任务 |
| `qwen2.5:72b` | 72B | 128K | 通用最强、大上下文 |
| `llama3.3:70b` | 70B | 128K | 英文创意、英文任务 |

> Ollama 默认只启用 2048 tokens 上下文。如需更大上下文，需在运行模型时设置 `num_ctx`，但会显著增加内存占用。

---

## 三、CC Switch 配置步骤

### 3.1 启用本地代理

打开 **CC Switch** → **Settings**：

| 设置项 | 值 |
|--------|-----|
| Enable Local Proxy | ✅ 开启 |
| Listen Address | `127.0.0.1` |
| Listen Port | `15721` |

### 3.2 添加 Ollama Provider

进入 **Providers** → **Add Provider**：

| 字段 | 值 |
|------|-----|
| Name | `Local Ollama` |
| App | `Claude` |
| Provider Type | `OpenAI-compatible` / `Custom` / `Local`（选本地/OpenAI 兼容项） |
| Base URL | `http://127.0.0.1:11434/v1` |
| API Key | `ollama`（占位符即可，Ollama 不校验） |

### 3.3 模型角色映射

Claude Code 内部使用 `haiku` / `sonnet` / `opus` / `reasoning` 四种角色请求模型。CC Switch 必须把它们映射到本地模型名：

| Claude Code 角色 | 映射到本地模型 | 用途 |
|------------------|---------------|------|
| `haiku` | `qwen2.5-coder:32b` | 快速/轻量任务 |
| `sonnet` | `deepseek-r1:70b` | 默认主力、推理 |
| `opus` | `qwen2.5:72b` | 最强模型、大上下文 |
| `reasoning` | `deepseek-r1:70b` | 推理模式 |

如需偏重英文创意，可将 `sonnet` 或 `opus` 改为 `llama3.3:70b`。

### 3.4 环境变量配置

在该 Provider 的环境变量区域填写：

```bash
ANTHROPIC_BASE_URL=http://127.0.0.1:11434/v1
ANTHROPIC_AUTH_TOKEN=ollama
ANTHROPIC_DEFAULT_HAIKU_MODEL=qwen2.5-coder:32b
ANTHROPIC_DEFAULT_SONNET_MODEL=deepseek-r1:70b
ANTHROPIC_DEFAULT_OPUS_MODEL=qwen2.5:72b
ANTHROPIC_REASONING_MODEL=deepseek-r1:70b
```

### 3.5 激活 Provider

在 CC Switch 中将 `Local Ollama` 设为 **Claude 的当前 Provider**。

---

## 四、在 VS Code 中使用

### 方式 A：终端直接运行

```bash
claude
# 或带指令
claude "帮我解释这段代码"
```

### 方式 B：Claude Code VS Code 扩展

安装 Claude Code 官方扩展后，其底层同样调用 Claude Code CLI，配置正确后会自动走本地模型。

---

## 五、验证是否走通本地

在终端运行：

```bash
claude --verbose "你好"
```

或在 Ollama 侧观察模型是否被加载：

```bash
ollama ps
```

若看到对应模型出现在 `ollama ps` 列表中，说明请求已到达本地。

---

## 六、常见问题

**Q：为什么 VS Code 里的 Claude 官方扩展不能直接接本地模型？**  
A：该扩展只支持 Anthropic 官方 API，不走 Claude Code CLI，因此无法被 CC Switch 接管。

**Q：上下文长度能不能直接用到 128K？**  
A：模型架构支持，但 Ollama 默认 2048。开启更大上下文会显著增加内存，64GB 内存跑 70B 模型时建议控制在 4K–8K 以内。

**Q：本地 70B 模型速度如何？**  
A：明显慢于云端 Claude。建议轻量任务用 `qwen2.5-coder:32b`，复杂任务才用 70B/72B。

---

## 七、相关命令速查

```bash
# 查看已下载模型
ollama list

# 查看正在运行的模型
ollama ps

# 手动运行某个模型（测试用）
ollama run deepseek-r1:70b

# 查看模型信息
ollama show deepseek-r1:70b
```

---

*本文件为操作备忘，随环境变化可能需要更新。*
