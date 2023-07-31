const express = require('express');
const { Pool } = require('pg');
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config();
const app = express();

const pool = new Pool({
  user: 'harshit3125',
  host: 'localhost',
  database: 'harshit',
  password: 'harshit',
  port: 5432, 
});

module.exports.pool={ pool };;
pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Connected to the PostgreSQL database!');
    
    done(); 
  }
});

app.use(bodyParser.json()); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true }));


const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');



app.use('/api',authRoutes);



const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`API is running on port ${port}`);
});
