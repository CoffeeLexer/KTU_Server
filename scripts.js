const crypto = require("crypto");
module.exports = {
    hash
}
function hash(string, pepper) {
    return crypto.createHmac('sha256', pepper)
        .update(string)
        .digest('hex')
}