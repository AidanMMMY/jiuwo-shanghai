import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { remark } from 'remark';
import html from 'remark-html';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark().use(html).process(markdown);
  return result.toString();
}
