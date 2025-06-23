import GON from '../src/index.js'

// This test file contains tests that are intentionally failing
// They can be gradually fixed to demonstrate the improvement tracking system

describe('Gradual Improvements Tests', () => {
  
  describe('Feature 1: Enhanced Date Parsing', () => {
    test('Parse ISO date with timezone', () => {
      const input = `{"date":|2023-12-17T12:00:00.000+01:00|}`
      const result = GON.parse(input)
      expect(result.date.toISOString()).toBe("2023-12-17T11:00:00.000Z")
    })

    test('Parse date with milliseconds', () => {
      const input = `{"date":|2023-12-17T12:00:00.123Z|}`
      const result = GON.parse(input)
      expect(result.date.getMilliseconds()).toBe(123)
    })

    test('Parse relative dates', () => {
      const input = `{"date":|now|}`
      const result = GON.parse(input)
      expect(result.date).toBeInstanceOf(Date)
      expect(result.date.getTime()).toBeCloseTo(Date.now(), -2) // Within 100ms
    })
  })

  describe('Feature 2: Advanced Reference System', () => {
    test('Deep object references', () => {
      const input = `{
        "user": {"name": "Alice", "profile": {"age": 30}},
        "ref": @user.profile@
      }`
      const result = GON.parse(input)
      expect(result.ref).toBe(result.user.profile)
      expect(result.ref.age).toBe(30)
    })

    test('Array element references', () => {
      const input = `{
        "items": [{"id": 1}, {"id": 2}, {"id": 3}],
        "first": @items.0@,
        "last": @items.2@
      }`
      const result = GON.parse(input)
      expect(result.first).toBe(result.items[0])
      expect(result.last).toBe(result.items[2])
    })

    test('Cross-file references', () => {
      const input = `{
        "config": {"theme": "dark"},
        "user": {"preferences": @config@}
      }`
      const result = GON.parse(input)
      expect(result.user.preferences).toBe(result.config)
    })
  })

  describe('Feature 3: Extended Data Types', () => {
    test('Parse Map objects', () => {
      const input = `{"data":<{"key1":"value1","key2":"value2"}>}`
      const result = GON.parse(input)
      expect(result.data).toBeInstanceOf(Map)
      expect(result.data.get("key1")).toBe("value1")
      expect(result.data.get("key2")).toBe("value2")
    })

    test('Parse Set objects', () => {
      const input = `{"unique":{1,2,3,3,2,1}}`
      const result = GON.parse(input)
      expect(result.unique).toBeInstanceOf(Set)
      expect(result.unique.size).toBe(3)
      expect(result.unique.has(1)).toBe(true)
      expect(result.unique.has(2)).toBe(true)
      expect(result.unique.has(3)).toBe(true)
    })

    test('Parse RegExp objects', () => {
      const input = `{"pattern":/^[a-z]+$/i}`
      const result = GON.parse(input)
      expect(result.pattern).toBeInstanceOf(RegExp)
      expect(result.pattern.test("Hello")).toBe(true)
      expect(result.pattern.test("123")).toBe(false)
    })
  })

  describe('Feature 4: Error Handling', () => {
    test('Graceful handling of malformed dates', () => {
      const input = `{"date":|invalid-date|}`
      const result = GON.parse(input)
      expect(result.date).toBe(null) // Should return null for invalid dates
    })

    test('Graceful handling of invalid references', () => {
      const input = `{"ref":@nonexistent@}`
      const result = GON.parse(input)
      expect(result.ref).toBe(undefined) // Should return undefined for invalid refs
    })

    test('Graceful handling of circular references in stringify', () => {
      const obj = { name: "test" }
      obj.self = obj
      const result = GON.stringify(obj)
      expect(result).toContain('"self": @references.')
    })
  })

  describe('Feature 5: Performance Optimizations', () => {
    test('Large array parsing performance', () => {
      const largeArray = Array.from({length: 10000}, (_, i) => ({id: i, value: `item${i}`}))
      const input = GON.stringify(largeArray)
      const start = performance.now()
      const result = GON.parse(input)
      const end = performance.now()
      
      expect(result).toHaveLength(10000)
      expect(end - start).toBeLessThan(100) // Should parse in under 100ms
    })

    test('Deep object parsing performance', () => {
      const deepObj = {}
      let current = deepObj
      for (let i = 0; i < 1000; i++) {
        current.nested = { level: i }
        current = current.nested
      }
      
      const input = GON.stringify(deepObj)
      const start = performance.now()
      const result = GON.parse(input)
      const end = performance.now()
      
      expect(result.nested.nested.level).toBe(1)
      expect(end - start).toBeLessThan(50) // Should parse in under 50ms
    })
  })

  describe('Feature 6: Edge Cases', () => {
    test('Empty string parsing', () => {
      const input = `""`
      const result = GON.parse(input)
      expect(result).toBe("")
    })

    test('Whitespace handling', () => {
      const input = `{  "name"  :  "test"  ,  "value"  :  42  }`
      const result = GON.parse(input)
      expect(result.name).toBe("test")
      expect(result.value).toBe(42)
    })

    test('Unicode character handling', () => {
      const input = `{"emoji":"🚀","unicode":"测试","special":"\\u0041"}`
      const result = GON.parse(input)
      expect(result.emoji).toBe("🚀")
      expect(result.unicode).toBe("测试")
      expect(result.special).toBe("A")
    })
  })
}) 