#!/usr/bin/env node

const program = require('commander')
const Web3 = require('web3')
const dragoEventfulAbi = require('./dragoEventful-v2.json')
let request = require('request')
const pino = require('pino')
const Web3WsProvider = require('./reconnectingWsProvider')

const logger = pino({
  prettyPrint: { colorize: true, translateTime: true }
})

const ROPSTEN = 'ropsten'
const MAINNET = 'mainnet'
const KOVAN = 'kovan'

// Parity - Kovan
const EP_RIGOBLOCK_KV_DEV = 'https://kovan.dev.endpoint.network/rpc'
const EP_RIGOBLOCK_KV_DEV_WS = 'wss://kovan.dev.endpoint.network/ws'
const EP_RIGOBLOCK_KV_PROD = 'https://kovan..dev.endpoint.network/rpc'
const EP_RIGOBLOCK_KV_PROD_WS = 'wss://kovan.dev.endpoint.network/ws'

// Parity - Ropsten
const EP_RIGOBLOCK_RP_DEV = 'https://ropsten.dev.endpoint.network/rpc'
const EP_RIGOBLOCK_RP_DEV_WS = 'wss://ropsten.dev.endpoint.network/ws'
const EP_RIGOBLOCK_RP_PROD = 'https://ropsten.dev.endpoint.network/rpc'
const EP_RIGOBLOCK_RP_PROD_WS = 'wss://ropsten.dev.endpoint.network/ws'

// Parity - Mainnet
const EP_RIGOBLOCK_MN_DEV = 'https://mainnet.dev.endpoint.network/rpc'
const EP_RIGOBLOCK_MN_DEV_WS = 'wss://mainnet.dev.endpoint.network/ws'
const EP_RIGOBLOCK_MN_PROD = 'https://mainnet.dev.endpoint.network/rpc'
const EP_RIGOBLOCK_MN_PROD_WS = 'wss://mainnet.dev.endpoint.network/ws'

let account = '0xc8DCd42e846466F2D2b89F3c54EBa37bf738019B'.toLowerCase()
const endpoint = {
  infura: {
    name: 'infura',
    https: {
      kovan: {
        dev: 'https://kovan.infura.io/metamask',
        prod: 'https://kovan.infura.io/metamask'
      },
      ropsten: {
        dev: 'https://ropsten.infura.io/metamask',
        prod: 'https://ropsten.infura.io/metamask'
      },
      mainnet: {
        dev: 'https://mainnet.infura.io/metamask',
        prod: 'https://mainnet.infura.io/metamask'
      }
    },
    wss: {
      kovan: {
        dev: 'wss://kovan.infura.io/ws',
        prod: 'wss://kovan.infura.io/ws'
      },
      ropsten: {
        dev: 'wss://ropsten.infura.io/ws',
        prod: 'wss://ropsten.infura.io/ws'
      },
      mainnet: {
        dev: 'wss://mainnet.infura.io/ws',
        prod: 'wss://mainnet.infura.io/ws'
      }
    }
  },
  rigoblock: {
    name: 'rigoblock',
    https: {
      kovan: {
        dev: EP_RIGOBLOCK_KV_DEV,
        prod: EP_RIGOBLOCK_KV_PROD
      },
      ropsten: {
        dev: EP_RIGOBLOCK_RP_DEV,
        prod: EP_RIGOBLOCK_RP_PROD
      },
      mainnet: {
        dev: EP_RIGOBLOCK_MN_DEV,
        prod: EP_RIGOBLOCK_MN_PROD
      }
    },
    wss: {
      kovan: {
        dev: EP_RIGOBLOCK_KV_DEV_WS,
        prod: EP_RIGOBLOCK_KV_PROD_WS
      },
      ropsten: {
        dev: EP_RIGOBLOCK_RP_DEV_WS,
        prod: EP_RIGOBLOCK_RP_PROD_WS
      },
      mainnet: {
        dev: EP_RIGOBLOCK_MN_DEV_WS,
        prod: EP_RIGOBLOCK_MN_PROD_WS
      }
    }
  },
  local: {
    name: 'local',
    https: {
      kovan: {
        dev: 'http://localhost:8545',
        prod: 'http://localhost:8545'
      },
      ropsten: {
        dev: 'http://localhost:8545',
        prod: 'http://localhost:8545'
      },
      mainnet: {
        dev: 'http://localhost:8545',
        prod: 'http://localhost:8545'
      }
    },
    wss: {
      kovan: {
        dev: 'ws://localhost:8546',
        prod: 'ws://localhost:8546'
      },
      ropsten: {
        dev: 'ws://localhost:8546',
        prod: 'ws://localhost:8546'
      },
      mainnet: {
        dev: 'ws://localhost:8546',
        prod: 'ws://localhost:8546'
      }
    }
  }
}

const eventfulContract = {
  [ROPSTEN]: '0x8780004dc7f9508602a08398830c433a0483b058'.toLowerCase(),
  [MAINNET]: '0xd79483f44f7be4ff09226b90daf6fbc3a209a340'.toLowerCase()
  // [KOVAN]: '0x35d3ab6b7917d03050423f7E43d4D9Cff155a685'.toLowerCase()
}

// const dragoContract = {
//   [ROPSTEN]: '0x200D0735De695853F592648Bc5efA50DccD5A154'.toLowerCase(),
//   [MAINNET]: '0xaEdB9a26693146a19BEC8e4b9f4C2EB4E6b9237f'.toLowerCase(),
//   [KOVAN]: '0x9ad52C517E6D28cEC3521Ae7fD25135AdB987689'.toLowerCase()
// }

const dragoCreatedSignature =
  '0x19b85c898cf6ac07e2cd8c5e44f84c9146263ac6861bfef2ed01d419b37c2c36'

// const buyDragoSignature =
//   '0xcad98ce2f54320f9a3cbfcabd750461d8fbc469076324d37907488ff1d45c290'

// const sellDragoSignature =
//   '0x44fdc18a9b8ed853260ec560ccf070691dcfa501b4a806b5b5e31eed8bc88b93'

program.version('0.1.0').parse(process.argv)

benchCreate = async (
  networkName,
  fromBlock,
  toBlock,
  contract,
  key = 0,
  delay = 0
) => {
  logger.info(`***** Fetching DragoCreate events.`)
  let wait = ms => new Promise((r, j) => setTimeout(r, ms))
  await wait(delay)
  let startTime = new Date()
  let logsArray = []
  let logs
  try {
    logs = await contract
      .getPastEvents('allEvents', {
        // filter: filters,
        fromBlock: fromBlock,
        toBlock: toBlock,
        topics: [[dragoCreatedSignature], null, null, null]
      })
      .catch(error => {
        logger.info(error)
      })
  } catch (err) {}

  let endTime = new Date()
  let dif = startTime.getTime() - endTime.getTime()
  let Seconds_from_T1_to_T2 = dif / 1000
  let Seconds_Between_Dates = Math.abs(Seconds_from_T1_to_T2)
  logger.info(
    `***** Chunk ${key} ${fromBlock} ${toBlock} -> ${
      logs.length
    } events fetched in ${Seconds_Between_Dates}s`
  )
  logsArray.push(key, logs.length, fromBlock, toBlock)
  return logsArray
}

getBlockChunks = async (start, end, chunkSize, web3) => {
  const startBlock = start
  const chunks = []
  let endBlock = end
  if (endBlock === 'latest') {
    try {
      endBlock = await web3.eth.getBlockNumber().catch(error => {
        logger.info(error)
      })
    } catch (e) {
      return console.error(e)
    }
  }
  for (let i = startBlock - 1; i < endBlock; i += chunkSize) {
    const fromBlock = i + 1
    const toBlock = i + chunkSize > endBlock ? end : i + chunkSize
    chunks.push({ fromBlock, toBlock })
  }
  return chunks.reverse()
}

getChunksEvents = async (chunks, startBlock, web3, networkName) => {
  let logsArray = Array(0)
  const contract = new web3.eth.Contract(
    dragoEventfulAbi,
    eventfulContract[networkName]
  )
  logsArray = chunks.map(async (chunk, key) => {
    return benchCreate(
      networkName,
      chunk.fromBlock,
      chunk.toBlock,
      contract,
      key,
      0
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
      logger.info(``)
      logger.info(``)
      Promise.all([
        benchCreate(networkName, startBlock, 'latest', contract, 0, 0)
      ])
    })
    .catch(error => {
      logger.info(error)
    })
}

let protocol = 'https'
let networkName = MAINNET
// let networkName = ROPSTEN
let startBlock = 3000000
let chunck = 250000

//
// RIGOBLOCK
//

let endpointName = 'rigoblock'
let transport = endpoint[endpointName][protocol][networkName].prod
let web3
logger.info(
  '**** TESTING -> ' +
    endpointName +
    ' ' +
    networkName.toUpperCase() +
    ' ' +
    transport
)
web3 = new Web3(transport)

go = async () => {
  let chunksArray = await getBlockChunks(startBlock, 'latest', chunck, web3)
  await getChunksEvents(chunksArray, startBlock, web3, networkName)
}

go(startBlock, web3, networkName)

//
// INFURA
//

// endpointName = 'infura'
// transport = endpoint[endpointName][protocol][networkName].prod
// logger.info(
//   '**** TESTING -> ' +
//     endpointName +
//     ' ' +
//     networkName.toUpperCase() +
//     ' ' +
//     transport
// )
// web3 = new Web3(transport)

// go = async () => {
//   let chunksArray = await getBlockChunks(startBlock, 'latest', chunck, web3)
//   getChunksEvents(chunksArray, startBlock, web3, networkName)
// }

// go(startBlock, web3, networkName)
