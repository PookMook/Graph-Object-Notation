# Test Improvement System

This project uses a sophisticated test improvement tracking system that allows gradual development while maintaining code quality. The system tracks which tests are passing and failing, and allows PRs to be merged when improvements are being made.

## How It Works

### Test Status Tracking

The system maintains a baseline file (`test/test-status-baseline.json`) that tracks the status of all tests:

```json
{
  "test_status": {
    "parse.test.js": {
      "total": 10,
      "passing": 10,
      "failing": 0,
      "tests": {
        "Parsing strings": "passed",
        "Parsing date": "passed"
        // ... more tests
      }
    }
  }
}
```

### Improvement Criteria

A PR can be merged if it meets these criteria:

1. **No significant regressions**: At least 90% of previously passing tests must still pass
2. **Improvement ratio**: For every new failing test, there must be at least 2 new passing tests
3. **Performance maintained**: No significant performance regressions

### Test Categories

#### Core Tests (Must Pass)

- `parse.test.js` - Basic parsing functionality
- `stringify.test.js` - Basic stringification functionality
- `golden-strings.test.js` - Comprehensive feature tests
- `performance.test.js` - Performance benchmarks

#### Improvement Tests (Can Fail Initially)

- `improvements.test.js` - Advanced features and edge cases

## Adding New Tests

### 1. Create Failing Tests First

When adding new features, start by creating tests that fail:

```javascript
test("New feature test", () => {
  const result = someNewFeature();
  expect(result).toBe(expectedValue); // This will fail initially
});
```

### 2. Update the Baseline

Add your new test to the baseline as failing:

```json
{
  "tests": {
    "New feature test": "failed"
  }
}
```

### 3. Implement the Feature

Gradually implement the feature until the test passes.

### 4. Update Baseline on Main Branch

When merged to main, the baseline will be automatically updated with the new passing status.

## CI Workflow

The GitHub Actions workflow:

1. **Runs all tests** and captures results
2. **Compares with baseline** to determine improvements
3. **Checks performance** for regressions
4. **Allows/denies merge** based on improvement criteria
5. **Updates baseline** when merged to main

## Example Workflow

### Scenario 1: Adding New Features

```
Initial state: 10 passing tests, 0 failing
Add 5 new failing tests → 10 passing, 5 failing
Fix 3 tests → 13 passing, 2 failing
Result: Can merge (3 new passing vs 2 new failing = 1.5 ratio)
```

### Scenario 2: Regression Prevention

```
Initial state: 10 passing tests
Break 2 existing tests → 8 passing, 2 failing
Result: Cannot merge (regression ratio = 20% > 10% threshold)
```

### Scenario 3: Gradual Improvement

```
Initial state: 10 passing, 5 failing
Fix 1 failing test → 11 passing, 4 failing
Add 2 new failing tests → 11 passing, 6 failing
Result: Cannot merge (1 new passing vs 2 new failing = 0.5 ratio)
Fix 1 more test → 12 passing, 5 failing
Result: Can merge (2 new passing vs 2 new failing = 1.0 ratio, but 2 > 1)
```

## Configuration

The improvement thresholds can be configured in the baseline file:

```json
{
  "improvement_threshold": {
    "new_passing_ratio": 2.0, // New passing tests must be 2x new failing
    "max_regression_ratio": 0.1 // Max 10% regression allowed
  }
}
```

## Best Practices

1. **Start with failing tests** - Write tests for features you want to implement
2. **Small incremental changes** - Fix one or two tests at a time
3. **Monitor the baseline** - Keep track of which tests are passing/failing
4. **Document new features** - Update documentation when tests pass
5. **Performance matters** - Don't sacrifice performance for features

## Troubleshooting

### CI Failing Due to Test Improvements

If your PR is failing the test improvement check:

1. Check the test summary in the PR comment
2. Ensure you're not breaking existing tests
3. Add more passing tests or fix more failing tests
4. Consider if the feature is ready for implementation

### Updating the Baseline Manually

If you need to update the baseline manually:

```bash
# Update baseline with current test results
bun test/test-runner.js --update-baseline
```

### Adding New Test Files

When adding a new test file:

1. Add it to the baseline with all tests marked as "failed"
2. Gradually implement features to make tests pass
3. The baseline will be updated automatically on main branch

## Benefits

This system provides:

- **Gradual development** - You can work on features incrementally
- **Quality maintenance** - Prevents significant regressions
- **Clear progress tracking** - See exactly which tests are passing/failing
- **Performance protection** - Maintains performance standards
- **Team collaboration** - Multiple developers can work on different features

## Example: Working on Date Features

1. **Add failing tests** to `improvements.test.js`:

   ```javascript
   test("Parse ISO date with timezone", () => {
     const input = `{"date":|2023-12-17T12:00:00.000+01:00|}`;
     const result = GON.parse(input);
     expect(result.date.toISOString()).toBe("2023-12-17T11:00:00.000Z");
   });
   ```

2. **Update baseline** to mark test as failing

3. **Implement timezone support** in the parser

4. **Test passes** → baseline updated on main

5. **Repeat** for next feature

This approach ensures steady progress while maintaining code quality and preventing regressions.
