const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.we0bjkr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoryCollection = client.db('buySell').collection('category')
        const bookingCollection = client.db('buySell').collection('booking')
        const usersCollection = client.db('buySell').collection('user')

        app.get('/category/:id', async (req, res) => {
            const id = req.params.id;
            const query = { categoryId: id };
            const result = await categoryCollection.find(query).toArray()
            res.send(result);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const users = req.body;
            const result = await usersCollection.insertOne(users);
            res.send(result);
        })

    }
    finally {

    }
}
run().catch(err => console.log(err))


app.get('/', async (req, res) => {
    res.send('assignment 12 server is running')
});

app.listen(port, () => console.log(`assignment server running on ${port} `))