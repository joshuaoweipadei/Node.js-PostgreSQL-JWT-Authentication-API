# Node.js-PostgreSQL-JWT-Authentication-API

## Project setup
```
npm install
```

Before starting the server, create a 'config.json' file in the root directory.

Copy and paste this codes below. Enter your database name, user, port and password

Connection to PostgreSQL Database.
```json
{
    "database_conn": {
        "host": "localhost",
        "database": "",
        "port": "",
        "user": "", 
        "password": ""
    },
    "secret": "my secret is coding!!!"
}
```


### Start Server and Create Database Tables
```
npm run setup
```