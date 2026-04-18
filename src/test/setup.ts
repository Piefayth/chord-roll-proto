import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

// Persistent document state leaks between tests through localStorage. Clear it
// so each test sees a fresh DocumentProvider.
beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});
