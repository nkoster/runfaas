## runfaas

Simple "function as a service" server, with authentication.

### Install

```
git clone https://github.com/nkoster/runfaas
cd runfaas
npm i
mkdir functions
echo 'ACCESS_TOKEN_SECRET=MyBigSecret' >>.env
echo 'ADMIN_USER=admin' >>.env
echo 'ADMIN_PASSWORD=AnotherSecret' >>.env
node server.js
```

The server will detect changes inside the **functions/** directory,
and will reload whenever new functions are added or when old functions are removed.

If you want, you can disable the authentication part by adding the following line to your **.env** file:

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

Here is an example for a function named **hellofaas**, with a dependency **pg**, which is a nodejs postgresql client library.

```
mkdir functions/hellofaas
cd functions/hellofaas
npm init -y
npm i pg
cat > index.js << DUDE
module.exports = (body, res) => {
  const pg = require('pg')
  const { name } = body
  res.send({ message: `${name}, pg is at host ${pg.defaults.host}`})
}
DUDE
```

Function **hellofaas** is now available for authenticated POST requests at endpoint http://localhost:3030/function/hellofaas
or for unauthenticated POST requests in case you have disabled authentication.

There's a tiny "admin" page at http://localhost:3030/ where all invocations (and catched errors) are logged with counters and response times.
You need to set and use the **ADMIN_USER** and **ADMIN_PASSWORD** in the **.env** to access the "admin" page.
To do: extend the admin page.
