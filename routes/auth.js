
const express = require('express');
const router = express.Router();
const { pool } = require('../server').pool;

const bcrypt = require('bcrypt');


router.post('/register', async (req, res) => {
    try {
        const { name, email, password ,role} = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const checkUserQuery = 'SELECT * FROM users WHERE email = $1';
        const checkUserValues = [email];
        const existingUser = await pool.query(checkUserQuery, checkUserValues);

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const insertUserQuery = 'INSERT INTO users (name, email, password,role) VALUES ($1, $2, $3,$4) RETURNING userid';
        const insertUserValues = [name, email, hashedPassword,role];
        const result = await pool.query(insertUserQuery, insertUserValues);
        const userId = result.rows[0].userid;

        res.status(201).json({ userId, message: 'User registered successfully' });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ error: 'Failed to register user' });
    }
});


router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const userQuery = 'SELECT * FROM users WHERE email = $1';
        const userValues = [email];
        const userResult = await pool.query(userQuery, userValues);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check the user's role and redirect accordingly
        if (user.role === 'admin') {
            // Redirect to the admin page or return a response indicating admin login
            return res.status(200).json({ userId: user.userid, role: 'admin', message: 'Admin login successful' });
        } else if (user.role === 'user') {
            // Redirect to the user page or return a response indicating user login
            return res.status(200).json({ userId: user.userid, role: 'user', message: 'User login successful' });
        }

        // If the user role is neither 'admin' nor 'user', handle as needed (e.g., return an error response)
        return res.status(401).json({ error: 'Invalid credentials' });

    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ error: 'Failed to login' });
    }
});



module.exports = router;
