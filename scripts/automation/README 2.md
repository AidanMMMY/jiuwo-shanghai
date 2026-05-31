# Browser Automation Framework

基于 Playwright 的无头浏览器自动化框架，支持登录、页面分析、表单填写、点击等操作。

## 安装

```bash
npm install
npx playwright install chromium
```

## 目录结构

```
scripts/automation/
├── core/
│   └── browser.mjs          # 浏览器核心封装
├── utils/
│   └── page-analyzer.mjs    # 页面分析工具
├── tasks/
│   └── example.mjs          # 示例任务
├── config.mjs               # 配置文件（目标网站、凭证）
└── .storage/                # 运行时数据（登录状态、截图）
```

## 快速开始

### 1. 配置目标网站

编辑 `config.mjs`，添加你要自动化的网站：

```js
export const CONFIG = {
  mysite: {
    baseUrl: "https://mysite.com",
    loginUrl: "https://mysite.com/login",
    credentials: {
      username: process.env.MY_USERNAME,
      password: process.env.MY_PASSWORD,
    },
    selectors: {
      usernameInput: 'input[type="email"]',
      passwordInput: 'input[type="password"]',
      submitButton: 'button[type="submit"]',
    },
  },
};
```

### 2. 运行示例任务

```bash
cd scripts/automation
node tasks/example.mjs
```

### 3. 让 Claude 帮你写任务

直接告诉我：

> "访问 example.com，登录后找到订单列表，把第一个订单的状态发给我。"

我会：
1. 查看 `config.mjs` 里的配置
2. 写一个新的 task 文件
3. 运行并给你结果

## 核心 API

### BrowserSession

```js
import { createSession } from "./core/browser.mjs";

const session = await createSession({ headless: true });

// 导航
await session.goto("https://example.com");

// 分析页面
const info = await session.analyzePage();

// 填写表单
await session.fill('input[name="email"]', "user@example.com");
await session.fill('input[name="password"]', "secret");

// 点击
await session.click('button[type="submit"]');

// 提取文本
const title = await session.extractText("h1");

// 截图
await session.screenshot("result");

// 保存登录状态
await session.saveState();

// 关闭
await session.close();
```

### 页面分析

```js
import { summarizePage, findSelectorByText, pageContains } from "./utils/page-analyzer.mjs";

const info = await session.analyzePage();

// 打印页面摘要
console.log(summarizePage(info));

// 查找包含特定文字的按钮
const selector = findSelectorByText(info, "submit|confirm");

// 检查页面是否包含文字
if (pageContains(info, "success")) { ... }
```

## 环境变量

敏感信息（用户名、密码）建议通过环境变量传入：

```bash
export AUTO_USERNAME="your-username"
export AUTO_PASSWORD="your-password"
node tasks/example.mjs
```

## 调试模式

如果需要看到浏览器窗口执行过程：

```js
const session = await createSession({
  headless: false,  // 显示浏览器
  slowMo: 500,      // 每个操作间隔 500ms
});
```
