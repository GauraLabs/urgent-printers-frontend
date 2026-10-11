import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// checkout.js never loads under jsdom; tests that need the real loader use vi.importActual.
vi.mock("@/lib/razorpay", () => ({ loadRazorpay: async () => true }));
