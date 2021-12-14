const crypto = require('crypto')
const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const path = require('path')
const ejs = require('ejs')
const server = express()

const port = 82
const pepper = 'Come \'n Shed'

const db = require('./mysql')
const scripts = require('./scripts')

const {request, response} = require("express");
const {use} = require("express/lib/router");
const {hash} = require("./scripts");

server.use(require('body-parser').json())
server.use(express.urlencoded())
server.use(express.json())
server.use(cookieParser())
server.use(session({secret: 'SHA256'}))

server.get('/debug', (request, response) => {
    response.send(hash('Antanas', pepper))
})

server.get('/favicon.ico', (request, response) => {
    response.sendFile(path.join(__dirname, './assets/favicon.png'))
})
server.get(/.*\.css/, (request, response) => {
    let url = request.url.toString()
    let file = url.substr(url.lastIndexOf('/') + 1)
    response.sendFile(path.join(__dirname, file))
})
server.get(/.*\.(svg|png|js)/, (request, response) => {
    let url = request.url.toString()
    let file = url.substr(url.lastIndexOf('/') + 1)
    response.sendFile(path.join(__dirname, './assets/' + file))
})
server.all(/.*/, (request, response, next) => {
    if(!request.session.single) {
        request.session.error = ''
    }
    else {
        request.session.single = false
}
    next()
})
server.post('/login', async (request, response) => {
    let primary = request.body.primary
    let password = request.body.password

    let result = await db.query(`SELECT * FROM account WHERE username = '${primary}' OR email = '${primary}'`)
    if(result.length === 1) {
        let hash = scripts.hash(password, pepper)
        if(result[0].password === hash) {
            let type = ''
            type = (await db.query(`SELECT * FROM admin WHERE fk_account = '${result[0].username}'`)).length === 1 ? 'admin' : ''
            if(type === '')
                type = (await db.query(`SELECT * FROM worker WHERE fk_account = '${result[0].username}'`)).length === 1 ? 'worker' : ''
            if(type === '')
                type = (await db.query(`SELECT * FROM client WHERE fk_account = '${result[0].username}'`)).length === 1 ? 'client' : ''
            if(type !== '') {
                request.session.account = {
                    'username': result[0].username,
                    'email': result[0].email,
                    'type': type
                }
                return response.redirect('/')
            }
        }
    }
    request.session.single = true
    request.session.error = 'Slaptažodis arba vartotojo vardas/el. paštas įvestas neteisingai'
    response.redirect('/login')
})
server.post('/register', async (request, response) => {
    let error = ''
    let username = request.body.username
    let email = request.body.email
    let password_1 = request.body.password_1
    let password_2 = request.body.password_2
    error = username ? error : error + '<br>Vartotojo vardas nėra užpildytas'
    error = email ? error : error + '<br>Vartotojo el. paštas nėra užpildytas'
    error = password_1 ? error : error + '<br>Vartotojo slaptažodis nėra užpildytas'
    error = password_2 ? error : error + '<br>Vartotojo kartojamas slaptažodis nėra užpildytas'
    if(!error)
        error = password_1 === password_2 ? error : '<br>Slaptažodžiai turi sutapti'
    if(!error) {
        let result = await db.query(`SELECT * FROM account WHERE username = '${username}'`)
        if(result.length !== 0)
            error += '<br>Vartotojas tokiu vardu jau užregistruotas'
        result = await db.query(`SELECT * FROM account WHERE email = '${email}'`)
        if(result.length !== 0)
            error += '<br>Vartotojas tokiu el. paštu jau užregistruotas'
    }
    if(!error) {
        await db.query(`INSERT INTO account(username, email, password) value ('${username}', '${email}', '${hash(password_1, pepper)}')`)
        await db.query(`INSERT INTO client(fk_account) VALUE ('${username}')`)
        return response.redirect('/login')
    }
    request.session.single = true
    request.session.error = error.toString().substr(4)
    response.redirect('/register')
})
server.post('/admin_register',  async (request, response) => {
    let error = ''
    let username = request.body.username
    let email = request.body.email
    let password_1 = request.body.password_1
    let password_2 = request.body.password_2
    error = username ? error : error + '<br>Vartotojo vardas nėra užpildytas'
    error = email ? error : error + '<br>Vartotojo el. paštas nėra užpildytas'
    error = password_1 ? error : error + '<br>Vartotojo slaptažodis nėra užpildytas'
    error = password_2 ? error : error + '<br>Vartotojo kartojamas slaptažodis nėra užpildytas'
    if(!error)
        error = password_1 === password_2 ? error : '<br>Slaptažodžiai turi sutapti'
    if(!error) {
        let result = await db.query(`SELECT * FROM account WHERE username = '${username}'`)
        if(result.length !== 0)
            error += '<br>Vartotojas tokiu vardu jau užregistruotas'
        result = await db.query(`SELECT * FROM account WHERE email = '${email}'`)
        if(result.length !== 0)
            error += '<br>Vartotojas tokiu el. paštu jau užregistruotas'
    }
    if(!error) {
        await db.query(`INSERT INTO account(username, email, password) value ('${username}', '${email}', '${hash(password_1, pepper)}')`)
        await db.query(`INSERT INTO admin(fk_account) VALUE ('${username}')`)
        return response.redirect('/admin_register')
    }
    request.session.single = true
    request.session.error = error.toString().substr(4)
    response.redirect('/admin_register')
})
server.post('/news_update',  async (request, response) => {
    let id = await request.body.id
    let value = await request.body.value
    await db.query(`UPDATE system.news SET content = '${value}' WHERE id = '${id}'`);
    response.send('Done!')
})
server.post('/order_new', async (request, response) =>{
    error = ''
    status = true
    dishes = request.body.dish
    amounts = request.body.amount
    tip = parseFloat(request.body.tip)
    if(isNaN(tip)){
        status = false
        error += '<br>Klaidingai įvedėte arbatpinigius'
    }
    if(!dishes || dishes.length !== amounts.length){
        status = false
        error += '<br>Pasirinkite patiekalą(-us)'
    }
    if(status){
        let db_id = await db.query(`SELECT id FROM client WHERE '${request.session.account.username}' = fk_account`)
        let client_id = db_id[0]["id"]
        let price = 0.0
        for(let i = 0; i < dishes.length; i++){
            let db_price = await db.query(`SELECT price FROM dish WHERE id = ${dishes[i]}`);
            price += db_price[0]["price"] * amounts[i]
        }
        let result = await db.query(`INSERT INTO system.order(fk_client, order_date, price, tip) VALUE (${client_id}, NOW(), ${price}, ${tip})`)
        let order_id = result.insertId
        for(let i = 0; i < dishes.length; i++){
            await db.query(`INSERT INTO order_dish(count, fk_dish, fk_order) VALUE (${amounts[i]}, ${dishes[i]}, ${order_id})`)
        }
    }
    request.session.single = true
    request.session.error = error
    response.redirect('/order_new')
})
server.post('/approve_order', async (request, response) => {
    let error = ''
    let user = request.session.account.username
    let worker_id = (await db.query(`SELECT id FROM worker WHERE fk_account = '${user}'`))[0]['id']
    let order_id = request.body.order_id
    let db_order = await db.query(`SELECT *
                                   FROM system.order
                                   WHERE id = ${order_id}
                                     AND order_end_date IS NULL
                                     AND (fk_worker IS NULL OR fk_worker = ${worker_id})`)
    if (!db_order) {
        error = 'Užsakymą priėmė kitas darbuotojas'
    } else {
        order = db_order[0]
        if (!order['fk_worker']) {
            await db.query(`UPDATE system.order
                            SET fk_worker = '${worker_id}' WHERE id = ${order_id}`)
        } else if (!order['order_end_date']) {
            let driver = await db.query(`SELECT worker.id, username FROM account INNER JOIN worker ON account.username = worker.fk_account WHERE account.username = '${ request.body.driver }'`)
            if(driver.length > 0) {
                await db.query(`UPDATE system.order
                                SET order_end_date = NOW(), fk_driver = ${ driver[0]['id'] }
                                WHERE id = ${order_id}`)
            }
            else{
                error = 'Darbuotojas/vairuotojas tokiu vardu neegzistuoja'
            }
        }
    }
    request.session.single = true
    request.session.error = error
    if(error === '')
        response.redirect(`/order_approved`)
    else
        response.redirect(`/order_details/${order_id}`)
})

server.get('/logout', (request, response) => {
    request.session.account = ''
    response.redirect('/')
})
server.get(/.*/, async (request, response) => {
    let url = request.url.substr(1)
    let split = url.split('/')
    let type = (request.session.account && request.session.account.type) ? request.session.account.type : 'guest'
    let option = split[0] ? split[0] : "default"
    let html = await ejs.renderFile('./ejs/index.ejs', {
        url: url,
        type: type,
        option : option,
        db: db,
        session: request.session
    },
    {
        async:true
    })
    response.send(html)
})
server.listen(port, () => {
    console.log(`Server online http://localhost:${port}`)
})
