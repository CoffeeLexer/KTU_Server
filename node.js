const express = require('express')
const server = express()
const path = require('path')
const port = 80

server.get('/', (req, res) => {
    console.log("/")
    res.sendFile(path.join(__dirname, '/front-end/html/index.html'))
})
server.get('/assets/Logo_1.png', (req, res) => {
    res.sendFile(path.join(__dirname, '/front-end/assets/Logo_1.png'))
})
server.get('/assets/burger.jpg', (req, res) => {
    res.sendFile(path.join(__dirname, '/front-end/assets/burger.png'))
})
server.get('/css/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, '/front-end/css/style.css'))
})
server.listen(port, () => {
    console.log(`Server is Running on port ${port}`)
})