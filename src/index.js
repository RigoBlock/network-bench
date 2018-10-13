#!/usr/bin/env node

const program = require('commander')
const Web3 = require('web3')
const dragoEventfulAbi = require('./dragoEventful-v2.json')

const pino = require('pino')

const logger = pino({
  prettyPrint: { colorize: true, translateTime: true }
})

const ROPSTEN = 'ROPSTEN'
const MAINNET = 'MAINNET'

let account = '0xc8DCd42e846466F2D2b89F3c54EBa37bf738019B'.toLowerCase()
const endpoint = {
  ROPSTEN: 'https://ropsten.infura.io/metamask',
  MAINNET: 'https://mainnet.infura.io/metamask'
}
const eventfulContract = {
  ROPSTEN: '0x200D0735De695853F592648Bc5efA50DccD5A154'.toLowerCase(),
  MAINNET: '0xaEdB9a26693146a19BEC8e4b9f4C2EB4E6b9237f'.toLowerCase()
}

const dragoContract = {
  ROPSTEN: '0x200D0735De695853F592648Bc5efA50DccD5A154'.toLowerCase(),
  MAINNET: '0xaEdB9a26693146a19BEC8e4b9f4C2EB4E6b9237f'.toLowerCase()
}

const dragoCreatedSignature =
  '0x19b85c898cf6ac07e2cd8c5e44f84c9146263ac6861bfef2ed01d419b37c2c36'

const buyDragoSignature =
  '0xcad98ce2f54320f9a3cbfcabd750461d8fbc469076324d37907488ff1d45c290'

const sellDragoSignature =
  '0x44fdc18a9b8ed853260ec560ccf070691dcfa501b4a806b5b5e31eed8bc88b93'

program.version('0.1.0').parse(process.argv)

bench = async networkName => {
  logger.info(`*****`)
  logger.info(`*****`)
  logger.info(`***** ${networkName} -> Fetching events.`)
  let startTime = new Date()
  const web3 = new Web3(endpoint[networkName])
  const balance = await web3.eth.getBalance(account)
  logger.info(
    `***** ${networkName} -> Balance account ${account} -> ${balance}`
  )
  const contract = new web3.eth.Contract(
    dragoEventfulAbi,
    eventfulContract[networkName]
  )
  const logs = await contract.getPastEvents('allEvents', {
    // filter: filters,
    fromBlock: 0,
    toBlock: 'latest',
    topics: [
      [dragoCreatedSignature, buyDragoSignature, sellDragoSignature],
      null,
      null,
      null
    ]
  })
  let endTime = new Date()
  let dif = startTime.getTime() - endTime.getTime()
  let Seconds_from_T1_to_T2 = dif / 1000
  let Seconds_Between_Dates = Math.abs(Seconds_from_T1_to_T2)
  logger.info(`***** ${networkName} -> events ${JSON.stringify(logs, null, 4)}`)
  logger.info(
    `***** ${logs.length} events fetched in ${Seconds_Between_Dates}s`
  )
}

runBench = async () => {
  await bench(ROPSTEN)
  await bench(MAINNET)
}

runBench()
