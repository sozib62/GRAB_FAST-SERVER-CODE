const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.we0bjkr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        const categoryCollection = client.db('buySell').collection('category')
        const bookingCollection = client.db('buySell').collection('booking')
        const usersCollection = client.db('buySell').collection('user')
        const productsCollection = client.db('buySell').collection('product')
        const paymentsCollection = client.db('buySell').collection('payments');
        // const advertisesCollection = client.db('buySell').collection('advertise')

        app.get('/category/:id', async (req, res) => {
            const id = req.params.id;
            const query = { categoryId: id };
            const result = await categoryCollection.find(query).toArray()
            res.send(result);
        })

        app.post('/bookings', verifyJWT, async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const booking = await bookingCollection.findOne(query);
            res.send(booking);
        })

        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'Forbidden Access' })
            }

            const query = { email: email };
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/create-payment', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query)

            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '7d' })
                return res.send({ accessToken: token })
            }

            res.status(403).send('Forbidden Access')
        })

        app.put('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    status: 'verified'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.post('/users', async (req, res) => {
            const users = req.body;
            const result = await usersCollection.insertOne(users);
            res.send(result);
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(query);
            res.send(result)
        })

        app.get('/users', async (req, res) => {
            const query = {}
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ seller: user?.role === 'Seller' });
        })
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ buyer: user?.role === 'Buyer' });
        })

        app.put('/users/admin/:id', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail }
            const user = await usersCollection.findOne(query)

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }

            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.post('/product', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product)
            res.send(result);
        })

        app.get('/product', async (req, res) => {
            const query = {};
            const product = await productsCollection.find(query).toArray();
            res.send(product)
        })

        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await productsCollection.deleteOne(query);
            res.send(result)
        })
        app.put('/advertise/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    status: 'advertise'
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.get('/advertise', async (req, res) => {
            const query = {};
            const result = await productsCollection.find(query).toArray()
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