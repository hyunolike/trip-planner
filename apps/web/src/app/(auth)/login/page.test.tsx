import { isValidElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/auth/LoginForm', () => ({ LoginForm: () => null }));

import LoginPage from './page';

describe('login page', () => {
  it('does not mount a second form as the Suspense fallback', () => {
    const element = LoginPage({ searchParams: Promise.resolve({}) });
    expect(isValidElement(element)).toBe(true);
    expect(element.props.fallback).toBeNull();
  });
});
