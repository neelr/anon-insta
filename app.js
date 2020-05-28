require("dotenv").config()
const { IgApiClient } = require("instagram-private-api")
const html2image = require("node-html-to-image")
const fs = require("fs")
const Airtable = require('airtable');
const words = require("./words")
const pngToJpeg = require('png-to-jpeg');
var crypto = require('crypto');
const express = require("express")
const base = new Airtable({ apiKey: process.env.AIRTABLE }).base(process.env.BASE);
const app = express()
app.use(express.json())
app.set('trust proxy', true)
const html = fs.readFileSync("text.html")

const MAX_ID = "recwllrvK6qSCN46G"
const ig = new IgApiClient();

var login = async () => {
    ig.state.generateDevice(process.env.IG_USERNAME);
    ig.state.proxyUrl = process.env.IG_PROXY;
    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
}

app.post("/api/post", async (req, res) => {
    if (!(req.body.body && req.body.name)) {
        res.sendStatus(500)
        return;
    }
    let ipHash = crypto.createHash('sha256').update(req.ip, 'utf8').digest('hex').toString();
    base('IP Banlist')
        .select({
            filterByFormula: `{IP}='${ipHash}'`
        })
        .firstPage((err, records) => {
            if (records.length == 0) {
                base('Current Number').find(MAX_ID, async (err, record) => {
                    await login()
                    let image = await html2image({
                        html: html.toString().replace("{{body}}", req.body.body).replace("{{name}}", req.body.name).replace("{{number}}", record.get("MAX") + 1)
                    })
                    let pngBuffer = await pngToJpeg({ quality: 100 })(image)
                    let result = await ig.publish.photo({
                        file: pngBuffer,
                        caption: 'my caption',
                    })
                    base('Posts').create([
                        {
                            "fields": {
                                PersonTag: req.body.name,
                                Note: req.body.body,
                                IP: ipHash,
                                "Post Number": record.get("MAX") + 1,
                                MediaID: result.media.id
                            }
                        }])
                    base("Current Number")
                        .update([
                            {
                                id: MAX_ID,
                                fields: {
                                    "MAX": record.get("MAX") + 1
                                }
                            }
                        ])
                    res.sendStatus(200)
                });
            } else {
                res.sendStatus(401)
            }
        })
})

app.post("/api/comment", (req, res) => {
    if (!(req.body.body && req.body.postNumber)) {
        res.sendStatus(500)
        return;
    }
    let ipHash = crypto.createHash('sha256').update(req.ip, 'utf8').digest('hex').toString();
    base('IP Banlist')
        .select({
            filterByFormula: `{IP}='${ipHash}'`
        })
        .firstPage((err, records) => {
            if (records.length == 0) {
                base("Posts")
                    .select({
                        filterByFormula: `{Post Number}='${req.body.postNumber}'`
                    })
                    .eachPage(records => {
                        if (records.length == 0) {
                            res.sendStatus(404)
                            return;
                        }
                        records.forEach(async record => {
                            let prefixHash = crypto.createHash('sha256').update(`${req.ip}-${record.get("Post Number")}`, 'utf8').digest('hex').toString();
                            let prefix;
                            if (record.get("IP") == ipHash) {
                                prefix = "OP"
                            } else {
                                prefix = `${words.adjectives[parseInt(prefixHash.slice(0, 32), 16) % words.adjectives.length]} ${words.animals[parseInt(prefixHash.slice(32), 16) % words.animals.length]}`
                            }
                            console.log(prefix)
                            await login()
                            ig.media.comment({
                                mediaId: record.get("MediaID"),
                                text: `${prefix}: ${req.body.body}`
                            })
                            res.sendStatus(200)
                        })
                    })
            } else {
                res.sendStatus(401)
            }
        })
})

app.listen(3000, () => console.log("on port 3000"))