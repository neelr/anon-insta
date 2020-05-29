require("dotenv").config();
const { IgApiClient } = require("instagram-private-api");
const fs = require("fs");
const Airtable = require("airtable");
const words = require("./utils/words");
var crypto = require("crypto");
const express = require("express");
const puppeteer = require("puppeteer");
const next = require("next");
const axios = require("axios");
const qs = require("querystring");
const base = new Airtable({ apiKey: process.env.AIRTABLE }).base(
    process.env.BASE
);
const app = express();
app.use(express.json());
app.set("trust proxy", true);
const html = fs.readFileSync("./utils/text.html");
const dev = process.env.NODE_ENV !== "production";
const server = next({ dev });
const handle = server.getRequestHandler();

const MAX_ID = "recwllrvK6qSCN46G";
const ig = new IgApiClient();

var loadHTML = async (name, number, body) => {
    const browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 500 });
    await page.setContent(
        html
            .toString()
            .replace("{{body}}", body.replace("<", "&lt").replace(">", "&rt"))
            .replace("{{name}}", name.replace("<", "&lt").replace(">", "&rt"))
            .replace("{{postNumber}}", number)
    );
    let imgBuffer = await page.screenshot({ type: "jpeg", quality: 100 });
    await browser.close();
    return imgBuffer;
};

var login = async () => {
    ig.state.generateDevice(process.env.IG_USERNAME);
    ig.state.proxyUrl = process.env.IG_PROXY;
    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
};

var checkCaptcha = captcha => {
    return new Promise((res, rej) => {
        axios
            .post(
                "https://www.google.com/recaptcha/api/siteverify",
                qs.stringify({
                    secret: process.env.CAPTCHA,
                    response: captcha
                })
            )
            .then(d => {
                if (d.data.success) {
                    res();
                    return;
                }
                rej();
            });
    });
};

server.prepare().then(() => {
    app.get("/", handle);
    app.get("/_next/*", handle);

    app.post("/api/post", async (req, res) => {
        checkCaptcha(req.body.captcha)
            .then(() => {
                if (!(req.body.body && req.body.name)) {
                    res.sendStatus(500);
                    return;
                }
                let ipHash = crypto
                    .createHash("sha256")
                    .update(req.ip, "utf8")
                    .digest("hex")
                    .toString();
                base("IP Banlist")
                    .select({
                        filterByFormula: `{IP}='${ipHash}'`
                    })
                    .firstPage((err, records) => {
                        if (records.length == 0) {
                            base("Current Number").find(MAX_ID, async (err, record) => {
                                await login();
                                let pngBuffer = await loadHTML(
                                    req.body.name,
                                    record.get("MAX") + 1,
                                    req.body.body
                                );
                                let result = await ig.publish
                                    .photo({
                                        file: pngBuffer,
                                        caption: `${req.body.body}\n - ${req.body.name}`
                                    })
                                    .catch(e => console.log(e));
                                base("Posts").create([
                                    {
                                        fields: {
                                            PersonTag: req.body.name,
                                            Note: req.body.body,
                                            IP: ipHash,
                                            "Post Number": record.get("MAX") + 1,
                                            MediaID: result.media.id
                                        }
                                    }
                                ]);
                                base("Current Number").update([
                                    {
                                        id: MAX_ID,
                                        fields: {
                                            MAX: record.get("MAX") + 1
                                        }
                                    }
                                ]);
                                res.sendStatus(200);
                            });
                        } else {
                            res.sendStatus(401);
                        }
                    });
            })
            .catch(d => {
                res.sendStatus(401);
            });
    });

    app.post("/api/comment", (req, res) => {
        checkCaptcha(req.body.captcha)
            .then(d => {
                if (!(req.body.body && req.body.postNumber)) {
                    res.sendStatus(500);
                    return;
                }
                let ipHash = crypto
                    .createHash("sha256")
                    .update(req.ip, "utf8")
                    .digest("hex")
                    .toString();
                base("IP Banlist")
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
                                        res.sendStatus(404);
                                        return;
                                    }
                                    records.forEach(async record => {
                                        let prefixHash = crypto
                                            .createHash("sha256")
                                            .update(`${req.ip}-${record.get("Post Number")}`, "utf8")
                                            .digest("hex")
                                            .toString();
                                        let prefix;
                                        if (record.get("IP") == ipHash) {
                                            prefix = "🔴 OP";
                                        } else {
                                            prefix = `${
                                                words.adjectives[
                                                parseInt(prefixHash.slice(0, 32), 16) %
                                                words.adjectives.length
                                                ]
                                                } ${
                                                words.animals[
                                                parseInt(prefixHash.slice(32), 16) %
                                                words.animals.length
                                                ]
                                                }`;
                                        }
                                        console.log(prefix);
                                        await login();
                                        ig.media.comment({
                                            mediaId: record.get("MediaID"),
                                            text: `${prefix}: ${req.body.body}`
                                        });
                                        res.sendStatus(200);
                                    });
                                });
                        } else {
                            res.sendStatus(401);
                        }
                    });
            })
            .catch(d => {
                res.sendStatus(401);
            });
    });

    app.listen(3000, () => console.log("on port 3000"));
});
