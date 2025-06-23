#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const shouldUpdateBaseline = args.includes('--update-baseline');
const shouldCheckImprovements = args.includes('--check-improvements');

// Load baseline
function loadBaseline() {
  try {
    const baselinePath = path.join(process.cwd(), 'test', 'test-status-baseline.json');
    if (fs.existsSync(baselinePath)) {
      return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading baseline:', error.message);
  }
  return null;
}

// Run tests and capture results
function runTests() {
  return new Promise((resolve, reject) => {
    const testProcess = spawn('bun', ['test'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let stdout = '';
    let stderr = '';

    testProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    testProcess.on('close', (code) => {
      // Parse the test output to extract results
      const results = parseTestOutput(stdout, stderr, code);
      resolve(results);
    });

    testProcess.on('error', (error) => {
      reject(new Error(`Failed to run tests: ${error.message}`));
    });
  });
}

// Parse Bun test output to extract test results
function parseTestOutput(stdout, stderr, exitCode) {
  const lines = stdout.split('\n');
  const testResults = {
    testResults: [],
    success: exitCode === 0
  };

  let currentFile = null;
  let currentTests = [];

  for (const line of lines) {
    // Look for test file paths
    if (line.includes('.test.js') && line.includes('running')) {
      if (currentFile) {
        testResults.testResults.push({
          testFilePath: currentFile,
          testResults: currentTests,
          numPassingTests: currentTests.filter(t => t.status === 'passed').length,
          numFailingTests: currentTests.filter(t => t.status === 'failed').length
        });
      }
      currentFile = line.split('running')[0].trim();
      currentTests = [];
    }
    
    // Look for test results (pass/fail)
    if (line.includes('✓') || line.includes('✗')) {
      const testName = line.replace(/[✓✗]/g, '').trim();
      const status = line.includes('✓') ? 'passed' : 'failed';
      currentTests.push({
        title: testName,
        status: status
      });
    }
  }

  // Add the last file
  if (currentFile) {
    testResults.testResults.push({
      testFilePath: currentFile,
      testResults: currentTests,
      numPassingTests: currentTests.filter(t => t.status === 'passed').length,
      numFailingTests: currentTests.filter(t => t.status === 'failed').length
    });
  }

  return testResults;
}

// Parse test results into our format
function parseTestResults(results) {
  const testStatus = {};
  
  for (const testFile of results.testResults) {
    const fileName = path.basename(testFile.testFilePath);
    const fileStatus = {
      total: testFile.numPassingTests + testFile.numFailingTests,
      passing: testFile.numPassingTests,
      failing: testFile.numFailingTests,
      tests: {}
    };

    for (const testCase of testFile.testResults) {
      fileStatus.tests[testCase.title] = testCase.status;
    }

    testStatus[fileName] = fileStatus;
  }

  return testStatus;
}

// Compare current results with baseline
function compareWithBaseline(currentResults, baseline) {
  if (!baseline) {
    console.log('No baseline found, treating all tests as new');
    return {
      canMerge: true,
      reason: 'No baseline found',
      summary: {
        previouslyPassing: 0,
        stillPassing: 0,
        newlyPassing: 0,
        newlyFailing: 0,
        regressions: 0
      }
    };
  }

  const baselineStatus = baseline.test_status;
  const improvementThreshold = baseline.improvement_threshold;
  
  let previouslyPassing = 0;
  let stillPassing = 0;
  let newlyPassing = 0;
  let newlyFailing = 0;
  let regressions = 0;

  // Check each test file
  for (const [fileName, currentFile] of Object.entries(currentResults)) {
    const baselineFile = baselineStatus[fileName];
    
    if (!baselineFile) {
      // New test file
      newlyPassing += currentFile.passing;
      newlyFailing += currentFile.failing;
      continue;
    }

    // Check each test in the file
    for (const [testName, currentStatus] of Object.entries(currentFile.tests)) {
      const baselineStatus = baselineFile.tests[testName];
      
      if (!baselineStatus) {
        // New test
        if (currentStatus === 'passed') {
          newlyPassing++;
        } else {
          newlyFailing++;
        }
      } else if (baselineStatus === 'passed') {
        // Previously passing test
        previouslyPassing++;
        if (currentStatus === 'passed') {
          stillPassing++;
        } else {
          regressions++;
        }
      } else {
        // Previously failing test
        if (currentStatus === 'passed') {
          newlyPassing++;
        } else {
          // Still failing, not counted as regression
        }
      }
    }
  }

  // Check if we can merge based on improvement criteria
  const canMerge = checkImprovementCriteria(
    previouslyPassing, stillPassing, newlyPassing, newlyFailing, regressions, improvementThreshold
  );

  return {
    canMerge,
    reason: canMerge ? 'Improvements detected' : 'Too many regressions or insufficient improvements',
    summary: {
      previouslyPassing,
      stillPassing,
      newlyPassing,
      newlyFailing,
      regressions
    }
  };
}

// Check if improvements meet the criteria
function checkImprovementCriteria(previouslyPassing, stillPassing, newlyPassing, newlyFailing, regressions, threshold) {
  // All previously passing tests must still pass (with small tolerance)
  const regressionRatio = previouslyPassing > 0 ? regressions / previouslyPassing : 0;
  if (regressionRatio > threshold.max_regression_ratio) {
    return false;
  }

  // New passing tests should be at least 2x the new failing tests
  if (newlyFailing > 0 && newlyPassing / newlyFailing < threshold.new_passing_ratio) {
    return false;
  }

  return true;
}

// Update baseline with current results
function updateBaseline(currentResults) {
  const baseline = loadBaseline() || {
    timestamp: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || 'unknown',
    improvement_threshold: {
      new_passing_ratio: 2.0,
      max_regression_ratio: 0.1
    }
  };

  baseline.timestamp = new Date().toISOString();
  baseline.commit = process.env.GITHUB_SHA || 'unknown';
  baseline.test_status = currentResults;

  const baselinePath = path.join(process.cwd(), 'test', 'test-status-baseline.json');
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
  console.log('Baseline updated');
}

// Main execution
async function main() {
  try {
    console.log('Running tests...');
    const testResults = await runTests();
    const parsedResults = parseTestResults(testResults);
    
    if (shouldUpdateBaseline) {
      updateBaseline(parsedResults);
      return;
    }

    if (shouldCheckImprovements) {
      const baseline = loadBaseline();
      const comparison = compareWithBaseline(parsedResults, baseline);
      
      console.log('Test Improvement Analysis:');
      console.log('========================');
      console.log(`Previously passing tests: ${comparison.summary.previouslyPassing}`);
      console.log(`Still passing: ${comparison.summary.stillPassing}`);
      console.log(`Newly passing: ${comparison.summary.newlyPassing}`);
      console.log(`Newly failing: ${comparison.summary.newlyFailing}`);
      console.log(`Regressions: ${comparison.summary.regressions}`);
      console.log('');
      console.log(`Can merge: ${comparison.canMerge ? 'YES' : 'NO'}`);
      console.log(`Reason: ${comparison.reason}`);
      
      // Set GitHub Actions outputs
      if (process.env.GITHUB_OUTPUT) {
        const output = process.env.GITHUB_OUTPUT;
        fs.appendFileSync(output, `can_merge=${comparison.canMerge}\n`);
        fs.appendFileSync(output, `reason=${comparison.reason}\n`);
        fs.appendFileSync(output, `previously_passing=${comparison.summary.previouslyPassing}\n`);
        fs.appendFileSync(output, `still_passing=${comparison.summary.stillPassing}\n`);
        fs.appendFileSync(output, `newly_passing=${comparison.summary.newlyPassing}\n`);
        fs.appendFileSync(output, `newly_failing=${comparison.summary.newlyFailing}\n`);
        fs.appendFileSync(output, `regressions=${comparison.summary.regressions}\n`);
      }
      
      // Exit with appropriate code
      process.exit(comparison.canMerge ? 0 : 1);
    }

    // Default: just run tests normally
    console.log('Tests completed successfully');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 