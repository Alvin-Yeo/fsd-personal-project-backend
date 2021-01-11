// load libraries
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const fs = require('fs');

// environment configuration
require('dotenv').config();
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || '';
const GOOGLE_OAUTH_PLAYGROUND = 'https://developers.google.com/oauthplayground';

// OAuth2 Client
const oauth2Client = new OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GOOGLE_OAUTH_PLAYGROUND
);

oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

const accessToken = oauth2Client.getAccessToken();

// transport
const smtpTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: 'alvin.webdev@gmail.com',
        clientId: GMAIL_CLIENT_ID,
        clientSecret: GMAIL_CLIENT_SECRET,
        refreshToken: GMAIL_REFRESH_TOKEN,
        accessToken 
    }
});

// html template
const readHtml = (path) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (error, html) => {
            if(error != null) 
                reject(error);
            else
                resolve(html);
        });
    });
};

// closure
const composeMail = (transport) => {
    return (email) => {
        readHtml(__dirname + '/nodemailer_template.html')
            .then(html => {
                transport.sendMail(
                    {
                        from: process.env.GMAIL_SENDER,
                        to: email,
                        subject: 'Welcome to Simple-Notes!',
                        html
                    }, 
                    (err, info) => {
                        (err) ? console.log(err) : console.log(info);
                    }
                );
            })
            .catch(error => {
                console.error(`[ERROR] Error reading html template. `);
                console.error(`[ERROR] Error: `, error)
            });
    }
}

// send email
const sendMail = composeMail(smtpTransport);


module.exports = { sendMail };