#!/usr/bin/env node

import GON from '../lib/index.js'

// Performance test utilities
const measureTime = (fn, iterations = 1000) => {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = performance.now()
  return (end - start) / iterations
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

// Run benchmarks and collect metrics
const runBenchmarks = () => {
  const results = {
    timestamp: new Date().toISOString(),
    parse: {},
    stringify: {},
    comparison: {}
  }

  // Parse benchmarks
  Object.entries(testData).forEach(([name, data]) => {
    const parseTime = measureTime(() => GON.parse(data.gon), 1000)
    const stringifyTime = measureTime(() => GON.stringify(data.object), 1000)
    
    results.parse[name] = parseTime
    results.stringify[name] = stringifyTime
  })

  // JSON comparison
  const jsonString = JSON.stringify(testData.simple.object)
  const gonParseTime = measureTime(() => GON.parse(testData.simple.gon), 1000)
  const jsonParseTime = measureTime(() => JSON.parse(jsonString), 1000)
  const gonStringifyTime = measureTime(() => GON.stringify(testData.simple.object), 1000)
  const jsonStringifyTime = measureTime(() => JSON.stringify(testData.simple.object), 1000)

  results.comparison = {
    parse_ratio: gonParseTime / jsonParseTime,
    stringify_ratio: gonStringifyTime / jsonStringifyTime
  }

  return results
}

// Main execution
const results = runBenchmarks()

// Output for GitHub Actions
console.log('=== BENCHMARK RESULTS ===')
console.log(JSON.stringify(results, null, 2))

// Also output in a format that can be parsed by shell scripts
console.log('\n=== SHELL-PARSEABLE OUTPUT ===')
console.log(`parse_simple: ${results.parse.simple}`)
console.log(`parse_complex: ${results.parse.complex}`)
console.log(`parse_large: ${results.parse.large}`)
console.log(`stringify_simple: ${results.stringify.simple}`)
console.log(`stringify_complex: ${results.stringify.complex}`)
console.log(`stringify_large: ${results.stringify.large}`)
console.log(`gon_vs_json_parse_ratio: ${results.comparison.parse_ratio}`)
console.log(`gon_vs_json_stringify_ratio: ${results.comparison.stringify_ratio}`)

export { runBenchmarks } 