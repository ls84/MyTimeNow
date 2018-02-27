const process = require('process')
const { TransactionProcessor } = require('sawtooth-sdk/processor')
const { TransactionHandler } = require('sawtooth-sdk/processor/handler')
const crypto = require('crypto')
const cbor = require('cbor')

const validatorAddress = process.argv[2]
console.log("connecting to:", validatorAddress)

const transactionProcessor = new TransactionProcessor(validatorAddress)

class tpstudy extends TransactionHandler {
  constructor () {
    super("mytime", ['1.0'], ["010000"])
  }

  apply (transactionProcessRequest, context) {
		console.log("apply called")
		const payload = cbor.decodeFirstSync(transactionProcessRequest.payload)
		console.log('payload:', payload)
		const address = transactionProcessRequest.header.inputs[0]
		return context.getState([address])
		.then((currentState) => {
			let newState = {[address]: cbor.encode(payload)}
			return context.setState(newState)
		})
  }
}

transactionProcessor.addHandler(new tpstudy())
transactionProcessor.start()
