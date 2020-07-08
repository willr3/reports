const proxy = require('http-proxy-middleware')

const port = 3001

module.exports = function(app){
    app.use(proxy('/.test',{target: `http://localhost:${port}/`}))
    app.use(proxy('/api',{target: `http://localhost:${port}/`}))
    app.use(proxy('/ws', {target: `ws://localhost:${port}/`,ws:true}))
}
