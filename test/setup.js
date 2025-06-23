// Test setup for Bun
import { expect, test, describe } from "bun:test";

// Make test utilities globally available
global.expect = expect;
global.test = test;
global.describe = describe;

// Add Jest-like matchers for compatibility
expect.extend({
  toBeInstanceOf(received, constructor) {
    const pass = received instanceof constructor;
    return {
      pass,
      message: () => `expected ${received} to be instance of ${constructor.name}`,
    };
  },
});

// Add custom matchers
expect.toBeInstanceOf = function(constructor) {
  return this.toBeInstanceOf(constructor);
}; 