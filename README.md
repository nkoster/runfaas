## runfaas

Simple "function as a service" server, with authentication.

### Install

```
git clone https://github.com/nkoster/runfaas
cd runfaas
npm i
mkdir functions
echo 'ACCESS_TOKEN_SECRET=MyBigSecret' >>.env
node server.js
```

The server will detect changes inside the **functions/** directory,
and will reload whenever new functions are added or when old functions are removed. (experimental)

If you like, you can disable the authentication part by adding the following line to your **.env** file:

```
AUTHENTICATION=false
```

In case you want to use a different path for your functions base directory, you can also specify that in the **.env** file:

```
FUNCTIONS_PATH=/faas/api/functions
```

### Deploy a FaaS function

Make or copy a directory inside the **functions/** directory.
The *name* of that directory will be *name* of the function, and also part of the *name* for the API endpoint.
Inside the function *name* directory should live an **index.js** file with a layout like this:

```javascript
module.exports = (body, res) => {
  const { name } = body
  res.send({ message: `your name is ${name}` })
}
```

**body** contains the POST data and **res** an [express response](https://expressjs.com/en/api.html#res) object.

### Example Function

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
or for unauthenticated POST requests in case you disabled authentication.
