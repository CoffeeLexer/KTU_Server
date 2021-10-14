module.exports = {
    DB_RowCount,
    SyncQuery,
    TimeNow,
    GetNews,
    GetNewsById
}
function TimeNow() {
    let time = new Date()
    let yyyy = time.getFullYear()
    let MM = time.getMonth() + 1
    let dd = time.getDate()
    let hh = time.getHours()
    let mm = time.getMinutes()
    let ss = time.getSeconds()
    let ml = time.getMilliseconds()
    yyyy = "0".repeat(4 - yyyy.toString().length) + yyyy.toString()
    MM = "0".repeat(2 - MM.toString().length) + MM.toString()
    dd = "0".repeat(2 - dd.toString().length) + dd.toString()
    hh = "0".repeat(2 - hh.toString().length) + hh.toString()
    mm = "0".repeat(2 - mm.toString().length) + mm.toString()
    ss = "0".repeat(2 - ss.toString().length) + ss.toString()
    ml = "0".repeat(3 - ml.toString().length) + ml.toString()
    return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}.${ml}`
}
function DB_RowCount(database, table) {
    var count;
    var flag = true
    database.query(`SELECT COUNT(*) as \`count\` FROM ${table}`, (err, result) => {
        if (err) throw err
        count = result[0]['count']
        flag = false
    })
    while(flag) {require('deasync').sleep(10);}
    return count
}
async function SyncQuery(database, sql) {
    let x = -1
    const p = new Promise((resolve, reject) => {
        database.query(`SELECT COUNT(*) as \`count\` FROM position`, (err, result) => {
            if(err) reject(err);
            else resolve(result)
        })
    })
    return p
}
async function GetNews(database) {
    return new Promise((resolve, reject) => {
        database.query(`select news.id, content, CONCAT(DATE_FORMAT(date_time, "%Y-%m-%d"), TIME_FORMAT(date_time, " %H:%i")) as \`time\`, fk_account as author from news
            join admin a on a.id = news.fk_author`, (err, result) => {
            if(err) reject(err);
            else resolve(result)
        })
    })
}
async function GetNewsById(database, id) {
    return new Promise((resolve, reject) => {
        database.query(`select content, CONCAT(DATE_FORMAT(date_time, "%Y-%m-%d"), TIME_FORMAT(date_time, " %H:%i")) as time, fk_account as author from news
            join admin a on a.id = news.fk_author where news.id = ${id}`, (err, result) => {
            if(err) reject(err);
            else resolve(result)
        })
    })
}
async function DatabaseQuery(database, sql) {
    return new Promise((resolve, reject) => {
        database.query(sql, (err, result) => {
            if (err) reject(err);
            else resolve(result)
        })
    })
}