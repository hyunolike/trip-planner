import { describe, expect, it } from 'vitest';
import { problemMessage } from './errors';

describe('problemMessage', () => {
  it('uses the server detail when there is one', () => {
    expect(problemMessage({ detail: '이메일 또는 비밀번호가 맞지 않아요.' }, 401)).toBe(
      '이메일 또는 비밀번호가 맞지 않아요.',
    );
  });

  it('falls back to a sentence per status', () => {
    expect(problemMessage(undefined, 429)).toBe('요청이 너무 많아요. 잠시 후 다시 시도해 주세요.');
    expect(problemMessage({}, 500)).toBe('잠시 문제가 생겼어요. 조금 뒤 다시 시도해 주세요.');
    expect(problemMessage(new TypeError('fetch failed'))).toBe(
      '연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.',
    );
  });
});
