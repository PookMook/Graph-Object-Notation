import GON from '../src/index.js'
const objectToSerialize = {name:"test",nest:{deep:[]},deep:[{nest:true}]}

test('stringify object',()=>{
  expect(GON.stringify(objectToSerialize)).toBe('{"data": {"name": "test","nest": @references.0xf001@,"deep": @references.0xf002@},"references": {"0xf001": {"deep": @references.0xf003@},"0xf002": [@references.0xf004@],"0xf003": [],"0xf004": {"nest": true}}}')
})
test('Immutable object stringify',()=>{
  expect(GON.stringify(objectToSerialize)).toBe('{"data": {"name": "test","nest": @references.0xf001@,"deep": @references.0xf002@},"references": {"0xf001": {"deep": @references.0xf003@},"0xf002": [@references.0xf004@],"0xf003": [],"0xf004": {"nest": true}}}')
})
