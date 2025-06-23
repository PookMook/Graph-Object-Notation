import GON from '../src/index.js'

const string = `{
  "string":"hello world",
  "date":|2019-12-18T12:00:00.000Z|,
  "int":42,
  "bigInt":42n,
  "symbol":±test±,
  "null":null,
  "array":[null],
  "object":{"name":"Arthur"},
  "reference":@object@
}`
const object = GON.parse(string)


test('Parsing strings',()=>{
  expect(object.string).toBe("hello world")
})
test('Parsing date',()=>{
  expect(object.date.toISOString()).toBe("2019-12-18T12:00:00.000Z")
})
test('Parsing int',()=>{
  expect(object.int).toBe(42)
})
test('Parsing bigInt',()=>{
  expect(object.bigInt).toBe(BigInt(42))
})
test('Parsing symbol',()=>{
  expect(object.symbol).toBe(Symbol.for('test'))
})
test('Parsing null',()=>{
  expect(object.null).toBe(null)
})
test('Parsing array',()=>{
  expect(JSON.stringify(object.array)).toBe("[null]")
})
test('Parsing object',()=>{
  expect(JSON.stringify(object.object)).toBe(`{"name":"Arthur"}`)
})
test('Parsing reference',()=>{
  expect(object.reference).toBe(object.object)
})