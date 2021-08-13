;(async _ => {

const chokidar = require('chokidar')
const express = require('express')
const cluster = require('cluster')
const fs = require('fs')

const API_PORT = process.env.API_PORT || 3030

const fileCounter = { state: 0 }

const functions = fs.readdirSync(__dirname + '/functions')
  .map(f => {
    return {
      name: f,
      counter: 0
    }
  })

if (functions.length === 0) {
  console.log(`No functions found in ${__dirname}/functions/`)
}

if (cluster.isMaster) {

  const glob = require('glob')

  const files = await new Promise((resolve, reject) => {
    glob('functions' + '/*/!(node_modules)', (err, result) => {
      if (err) reject(null)
      resolve(result)
    })
  })

  const worker = { state: cluster.fork() }

  cluster.on('exit', _ => worker.state = cluster.fork())

  const watcher = chokidar.watch('functions/', {
    ignored: [/^\./, /node_modules/, /\.git/],
    persistent: true
  })

  const restartWorker = _ => {
    fileCounter.state++
    if (fileCounter.state > files.length)
      console.log('--- Reload')
      process.kill(worker.state.process.pid)
  }

  watcher
    .on('add', _ => restartWorker())
    .on('unlink', _ => restartWorker())

  console.log(`--- RunFaaS running at port ${API_PORT}`)

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
        console.log(`--- Function ended after ${durationInMilliseconds.toLocaleString()} ms`)
    })
    next()
  })
  
  for (let f = 0; f < functions.length; f++) {
    app.post(`/function/${functions[f].name}`, ((req, res) => {
      const func = require(`./functions/${functions[f].name}/index`)
      functions[f].counter += 1
      console.log(`--- Invoking function "${functions[f].name}" (${functions[f].counter})`)
      try {
        func(req.body, res)
      } catch(err) {
        console.log(err.message)
        res.status(500).send()
      }
    }))
  }
  
  app.listen(API_PORT, _ => console.log(`--- ${functions.length} function${
    functions.length != 1 ? 's' : ''
  } loaded`))

}

})()
