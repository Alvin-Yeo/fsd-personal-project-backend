// load libraires
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const { passport, localStrategyAuth } = require('./src/auth_passport');
const jwt = require('jsonwebtoken');
const { sendMail } = require('./src/nodemailer_gmail');
const { pingMysql, createUser } = require('./src/db_mysql');
const { mkNote, connectMongoDb, insertOne, deleteOne } = require('./src/db_mongo');
const { upload, readFile, putObject, deleteObject, checkAWSAcessKey } = require('./src/db_s3_multer');


// environment configuration
require('dotenv').config();
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// function
const mkSystemErrResponse = (error, msg, res) => {
    console.error(`[ERROR] ${msg}`);
    console.error(`[ERROR] Error message: ${error}`);

    res.status(500);
    res.type('application/json');
    res.json({ error});
    return;
}

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
    fetch('https://api.quotable1.io/random')
        .then(result => result.json())
        .then(result => {
            res.status(200);
            res.type('application/json');
            res.json({ msg: result.content, author: result.author });
        })
        .catch(error => {
            mkSystemErrResponse(error, 'Failed to fetch external api.', res);
        });
});

// post /note
app.post('/note',
    upload.single('photo'),
    async(req, res) => {
        const doc = (req.file) 
                ? mkNote(req.body, req.file.filename) 
                : mkNote(req.body, null);

        let insertedId = '';

        try {
            // insert doc to mongodb
            const mongoResp = await insertOne(doc);
            insertedId = mongoResp['insertedId'];
            console.info('[INFO] Inserted id: ', insertedId);

            // read image file and upload to s3
            if(req.file) {
                console.info('[INFO] req.file: ', req.file);

                const buff = await readFile(req.file.path);
                await putObject(req.file, buff);

                console.info(`[INFO] Image uploaded to S3 successfully.`);
                console.info(`[INFO] Removing temp file...`);
                fs.unlink(req.file.path, () => {});
            }

            console.info(`[INFO] Transaction completed successfully.`);
            res.status(200);
            res.type('application/json');
            res.json({ insertedId });
        } catch(error) {
            if(insertedId) {
                console.info(`[INFO] Reversing transaction...`);
                // remove doc from mongodb
                deleteOne(insertedId)
                    .then(result => console.info(`[INFO] Transaction reversed successfully.`))
                    .catch(error => console.error(error));
            }

            mkSystemErrResponse(error, 'Failed to create new note.', res);
        }           
    }
);

// check db connections and start app
const p0 = pingMysql();

// connect to mongoDB
const p1 = connectMongoDb();

// checking S3 Access Key in environment variables
const p2 = checkAWSAcessKey();

Promise.all([ p0, p1, p2 ])
    .then((result) => {
        app.listen(PORT, () => {
            console.info(`[INFO] Server started on port ${PORT} at ${new Date()}`);
        })
    })
    .catch((error) => {
        console.error(`[ERROR] Failed to start server.`);
        console.error(`[ERROR] Error message: `, error);
    })