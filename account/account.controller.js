const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const config = require("../config.json");
const dbQuery = require("../db/queries");
const verifyToken = require("../helpers/jwt-verify");
const sendEmail = require("../helpers/send-email");

/* 
 * Define all routes
 */
router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.get('/users', verifyToken, getAll);
router.delete('/:id', verifyToken, deleteUser);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-password-email-token', verifyResetToken);
router.put('/reset-password', resetPassword)


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

        // Send registration email
        const verifyEmailUrl = `${req.get('origin')}/verify-email?token=${dbResult.verification_token}`;
        sendEmail({
            to: email,
            subject: 'Verify Email',
            html: `<h4>Verify Email Account</h4>
                <p>Please click the link below to verify your email address:</p>
                <p><a href="${verifyEmailUrl}">${verifyEmailUrl}</a></p>`
        });

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
 * Login user
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

        if(!dbResult.is_verified){
            return res.status(400).json({ message: "Your account have not been verified yet, follow the link in your email inbox and verify this account" });
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


/*
 * Verify email account
 */
async function verifyEmail(req, res){
    console.log(req.body)
    const { token } = req.body;
    const verifyEmailQuery = `SELECT * FROM users WHERE verification_token = $1`;

    // Query to update is_verified field
    const resetQuery = `UPDATE users SET is_verified = $1 WHERE verification_token = $2 returning * `;

    try {
        const { rows } = await dbQuery.query(verifyEmailQuery, [token]);
        const dbResult = rows[0];

        // Check if the token is associated with any account
        if(!dbResult){
            return res.status(400).json({ message: "Invalid Parametre: Email account verification failed" });
        }

        // Check if the account have been verified previously
        if(dbResult.is_verified){
            return res.status(400).json({ message: "This account have been verified already" });
        }

        // Update is_verified to true
        await dbQuery.query(resetQuery, [true, token]);

        return res.status(200).json("Email account verification successful");

    } catch (error) {
        return res.status(500).json({ message: "Operation was not successful" });
    }
}


/*
 * Get all users
 */
async function getAll(req, res){
    const getAllQuery = `SELECT id, firstname, lastname, email, created_at FROM users ORDER BY id ASC`;
    try {
        const { rows } = await dbQuery.query(getAllQuery);
        // return the users row
        return res.status(200).json(rows)

    } catch (error) {
        return res.status(500).json({ message: "Operation was not successful" }); 
    }
} 


/*
 * Delete users
 */
async function deleteUser(req, res){
    const deleteUserQuery = `DELETE FROM users WHERE id = $1`;
    try {
        const { rows } = await dbQuery.query(deleteUserQuery, [req.params.id]);
        // return the users row
        return res.status(200).json(rows)
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Operation was not successful" });  
    }
}


/*
 * Forgot Password
 */
async function forgotPassword(req, res){
    const { email } = req.body;
    const emailQuery = `SELECT email, verification_token FROM users WHERE email = $1`;

    const resetQuery = `UPDATE users SET reset_password_token = $1, reset_password_expiry = $2 WHERE email = $3 returning * `;
    const resetPasswordToken = crypto.randomBytes(36).toString('hex');
    const resetPasswordExpiry = new Date(Date.now() + 24*60*60*1000);

    try {
        const { rows } = await dbQuery.query(emailQuery, [email]);
        const dbResult = rows[0];

        // Check if the user eamil exist
        if(!dbResult){
            return res.status(400).json({ message: "Account with this email does not exist" });
        }

        // Store the reset password token and expiry date
        await dbQuery.query(resetQuery, [resetPasswordToken, resetPasswordExpiry, email]);

        // Send email with reser password link
        const resetPasswordUrl = `${req.get('origin')}/reset-password?email=${dbResult.email}&token=${resetPasswordToken}`;
        sendEmail({
            to: email,
            subject: 'Reset Password',
            html: `<h4>Enter your new password</h4>
                <p>Please click the link below to reset your password:</p>
                <p><a href="${resetPasswordUrl}">${resetPasswordUrl}</a></p>`
        });

        return res.status(200).json(dbResult);
        
    } catch (error) {
        return res.status(500).json({ message: "Operation was not successful" });
    }
}


/*
 * Verify email and token for reset password
 */
async function verifyResetToken(req, res){
    const { email, token } = req.body;
    const verifyQuery = `SELECT * FROM users WHERE email = $1 AND reset_password_token = $2`;

    try {
        const { rows } = await dbQuery.query(verifyQuery, [email, token]);
        const dbResult = rows[0];
        if(!dbResult){
            return res.status(400).json({ message: "Invalid parametres provided, cannot reset password" });
        }

        // Check if the reset password token time have expired
        if(dbResult.reset_password_expiry < new Date()){
            return res.status(400).json({ message: "This reset password token has expired." });
        }

        // if email and token verification is correct, return a status of ok
        return res.status(200);

    } catch (error) {
        return res.status(500).json({ message: "Operation was not successful" });
    }
}


/*
 * Reset password
 */
async function resetPassword(req, res){
    const { email, token, password } = req.body;

    // Hash new password
    const hashPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

    // Store the new password
    const resetPasswordQuery = `UPDATE users SET password = $1 WHERE email = $2 AND reset_password_token = $3 returning *`;

    try {
        await dbQuery.query(resetPasswordQuery, [hashPassword, email, token]);

        // return a 200 status code
        return res.status(200).json("Reset password was successful, login now");

    } catch (error) {
        return res.status(500).json({ message: "Operation was not successful" });
    }
}