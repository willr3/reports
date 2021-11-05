require('babel-register')({
    presets: ['es2015', 'react']
});

const express = require('express')
const fs = require('fs').promises;
const fsOld = require('fs')
const Path = require('path')
const http = require('http')
const bodyParser = require('body-parser')
const multer = require('multer') // v1.0.5
const WebSocket = require('ws')
const url = require('url');
const wss = new WebSocket.Server({ noServer: true, clientTracking: true })
var zlib = require('zlib');
const { promisify } = require("util");

const jsonpath = require('jsonpath');

var DateTime = require('luxon').DateTime;

const dataPath = (process.env.DATA_PATH || __dirname+"/data")+"/"

wss.broadcast = (data, skip) => {
    let encoded = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client === skip) {
        } else if (client.readyState === WebSocket.OPEN) {
            client.send(encoded)
        }
    })
}
wss.on('connection', (ws, req) => {
    ws.on('message', (message) => {
        if (!message.data) {
            ws.send(false, (error) => {
                if (error) {
                    console.error("WS sendError for !data", error)
                }
            })
        } else {
            ws.send(Date.now(), (error) => {
                if (error) {
                    console.error("WS sendError for date ack", error)
                }
            })
        }
    })
    ws.on('close', () => {
        //TODO 
    })
})

const ls = async (path, filter) => {
    return fs.readdir(path).then((files) => {
        return Promise.all(files.map(file => {
            const fullPath = Path.join(path, file)
            return fs.stat(fullPath).then(stat => {
                const { size, mtimeMs } = stat
                return {
                    name: file,
                    fullPath,
                    isDirectory: stat.isDirectory(),
                    isFile: stat.isFile(),
                    size,
                    time: mtimeMs
                }
            }).catch((e) => { return { file, error: e } })
        })
        ).then(files=>{
            return Promise.resolve(files.filter(filter))
        })
    },(error)=>{
        console.log("Error ls",path,error)
    })
}

const app = express()
app.set("port", process.env.PORT || 3001);
const server = http.createServer(app);

app.use( (req,res,next) => {
    console.log(req.method,req.url)
    next()
})

server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;

    //TODO pick between different sockets
    wss.handleUpgrade(request, socket.head, (ws) => {
        wss.emit('connection', ws, request)
    })
})
const upload = multer() // for parsing multipart/form-data
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }))
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

app.post("/api/map", async (req, res) => {
    try {
        let { accessors, files } = req.body;
        if (accessors) {
            Object.keys(accessors).forEach(key => {
                const value = accessors[key].trim()
                if ((value.startsWith("(") && value.includes("=>")) || (value.startsWith("function") && value.endsWith("}"))) {
                    try {
                        //webpack minifier breaks name of jsonpath, etc.
                        //going to pass them as arguemnts to wrapped fn
                        const factory = new Function('jsonpath', 'DateTime', "return " + value)
                        const newFn = factory(jsonpath, DateTime)
                        accessors[key] = newFn;
                    } catch (e) {
                        console.error("failed to recreate", key, e)
                        delete accessors[key]
                    }
                }
            })
        }
        const rtrn = []
        if (Array.isArray(files) && accessors) {
            await Promise.all(files.map(file => {
                return fs.readFile(file).then(content => {
                    return Promise.resolve(JSON.parse(content));
                    // used if we are reading from zips on the filesystem
                    // return new Promise((resolve,reject)=>{
                    //     zlib.unzip(Buffer.from(content),(err,buffer)=>{
                    //         if(err){
                    //             reject(err)
                    //         }
                    //         var json = JSON.parse(buffer.toString())
                    //         json.jenkinsId = file.substring(file.lastIndexOf("/")+1,file.length-".json".length);
                    //         resolve(json);
                    //     })
                    // })
                }).then((json, jsonIndex, allJson) => {
                    const fileName = file.substring(file.lastIndexOf('/') + 1)
                    const entry = { file: fileName.substring(0, fileName.lastIndexOf('.')), data: {} }
                    if (accessors && Object.keys(accessors).length > 0) {
                        Object.keys(accessors).forEach(key => {
                            const value = accessors[key];
                            if (typeof value === "string") {
                                if (value.startsWith("$")) {
                                    entry.data[key] = jsonpath.query(json, value)
                                    if (Array.isArray(entry.data[key]) && entry.data[key].length === 1) {
                                        entry.data[key] = entry.data[key][0]
                                    }
                                } else {
                                    entry.data[key] = json[value]
                                }
                            } else if (typeof value === "function") {
                                try {
                                    entry.data[key] = value(json, jsonIndex, allJson/*,jsonpath,DateTime*/) //testing if they are needed
                                } catch (e) {
                                    console.error("failed to apply", key, value, e)
                                }
                            }
                        })
                    } else {
                        entry.data = json;
                    }
                    rtrn.push(entry)
                })
            }))
        }
        res.send(rtrn)
    } catch (wtf) {
        console.error("wtf", wtf);
        res.status(400).json({
            error: JSON.stringify(wtf)
        })
    }
})
app.post("/api/data/:groupId/:name", upload.array(), async (req, res) => {
    let { groupId = "", name = false } = req.params
    if (!name) {
        name = Date.now()
    }
    if(!name.endsWith(".json")){
        name = `${name}.json`
    }
    fs.access(`${dataPath}/${groupId}`,fsOld.constants.F_OK).then(
        (ok) => {
            return Promise.resolve(ok)
        },
        (error) => {
            return fs.mkdir(`${dataPath}/${groupId}`)
        }
    ).then(() => {
        return fs.writeFile(`${dataPath}/${groupId}/${name}`,
            JSON.stringify(req.body),
            { flag: "wx" } // prevents us from overriding an existing file    
        )
    })
    .then(
        (pass) => {
            res.json({ ok: Date.now() })
        },
        (error) => {
            console.log("error", error)
            res.status(400).json({
                error: JSON.stringify(error)
            })
        }
    )
})
app.delete("/api/data/:groupId/:name", upload.array(), async (req, res) => {
    let { groupId = "", name = false } = req.params
    if(!name){
        res.status(400).json({
            error: "mising name",
            groupId
        })
    }
    fs.unlink(`${dataPath}/${groupId}/${name}`).then((ok)=>{
        res.json({ ok: Date.now() })
    },
    (error)=>{
        res.status(400).json({
            error: JSON.stringify(error)
        })
    })
})
const applyFilter = (filter,file)=>{    
    let rtrn = true;
    if(file.hasOwnProperty(filter)){
        rtrn = file[filter]
    }else if ( /\/[^\/]+\/.*/.test(filter)){
        const m = /\/([^\/]+)\/(.*)/.exec(filter)
        rtrn = RegExp(m[1],m[2]).test(file.name)
    }
    return rtrn
}
app.get("/api/ls", async (req, res) => {
    let {filter=false,path=""} = req.query
    
    let fullPath = `${dataPath}/${path}`;

    if (fullPath.endsWith("/")) {
        fullPath = fullPath.substring(0, fullPath.length - 1);
    }
    const f = filter ? (file)=>{
        if(Array.isArray(filter)){
            return filter.map((entry)=>applyFilter(entry,file)).reduce((a,b)=>a&&b,true)
        }else{
            return applyFilter(filter,file)
        }
    } : (file)=>{
        return true
    }
    const files = await ls(fullPath,f);
    res.json({ fullPath, name: Path.basename(fullPath), files })
});

const staticServer = express.static(`${dataPath}`);
app.use("/api/data", 
    (req,res,next)=>{
        staticServer(req,res,next)
    }
);
//https://medium.com/swlh/how-to-use-useeffect-on-server-side-654932c51b13
app.use("/",express.static(__dirname));//serve the most recent npm run build

app.get('/*', (req, res) => { //redirect urls to index.html for initial load of SPA paths
    console.log("/*",req.url)
    if(!req.url.startsWith("/api")){
        res.sendFile(Path.resolve(__dirname, './index.html'));
    }
    
})

server.listen(app.get("port"), () => {
    console.log(`Find the api server @ http://localhost:${app.get("port")}/`);
})