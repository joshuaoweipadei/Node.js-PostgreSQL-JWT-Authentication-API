const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const config = require("../config.json");
const dbQuery = require("../db/queries")

/* 
 * Define all routes
 */
router.post('/register', register);
router.post('/login', login);


// Export the routers
module.exports = router;


/*
 * Registration
 */
async function register(req, res){
    const { email, firstname, lastname, password } = req.body;

    // Hash password
    const hashPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

    // Generate email verification token 
    const verificationToken = crypto.randomBytes(36).toString('hex');

    const createUserQuery = `INSERT INTO users (email, firstname, lastname, password, verification_token, created_at) VALUES($1, $2, $3, $4, $5, $6) returning *`;
    const values = [email, firstname, lastname, hashPassword, verificationToken, new Date()];

    try {
        const { rows } = await dbQuery.query(createUserQuery, values);
        const dbResult = rows[0];

        // remove password and return back data to the user
        delete dbResult.password;

        return res.status(200).json(dbResult)
    } catch (error) {
        // if email address already exist
        if(error.constraint === 'users_email_key' || error.routine === '_bt_check_unique'){
            return res.status(400).json({ message: "User with that email address already exist" });
        }

        return res.status(500).json({ message: "Operation was not successful" });
    }
}


/*
 * Login
 */
async function login(req, res){
    const { email, password } = req.body;
    const loginUserQuery = `SELECT * FROM users WHERE email = $1`;
    try {
        const { rows } = await dbQuery.query(loginUserQuery, [email]);
        const dbResult = rows[0];

        // Check if the user exist
        if(!dbResult){
            return res.status(400).json({ message: "User with this email does not exist" });
        }

        // Compare password with hashed password
        if(!bcrypt.compareSync(password, dbResult.password)){
            return res.status(400).json({ message: "Incorrect password" });
        }

        // Generate user login token
        const token = jwt.sign({ sub: dbResult.id, id: dbResult.id, email: dbResult.email }, config.secret, { expiresIn: '2h' });
        // remove password and return back data to the user
        delete dbResult.password;

        return res.status(200).json({...dbResult, token})

    } catch (error) {
        return res.status(500).json({ message: "Operation was not successful" });
    }
}