const pool = require('./pool');

module.exports = {
    query(querySql, params){
        return new Promise((resolve, reject) => {
            pool.query(querySql, params).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    }
};