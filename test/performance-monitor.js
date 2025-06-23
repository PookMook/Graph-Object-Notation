import fs from 'fs'
import path from 'path'
import GON from '../lib/index.js'

// Performance monitoring utilities
const measureTime = (fn, iterations = 1000) => {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = performance.now()
  return (end - start) / iterations
}

const measureMemory = (fn) => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const before = process.memoryUsage()
    const result = fn()
    const after = process.memoryUsage()
    return {
      result,
      heapUsed: after.heapUsed - before.heapUsed,
      heapTotal: after.heapTotal - before.heapTotal,
      external: after.external - before.external
    }
  }
  return { result: fn() }
}

// Test data sets
const testData = {
  simple: {
    gon: `{"string":"hello","number":42,"boolean":true,"null":null}`,
    object: { string: "hello", number: 42, boolean: true, null: null }
  },
  complex: {
    gon: `{
      "string":"hello world",
      "date":|2019-12-18T12:00:00.000Z|,
      "int":42,
      "bigInt":42n,
      "symbol":±test±,
      "null":null,
      "array":[1,2,3,{"nested":"value"}],
      "object":{"name":"Arthur","age":30},
      "reference":@object@
    }`,
    object: {
      string: "hello world",
      date: new Date("2019-12-18T12:00:00.000Z"),
      int: 42,
      bigInt: BigInt(42),
      symbol: Symbol.for('test'),
      null: null,
      array: [1, 2, 3, { nested: "value" }],
      object: { name: "Arthur", age: 30 }
    }
  },
  large: {
    gon: `{
      "users":[
        ${Array.from({ length: 100 }, (_, i) => `{"id":${i},"name":"User${i},"email":"user${i}@example.com","active":${i % 2 === 0},"score":${Math.random() * 100}}`).join(',')}
      ],
      "metadata":{"total":100,"page":1,"limit":50},
      "references":{
        ${Array.from({ length: 10 }, (_, i) => `"ref${i}":@users[${i * 10}]@`).join(',')}
      }
    }`,
    object: {
      users: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `User${i}`,
        email: `user${i}@example.com`,
        active: i % 2 === 0,
        score: Math.random() * 100
      })),
      metadata: { total: 100, page: 1, limit: 50 }
    }
  }
}

// Performance metrics collection
const collectMetrics = () => {
  const metrics = {
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    tests: {}
  }

  // Collect parse metrics
  Object.entries(testData).forEach(([name, data]) => {
    const parseTime = measureTime(() => GON.parse(data.gon), 1000)
    const stringifyTime = measureTime(() => GON.stringify(data.object), 1000)
    const parseMemory = measureMemory(() => GON.parse(data.gon))
    const stringifyMemory = measureMemory(() => GON.stringify(data.object))

    metrics.tests[name] = {
      parse: {
        time: parseTime,
        memory: parseMemory.heapUsed
      },
      stringify: {
        time: stringifyTime,
        memory: stringifyMemory.heapUsed
      }
    }
  })

  // Collect comparison metrics
  const jsonString = JSON.stringify(testData.simple.object)
  const gonParseTime = measureTime(() => GON.parse(testData.simple.gon), 1000)
  const jsonParseTime = measureTime(() => JSON.parse(jsonString), 1000)
  const gonStringifyTime = measureTime(() => GON.stringify(testData.simple.object), 1000)
  const jsonStringifyTime = measureTime(() => JSON.stringify(testData.simple.object), 1000)

  metrics.comparison = {
    parse: {
      gon: gonParseTime,
      json: jsonParseTime,
      ratio: gonParseTime / jsonParseTime
    },
    stringify: {
      gon: gonStringifyTime,
      json: jsonStringifyTime,
      ratio: gonStringifyTime / jsonStringifyTime
    }
  }

  return metrics
}

// Performance history management
const getHistoryPath = () => path.join(process.cwd(), 'test', 'performance-history.json')

const loadHistory = () => {
  const historyPath = getHistoryPath()
  if (fs.existsSync(historyPath)) {
    try {
      return JSON.parse(fs.readFileSync(historyPath, 'utf8'))
    } catch (error) {
      console.warn('Failed to load performance history:', error.message)
      return []
    }
  }
  return []
}

const saveHistory = (history) => {
  const historyPath = getHistoryPath()
  try {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2))
  } catch (error) {
    console.error('Failed to save performance history:', error.message)
  }
}

const addMetrics = (metrics) => {
  const history = loadHistory()
  history.push(metrics)
  
  // Keep only last 100 entries
  if (history.length > 100) {
    history.splice(0, history.length - 100)
  }
  
  saveHistory(history)
  return history
}

// Regression detection
const detectRegressions = (currentMetrics, history) => {
  if (history.length < 2) return []

  const regressions = []
  const recentMetrics = history.slice(-5) // Last 5 entries
  const baselineMetrics = history.slice(-10, -5) // Previous 5 entries

  if (baselineMetrics.length === 0) return regressions

  // Calculate baseline averages
  const baseline = {}
  Object.keys(currentMetrics.tests).forEach(testName => {
    baseline[testName] = {
      parse: { time: 0, memory: 0 },
      stringify: { time: 0, memory: 0 }
    }
    
    baselineMetrics.forEach(metric => {
      if (metric.tests[testName]) {
        baseline[testName].parse.time += metric.tests[testName].parse.time
        baseline[testName].parse.memory += metric.tests[testName].parse.memory
        baseline[testName].stringify.time += metric.tests[testName].stringify.time
        baseline[testName].stringify.memory += metric.tests[testName].stringify.memory
      }
    })
    
    const count = baselineMetrics.length
    baseline[testName].parse.time /= count
    baseline[testName].parse.memory /= count
    baseline[testName].stringify.time /= count
    baseline[testName].stringify.memory /= count
  })

  // Check for regressions (20% threshold)
  const threshold = 1.2
  Object.entries(currentMetrics.tests).forEach(([testName, current]) => {
    const base = baseline[testName]
    if (!base) return

    if (current.parse.time > base.parse.time * threshold) {
      regressions.push({
        test: testName,
        operation: 'parse',
        metric: 'time',
        current: current.parse.time,
        baseline: base.parse.time,
        degradation: ((current.parse.time / base.parse.time) - 1) * 100
      })
    }

    if (current.stringify.time > base.stringify.time * threshold) {
      regressions.push({
        test: testName,
        operation: 'stringify',
        metric: 'time',
        current: current.stringify.time,
        baseline: base.stringify.time,
        degradation: ((current.stringify.time / base.stringify.time) - 1) * 100
      })
    }

    if (current.parse.memory > base.parse.memory * threshold) {
      regressions.push({
        test: testName,
        operation: 'parse',
        metric: 'memory',
        current: current.parse.memory,
        baseline: base.parse.memory,
        degradation: ((current.parse.memory / base.parse.memory) - 1) * 100
      })
    }

    if (current.stringify.memory > base.stringify.memory * threshold) {
      regressions.push({
        test: testName,
        operation: 'stringify',
        metric: 'memory',
        current: current.stringify.memory,
        baseline: base.stringify.memory,
        degradation: ((current.stringify.memory / base.stringify.memory) - 1) * 100
      })
    }
  })

  return regressions
}

// Performance monitoring functions
const monitorPerformance = () => {
  console.log('📊 Collecting performance metrics...')
  
  const metrics = collectMetrics()
  const history = addMetrics(metrics)
  const regressions = detectRegressions(metrics, history)

  console.log(`✅ Metrics collected at ${metrics.timestamp}`)
  console.log(`📈 Performance history: ${history.length} entries`)

  if (regressions.length > 0) {
    console.log('\n⚠️  Performance regressions detected:')
    regressions.forEach(regression => {
      console.log(`  ${regression.test}.${regression.operation}.${regression.metric}: +${regression.degradation.toFixed(1)}%`)
    })
  } else {
    console.log('✅ No performance regressions detected')
  }

  return { metrics, history, regressions }
}

const generateReport = (metrics, history, regressions) => {
  const report = {
    summary: {
      timestamp: metrics.timestamp,
      version: metrics.version,
      totalTests: Object.keys(metrics.tests).length,
      regressions: regressions.length
    },
    current: metrics,
    trends: {
      parse: {},
      stringify: {}
    }
  }

  // Calculate trends
  if (history.length >= 5) {
    const recent = history.slice(-5)
    Object.keys(metrics.tests).forEach(testName => {
      const parseTimes = recent.map(h => h.tests[testName]?.parse?.time).filter(Boolean)
      const stringifyTimes = recent.map(h => h.tests[testName]?.stringify?.time).filter(Boolean)

      if (parseTimes.length > 0) {
        report.trends.parse[testName] = {
          average: parseTimes.reduce((a, b) => a + b, 0) / parseTimes.length,
          min: Math.min(...parseTimes),
          max: Math.max(...parseTimes)
        }
      }

      if (stringifyTimes.length > 0) {
        report.trends.stringify[testName] = {
          average: stringifyTimes.reduce((a, b) => a + b, 0) / stringifyTimes.length,
          min: Math.min(...stringifyTimes),
          max: Math.max(...stringifyTimes)
        }
      }
    })
  }

  return report
}

// CLI interface
const main = () => {
  const command = process.argv[2] || 'monitor'

  switch (command) {
    case 'monitor':
      const { metrics, history, regressions } = monitorPerformance()
      const report = generateReport(metrics, history, regressions)
      
      console.log('\n📋 Performance Report:')
      console.log(JSON.stringify(report, null, 2))
      break

    case 'history':
      const historyData = loadHistory()
      console.log(`📊 Performance history (${historyData.length} entries):`)
      historyData.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.timestamp} (v${entry.version})`)
      })
      break

    case 'clear':
      saveHistory([])
      console.log('🗑️  Performance history cleared')
      break

    default:
      console.log('Usage: node test/performance-monitor.js [monitor|history|clear]')
      console.log('  monitor - Collect current metrics and check for regressions')
      console.log('  history - Show performance history')
      console.log('  clear   - Clear performance history')
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { monitorPerformance, collectMetrics, detectRegressions, generateReport } 