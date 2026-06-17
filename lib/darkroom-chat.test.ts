// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  classifyUserIntent,
  buildTopicState,
  resolvePronouns,
  parseTopicLock,
  formatTopicLockInstruction,
  extractUserMentionedNames,
  isConcreteTopicEntityForTest,
  safeJsonParse,
  safeJsonParseArray,
} from './darkroom-chat';
import type { HistoryMessage } from './darkroom-chat';

describe('classifyUserIntent', () => {
  it('classifies questions as ask', () => {
    expect(classifyUserIntent('你认识小马吗？', undefined, true)).toBe('ask');
    expect(classifyUserIntent('Who is Phillip?', undefined, false)).toBe('ask');
  });

  it('classifies short replies after a question as answer', () => {
    const prev = '小马哪方面专一？';
    expect(classifyUserIntent('感情方面', prev, true)).toBe('answer');
    expect(classifyUserIntent('感情方面。', prev, true)).toBe('answer');
  });

  it('classifies explicit shift markers', () => {
    expect(classifyUserIntent('先不说这个，聊聊 Dex', undefined, true)).toBe('shift');
    expect(classifyUserIntent("Let's talk about Dex", undefined, false)).toBe('shift');
  });

  it('defaults to gossip', () => {
    expect(classifyUserIntent('继续', undefined, true)).toBe('gossip');
    expect(classifyUserIntent('Go on', undefined, false)).toBe('gossip');
  });
});

describe('extractUserMentionedNames', () => {
  it('extracts names from Chinese "do you know" patterns', () => {
    const history: HistoryMessage[] = [{ role: 'user', content: '你认识司徒吗？' }];
    expect(extractUserMentionedNames(history, true)).toContain('司徒');
  });

  it('extracts names from English "do you know" patterns', () => {
    const history: HistoryMessage[] = [{ role: 'user', content: 'Do you know nemo?' }];
    expect(extractUserMentionedNames(history, false)).toContain('nemo');
  });
});

describe('buildTopicState', () => {
  it('prioritizes user-mentioned names over known entities', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: '你认识司徒吗？' },
      { role: 'assistant', content: '司徒啊，听说过。' },
    ];
    const state = buildTopicState(history, true);
    expect(state.primaryEntity).toBe('司徒');
  });

  it('falls back to known entity when user mentions no name', () => {
    const history: HistoryMessage[] = [
      { role: 'assistant', content: '小马最近怎么样？' },
      { role: 'user', content: '他挺好的。' },
    ];
    const state = buildTopicState(history, true);
    expect(state.primaryEntity).toBe('Phillip');
  });

  it('uses dynamic entities for matching', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: '司徒最近来店里了吗？' },
    ];
    const dynamicEntities = [
      { id: 1, name: '司徒', aliases: ['situ'], source: 'user_mentioned' as const, created_at: '' },
    ];
    const state = buildTopicState(history, true, dynamicEntities);
    expect(state.primaryEntity).toBe('司徒');
  });

  it('detects answer intent with previous assistant question', () => {
    const history: HistoryMessage[] = [
      { role: 'assistant', content: '小马哪方面专一？' },
      { role: 'user', content: '感情方面' },
    ];
    const state = buildTopicState(history, true);
    expect(state.userIntent).toBe('answer');
    expect(state.primaryEntity).toBe('Phillip');
  });

  it('keeps session primary_entity as anchor even when assistant mentions another known entity', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: '你认识司徒吗？' },
      { role: 'assistant', content: '认得，司徒……是小马的前任。' },
      { role: 'user', content: '他很喜欢看电影' },
    ];
    const state = buildTopicState(history, true, [], null, '司徒');
    expect(state.primaryEntity).toBe('司徒');
  });

  it('scans user messages before assistant messages so user mentions dominate', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: '我今晚跟老王一起去的。' },
      { role: 'assistant', content: '那挺好。他今天晚上状态怎么样？' },
      { role: 'user', content: '他有点累' },
    ];
    const state = buildTopicState(history, true);
    expect(state.primaryEntity).toBe('Tee');
  });

  it('lets classifier shift away from session anchor when explicit', () => {
    const history: HistoryMessage[] = [{ role: 'user', content: '聊聊 Dex' }];
    const state = buildTopicState(history, true, [], {
      intent: 'shift',
      topicEntity: 'Dex',
      confidence: 0.9,
    }, 'Tee');
    expect(state.primaryEntity).toBe('Dex');
  });

  it('inherits recent entity when user message is a short pronoun question', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: 'dex经常来吗？' },
      { role: 'assistant', content: '挺稳定的。你找他？' },
      { role: 'user', content: '他喜欢谁？' },
    ];
    const state = buildTopicState(history, true);
    expect(state.primaryEntity).toBe('Dex');
  });

  it('keeps Dex locked across multiple pronoun follow-ups', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: 'Dex经常来吗' },
      { role: 'assistant', content: '常来，稳定得像一段不会报错的代码。不过他从来不做多余的注释。' },
      { role: 'user', content: '他在啾喔有喜欢的人吗' },
      { role: 'assistant', content: '有传言说他对某个人特别上心，但他从没承认过，嘴很严。' },
      { role: 'user', content: '他单身吗' },
    ];
    const state = buildTopicState(history, true);
    expect(state.primaryEntity).toBe('Dex');
    const resolved = resolvePronouns('他单身吗', state, true);
    expect(resolved).toContain('Dex');
  });

  it('inherits Dex when latest pronoun question names Aidan as object', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: 'dex经常来吗' },
      { role: 'assistant', content: '日志里说他是稳定信号，几乎不会断连的那种。常客没跑了。' },
      { role: 'user', content: '他喜欢Aidan吗' },
    ];
    const state = buildTopicState(history, true);
    expect(state.primaryEntity).toBe('Dex');
    const resolved = resolvePronouns('他喜欢Aidan吗', state, true);
    expect(resolved).toContain('Dex');
  });

  it('does not let classifier topicEntity Aidan override inherited Dex', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: 'dex经常来吗' },
      { role: 'assistant', content: '日志里说他是稳定信号，几乎不会断连的那种。常客没跑了。' },
      { role: 'user', content: '他喜欢Aidan吗' },
    ];
    const state = buildTopicState(history, true, [], { intent: 'ask', topicEntity: 'Aidan', confidence: 0.9 });
    expect(state.primaryEntity).toBe('Dex');
  });

  it('does not let a stale session anchor override Dex in current history', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: 'Dex单身吗？' },
      { role: 'assistant', content: '不单身，有个在一起12年的男朋友。你是想打听他，还是替别人问的？' },
      { role: 'user', content: '我想更了解他' },
    ];
    const state = buildTopicState(history, true, [], null, 'Phillip');
    expect(state.primaryEntity).toBe('Dex');
  });

  it('allows classifier shift to override the current topic', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: 'Dex单身吗？' },
      { role: 'assistant', content: '不单身，有个在一起12年的男朋友。' },
      { role: 'user', content: '聊聊小马' },
    ];
    const state = buildTopicState(history, true, [], { intent: 'shift', topicEntity: 'Phillip', confidence: 0.9 }, 'Dex');
    expect(state.primaryEntity).toBe('Phillip');
  });

  it('inherits nemo via classifier when it is not in known/dynamic entities', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: 'nemo不是老王圈子的边缘人物！是核心人物！' },
      { role: 'assistant', content: '行，记录已更新。老王核心圈又添一席。' },
      { role: 'user', content: '那nemo有什么情史吗' },
      { role: 'assistant', content: '关于情史，记录里只有酒量数据，情感模块那栏是空的。要么藏得太深，要么老王圈子没给传开。' },
      { role: 'user', content: '他可是有个五年左右的男朋友哦' },
    ];
    const state = buildTopicState(history, true, [], { intent: 'gossip', topicEntity: 'nemo', confidence: 0.8 });
    expect(state.primaryEntity).toBe('nemo');
  });

  it('inherits nemo via session anchor when it appears in prior user messages', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: 'nemo不是老王圈子的边缘人物！是核心人物！' },
      { role: 'assistant', content: '行，记录已更新。老王核心圈又添一席。' },
      { role: 'user', content: '他可是有个五年左右的男朋友哦' },
    ];
    const state = buildTopicState(history, true, [], null, 'nemo');
    expect(state.primaryEntity).toBe('nemo');
  });
});

describe('resolvePronouns', () => {
  it('prepends topic context when pronoun is used', () => {
    const state = {
      primaryEntity: '司徒',
      primaryIsUserMentioned: true,
      entities: ['司徒'],
      userIntent: 'gossip' as const,
    };
    const result = resolvePronouns('他是不是很帅？', state, true);
    expect(result).toContain('司徒');
    expect(result).toContain('他是不是很帅？');
  });

  it('returns null when entity is already named', () => {
    const state = {
      primaryEntity: '司徒',
      primaryIsUserMentioned: true,
      entities: ['司徒'],
      userIntent: 'gossip' as const,
    };
    expect(resolvePronouns('司徒是不是很帅？', state, true)).toBeNull();
  });

  it('prepends answer continuation for short answers', () => {
    const state = {
      primaryEntity: '小马',
      primaryIsUserMentioned: false,
      entities: ['小马'],
      userIntent: 'answer' as const,
    };
    const result = resolvePronouns('感情方面', state, true);
    expect(result).toContain('小马');
    expect(result).toContain('感情方面');
  });
});

describe('parseTopicLock', () => {
  it('parses and strips topic lock tag', () => {
    const raw = '[TopicLock: 小马]\n他感情方面挺专一的。';
    const { topic, cleanContent } = parseTopicLock(raw);
    expect(topic).toBe('小马');
    expect(cleanContent).toBe('他感情方面挺专一的。');
  });

  it('returns original content when tag is missing', () => {
    const raw = '他感情方面挺专一的。';
    const { topic, cleanContent } = parseTopicLock(raw);
    expect(topic).toBeUndefined();
    expect(cleanContent).toBe(raw);
  });

  it('handles english topic lock', () => {
    const raw = '[TopicLock: Phillip]\nHe is loyal in relationships.';
    const { topic, cleanContent } = parseTopicLock(raw);
    expect(topic).toBe('Phillip');
    expect(cleanContent).toBe('He is loyal in relationships.');
  });
});

describe('formatTopicLockInstruction', () => {
  it('includes the topic placeholder in Chinese', () => {
    const instruction = formatTopicLockInstruction('司徒', true);
    expect(instruction).toContain('[TopicLock: 司徒]');
  });

  it('includes the topic placeholder in English', () => {
    const instruction = formatTopicLockInstruction('Phillip', false);
    expect(instruction).toContain('[TopicLock: Phillip]');
  });
});

describe('isConcreteTopicEntityForTest', () => {
  it('rejects pronouns and generic placeholders in Chinese', () => {
    expect(isConcreteTopicEntityForTest('他', true)).toBe(false);
    expect(isConcreteTopicEntityForTest('某个人', true)).toBe(false);
    expect(isConcreteTopicEntityForTest('谁', true)).toBe(false);
  });

  it('rejects pronouns and generic placeholders in English', () => {
    expect(isConcreteTopicEntityForTest('he', false)).toBe(false);
    expect(isConcreteTopicEntityForTest('someone', false)).toBe(false);
    expect(isConcreteTopicEntityForTest('this person', false)).toBe(false);
  });

  it('accepts concrete names', () => {
    expect(isConcreteTopicEntityForTest('Dex', false)).toBe(true);
    expect(isConcreteTopicEntityForTest('司徒', true)).toBe(true);
  });
});

describe('safeJsonParse', () => {
  it('returns null for empty or whitespace input', () => {
    expect(safeJsonParse('')).toBeNull();
    expect(safeJsonParse('   ')).toBeNull();
  });

  it('parses clean JSON', () => {
    const result = safeJsonParse('{"summary":"test","primary_entity":"Alice"}');
    expect(result).toEqual({ summary: 'test', primary_entity: 'Alice' });
  });

  it('strips markdown fences', () => {
    const raw = '```json\n{"summary":"test"}\n```';
    expect(safeJsonParse(raw)).toEqual({ summary: 'test' });
  });

  it('extracts JSON from surrounding text', () => {
    const raw = 'Here is the summary:\n{"summary":"test","primary_entity":"Bob"}\nHope that helps!';
    expect(safeJsonParse(raw)).toEqual({ summary: 'test', primary_entity: 'Bob' });
  });

  it('returns null for truncated JSON', () => {
    const raw = '{"summary":"this is a very long summary that got cut off mid';
    expect(safeJsonParse(raw)).toBeNull();
  });

  it('returns null for unterminated string in JSON', () => {
    const raw = '{"summary":"unterminated';
    expect(safeJsonParse(raw)).toBeNull();
  });

  it('returns null for non-JSON or array responses', () => {
    expect(safeJsonParse('just some text')).toBeNull();
    expect(safeJsonParse('[]')).toBeNull();
  });

  it('handles nested braces correctly', () => {
    const raw = '{"summary":"She said {hello} to him"}';
    expect(safeJsonParse(raw)).toEqual({ summary: 'She said {hello} to him' });
  });

  it('extracts the first object when multiple JSON values are present', () => {
    const raw = 'prefix {"a":1} middle {"b":2} suffix';
    expect(safeJsonParse(raw)).toEqual({ a: 1 });
  });

  it('extracts object from markdown fence with trailing text', () => {
    const raw = 'Here is the JSON:\n```json\n{"x":true}\n```\nDone.';
    expect(safeJsonParse(raw)).toEqual({ x: true });
  });
});

describe('safeJsonParseArray', () => {
  it('parses a clean JSON array', () => {
    expect(safeJsonParseArray('[{"content":"a"}]')).toEqual([{ content: 'a' }]);
  });

  it('extracts an array from surrounding text', () => {
    const raw = "Memories:\n```json\n[{\"content\":\"a\"},{\"content\":\"b\"}]\n```\nThat's all.";
    expect(safeJsonParseArray(raw)).toEqual([{ content: 'a' }, { content: 'b' }]);
  });

  it('returns null for object responses', () => {
    expect(safeJsonParseArray('{"entries":[]}')).toBeNull();
  });

  it('returns null for truncated arrays', () => {
    expect(safeJsonParseArray('[{"content":"a"')).toBeNull();
  });
});
