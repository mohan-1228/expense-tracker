const bcrypt = require('bcrypt');
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

const signup = async (req, res) => {
    const { email: rawEmail, password, name } = req.body;


    if(!rawEmail || !password || !name){
        return res.status(400).json({error: "Email, password and name are required  "});
    }
    const email = rawEmail.trim().toLowerCase();

    try{
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

        if(existingUser.rows.length > 0){
            return res.status(409).json({error: "Email already registered"});
        }


        const hashedPassword = await bcrypt.hash(password, 10);


        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING id, email, name',[email, hashedPassword, name]
        );

        res.status(201).json({user: result.rows[0]});


    }catch (err){
        console.error(err);
        res.status(500).json({error: "Something went wrong during signup"});
    }

};

const login = async (req, res) => {
    const { email: rawEmail, password } = req.body;

    if(!rawEmail || !password){
        return res.status(400).json({error: "Email and password are required"});
    }
    const email = rawEmail.trim().toLowerCase();

    try{
        const userResult = await pool.query('SELECT id, name, email, password_hash FROM users WHERE email = $1', [email]);

        if(userResult.rows.length === 0){
            return res.status(401).json({error: "Invalid email or password"});
        }

        const user = userResult.rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if(!isPasswordValid){
            return res.status(401).json({error: "Invalid email or password"});
        }

        const token = jwt.sign({id: user.id, email: user.email}, process.env.JWT_SECRET, {expiresIn: '1h'});

        res.status(200).json({message: "Login successful", token, user: {id: user.id, name: user.name, email: user.email}});

    }catch (err){
        console.error(err);
        res.status(500).json({error: "Something went wrong during login"});
    }
};

module.exports = {signup, login};