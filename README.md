# Graph Object Notation

ALPHA STATE WARNING, PLEASE DO NOT USE IN PRODUCTION, STUFF BREAKS ALL THE TIME

The goal of this package is to provide a way to serialize/parse graph objects with a syntax as close as possible to JSON.
The serialized data format is a superset of the JSON data format and holds the extension .gon

# How to install

```
npm install graph-object-notation --save
```

# How to use

```js
import GON from "graph-object-notation";

const graph = GON.parse(`{
  "foo":{"name":"bar"},
  "ref":@foo@
}`);

console.log(JSON.stringify(graph));
// Returns {"foo":{"name":"bar"},"ref":{"name":"bar"}}

console.log(GON.stringify(graph));
// Returns {"data":{"foo":@references.0xf001@,"ref":@references.0xf001@},"references":{"0xf001":{"name":"bar"}}}
```

# Accepted serialization

GON is a superset of JSON, everything JSON should work using GON.parse
In addition to JSON, GON offers a few more serialization options:

```
{
  "date":|2019-12-17T12:00:00.000Z|,
  "bigInt":42n,
  "Symbol":±debug±,
  "Reference":@bigInt@
}
```

# Import options

You can import the whole suite with `import GON from 'graph-object-notation` or just the part you need with `import {parse,stringify} from 'graph-object-notation'`

# GON.parse(stringToBeParsed)

Parse **stringToBeParsed** in the GON format, resolve references and provide a JS object that can be a graph

# GON.stringify(objectToSerialize, replacer, spaces, target)

/!\ Stringify might mutate the **objectToSerialize**

/!\ Stringify return a serialized version of your string on the form {"data":{...yourObject/array}, **target**:{...}}, if you want to stringify and parse in succession, you'll need to `GON.parse(GON.stringify({test:"hello"}).data` to get the expected result

Serialize **objectToSerialize** to the GON format. default is `{}`

**replacer** is not yet implemented and will work like the **replacer** from JSON.stringify. default is `null`

**space** is used to make the serialized string more readable for human, works like **space** from JSON.stringify, default is `0`

**target** specify the property that will hold the references, default is `"references"`

# Performance Testing

GON includes comprehensive performance testing to ensure changes don't reduce performance. The test suite includes:

## Running Performance Tests

```bash
# Run all tests including performance tests
npm test

# Run only performance benchmarks
npm run benchmark

# Monitor performance over time and detect regressions
npm run perf
```

## Performance Test Types

### 1. **Parse Performance Tests**

- Tests parsing speed for simple, complex, and large data sets
- Measures average time per operation
- Detects performance regressions
- Compares against JSON.parse baseline

### 2. **Stringify Performance Tests**

- Tests serialization speed for various data types
- Measures memory usage during operations
- Tracks performance consistency across multiple runs

### 3. **Memory Usage Tests**

- Monitors heap and total memory usage
- Ensures memory consumption stays within reasonable limits
- Tracks memory leaks over time

### 4. **Regression Detection**

- Automatically detects performance regressions
- Compares current performance against historical baselines
- Alerts when performance degrades by more than 20%

### 5. **Stress Tests**

- High-frequency parsing/stringifying (10,000+ operations)
- Tests performance under load
- Measures operations per second

## Performance Monitoring

The performance monitoring system tracks metrics over time and can:

- **Collect metrics**: `npm run perf monitor`
- **View history**: `npm run perf history`
- **Clear history**: `npm run perf clear`

Performance data is stored in `test/performance-history.json` and includes:

- Timestamp and version information
- Parse/stringify times for different data sizes
- Memory usage statistics
- Comparison with JSON performance
- Regression detection results

## Performance Thresholds

The test suite enforces performance thresholds to prevent regressions:

- **Simple data**: < 0.1ms average
- **Complex data**: < 0.5ms average
- **Large data**: < 2.0ms average
- **Memory usage**: < 1MB for large operations
- **JSON comparison**: < 10x slower than native JSON

These thresholds ensure that GON remains performant for production use.

# RoadMap

The goal is to provide a serialization for useful JS types of object/primitive, and graph supports.
Next versions will focus on :

- ~Making stringify immutable~
- Adding tests for automatic deployements
- Improved resiliency of the parse/stringify functions
- Better optimization of the parse/stringify functions
- Adding support for Maps and Sets
- Adding support for single-quote/backquote notation for strings
- Adding Conditionnal checks on toGON(), and toJSON() for unknown objects.
- Adding logic for the replacer
