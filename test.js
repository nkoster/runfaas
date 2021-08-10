module.exports = (body, res) => {
  const { name } = body
  res.send({ message: `name was ${name}`})
}
