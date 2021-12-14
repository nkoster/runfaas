;(async _ => {

require('dotenv').config()
const useAuth = process.env.AUTHENTICATION !== 'false'
const functionsPath = process.env.FUNCTIONS_PATH || './functions'
const log = console.log.bind(console)
const chokidar = require('chokidar')
const express = require('express')
const axios = require('axios')
const https = require('https')
const app = express()
const cors = require('cors')
app.use(cors())
const cluster = require('cluster')
const open = require('open')
const fs = require('fs')
const jwt = require('jsonwebtoken')
const ws = require('ws')
const wss = new ws.Server({ noServer: true })
const getPem = require('rsa-pem-from-mod-exp')
const API_PORT = process.env.API_PORT || 3030
const fileCounter = { state: 0 }

const functions = fs.readdirSync(functionsPath)
  .map(f => {
    return {
      name: f,
      counter: 0
    }
  })

if (functions.length === 0) log(`No functions found in ${functionsPath}/`)

// Fetch certificate data from OIDC end-point
let cert = {}
if (useAuth) {
  cert = await axios.get(process.env.OID_CERT_URL, {
    // Workaround for expired TLS cert in my docker environment
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  })
    .then(r => r.data.keys)
    .catch(err => {
      throw new Error(err)
    })
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

  if (process.env.OPEN_ADMIN_PAGE === 'true') open(`http://localhost:${API_PORT}`)

}

if (cluster.isWorker) {

  const myDateString = _ =>
    new Date(Date.now()).toString().replace(/\((.+)\)/, '')
    .split(' ').splice(0, 5).join(' ')

  const send = msg => wss.clients.forEach(c => {
    log(`--- ${msg}`)
    c.send(`${myDateString()} ${msg}`)
  })

  const path = require('path')

  app.use('/', express.static(path.join(__dirname, 'ui')))
  app.use('/admin', express.static(path.join(__dirname, 'public')))

  app.use(express.json())

  app.use((req, res, next) => {
    if (req.method === 'POST') return next()
    const auth = {
      login: process.env.ADMIN_USER,
      password: process.env.ADMIN_PASSWORD
    }
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')
    if (login && password && login === auth.login && password === auth.password) {
      return next()
    }
    res.set('WWW-Authenticate', 'Basic realm="RunFaaS Admin Login"')
    res.status(401).send('Authentication required.')
  })

  const getDurationInMilliseconds = start => {
    const NS_PER_SEC = 1e9
    const NS_TO_MS = 1e6
    const diff = process.hrtime(start)
    return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS
  }

  // OpenIDConnect authentication middleware.
  const authenticateToken = async (req, res, next) => {

    // If authentication is disabled, just continue...
    if (!useAuth) return next()

    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (!token) {
      const message = 'No token supplied'
      send(message)
      return res.status(401).send({ error: message })
    }

    // Check if the access_token is valid.
    let data
    data = await axios.request({
      url: '/introspect',
      data: `token=${token}`,
      method: 'post',
      baseURL: process.env.OID_BASE_URL,
      auth: {
        username: process.env.API_USERNAME,
        password: process.env.OPENID_PASSWORD
      },
    })
      .then(res => res.data)
      .catch(err => {
        send(err.message)
        res.status(501).send(err.message)
      })

    // The token is "active", let's continue...
    if (data.active) {
      const ssoContext = await axios.request({
          url: '/ssocontext',
          baseURL: process.env.OID_BASE_URL,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(r => r.data)
        .catch(err => send(err.message))

      // Verify the ssoContext JWT
      const modulus = cert[0].n
      const exponent = cert[0].e
      const pem = getPem(modulus, exponent)
      jwt.verify(ssoContext, pem, { algorithms: 'RS256' }, (err, user) => {
        if (err) {
          const message = `SSOContext did not verify against secret "${pem}"`
          send(message)
          return res.status(500).send({error: err.message})
        }
        req.user = user
        if (user.organization.pv_entity_id === 3) {
          // All good, continue middleware.
          return next()
        }
        const message = 'User not allowed.'
        send(message)
        return res.status(401).send({error: message})
      })
    }
    else {
      const message = 'Access token is not active.'
      send(message)
      return res.status(401).send(message)
    }

  }

  app.use((req, res, next) => {
    if (!req.originalUrl.includes('/function/')) return next()
    const func = req.originalUrl.split('/')[2]
    const start = process.hrtime()
    res.on('close', _ => {
      const durationInMilliseconds = getDurationInMilliseconds(start)
      const message = `Function "${func}" finished in ${durationInMilliseconds.toLocaleString()} ms`
      send(message)
    })
    return next()
  })

  for (let f = 0; f < functions.length; f++) {
    app.post(`/function/${functions[f].name}`, authenticateToken, ((req, res) => {
      let func = null
      try {
        func = require(`${functionsPath}/${functions[f].name}/index`)
      } catch (err) {
        const message = 'Error: ' + err.message
        send(message)
        return res.status(500).send()
      }
      if (typeof func !== 'function') {
        const message = `Error: Invalid function "${functions[f].name}"`
        send(message)
        return res.status(500).send()
      }
      functions[f].counter += 1
      const message = `Invoking function "${functions[f].name}" (${functions[f].counter})`
      try {
        func(req.body, res)
        send(message)
      } catch(err) {
        send(err.message)
        res.status(500).send()
      }
    }))
  }
  
  const server = app.listen(API_PORT, _ => log(`--- ${functions.length} function${
    functions.length !== 1 ? 's' : ''
  } active`))
  
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, socket => {
      wss.emit('connection', socket, request)
    })
  })

}

})()
