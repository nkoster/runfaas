const express = require('express')
const cluster = require('cluster')
const fs = require('fs')

const API_PORT = process.env.API_PORT || 3030

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
  cluster.fork()
  cluster.on('exit', (worker, code, signal) => {
    if (signal) console.log(`signal ${signal} received`)
    console.log(`worker ${worker.id} with PID ${worker.process.pid} terminated with exit code ${code}`)
    cluster.fork()
  })
}

if (cluster.isWorker) {

  const app = express()

  app.use(express.json())
  
  app.use((_, res, next) => {
    const start = process.hrtime()
    res.on('close', _ => {
        const durationInMilliseconds = getDurationInMilliseconds(start)
        console.log(`--- Function finished after ${durationInMilliseconds.toLocaleString()} ms`)
    })
    next()
  })
  
  const getDurationInMilliseconds = start => {
    const NS_PER_SEC = 1e9
    const NS_TO_MS = 1e6
    const diff = process.hrtime(start)
    return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS
  }
  
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
  
  app.listen(API_PORT, _ => console.log(`RunFaaS running at port ${API_PORT}\n${functions.length} function${
    functions.length != 1 ? 's' : ''
  } loaded`))
  
}
