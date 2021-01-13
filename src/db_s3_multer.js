// load libraries
const AWS = require('aws-sdk');
const multer = require('multer');
const fs = require('fs');

// environment configuration
require('dotenv').config();

const checkAWSAcessKey = () => {
    return new Promise((resolve, reject) => {
        if(!!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY)
            resolve();
        else
            reject('S3 Access Key (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) not found in environment.');
    });
};

/* Multer */

const upload = multer({ dest: process.env.TMP_DIR || './temp' });

const readFile = (path) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (error, buff) => {
            if(error != null) 
                reject(error);
            else
                resolve(buff);
        });
    });
};

/* AWS S3 */

// Please set the two following variables in the environment
// AWS_ACCESS_KEY_ID=
// AWS_SECRET_ACCESS_KEY=
// For more info, please refer to https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html

const S3_ENDPOINT = process.env.S3_ENDPOINT || 'sfo2.digitaloceanspaces.com';
const s3 = new AWS.S3({
    endpoint: new AWS.Endpoint(S3_ENDPOINT)
})

// closure
const mkPutObject = (s3) => {
    return (file, buff) => {
        return new Promise((resolve, reject) => {
            const params = {
                Bucket: process.env.S3_BUCKET,
                Key: file.filename,
                Body: buff,
                ACL: 'public-read',
                ContentType: file.mimetype,
                ContentLength: file.size
            };
    
            s3.putObject(params, (error, result) => {
                if(error != null)
                    reject(error);
                else    
                    resolve(result);
            });
        });
    }
};

const mkDeleteObject = (s3) => {
    return (key) => {
        const params = {
            Bucket: process.env.S3_BUCKET,
            Key: key
        };

        s3.deleteObject(params, (error, result) => {
            if(err) console.error(error, error.stack)
            else console.info(result);
        });
    }
}

const putObject = mkPutObject(s3);
const deleteObject = mkDeleteObject(s3);

module.exports = { upload, readFile, putObject, deleteObject, checkAWSAcessKey };