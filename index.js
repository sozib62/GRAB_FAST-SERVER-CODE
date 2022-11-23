const express = require('express');
const cors = require('cors');
const { config } = require('dotenv');
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
    res.send('assignment 12 server is running')
});

app.listen(port, () => console.log(`assignment server running on ${port} `))