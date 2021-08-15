;(async _ => {

require('dotenv').config()
const useAuth = process.env.AUTHENTICATION === 'false' ? false : true
const functionsPath = process.env.FUNCTIONS_PATH || './functions'
const log = console.log.bind(console)
const chokidar = require('chokidar')
const express = require('express')
const app = express()
const cluster = require('cluster')
const open = require('open')
const fs = require('fs')
const jwt = require('jsonwebtoken')
const ws = require('ws')
const wss = new ws.Server({ noServer: true })
const sockets = new Map()

const API_PORT = process.env.API_PORT || 3030

const fileCounter = { state: 0 }

const functions = fs.readdirSync(functionsPath)
  .map(f => {
    return {
      name: f,
      counter: 0
    }
  })

if (functions.length === 0) {
  log(`No functions found in ${functionsPath}/`)
}

if (cluster.isMaster) {

  const glob = require('glob')

  const files = await new Promise((resolve, reject) => {
    glob(functionsPath + '/*/!(node_modules)', (err, result) => {
      if (err) reject(null)
      resolve(result)
    })
  })

  const worker = { state: cluster.fork() }

  cluster.on('exit', _ => worker.state = cluster.fork())

  const watcher = chokidar.watch(`${functionsPath}/`, {
    ignored: [/^\./, /node_modules/, /\.git/, /\/tls\//],
    persistent: true
  })

  const restartWorker = path => {
    fileCounter.state++
    if (fileCounter.state > files.length) {
      log(`--- Reload (${path})`)
      process.kill(worker.state.process.pid)
    }
  }

  watcher
    .on('add', path => restartWorker(path))
    .on('unlink', path => restartWorker(path))

  log(`--- RunFaaS running at port ${API_PORT}`)

  open(`http://localhost:${API_PORT}`)

}

if (cluster.isWorker) {

  app.use((req, res, next) => {
    if (req.method === 'POST') return next()
    const auth = { login: process.env.ADMIN_USER, password: process.env.ADMIN_PASSWORD }
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')
    if (login && password && login === auth.login && password === auth.password) {
      return next()
    }
    res.set('WWW-Authenticate', 'Basic realm="401"')
    res.status(401).send('Authentication required.')
  })

  app.use(express.json())
  
  const getDurationInMilliseconds = start => {
    const NS_PER_SEC = 1e9
    const NS_TO_MS = 1e6
    const diff = process.hrtime(start)
    return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS
  }

  const authenticateToken = (req, res, next) => {
    const failure = { state: false }
    if (!useAuth) return next()
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (!token) {
      log('--- No token supplied')
      failure.state = true
      return res.status(200).send({ error: 'No token supplied'})
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        log('--- Token did not verify')
        failure.state = true
        return res.status(200).send({ error: 'Token did not verify'})
      }
      req.user = user
      return next()
    })
  }
  
  app.use((req, res, next) => {
    if (!req.originalUrl.includes('/function/')) return next()
    const start = process.hrtime()
    res.on('close', _ => {
        const durationInMilliseconds = getDurationInMilliseconds(start)
        const message = `--- Function ended after ${durationInMilliseconds.toLocaleString()} ms`
        log(message)
        Array.from(sockets.keys()).forEach(socket => {
          socket.send(message.replace('---', '') + '<br>\n')
        })
    })
    return next()
  })

  for (let f = 0; f < functions.length; f++) {
    app.post(`/function/${functions[f].name}`, authenticateToken, ((req, res) => {
      const func =
        require(`${functionsPath}/${functions[f].name}/index`)
      functions[f].counter += 1
      const message = `--- Invoking function "${functions[f].name}" (${functions[f].counter})`
      log(message)
      try {
        func(req.body, res)
        Array.from(sockets.keys()).forEach(socket => {
          socket.send(new Date(Date.now()).toString().replace(/\((.+)\)/, '') + message)
        })
      } catch(err) {
        log(err.message)
        res.status(500).send()
      }
    }))
  }
  
  const path = require('path')
  app.use(express.static(path.join(__dirname, 'public')))

  wss.on('connection', socket => {
    console.log('--- websocket connection')
    sockets.set(socket, {})
    socket.on('close', _ => sockets.delete(socket))
  })

  const server = app.listen(API_PORT, _ => log(`--- ${functions.length} function${
    functions.length != 1 ? 's' : ''
  } active`))
  
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, socket => {
      wss.emit('connection', socket, request)
    })
  })

}

})()
