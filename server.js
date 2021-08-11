const express = require('express')
const app = express()
const API_PORT = process.env.API_PORT || 3030

app.use(express.json())

app.use((_, res, next) => {
  const start = process.hrtime()
  res.on('close', _ => {
      const durationInMilliseconds = getDurationInMilliseconds(start)
      console.log(` ${durationInMilliseconds.toLocaleString()} ms`)
  })
  next()
})

const getDurationInMilliseconds = start => {
  const NS_PER_SEC = 1e9
  const NS_TO_MS = 1e6
  const diff = process.hrtime(start)
  return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS
}

const functions = [
  { name: 'test', counter: 0 },
  { name: 'aap', counter: 0 }
]

for (let f = 0; f < functions.length; f++) {
  app.post(`/function/${functions[f].name}`, ((req, res) => {
    const func = require(`./${functions[f].name}`)
    functions[f].counter += 1
    process.stdout.write(`Invoking function "${functions[f].name}" (${functions[f].counter})`)
    try {
      func(req.body, res)
    } catch(err) {
      console.log(err.message)
      res.status(500).send()
    }
  }))
}

app.listen(API_PORT, _ => console.log(`RunFaaS running at port ${API_PORT}`))
