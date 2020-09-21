var pool = require('./pool');

pool.on('connect', () => {
    console.log("connected to the database")
});

/*
 * Creating the database table 
 */

// User table
const createUserTable = () => {
    const createUserQuery = `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        firstname VARCHAR(100) NOT NULL,
        lastname VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_verified BOOL DEFAULT(false),
        verification_token VARCHAR(255) NOT NULL,
        reset_password_token VARCHAR(255),
        reset_password_expiry TIMESTAMP,
        created_at DATE NOT NULL
    )`;
    pool.query(createUserQuery).then((res) => {
        console.log(res);
        pool.end();
    }).catch((error) => {
        console.log(error);
        pool.end();
    });
};


/*
 * Drop User table 
 */
const dropUserTable = () => {
    const dropUserQuery = `DROP TABLE IF EXISTS users`;
    pool.query(dropUserQuery).then((res) => {
        console.log(res);
        pool.end();
    }).catch((error) => {
        console.log(error);
        pool.end();
    });
};


pool.on('remove', () => {
    console.log('client removed');
    process.exit(0);
});


module.exports = {
    createUserTable,
    dropUserTable
}

require('make-runnable');