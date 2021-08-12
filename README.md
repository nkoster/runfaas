## runfaas

Simple "function as a service" server in nodejs.

### Install

```
git clone https://github.com/nkoster/runfaas
cd runfaas
npm i
mkdir functions
nodemon server.js
```

I am using nodemon here because runfaas is not able to detect and process changes inside
the functions/ folder at this moment so nodemon takes care of that at this moment.
That's my next challenge.

### Deploy a FaaS function

Make or copy a folder inside the functions/ folder.
The name of that folder will be name of the function and also the name of the API endpoint.
Inside the function folder should live an index.js file.

Here is an example index.js with minimal code:

```javascript
module.exports = (body, res) => {
  const pg = require('pg')
  console.log(pg.defaults.host)
  const { name } = body
  res.send({ message: `name was ${name}`})
}
```
