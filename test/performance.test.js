import GON from '../lib/index.js'

// Performance test utilities
const measureTime = (fn, iterations = 1000) => {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = performance.now()
  return (end - start) / iterations // Average time per iteration
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

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  parse: {
    simple: 0.1,
    complex: 0.5,
    large: 2.0
  },
  stringify: {
    simple: 0.1,
    complex: 0.5,
    large: 2.0
  }
}

describe('Performance Tests', () => {
  describe('Parse Performance', () => {
    Object.entries(testData).forEach(([name, data]) => {
      test(`Parse ${name} data performance`, () => {
        const avgTime = measureTime(() => GON.parse(data.gon), 1000)
        
        console.log(`Parse ${name}: ${avgTime.toFixed(4)}ms average`)
        
        // Performance assertion
        expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.parse[name])
        
        // Correctness check
        const result = GON.parse(data.gon)
        expect(result).toBeDefined()
      })
    })

    test('Parse performance regression detection', () => {
      const iterations = 1000
      const times = []
      
      for (let i = 0; i < 10; i++) {
        const time = measureTime(() => GON.parse(testData.complex.gon), iterations)
        times.push(time)
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      const maxTime = Math.max(...times)
      const minTime = Math.min(...times)
      
      console.log(`Parse regression test: avg=${avgTime.toFixed(4)}ms, min=${minTime.toFixed(4)}ms, max=${maxTime.toFixed(4)}ms`)
      
      // Check for consistency (max should not be more than 3x min)
      expect(maxTime / minTime).toBeLessThan(3)
      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.parse.complex)
    })
  })

  describe('Stringify Performance', () => {
    Object.entries(testData).forEach(([name, data]) => {
      test(`Stringify ${name} data performance`, () => {
        const avgTime = measureTime(() => GON.stringify(data.object), 1000)
        
        console.log(`Stringify ${name}: ${avgTime.toFixed(4)}ms average`)
        
        // Performance assertion
        expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.stringify[name])
        
        // Correctness check
        const result = GON.stringify(data.object)
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)
      })
    })

    test('Stringify performance regression detection', () => {
      const iterations = 1000
      const times = []
      
      for (let i = 0; i < 10; i++) {
        const time = measureTime(() => GON.stringify(testData.complex.object), iterations)
        times.push(time)
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      const maxTime = Math.max(...times)
      const minTime = Math.min(...times)
      
      console.log(`Stringify regression test: avg=${avgTime.toFixed(4)}ms, min=${minTime.toFixed(4)}ms, max=${maxTime.toFixed(4)}ms`)
      
      // Check for consistency (max should not be more than 3x min)
      expect(maxTime / minTime).toBeLessThan(3)
      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.stringify.complex)
    })
  })

  describe('Memory Usage', () => {
    test('Parse memory usage', () => {
      const memory = measureMemory(() => GON.parse(testData.large.gon))
      
      console.log(`Parse memory usage: heapUsed=${memory.heapUsed} bytes, heapTotal=${memory.heapTotal} bytes`)
      
      // Memory usage should be reasonable (less than 1MB for large data)
      expect(memory.heapUsed).toBeLessThan(1024 * 1024)
      expect(memory.result).toBeDefined()
    })

    test('Stringify memory usage', () => {
      const memory = measureMemory(() => GON.stringify(testData.large.object))
      
      console.log(`Stringify memory usage: heapUsed=${memory.heapUsed} bytes, heapTotal=${memory.heapTotal} bytes`)
      
      // Memory usage should be reasonable (less than 1MB for large data)
      expect(memory.heapUsed).toBeLessThan(1024 * 1024)
      expect(typeof memory.result).toBe('string')
    })
  })

  describe('Round-trip Performance', () => {
    test('Parse -> Stringify round-trip performance', () => {
      const avgTime = measureTime(() => {
        const parsed = GON.parse(testData.complex.gon)
        return GON.stringify(parsed)
      }, 500)
      
      console.log(`Round-trip performance: ${avgTime.toFixed(4)}ms average`)
      
      expect(avgTime).toBeLessThan(1.0) // Should be less than 1ms for round-trip
    })

    test('Stringify -> Parse round-trip performance', () => {
      const avgTime = measureTime(() => {
        const stringified = GON.stringify(testData.complex.object)
        return GON.parse(stringified)
      }, 500)
      
      console.log(`Reverse round-trip performance: ${avgTime.toFixed(4)}ms average`)
      
      expect(avgTime).toBeLessThan(1.0) // Should be less than 1ms for round-trip
    })
  })

  describe('Comparison with JSON', () => {
    test('GON vs JSON parse performance', () => {
      const jsonString = JSON.stringify(testData.simple.object)
      
      const gonTime = measureTime(() => GON.parse(testData.simple.gon), 1000)
      const jsonTime = measureTime(() => JSON.parse(jsonString), 1000)
      
      console.log(`GON parse: ${gonTime.toFixed(4)}ms, JSON parse: ${jsonTime.toFixed(4)}ms`)
      console.log(`GON is ${(gonTime / jsonTime).toFixed(2)}x slower than JSON`)
      
      // GON should not be more than 10x slower than JSON for simple data
      expect(gonTime / jsonTime).toBeLessThan(10)
    })

    test('GON vs JSON stringify performance', () => {
      const gonTime = measureTime(() => GON.stringify(testData.simple.object), 1000)
      const jsonTime = measureTime(() => JSON.stringify(testData.simple.object), 1000)
      
      console.log(`GON stringify: ${gonTime.toFixed(4)}ms, JSON stringify: ${jsonTime.toFixed(4)}ms`)
      console.log(`GON is ${(gonTime / jsonTime).toFixed(2)}x slower than JSON`)
      
      // GON should not be more than 10x slower than JSON for simple data
      expect(gonTime / jsonTime).toBeLessThan(10)
    })
  })

  describe('Stress Tests', () => {
    test('High-frequency parsing', () => {
      const iterations = 10000
      const start = performance.now()
      
      for (let i = 0; i < iterations; i++) {
        GON.parse(testData.simple.gon)
      }
      
      const totalTime = performance.now() - start
      const avgTime = totalTime / iterations
      
      console.log(`High-frequency parse: ${avgTime.toFixed(4)}ms average for ${iterations} iterations`)
      
      expect(avgTime).toBeLessThan(0.1) // Should be very fast for simple data
    })

    test('High-frequency stringifying', () => {
      const iterations = 10000
      const start = performance.now()
      
      for (let i = 0; i < iterations; i++) {
        GON.stringify(testData.simple.object)
      }
      
      const totalTime = performance.now() - start
      const avgTime = totalTime / iterations
      
      console.log(`High-frequency stringify: ${avgTime.toFixed(4)}ms average for ${iterations} iterations`)
      
      expect(avgTime).toBeLessThan(0.1) // Should be very fast for simple data
    })
  })
}) 