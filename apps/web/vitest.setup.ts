import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { resetCompletionStores } from '@/lib/trip/completion';

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCompletionStores();
});
