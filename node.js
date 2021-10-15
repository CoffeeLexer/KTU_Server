const http = require('http')
const path = require('path')
const express = require('express')
const mysql = require('mysql')
const body_parser = require('body-parser')
const crypto = require('crypto')

const script = require('./script')

const server = express()
const port = 81

const database = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'system',
    multipleStatements: true
})

database.connect((err) =>{
    if(err) throw err;
    console.log(`Database Connected`)
})

// Embedded JavaScript Innit
server.use('/', express.static(path.join(__dirname, 'static')))
server.use(body_parser.json())
server.set('views', path.join(__dirname, '/front-end/ejs'));
server.set('view engine', 'ejs')

server.get('/', (req, res) => {
    res.render('index_template', {
        title: "My Title",
        content: "content",
        time: script.TimeNow()
    });
})
server.get('/news', async (req, res) => {
    res.render('index_template', {
        title: "My Title",
        content: "content_news",
        data: await script.GetNews(database)
    });
})
server.get('/news/*', async (req, res) => {
    res.render('index_template', {
        title: "My Title",
        content: 'content_news_single',
        data: await script.GetNewsById(database, req.url.substr(req.url.lastIndexOf('/') + 1))
    });
})
server.get('/login', (req, res) => {
    res.render('index_template', {
        title: "My Title",
        content: "content_login"
    });
})

server.get('/register', (req, res) =>{
    res.render('index_template', {
        title: "My Title",
        content: "content_register"
    })
})

server.get('/*(.png|.jpg)', (req, res) => {
    res.sendFile(path.join(__dirname, `/front-end/assets${req.url}`))
})
server.get('/*.css', (req, res) => {
    res.sendFile(path.join(__dirname, `/front-end/css${req.url}`))
})
server.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, `/front-end/assets/Vector_Logo.png}`))
})

server.post('/api/register', async (req, res) => {
    console.log(req.body)
    console.log("body")
    res.json({ status: 'ok' })
    await script.AddAccount(database, req.body)
})

server.use((req, res, next) => {
    console.log(`${script.TimeNow()} ${req.url.substr(1)} ${req.ip.substr(7)}`)
    res.status(404).render('index_template', {
        title: "ERROR 404",
        content: 'content_error',
        error: `ERROR 404 Link '${req.url.substr(1)}' is not found`
    })
})
server.listen(port, () => {
    console.log(`Server is Running on port ${port}`)
})