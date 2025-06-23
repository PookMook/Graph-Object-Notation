import GON from '../src/index.js'

// Golden test strings for GON format
// These serve as comprehensive test cases covering all GON features

describe('GON Golden Test Strings', () => {
  
  describe('Basic JSON Superset Tests', () => {
    test('Simple JSON object', () => {
      const input = `{"name":"John","age":30,"active":true}`
      const result = GON.parse(input)
      expect(result).toEqual({
        name: "John",
        age: 30,
        active: true
      })
    })

    test('JSON with null and false', () => {
      const input = `{"nullValue":null,"falseValue":false,"emptyArray":[],"emptyObject":{}}`
      const result = GON.parse(input)
      expect(result).toEqual({
        nullValue: null,
        falseValue: false,
        emptyArray: [],
        emptyObject: {}
      })
    })

    test('Nested objects and arrays', () => {
      const input = `{
        "user": {
          "name": "Alice",
          "preferences": ["reading", "music", "travel"]
        },
        "metadata": {
          "created": "2023-01-01",
          "tags": ["important", "personal"]
        }
      }`
      const result = GON.parse(input)
      expect(result.user.name).toBe("Alice")
      expect(result.user.preferences).toEqual(["reading", "music", "travel"])
      expect(result.metadata.tags).toEqual(["important", "personal"])
    })
  })

  describe('Date Object Tests', () => {
    test('Single date', () => {
      const input = `{"created":|2023-12-17T12:00:00.000Z|}`
      const result = GON.parse(input)
      expect(result.created).toBeInstanceOf(Date)
      expect(result.created.toISOString()).toBe("2023-12-17T12:00:00.000Z")
    })

    test('Multiple dates', () => {
      const input = `{
        "startDate": |2023-01-01T00:00:00.000Z|,
        "endDate": |2023-12-31T23:59:59.999Z|,
        "updated": |2023-06-15T10:30:00.000Z|
      }`
      const result = GON.parse(input)
      expect(result.startDate.toISOString()).toBe("2023-01-01T00:00:00.000Z")
      expect(result.endDate.toISOString()).toBe("2023-12-31T23:59:59.999Z")
      expect(result.updated.toISOString()).toBe("2023-06-15T10:30:00.000Z")
    })
  })

  describe('BigInt Tests', () => {
    test('Single bigint', () => {
      const input = `{"largeNumber":42n}`
      const result = GON.parse(input)
      expect(result.largeNumber).toBe(BigInt(42))
      expect(typeof result.largeNumber).toBe("bigint")
    })

    test('Multiple bigints', () => {
      const input = `{
        "small": 1n,
        "large": 999999999999999999n,
        "zero": 0n
      }`
      const result = GON.parse(input)
      expect(result.small).toBe(BigInt(1))
      expect(result.large).toBe(BigInt("999999999999999999"))
      expect(result.zero).toBe(BigInt(0))
    })
  })

  describe('Symbol Tests', () => {
    test('Single symbol', () => {
      const input = `{"debug":±debug±}`
      const result = GON.parse(input)
      expect(result.debug).toBe(Symbol.for('debug'))
      expect(typeof result.debug).toBe("symbol")
    })

    test('Multiple symbols', () => {
      const input = `{
        "debug": ±debug±,
        "info": ±info±,
        "error": ±error±
      }`
      const result = GON.parse(input)
      expect(result.debug).toBe(Symbol.for('debug'))
      expect(result.info).toBe(Symbol.for('info'))
      expect(result.error).toBe(Symbol.for('error'))
    })
  })

  describe('Reference Tests', () => {
    test('Simple reference', () => {
      const input = `{
        "user": {"name": "Bob", "age": 25},
        "ref": @user@
      }`
      const result = GON.parse(input)
      expect(result.ref).toBe(result.user)
      expect(result.ref.name).toBe("Bob")
      expect(result.ref.age).toBe(25)
    })

    test('Circular reference', () => {
      const input = `{
        "parent": {
          "name": "Parent",
          "child": @child@
        },
        "child": {
          "name": "Child", 
          "parent": @parent@
        }
      }`
      const result = GON.parse(input)
      expect(result.parent.child).toBe(result.child)
      expect(result.child.parent).toBe(result.parent)
      expect(result.parent.child.parent).toBe(result.parent)
    })

    test('Multiple references to same object', () => {
      const input = `{
        "shared": {"id": "shared-123", "data": "important"},
        "ref1": @shared@,
        "ref2": @shared@,
        "ref3": @shared@
      }`
      const result = GON.parse(input)
      expect(result.ref1).toBe(result.shared)
      expect(result.ref2).toBe(result.shared)
      expect(result.ref3).toBe(result.shared)
      expect(result.ref1).toBe(result.ref2)
      expect(result.ref2).toBe(result.ref3)
    })
  })

  describe('Complex Mixed Tests', () => {
    test('Complex object with all GON features', () => {
      const input = `{
        "metadata": {
          "created": |2023-01-01T00:00:00.000Z|,
          "version": 1.0,
          "flags": [±debug±, ±info±]
        },
        "data": {
          "users": [
            {"id": 1n, "name": "Alice", "active": true},
            {"id": 2n, "name": "Bob", "active": false}
          ],
          "settings": @settings@
        },
        "settings": {
          "theme": "dark",
          "notifications": true,
          "lastModified": |2023-12-17T12:00:00.000Z|
        },
        "cache": {
          "user1": @data.users.0@,
          "user2": @data.users.1@,
          "config": @settings@
        }
      }`
      const result = GON.parse(input)
      
      // Test dates
      expect(result.metadata.created).toBeInstanceOf(Date)
      expect(result.settings.lastModified).toBeInstanceOf(Date)
      
      // Test bigints
      expect(result.data.users[0].id).toBe(BigInt(1))
      expect(result.data.users[1].id).toBe(BigInt(2))
      
      // Test symbols
      expect(result.metadata.flags[0]).toBe(Symbol.for('debug'))
      expect(result.metadata.flags[1]).toBe(Symbol.for('info'))
      
      // Test references
      expect(result.data.settings).toBe(result.settings)
      expect(result.cache.user1).toBe(result.data.users[0])
      expect(result.cache.user2).toBe(result.data.users[1])
      expect(result.cache.config).toBe(result.settings)
    })

    test('Array with mixed types and references', () => {
      const input = `[
        "string",
        42,
        true,
        null,
        |2023-12-17T12:00:00.000Z|,
        123n,
        ±test±,
        {"name": "object"},
        @3@,
        @6@,
        @7@
      ]`
      const result = GON.parse(input)
      
      expect(result[0]).toBe("string")
      expect(result[1]).toBe(42)
      expect(result[2]).toBe(true)
      expect(result[3]).toBe(null)
      expect(result[4]).toBeInstanceOf(Date)
      expect(result[5]).toBe(BigInt(123))
      expect(result[6]).toBe(Symbol.for('test'))
      expect(result[7]).toEqual({name: "object"})
      
      // References should point to the same objects
      expect(result[8]).toBe(result[3]) // null
      expect(result[9]).toBe(result[6]) // symbol
      expect(result[10]).toBe(result[7]) // object
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('Empty strings and whitespace', () => {
      const input = `{"empty":"","spaces":"   ","tabs":"\t\t\t"}`
      const result = GON.parse(input)
      expect(result.empty).toBe("")
      expect(result.spaces).toBe("   ")
      expect(result.tabs).toBe("\t\t\t")
    })

    test('Special characters in strings', () => {
      const input = `{"special":"\\"quotes\\" and \\n newlines and \\t tabs"}`
      const result = GON.parse(input)
      expect(result.special).toBe('"quotes" and \n newlines and \t tabs')
    })

    test('Nested references', () => {
      const input = `{
        "level1": {
          "level2": {
            "level3": {"value": "deep"}
          }
        },
        "ref1": @level1@,
        "ref2": @level1.level2@,
        "ref3": @level1.level2.level3@
      }`
      const result = GON.parse(input)
      expect(result.ref1).toBe(result.level1)
      expect(result.ref2).toBe(result.level1.level2)
      expect(result.ref3).toBe(result.level1.level2.level3)
    })
  })

  describe('Stringify Round-trip Tests', () => {
    test('Round-trip with references', () => {
      const original = {
        user: {name: "Alice", age: 30},
        ref: null // Will be set to reference user
      }
      original.ref = original.user
      
      const stringified = GON.stringify(original)
      const parsed = GON.parse(stringified)
      
      // Extract the data part for comparison
      const parsedData = parsed.data ? parsed.data : parsed
      expect(parsedData.user.name).toBe("Alice")
      expect(parsedData.ref).toBe(parsedData.user)
    })

    test('Round-trip with all GON types', () => {
      const original = {
        string: "test",
        number: 42,
        boolean: true,
        null: null,
        date: new Date("2023-12-17T12:00:00.000Z"),
        bigint: BigInt(123),
        symbol: Symbol.for("test"),
        array: [1, 2, 3],
        object: {nested: true}
      }
      
      const stringified = GON.stringify(original)
      const parsed = GON.parse(stringified)
      const parsedData = parsed.data ? parsed.data : parsed
      
      expect(parsedData.string).toBe("test")
      expect(parsedData.number).toBe(42)
      expect(parsedData.boolean).toBe(true)
      expect(parsedData.null).toBe(null)
      expect(parsedData.date.toISOString()).toBe("2023-12-17T12:00:00.000Z")
      expect(parsedData.bigint).toBe(BigInt(123))
      expect(parsedData.symbol).toBe(Symbol.for("test"))
      expect(parsedData.array).toEqual([1, 2, 3])
      expect(parsedData.object).toEqual({nested: true})
    })
  })
}) 