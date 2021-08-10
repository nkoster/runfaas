;(_ => {

const express = require('express')
const app = express()

app.use(express.json())

app.post('/function/test', ((req, middleware, res) => {
  const func = require('./test')
  try {
    func(req.body, res)
  } catch(err) {
    res.status(500).send()
  }
}))

app.listen(3030)

})()
