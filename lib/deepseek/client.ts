import OpenAI from "openai";

const apiKey = process.env.DEEPSEEK_API_KEY;
const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1";

export const deepseekClient = new OpenAI({
  apiKey: apiKey || "dummy-key-for-build",
  baseURL,
});

export const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
