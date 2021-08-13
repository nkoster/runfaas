## runfaas

Simple "function as a service" server, with authentication.

This thing exists because I didn't want to pay for a license to be able to make use of authentication in "openfaas".

### Install

```
git clone https://github.com/nkoster/runfaas
cd runfaas
npm i
mkdir functions
echo 'ACCESS_TOKEN_SECRET=MyBigSecret' >>.env
node server.js
```

The server will detect files changes inside the functions/ directory
and will reload whenever new functions are added or when old functions are removed. (experimental)

### Deploy a FaaS function

Make or copy a directory inside the **functions/** directory.
The *name* of that directory will be *name* of the function, and also the *name* of the API endpoint.
Inside the function *name* directory should live an **index.js** file with a layout like this:

```javascript
module.exports = (body, res) => {
  const { name } = body
  res.send({ message: `your name is ${name}` })
}
```

**body** contains the POST data and **res** an [express response](https://expressjs.com/en/api.html#res) object.

### Example

Here is an example, with a function named **test1**, and a dependency **pg**, which is a nodejs postgresql client module.

```
mkdir functions/test1
cd functions/test1
npm init -y
npm i pg
cat > index.js << DUDE
module.exports = (body, res) => {
  const pg = require('pg')
  console.log(pg.defaults.host)
  const { name } = body
  res.send({ message: `name was ${name}` })
}
DUDE
```

Function **test1** is now available for authenticated POST requests at endpoint http://localhost:3030/function/test1
