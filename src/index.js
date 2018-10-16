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
const KOVAN = 'KOVAN'

let account = '0xc8DCd42e846466F2D2b89F3c54EBa37bf738019B'.toLowerCase()
const endpoint = {
  https: {
    KOVAN: {
      dev: 'https://kovan.infura.io/metamask',
      prod: 'https://kovan.infura.io/metamask'
    },
    ROPSTEN: {
      dev: 'https://ropsten.infura.io/metamask',
      prod: 'https://ropsten.infura.io/metamask'
    },
    MAINNET: {
      dev: 'https://mainnet.infura.io/metamask',
      prod: 'https://mainnet.infura.io/metamask'
    }
  },
  wss: {
    KOVAN: {
      dev: 'wss://kovan.infura.io/ws',
      prod: 'wss://kovan.infura.io/ws'
    },
    ROPSTEN: {
      dev: 'wss://ropsten.infura.io/ws',
      prod: 'wss://ropsten.infura.io/ws'
    },
    MAINNET: {
      dev: 'wss://mainnet.infura.io/ws',
      prod: 'wss://mainnet.infura.io/ws'
    }
  }
}

const eventfulContract = {
  ROPSTEN: '0x200D0735De695853F592648Bc5efA50DccD5A154'.toLowerCase(),
  MAINNET: '0xaEdB9a26693146a19BEC8e4b9f4C2EB4E6b9237f'.toLowerCase(),
  KOVAN: '0x35d3ab6b7917d03050423f7E43d4D9Cff155a685'.toLowerCase()
}

const dragoContract = {
  ROPSTEN: '0x200D0735De695853F592648Bc5efA50DccD5A154'.toLowerCase(),
  MAINNET: '0xaEdB9a26693146a19BEC8e4b9f4C2EB4E6b9237f'.toLowerCase(),
  KOVAN: '0x9ad52C517E6D28cEC3521Ae7fD25135AdB987689'.toLowerCase()
}

const dragoCreatedSignature =
  '0x19b85c898cf6ac07e2cd8c5e44f84c9146263ac6861bfef2ed01d419b37c2c36'

const buyDragoSignature =
  '0xcad98ce2f54320f9a3cbfcabd750461d8fbc469076324d37907488ff1d45c290'

const sellDragoSignature =
  '0x44fdc18a9b8ed853260ec560ccf070691dcfa501b4a806b5b5e31eed8bc88b93'

program.version('0.1.0').parse(process.argv)

bench = async (networkName, fromBlock, protocol = 'https') => {
  logger.info(`*****`)
  logger.info(`*****`)
  logger.info(`***** ${endpoint[protocol][networkName].prod}`)
  logger.info(`***** ${networkName} -> Fetching events.`)
  let startTime = new Date()
  const web3 = new Web3(endpoint[protocol][networkName].prod)
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
    fromBlock: fromBlock,
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

benchCreate = async (
  networkName,
  fromBlock,
  toBlock,
  protocol = 'https',
  key = 0,
  delay = 0
) => {
  // logger.info(`*****`)
  // logger.info(`*****`)
  // logger.info(`***** ${endpoint[protocol][networkName].prod}`)
  // logger.info(`***** ${networkName} -> Fetching DragoCreate events.`)
  let wait = ms => new Promise((r, j) => setTimeout(r, ms))
  await wait(delay)
  let startTime = new Date()
  let logsArray = []
  const web3 = new Web3(endpoint[protocol][networkName].prod)
  // const balance = await web3.eth.getBalance(account)
  // logger.info(
  //   `***** ${networkName} -> Balance account ${account} -> ${balance}`
  // )
  const contract = new web3.eth.Contract(
    dragoEventfulAbi,
    eventfulContract[networkName]
  )
  const logs = await contract.getPastEvents('allEvents', {
    // filter: filters,
    fromBlock: fromBlock,
    toBlock: toBlock,
    topics: [[dragoCreatedSignature], null, null, null]
  })
  let endTime = new Date()
  let dif = startTime.getTime() - endTime.getTime()
  let Seconds_from_T1_to_T2 = dif / 1000
  let Seconds_Between_Dates = Math.abs(Seconds_from_T1_to_T2)
  // logger.info(`***** ${networkName} -> events ${JSON.stringify(logs, null, 4)}`)
  logger.info(
    `***** Chunk ${key} -> ${
      logs.length
    } events fetched in ${Seconds_Between_Dates}s`
  )
  logsArray.push(key, logs.length, fromBlock, toBlock)
  return logsArray
}

logger.info(`***** STARTING`)

chunks = (start, end, chunk) => {
  let rangesArray = []
  let i = 0
  let fromBlock = end - chunk
  let toBlock = end
  // rangesArray.push({ fromBlock: end - chunk, toBlock: end })

  while (toBlock > start) {
    if (i === 0) {
      rangesArray.push({
        fromBlock: fromBlock + 1,
        toBlock: 'latest'
      })
    } else {
      rangesArray.push({
        fromBlock: fromBlock + 1,
        toBlock: toBlock
      })
    }

    i++
    fromBlock = fromBlock - chunk
    toBlock = toBlock - chunk
    if (i > 100) break
    if (fromBlock < start) {
      rangesArray.push({
        fromBlock: start,
        toBlock: toBlock
      })
      break
    }
  }
  // logger.info(`${JSON.stringify(rangesArray)}`)
  rangesArray.map(chunk => {
    logger.info(
      `***** fromBlock ${chunk.fromBlock} -> toBlock ${chunk.toBlock}`
    )
  })
  return rangesArray
}

// runBench = async () => {
//   console.log('ok')
//   await bench(ROPSTEN, 0, 'https')
//   await bench(MAINNET, 0, 'https')
// }

runBench = async () => {
  await benchCreate(KOVAN, 6000000, 'https')
}

getChunksEvents = async (chunks, startBlock) => {
  let logsArray = Array(0)
  logsArray = await chunks.map(async (chunk, key) => {
    return await benchCreate(
      KOVAN,
      chunk.fromBlock,
      chunk.toBlock,
      'https',
      key,
      key * 100
    )
    // logsArray.push(logs)
  })
  Promise.all(logsArray)
    .then(results => {
      // console.log(results)
      let total = results.reduce((acc, curr) => acc + curr[1], 0)

      logger.info(`Total ${total}`)
    })
    .then(() => {
      logger.info(`***** Single chunk fetching from ${startBlock}`)
      Promise.all([benchCreate(KOVAN, startBlock, 'latest', 'https')])
    })
}
let protocol = 'https'
let networkName = KOVAN
let startBlock = 6000000
const web3 = new Web3(endpoint[protocol][networkName].prod)

web3.eth.getBlockNumber().then(lastBlock => {
  let chunksArray = chunks(startBlock, lastBlock.toFixed(), 100000)
  getChunksEvents(chunksArray, startBlock)
})

// runBench()
