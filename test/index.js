'use strict'

const url = require('url')
const test = require('tape')
const dynalite = require('dynalite')
const levelup = require('levelup')
const suite = require('abstract-leveldown/test')
const { DynamoDB } = require('aws-sdk')
const DynamoDbDown = require('../index')

const DynamoDbOptions = {
  region: 'us-east-1',
  accessKeyId: 'abc',
  secretAccessKey: '123',
  paramValidation: false
}

const startDbServer = cb => {
  const server = dynalite({
    createTableMs: 20,
    deleteTableMs: 20,
    updateTableMs: 20
  })

  server.listen(err => {
    if (err) throw err

    const address = server.address()
    const endpoint = url.format({
      protocol: 'http',
      hostname: address.address,
      port: address.port
    })

    DynamoDbOptions.endpoint = endpoint

    cb(server)
  })
}

const leveldown = location => {
  const dynamoDb = new DynamoDB(DynamoDbOptions)
  const dynamoDown = DynamoDbDown({ dynamoDb })(location)

  dynamoDown.oldOpen = dynamoDown._open
  dynamoDown._open = function (opts, cb) {
    return dynamoDown.oldOpen.bind(dynamoDown)(Object.assign({ dynamodb: DynamoDbOptions }, opts), cb)
  }

  return dynamoDown
}

const createTestOptions = () => {
  var server
  var dbIdx = 0
  const factory = () => leveldown(location())
  const location = () => `test-table${dbIdx++}`
  const lastLocation = () => `test-table${dbIdx}`
  const setUp = t =>
    startDbServer(newServer => {
      server = newServer
      t.end()
    })
  const tearDown = t => server.close(() => t.end())
  const dbSupportTestOptions = {
    bufferKeys: true,
    clear: false,
    createIfMissing: true,
    errorIfExists: true,
    seek: true,
    snapshots: true
  }
  return {
    location,
    lastLocation,
    /* REQUIRED BELOW, OPTIONAL ABOVE */
    setUp,
    tearDown,
    factory,
    test,
    ...dbSupportTestOptions
  }
}

/*
 *   Run select `levelup` tests
 */
test('levelup', t => {
  var server
  var db

  t.test('setup', t => {
    startDbServer(newServer => {
      server = newServer
      const dynamoDb = new DynamoDB(DynamoDbOptions)
      const dynamoDown = DynamoDbDown({
        dynamoDb
      })
      db = levelup(dynamoDown('foobase'))
      t.end()
    })
  })

  t.test('put string', t => {
    db.put('name', 'LevelUP string', function (err) {
      t.notOk(err)
      db.get('name', { asBuffer: false }, function (err, value) {
        t.notOk(err)
        t.equal(value, 'LevelUP string')
        t.end()
      })
    })
  })

  t.test('put binary', t => {
    const buffer = Buffer.from('testbuffer')
    db.put('binary', buffer, function (err) {
      t.notOk(err)
      db.get('binary', { encoding: 'binary' }, function (err, value) {
        t.notOk(err)
        t.deepEqual(value, buffer)
        t.end()
      })
    })
  })

  t.test('tearDown', t => {
    server.close(() => {
      t.end()
    })
  })

  t.test('setup', t => {
    startDbServer(newServer => {
      server = newServer
      const dynamoDb = new DynamoDB(DynamoDbOptions)
      const dynamoDown = DynamoDbDown({
        dynamoDb
      })
      db = levelup(dynamoDown('foobase'), { valueEncoding: 'json' })
      t.end()
    })
  })

  t.test('put object', t => {
    const object = {
      foo: 'bar',
      baz: 123,
      qux: true,
      corge: [1, 2, 3, 4, 5],
      grault: {
        foo: 'bar',
        baz: 123,
        qux: true,
        corge: [1, 2, 3, 4, 5]
      }
    }
    db.put('object', object, { valueEncoding: 'json' }, function (err) {
      t.notOk(err)
      db.get('object', { asBuffer: false }, function (err, value) {
        t.notOk(err)
        t.deepEqual(value, object)
        t.end()
      })
    })
  })

  t.test('tearDown', t => {
    server.close(() => {
      t.end()
    })
  })
})

/*
 *   Run all `abstract-leveldown` tests according to `dbSupportTestOptions`
 */
const options = createTestOptions()
// require('abstract-leveldown/test/clear-test').all(options.test, options);
suite(options)
