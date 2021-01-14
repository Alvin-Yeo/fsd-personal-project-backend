// load libraires
const { MongoClient, ObjectID } = require('mongodb');

// environment configuration
require('dotenv').config();

// connection string
const MONGO_LOCALHOST = 'mongodb://localhost:27017';
const MONGO_DATABASE = process.env.MONGO_DATABASE || 'simple-notes';
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'notes';

// create connection pool with mongo client
const mongoClient = new MongoClient(MONGO_LOCALHOST, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// data model
const mkNote = (params, key) => {
    return {
        user: params['user'],
        date: new Date(params['date']),
        content: params['content'],
        photo: key,
    }
}

// closure
const mkConnectMongoDb = (mongoClient) => {
    return async() => {
        await mongoClient.connect();
        console.info('[INFO] Connected to mongodb.');
        return true;
    }
};

const connectMongoDb = mkConnectMongoDb(mongoClient);

// insertOne
const insertOne = (doc) => {
    return mongoClient.db(MONGO_DATABASE).collection(MONGO_COLLECTION).insertOne(doc);
}

// deleteOne
const deleteOne = (id) => {
    return mongoClient.db(MONGO_DATABASE).collection(MONGO_COLLECTION).deleteOne({ '_id': ObjectID(id) });
}

// getNotes
const getNotes = (user, type = 'desc') => {
    const order = (type === 'asc') ? 1 : -1;
    return mongoClient.db(MONGO_DATABASE).collection(MONGO_COLLECTION).find({ user }).sort({ date: order }).toArray();
}

// getSingleNote
const getSingleNote = (id) => {
    return mongoClient.db(MONGO_DATABASE).collection(MONGO_COLLECTION).find(ObjectID(id)).toArray();
}

// getPhotos
const getPhotos = (user, type = 'desc') => {
    const order = (type === 'asc') ? 1 : -1;
    return mongoClient.db(MONGO_DATABASE).collection(MONGO_COLLECTION).aggregate([
        { 
            $match: {
                user,
                photo: { $ne: null } 
            }
        },
        {
            $sort: {
                date: order
            }
        },
        {
            $group: {
                _id: '$user',
                photos: {
                    $push: '$photo'
                }
            }
        }
    ])
    .toArray();
};


module.exports = { mkNote, connectMongoDb, insertOne, deleteOne, getNotes, getPhotos, getSingleNote }; 