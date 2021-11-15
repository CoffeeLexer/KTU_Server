const mysql = require('mysql')

module.exports = {
    query
}


const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'system'
})

connection.connect((error) => {
    if(error) throw error
    console.log('DB Connected!')
})

async function query(sql) {
    return new Promise((resolve, reject) => {
        connection.query(sql, (error, result) => {
            if(error) reject(error)
            else resolve(result)
        })
    })
}