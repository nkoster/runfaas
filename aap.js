module.exports = (body, res) => {
  const { name } = body
  res.send({ message: `hey aapaap, name was ${name}`})
}
