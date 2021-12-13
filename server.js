const crypto = require('crypto')
const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const path = require('path')
const ejs = require('ejs')
const server = express()

const port = 80
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

    let result = await db.query(`SELECT * FROM account WHERE (username = '${primary}' OR email = '${primary}') AND active`)
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
server.post('/worker_add',  async (request, response) => {
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
        let admin = request.session.account.username;
        let admin_id = await db.query(`SELECT * FROM admin WHERE fk_account = '${admin}'`)
        await db.query(`INSERT INTO account(username, email, password) value ('${username}', '${email}', '${hash(password_1, pepper)}')`)
        await db.query(`INSERT INTO worker(fk_account, fk_approved_by) VALUE ('${username}', '${admin_id[0]['id']}')`)
        return response.redirect('/worker_list')
    }
    request.session.single = true
    request.session.error = error.toString().substr(4)
    response.redirect('/worker_add')
})
server.post(/\/dish_edit\/[0-9]+/,  async (request, response) => {
    let id = request.url.substr(1)
    id = id.split('/')[1]
    let name = await request.body.name
    let description = await request.body.description
    let price = await request.body.price
    let sql = `UPDATE system.dish SET name = '${name}', description = '${description}', price = '${price}' WHERE id = '${id}'`;
    await db.query(sql);
    response.redirect('/dish/' + id)
})
server.post(/\/dish_new/,  async (request, response) => {
    let name = await request.body.name
    let description = await request.body.description
    let price = await request.body.price
    let admin_id = (await db.query(`SELECT * FROM system.admin WHERE fk_account = '${request.session.account.username}'`))[0]['id']
    let sql = `INSERT INTO system.dish(name, description, price, fk_uploaded_by)
                   value ('${name}', '${description}', '${price}', '${admin_id}')`;
    await db.query(sql);
    id = (await db.query(`SELECT id FROM dish WHERE name = '${name}' AND description = '${description}' AND price = '${price}' AND fk_uploaded_by = '${admin_id}'`))[0]['id']
    response.redirect('/dish/' + id)
})
server.post('/news_update',  async (request, response) => {
    let id = await request.body.id
    let value = await request.body.value
    await db.query(`UPDATE system.news SET content = '${value}' WHERE id = '${id}'`);
    response.send('Done!')
})
server.post('/news_new',  async (request, response) => {
    let content = await request.body.content
    let admin_id = (await db.query(`SELECT * FROM system.admin WHERE fk_account = '${request.session.account.username}'`))[0]['id']
    await db.query(`INSERT INTO system.news(content, fk_author) value('${content}', '${admin_id}')`);
    id = (await db.query(`select * from news where content = '${content}'  order by date_time desc`))[0]['id']
    response.redirect('/news_item/' + id)
})
server.post('/email_new', async (request, response) => {
    let getters = await request.body.getters
    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }
    let receivers = getters.toString().split('.').join(' ').split(',').join(' ').split(' ').filter(name => name !== "").filter(onlyUnique)
    let topic = await request.body.topic
    let content = await request.body.content
    await db.query(`INSERT INTO system.email(topic, content, fk_author) value ('${topic}', '${content}', '${request.session.account.username}')`)
    let email_id = (await db.query(`select * from email where content = '${content}' and topic = '${topic}' order by date_time desc`))[0]['id']
    for(let i = 0; i < receivers.length; i++) {
        name = receivers[i]
        user = await db.query(`SELECT * FROM account WHERE username = '${name}'`)
        if(user.length !== 0) {
            await db.query(`INSERT INTO system.email_recipient(fk_email, fk_recipient) value ('${email_id}', '${name}')`)
        }
    }
    response.redirect('/email_new')
})
server.get('/logout', (request, response) => {
    request.session.account = ''
    response.redirect('/')
})
server.get(/\/worker_delete\/[0-9]+/, async (request, response) => {
    let id = request.url.substr(1)
    id = id.split('/')[1]
    let name = (await db.query(`SELECT * FROM system.worker WHERE id = '${id}'`))[0]['fk_account']
    await db.query(`DELETE FROM system.worker WHERE fk_account = '${name}'`)
    await db.query(`DELETE FROM system.account WHERE username = '${name}'`)
    response.redirect('/worker_list')
})
server.get(/\/client_block\/[0-9]+/, async (request, response) => {
    let id = request.url.substr(1)
    id = id.split('/')[1]
    let name = (await db.query(`SELECT * FROM system.client WHERE id = '${id}'`))[0]['fk_account']
    await db.query(`UPDATE account SET active = NOT active WHERE username = '${name}'`)
    response.redirect('/client_list')
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
