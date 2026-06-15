// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  classifyUserIntent,
  buildTopicState,
  resolvePronouns,
  parseTopicLock,
  formatTopicLockInstruction,
  extractUserMentionedNames,
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
