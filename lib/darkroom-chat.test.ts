// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  classifyUserIntent,
  buildTopicState,
  resolvePronouns,
  parseTopicLock,
  formatTopicLockInstruction,
  extractUserMentionedNames,
  extractEntitiesFromText,
  detectForgetRequest,
  isConcreteTopicEntityForTest,
  safeJsonParse,
  safeJsonParseArray,
  countFirstPersonReferences,
  shouldAskIdentity,
  isIdentityRefusal,
  selectIdentityProbePrompt,
  looksLikeName,
  extractUserNameFromHistory,
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

describe('extractEntitiesFromText', () => {
  it('extracts names from Chinese natural mentions', () => {
    const names = extractEntitiesFromText('我昨天和阿林一起去了一家酒吧', true);
    expect(names).toContain('阿林');
  });

  it('extracts names from Chinese "X said" pattern', () => {
    const names = extractEntitiesFromText('小马说这家酒吧不错', true);
    expect(names).toContain('小马');
  });

  it('extracts names from English natural mentions', () => {
    const names = extractEntitiesFromText('I went out with Alex last night', false);
    expect(names).toContain('Alex');
  });

  it('extracts names from English "X and I" pattern', () => {
    const names = extractEntitiesFromText('Sam and I had a drink', false);
    expect(names).toContain('Sam');
  });

  it('filters out stopwords and MBTI types', () => {
    expect(extractEntitiesFromText('我是ENFP', true)).toHaveLength(0);
    expect(extractEntitiesFromText('I am not sure', false)).toHaveLength(0);
  });
});

describe('detectForgetRequest', () => {
  it('detects Chinese self-forget request', () => {
    const req = detectForgetRequest('把我忘了吧', true);
    expect(req).not.toBeNull();
    expect(req?.isSelf).toBe(true);
  });

  it('detects Chinese forget-other request', () => {
    const req = detectForgetRequest('别提小马了', true);
    expect(req?.name).toBe('小马');
    expect(req?.isSelf).toBe(false);
  });

  it('detects English self-forget request', () => {
    const req = detectForgetRequest('Forget about me', false);
    expect(req?.isSelf).toBe(true);
  });

  it('detects English forget-other request', () => {
    const req = detectForgetRequest("Don't mention Alex anymore", false);
    expect(req?.name).toBe('Alex');
    expect(req?.isSelf).toBe(false);
  });

  it('returns null for normal chat', () => {
    expect(detectForgetRequest('今天天气不错', true)).toBeNull();
    expect(detectForgetRequest('Tell me about the menu', false)).toBeNull();
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
      { id: 1, name: '司徒', aliases: ['situ'], source: 'user_mentioned' as const, entity_type: 'person', profile: {}, mention_count: 0, first_seen_at: '', last_mentioned_at: '', created_at: '' },
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

describe('countFirstPersonReferences', () => {
  it('counts Chinese first-person pronoun', () => {
    expect(countFirstPersonReferences('我觉得这里不错', true)).toBe(1);
    expect(countFirstPersonReferences('我喜欢我的酒', true)).toBe(2);
    expect(countFirstPersonReferences('你怎么看', true)).toBe(0);
  });

  it('counts English first-person pronouns', () => {
    expect(countFirstPersonReferences('I like this place', false)).toBe(1);
    expect(countFirstPersonReferences('My drink is great and I love it', false)).toBe(2);
    expect(countFirstPersonReferences('You should come', false)).toBe(0);
  });
});

describe('isIdentityRefusal', () => {
  it('detects Chinese refusals', () => {
    expect(isIdentityRefusal('不用了', true)).toBe(true);
    expect(isIdentityRefusal('不方便', true)).toBe(true);
    expect(isIdentityRefusal('我叫 Alex', true)).toBe(false);
  });

  it('detects English refusals', () => {
    expect(isIdentityRefusal('I\'d rather not', false)).toBe(true);
    expect(isIdentityRefusal('keep it private', false)).toBe(true);
    expect(isIdentityRefusal('I am Alex', false)).toBe(false);
  });
});

describe('looksLikeName', () => {
  it('accepts short Chinese names', () => {
    expect(looksLikeName('阿林', true)).toBe(true);
    expect(looksLikeName('司徒', true)).toBe(true);
    expect(looksLikeName('小马', true)).toBe(true);
  });

  it('rejects Chinese phrases that are not names', () => {
    expect(looksLikeName('喝酒的话', true)).toBe(false);
    expect(looksLikeName('谁吗', true)).toBe(false);
    expect(looksLikeName('出来', true)).toBe(false);
    expect(looksLikeName('算了吧', true)).toBe(false);
    expect(looksLikeName('指我和朋友两个小时', true)).toBe(false);
    expect(looksLikeName('听得最多的人之一', true)).toBe(false);
  });

  it('accepts short English names', () => {
    expect(looksLikeName('Alex', false)).toBe(true);
    expect(looksLikeName('nemo', false)).toBe(true);
  });

  it('rejects English sentences', () => {
    expect(looksLikeName('I am not sure', false)).toBe(false);
    expect(looksLikeName('no thanks', false)).toBe(false);
  });
});

describe('extractUserNameFromHistory', () => {
  it('extracts "I am X" only when X looks like a name', () => {
    expect(extractUserNameFromHistory([{ role: 'user', content: '我是阿林' }], true)).toBe('阿林');
    expect(extractUserNameFromHistory([{ role: 'user', content: '我就是这么想的' }], true)).toBeNull();
    expect(extractUserNameFromHistory([{ role: 'user', content: '我是个很能聊天的人' }], true)).toBeNull();
  });

  it('extracts "you can call me X"', () => {
    const history: HistoryMessage[] = [{ role: 'user', content: '你可以叫我阿林' }];
    expect(extractUserNameFromHistory(history, true)).toBe('阿林');
  });

  it('does not extract name from "he asked me to drink"', () => {
    const history: HistoryMessage[] = [
      { role: 'user', content: '明天他叫我喝酒的话，我还去不去呢' },
    ];
    expect(extractUserNameFromHistory(history, true)).toBeNull();
  });

  it('extracts name after assistant asks for it', () => {
    const history: HistoryMessage[] = [
      { role: 'assistant', content: '该怎么称呼你？' },
      { role: 'user', content: '阿林' },
    ];
    expect(extractUserNameFromHistory(history, true)).toBe('阿林');
  });

  it('does not treat refusal as a name', () => {
    const history: HistoryMessage[] = [
      { role: 'assistant', content: '该怎么称呼你？' },
      { role: 'user', content: '算了吧' },
    ];
    expect(extractUserNameFromHistory(history, true)).toBeNull();
  });

  it('does not treat questions as names', () => {
    const history: HistoryMessage[] = [
      { role: 'assistant', content: '你叫什么？' },
      { role: 'user', content: '谁吗' },
    ];
    expect(extractUserNameFromHistory(history, true)).toBeNull();
  });
});

describe('shouldAskIdentity', () => {
  const buildHistory = (...userContents: string[]): HistoryMessage[] =>
    userContents.map((content) => ({ role: 'user', content }));

  it('returns false when user name is already known', () => {
    const history = buildHistory('我觉得不错', '我上次来过');
    expect(shouldAskIdentity(history, true, 'Alex', 0, false, 0)).toBe(false);
  });

  it('returns false when user has declined', () => {
    const history = buildHistory('我觉得不错', '我上次来过', '我喜欢鸡尾酒');
    expect(shouldAskIdentity(history, true, '', 0, true, 0)).toBe(false);
  });

  it('returns false after max probes', () => {
    const history = buildHistory('我觉得不错', '我上次来过', '我喜欢鸡尾酒');
    expect(shouldAskIdentity(history, true, '', 3, false, 0)).toBe(false);
  });

  it('returns false with fewer than 2 user messages', () => {
    const history = buildHistory('我觉得不错');
    expect(shouldAskIdentity(history, true, '', 0, false, 0)).toBe(false);
  });

  it('returns true when 2 recent messages are self-referential', () => {
    const history = buildHistory('我觉得这里不错', '我上次来过');
    expect(shouldAskIdentity(history, true, '', 0, false, 0)).toBe(true);
  });

  it('returns true when total first-person references reach 2', () => {
    const history = buildHistory('你好', '我我', '酒吧不错');
    expect(shouldAskIdentity(history, true, '', 0, false, 0)).toBe(true);
  });

  it('returns false when recent turns are not self-referential', () => {
    const history = buildHistory('你好', '今天天气怎样', '酒吧几点开', '推荐一杯酒');
    expect(shouldAskIdentity(history, true, '', 0, false, 0)).toBe(false);
  });

  it('follows up after enough new user messages with self-reference', () => {
    const history = buildHistory('我上次来过', '我喜欢鸡尾酒', '酒吧不错', '我朋友也喜欢');
    expect(shouldAskIdentity(history, true, '', 1, false, 2)).toBe(true);
  });

  it('does not follow up too soon', () => {
    const history = buildHistory('我上次来过', '我喜欢鸡尾酒', '酒吧不错');
    expect(shouldAskIdentity(history, true, '', 1, false, 2)).toBe(false);
  });
});

describe('selectIdentityProbePrompt', () => {
  it('cycles through prompts by probe count', () => {
    const prompts = ['a', 'b', 'c'];
    expect(selectIdentityProbePrompt(prompts, 0)).toBe('a');
    expect(selectIdentityProbePrompt(prompts, 1)).toBe('b');
    expect(selectIdentityProbePrompt(prompts, 3)).toBe('a');
  });

  it('returns empty string when no prompts', () => {
    expect(selectIdentityProbePrompt([], 0)).toBe('');
  });
});

