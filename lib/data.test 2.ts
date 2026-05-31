import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const menuItemSchema = z.object({
  name: z.string(),
  nameZh: z.string(),
  price: z.string(),
  description: z.string(),
  descriptionZh: z.string(),
  image: z.string().optional(),
});

const menuCategorySchema = z.object({
  category: z.string(),
  categoryZh: z.string(),
  items: z.array(menuItemSchema),
});

describe('menu data schema', () => {
  it('validates a correct menu item', () => {
    const item = {
      name: 'Test Drink',
      nameZh: '测试饮品',
      price: '88',
      description: 'A test drink',
      descriptionZh: '一杯测试饮品',
    };
    expect(() => menuItemSchema.parse(item)).not.toThrow();
  });

  it('rejects an item with missing required field', () => {
    const item = {
      name: 'Test Drink',
      nameZh: '测试饮品',
      price: '88',
      description: 'A test drink',
      // missing descriptionZh
    };
    expect(() => menuItemSchema.parse(item)).toThrow();
  });
});
