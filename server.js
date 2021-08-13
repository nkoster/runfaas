;(async _ => {

require('dotenv').config()

const log = console.log.bind(console)
const chokidar = require('chokidar')
const express = require('express')
const cluster = require('cluster')
const fs = require('fs')
const jwt = require('jsonwebtoken')

const API_PORT = process.env.API_PORT || 3030

const fileCounter = { state: 0 }

const functions = fs.readdirSync(process.env.FUNCTIONS_PATH)
  .map(f => {
    return {
      name: f,
      counter: 0
    }
  })

if (functions.length === 0) {
  log(`No functions found in ${process.env.FUNCTIONS_PATH}/`)
}

if (cluster.isMaster) {

  const glob = require('glob')

  const files = await new Promise((resolve, reject) => {
    glob(process.env.FUNCTIONS_PATH + '/*/!(node_modules)', (err, result) => {
      if (err) reject(null)
      resolve(result)
    })
  })

  const worker = { state: cluster.fork() }

  cluster.on('exit', _ => worker.state = cluster.fork())

  const watcher = chokidar.watch(`${process.env.FUNCTIONS_PATH}/`, {
    ignored: [/^\./, /node_modules/, /\.git/],
    persistent: true
  })

  const restartWorker = _ => {
    fileCounter.state++
    if (fileCounter.state > files.length) {
      log('--- Reload')
      process.kill(worker.state.process.pid)
    }
  }

  watcher
    .on('add', _ => restartWorker())
    .on('unlink', _ => restartWorker())

  log(`--- RunFaaS running at port ${API_PORT}`)

}

if (cluster.isWorker) {

  const app = express()

  app.use(express.json())
  
  const getDurationInMilliseconds = start => {
    const NS_PER_SEC = 1e9
    const NS_TO_MS = 1e6
    const diff = process.hrtime(start)
    return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS
  }

  app.use((_, res, next) => {
    const start = process.hrtime()
    res.on('close', _ => {
        const durationInMilliseconds = getDurationInMilliseconds(start)
        log(`--- Function ended after ${durationInMilliseconds.toLocaleString()} ms`)
    })
    next()
  })

  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (!token) {
      log('--- No token supplied')
      return res.status(200).send({ error: 'No token supplied'})
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        log('--- Token did not verify')
        return res.status(200).send({ error: 'Token did not verify'})
      }
      req.user = user
      next()
    })
  }
  
  for (let f = 0; f < functions.length; f++) {
    app.post(`/function/${functions[f].name}`, authenticateToken, ((req, res) => {
      const func =
        require(`${process.env.FUNCTIONS_PATH}/${functions[f].name}/index`)
      functions[f].counter += 1
      log(`--- Invoking function "${functions[f].name}" (${functions[f].counter})`)
      try {
        func(req.body, res)
      } catch(err) {
        log(err.message)
        res.status(500).send()
      }
    }))
  }
  
  app.listen(API_PORT, _ => log(`--- ${functions.length} function${
    functions.length != 1 ? 's' : ''
  } loaded`))

}

})()
