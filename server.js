const express = require('express')
const app = express()
const API_PORT = process.env.API_PORT || 3030

app.use(express.json())

const functions = [
  'test',
  'aap'
]

functions.forEach(f => {
  app.post(`/function/${f}`, ((req, res) => {
    const func = require(`./${f}`)
    try {
      func(req.body, res)
      console.log(`Invoked function "${f}"`)
    } catch(err) {
      console.log(err.message)
      res.status(500).send()
    }
  }))
})

app.listen(API_PORT, _ =>
  console.log(`RunFaaS running at port ${API_PORT}`))
