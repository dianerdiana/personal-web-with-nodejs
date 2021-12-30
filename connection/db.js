const { Pool } = require('pg')

const dbPool = new Pool({
    database: 'personal-web-b29',
    port: 5432,
    user: 'postgres',
    password: '23514114'
})

module.exports = dbPool