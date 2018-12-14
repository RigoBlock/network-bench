#!/usr/bin/env node

const program = require('commander')
const Web3 = require('web3')
const dragoEventfulAbi = require('./dragoEventful-v2.json')
let request = require('request')
const pino = require('pino')
const Web3WsProvider = require('./reconnectingWsProvider')
const moment = require('moment')

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
        dev: 'https://mainnet.infura.io/v3/3fe47e5272bc4d38b6f0b247d94a6cd1',
        prod: 'https://mainnet.infura.io/v3/3fe47e5272bc4d38b6f0b247d94a6cd1'
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

program.version('0.1.0').parse(process.argv)

let protocol = 'https'
let networkName = MAINNET

// Set endpoint to one of 'local', 'infura', 'rigoblock'

let endpointName = 'local'
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

goGetBlock = async () => {
  const startBlock = 6000000
  const endBlock = await web3.eth.getBlockNumber()
  let blockNumber
  let totalTime = 0
  let avgTime = 0
  let i = 0
  for (blockNumber = endBlock; blockNumber > startBlock; blockNumber--) {
    let startTime = new Date()
    let blockTime
    i++
    const blockInfo = await web3.eth.getBlock(blockNumber)
    // logger.info(blockInfo)
    blockInfo
      ? (blockTime = moment.unix(blockInfo.timestamp))
      : (blockTime = 'no block time')

    let endTime = new Date()
    let dif = startTime.getTime() - endTime.getTime()
    let Seconds_from_T1_to_T2 = dif / 1000
    let Seconds_Between_Dates = Math.abs(Seconds_from_T1_to_T2)
    totalTime = totalTime + Seconds_Between_Dates
    avgTime = totalTime / i

    logger.info(
      `***** Getting getBlock -> ${blockNumber} -> ${blockTime} - timing -> req: ${Seconds_Between_Dates.toFixed(
        3
      )} avg: ${avgTime.toFixed(3)} tot: ${totalTime.toFixed(3)} s b/s: ${(
        i / totalTime
      ).toFixed(2)}`
    )
  }
}

goGetBlock()
