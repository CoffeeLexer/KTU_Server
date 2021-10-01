const http = require('http')
const path = require('path')
const express = require('express')
const mysql = require('mysql')

const server = express()
const port = 80

// Embedded JavaScript Innit
server.set('views', path.join(__dirname, '/front-end/ejs'));
server.set('view engine', 'ejs')

server.get('/', (req, res) => {
    res.render('index', {
        title: "My Title"
    });
})
server.get('/*(.png|.jpg)', (req, res) => {
    res.sendFile(path.join(__dirname, `/front-end/assets${req.url}`))
})
server.get('/*.css', (req, res) => {
    res.sendFile(path.join(__dirname, `/front-end/css${req.url}`))
})
server.listen(port, () => {
    console.log(`Server is Running on port ${port}`)
})