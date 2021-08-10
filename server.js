const express = require('express')
const app = express()

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
    } catch(err) {
      res.status(500).send()
    }
  }))
})

app.listen(3030)
