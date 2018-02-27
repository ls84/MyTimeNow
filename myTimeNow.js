const {Secp256k1PrivateKey} = require('sawtooth-sdk/signing/secp256k1.js')
const {createContext} = require('sawtooth-sdk/signing')
const {createHash} = require('crypto')
const {protobuf} = require('sawtooth-sdk')
const cbor = require('cbor')
const process = require('process')
const request = require('request')

// TODO: load hex from stdin
const privateKeyAsHex = "4d6e0c6ee537583cf5dada2534655971addc4c6325fbf97fcebaaae56bd84f5c"
const privateKey = Secp256k1PrivateKey.fromHex(privateKeyAsHex)

// get public key from PrivateKey
const context = createContext('secp256k1')
const publicKey = context.getPublicKey(privateKey)
console.log("publicKey:", publicKey.asHex())

// an address constructed using publicKey
const hash = (x) =>
  createHash('sha512').update(x).digest('hex').toLowerCase()

const nameSpace = "100000"
const address = nameSpace + hash(publicKey.asHex()).substring(0, 64)
console.log("address:", address)

// construct payload in Bytes and it's hash
const payload = {
	timeStamp: Date()
}

const payloadBytes = cbor.encode(payload)
const payloadSha512 = hash(payloadBytes)

console.log("payload:", payload)
console.log("payload hash", payloadSha512)

// construct Transaction Header
const transactionHeader = {
	familyName: 'mytime',
	familyVersion: '1.0',
	inputs: [address],
	outputs: [address],
	signerPublicKey: publicKey.asHex(),
	batcherPublicKey: publicKey.asHex(),
	dependencies: [],
	payloadSha512
}

// create & sign Transaction
const transactionHeaderBytes = protobuf.TransactionHeader.encode(transactionHeader).finish()
const transactionSignature = context.sign(transactionHeaderBytes, privateKey)
const transaction = protobuf.Transaction.create({
	header: transactionHeaderBytes,
	headerSignature: transactionSignature,
	payload: payloadBytes
})

// construct Batcher Header
const transactions = [transaction]
const batcherHeader = {
	signerPublicKey: publicKey.asHex(),
	transactionIds: transactions.map((txn) => txn.headerSignature),
}

// create & sign Batcher
const batchHeaderBytes = protobuf.BatchHeader.encode(batcherHeader).finish()
const batchSignature = context.sign(batchHeaderBytes, privateKey)
const batch = protobuf.Batch.create({
	header: batchHeaderBytes,
	headerSignature: batchSignature,
	transactions: transactions
})

// batchList
const batchListBytes = protobuf.BatchList.encode({
    batches: [batch]
}).finish()

// const request = require('request')
// 
const restApiAddress = process.argv[2]
console.log(restApiAddress)
request.post({
		uri: restApiAddress,
    body: batchListBytes,
    headers: {'Content-Type': 'application/octet-stream'}
}, (err, response) => {
    if (err) return console.log(err)
    console.log(response.body)
})
