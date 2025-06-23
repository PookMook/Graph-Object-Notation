#!/usr/bin/env node

import GON from '../lib/index.js'

// Benchmark utilities
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
        ${Array.from({ length: 100 }, (_, i) => `{"id":${i},"name":"User${i}","email":"user${i}@example.com","active":${i % 2 === 0},"score":${Math.random() * 100}}`).join(',')}
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

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  parse: { simple: 0.1, complex: 0.5, large: 2.0 },
  stringify: { simple: 0.1, complex: 0.5, large: 2.0 }
}

// Benchmark functions
const benchmarkParse = () => {
  console.log('\n=== Parse Performance Benchmarks ===')
  
  Object.entries(testData).forEach(([name, data]) => {
    const avgTime = measureTime(() => GON.parse(data.gon), 1000)
    const threshold = PERFORMANCE_THRESHOLDS.parse[name]
    const status = avgTime < threshold ? '✅ PASS' : '❌ FAIL'
    
    console.log(`${name.padEnd(10)}: ${avgTime.toFixed(4)}ms average ${status}`)
    console.log(`  Threshold: ${threshold}ms`)
  })
}

const benchmarkStringify = () => {
  console.log('\n=== Stringify Performance Benchmarks ===')
  
  Object.entries(testData).forEach(([name, data]) => {
    const avgTime = measureTime(() => GON.stringify(data.object), 1000)
    const threshold = PERFORMANCE_THRESHOLDS.stringify[name]
    const status = avgTime < threshold ? '✅ PASS' : '❌ FAIL'
    
    console.log(`${name.padEnd(10)}: ${avgTime.toFixed(4)}ms average ${status}`)
    console.log(`  Threshold: ${threshold}ms`)
  })
}

const benchmarkMemory = () => {
  console.log('\n=== Memory Usage Benchmarks ===')
  
  Object.entries(testData).forEach(([name, data]) => {
    const parseMemory = measureMemory(() => GON.parse(data.gon))
    const stringifyMemory = measureMemory(() => GON.stringify(data.object))
    
    console.log(`${name.padEnd(10)} Parse:  ${parseMemory.heapUsed} bytes heap, ${parseMemory.heapTotal} bytes total`)
    console.log(`${name.padEnd(10)} Stringify: ${stringifyMemory.heapUsed} bytes heap, ${stringifyMemory.heapTotal} bytes total`)
  })
}

const benchmarkComparison = () => {
  console.log('\n=== GON vs JSON Performance Comparison ===')
  
  const jsonString = JSON.stringify(testData.simple.object)
  
  const gonParseTime = measureTime(() => GON.parse(testData.simple.gon), 1000)
  const jsonParseTime = measureTime(() => JSON.parse(jsonString), 1000)
  const gonStringifyTime = measureTime(() => GON.stringify(testData.simple.object), 1000)
  const jsonStringifyTime = measureTime(() => JSON.stringify(testData.simple.object), 1000)
  
  console.log(`Parse Performance:`)
  console.log(`  GON:  ${gonParseTime.toFixed(4)}ms`)
  console.log(`  JSON: ${jsonParseTime.toFixed(4)}ms`)
  console.log(`  Ratio: ${(gonParseTime / jsonParseTime).toFixed(2)}x slower`)
  
  console.log(`Stringify Performance:`)
  console.log(`  GON:  ${gonStringifyTime.toFixed(4)}ms`)
  console.log(`  JSON: ${jsonStringifyTime.toFixed(4)}ms`)
  console.log(`  Ratio: ${(gonStringifyTime / jsonStringifyTime).toFixed(2)}x slower`)
}

const benchmarkStress = () => {
  console.log('\n=== Stress Tests ===')
  
  const iterations = 10000
  
  // High-frequency parse
  const parseStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    GON.parse(testData.simple.gon)
  }
  const parseTime = performance.now() - parseStart
  const avgParseTime = parseTime / iterations
  
  // High-frequency stringify
  const stringifyStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    GON.stringify(testData.simple.object)
  }
  const stringifyTime = performance.now() - stringifyStart
  const avgStringifyTime = stringifyTime / iterations
  
  console.log(`High-frequency parse (${iterations} iterations):`)
  console.log(`  Total time: ${parseTime.toFixed(2)}ms`)
  console.log(`  Average time: ${avgParseTime.toFixed(4)}ms`)
  console.log(`  Operations/sec: ${(iterations / (parseTime / 1000)).toFixed(0)}`)
  
  console.log(`High-frequency stringify (${iterations} iterations):`)
  console.log(`  Total time: ${stringifyTime.toFixed(2)}ms`)
  console.log(`  Average time: ${avgStringifyTime.toFixed(4)}ms`)
  console.log(`  Operations/sec: ${(iterations / (stringifyTime / 1000)).toFixed(0)}`)
}

const benchmarkRegression = () => {
  console.log('\n=== Regression Detection ===')
  
  const iterations = 1000
  const runs = 10
  
  // Parse regression test
  const parseTimes = []
  for (let i = 0; i < runs; i++) {
    const time = measureTime(() => GON.parse(testData.complex.gon), iterations)
    parseTimes.push(time)
  }
  
  const avgParseTime = parseTimes.reduce((a, b) => a + b, 0) / parseTimes.length
  const maxParseTime = Math.max(...parseTimes)
  const minParseTime = Math.min(...parseTimes)
  const parseConsistency = maxParseTime / minParseTime
  
  // Stringify regression test
  const stringifyTimes = []
  for (let i = 0; i < runs; i++) {
    const time = measureTime(() => GON.stringify(testData.complex.object), iterations)
    stringifyTimes.push(time)
  }
  
  const avgStringifyTime = stringifyTimes.reduce((a, b) => a + b, 0) / stringifyTimes.length
  const maxStringifyTime = Math.max(...stringifyTimes)
  const minStringifyTime = Math.min(...stringifyTimes)
  const stringifyConsistency = maxStringifyTime / minStringifyTime
  
  console.log(`Parse consistency (${runs} runs):`)
  console.log(`  Average: ${avgParseTime.toFixed(4)}ms`)
  console.log(`  Min: ${minParseTime.toFixed(4)}ms`)
  console.log(`  Max: ${maxParseTime.toFixed(4)}ms`)
  console.log(`  Consistency: ${parseConsistency.toFixed(2)}x (max/min ratio)`)
  
  console.log(`Stringify consistency (${runs} runs):`)
  console.log(`  Average: ${avgStringifyTime.toFixed(4)}ms`)
  console.log(`  Min: ${minStringifyTime.toFixed(4)}ms`)
  console.log(`  Max: ${maxStringifyTime.toFixed(4)}ms`)
  console.log(`  Consistency: ${stringifyConsistency.toFixed(2)}x (max/min ratio)`)
}

// Main benchmark runner
const runBenchmarks = () => {
  console.log('🚀 GON Performance Benchmarks')
  console.log('==============================')
  
  benchmarkParse()
  benchmarkStringify()
  benchmarkMemory()
  benchmarkComparison()
  benchmarkStress()
  benchmarkRegression()
  
  console.log('\n✅ Benchmarks completed!')
}

// Run benchmarks if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarks()
}

export { runBenchmarks, benchmarkParse, benchmarkStringify, benchmarkMemory, benchmarkComparison, benchmarkStress, benchmarkRegression } 