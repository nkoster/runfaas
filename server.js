const express = require('express')
const app = express()
const API_PORT = process.env.API_PORT || 3030
app.use(express.json())
const functions = [
  { name: 'test', counter: 0 },
  { name: 'aap', counter: 0 }
]
for (let f = 0; f < functions.length; f++) {
  app.post(`/function/${functions[f].name}`, ((req, res) => {
    const func = require(`./${functions[f].name}`)
    try {
      functions[f].counter += 1
      console.log(`Invoking function "${functions[f].name}" (${functions[f].counter})`)
      func(req.body, res)
    } catch(err) {
      console.log(err.message)
      res.status(500).send()
    }
  }))
}
app.listen(API_PORT, _ => console.log(`RunFaaS running at port ${API_PORT}`))
