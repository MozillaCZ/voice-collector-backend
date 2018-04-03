const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');
const fs = require('fs');
let stream = fs.createWriteStream("logs.txt");
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

let allowedKeys = [];

fs.readFile('allowedKeys.json', 'utf8', function(err, contents) {
    allowedKeys = JSON.parse(contents.toString());
});

let dbConfig = {
    host: "localhost",
    user: "",
    password: "",
    database: "voice-collector",
};

app.post('/api/submit', function (req, res) {
    res.write('{"status":"written"}');
    res.end();
    let db = mysql.createConnection(dbConfig);
    console.log('got post');
    db.connect(function (err) {
        if (err) {
            console.error(err);
        }
        console.log(JSON.stringify(req.body));
        let request = req.body;
        request.forEach((value) => {
            db.query('SELECT id FROM sentences WHERE sentence = ? LIMIT 1', value, function (checkErr, checkResult) {
                let json = JSON.stringify(checkResult);
                if (json != undefined) {
                    if (JSON.parse(JSON.stringify(checkResult)).length === 0) {
                        db.query('INSERT INTO sentences (sentence) VALUES (?)', value, function (err, result) {
                            if (err) {
                                console.error(err);
                            }
                        });
                    }
                }
            });
        });
        setTimeout(() => {
            db.end();
        }, 3000);
    });
});

app.post('/api/get', function (req, res) {
    let db = mysql.createConnection(dbConfig);
    console.log('got post api/get');
    console.log('key', JSON.stringify(req.body));
    if (allowedKeys.includes(req.body.key)) {
        db.connect(function (err) {
            if (err) {
                console.error(err);
            }
            db.query('SELECT id, sentence FROM sentences WHERE approved = 0 ORDER BY RAND() LIMIT 50', function (checkErr, checkResult) {
                let json = {
                    "status": "success",
                    "sentences": checkResult,
                };
                res.send(JSON.stringify(json));
                res.end();
                db.end();
            });
        });
    } else {
        res.send('{"status":"forbidden"}');
        res.end();
    }
});

app.post('/api/update', function (req, res) {
    let db = mysql.createConnection(dbConfig);
    console.log('got post api/update');
    console.log('key', JSON.stringify(req.body));
    if (allowedKeys.includes(req.body.key)) {
        db.connect(function (err) {
            if (err) {
                console.error(err);
            }
            console.log(req.body.status, req.body.sentence, req.body.id);
            db.query('UPDATE `sentences` SET approved = ?, sentence = ? WHERE id = ?', [req.body.status, req.body.sentence, req.body.id], function (checkErr, checkResult) {
                let json = {
                    "status": "success",
                };
                res.send(JSON.stringify(json));
                res.end();
                db.end();
            });
        });
    } else {
        res.send('{"status":"forbidden"}');
        res.end();
    }
});

app.listen(4877, () => {
    console.log('Listening on 4877');
});

class Db {
    constructor(config) {
        this.db = mysql.createConnection(config);
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.db.connect(function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    kill() {
        this.db.end();
    }

    queryNoData(query) {
        return new Promise((resolve, reject) => {
            this.db.query(query, function (err, result, fields) {
                if (err) reject(err);
                for (let i in result) {
                    console.log('Post Titles: ', result[i]);
                }
                resolve(result);
            });
        });
    }

    queryData(query, data) {
        return new Promise((resolve, reject) => {
            this.db.query(query, data, function (err, result, fields) {
                if (err) reject(err);
                resolve(result);
            });
        });
    }
}