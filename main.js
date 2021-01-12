// load libraires
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { pingMysql, createUser } = require('./src/db_mysql');
const { passport, localStrategyAuth } = require('./src/auth_passport');
const jwt = require('jsonwebtoken');
const { sendMail } = require('./src/nodemailer_gmail');
const fetch = require('node-fetch');

// environment configuration
require('dotenv').config();
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// create an instance of express
const app = express();

// cors
app.use(cors());

// logging all requests with morgan
app.use(morgan('combined'));

// initialize passport
app.use(passport.initialize());

// post /register
app.post('/register',
    express.json(),
    (req, res) => {
        const email = req.body.username;
        const password = req.body.password;

        createUser([ email, password ])
            .then(result => {
                sendMail(email);
                res.status(200);
                res.type('application/json');
                res.json({ message: 'ok' });
            })
            .catch(error => {
                if(error.errno === 1062) {
                    res.status(409);
                    res.type('application/json');
                    res.json({ error: 'Email address has already been used.' });
                }
            });
    }
);

// post /login
app.post('/login', 
    express.json(),
    localStrategyAuth,
    (req, res) => {
        // generate JWT token
        const ts = new Date().getTime() / 1000;
        const token = jwt.sign({
            sub: req.user.username,
            iss: 'simple-notes',
            iat: ts,
            exp: ts + (60 * 60),
        }, JWT_SECRET);

        console.info(`[INFO] Authenticated successfully.`);

        res.status(200);
        res.type('application/json');
        res.json({ token });
    }
);

// get /quote
app.get('/quote', async(req, res) => {
    fetch('https://api.quotable.io/random')
        .then(result => result.json())
        .then(result => {
            res.status(200);
            res.type('application/json');
            res.json({ msg: result.content, author: result.author });
        })
        .catch(error => {
            console.error(`[ERROR] Failed to fetch external api.`);
            console.error(`[ERROR] Error: `, error);
            res.status(500);
            res.type('application/json');
            res.json({ error });
        });
});

// check db connections and start app
const p0 = pingMysql();

Promise.all([ p0 ])
    .then((result) => {
        app.listen(PORT, () => {
            console.info(`[INFO] Server started on port ${PORT} at ${new Date()}`);
        })
    })
    .catch((error) => {
        console.error(`[ERROR] Failed to start server.`);
        console.error(`[ERROR] Error message: `, error);
    })