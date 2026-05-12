import OpenAI from "openai";

const apiKey = process.env.KIMI_API_KEY;
const baseURL = process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1";

export const kimiClient = new OpenAI({
  apiKey: apiKey || "dummy-key-for-build",
  baseURL,
});

export const DEFAULT_MODEL = process.env.KIMI_MODEL || "moonshot-v1-8k";
