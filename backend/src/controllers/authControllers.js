const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../services/mailer');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function issueVerificationEmail(userId, email) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

    await pool.query(
        'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [userId, tokenHash, expiresAt]
    );

    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${rawToken}`;

    try{
        await sendVerificationEmail(email, verifyUrl);
    }catch (mailErr){
        console.error('Failed to send verification email:', mailErr);
    }
}

const signup = async (req, res) => {
    const { email: rawEmail, password, name } = req.body;


    if(!rawEmail || !password || !name){
        return res.status(400).json({error: "Email, password and name are required  "});
    }
    const email = rawEmail.trim().toLowerCase();

    if(!EMAIL_REGEX.test(email)){
        return res.status(400).json({error: "Enter a valid email address"});
    }

    try{
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

        if(existingUser.rows.length > 0){
            return res.status(409).json({error: "Email already registered"});
        }


        const hashedPassword = await bcrypt.hash(password, 10);


        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING id, email, name',[email, hashedPassword, name]
        );

        const user = result.rows[0];
        await issueVerificationEmail(user.id, user.email);

        res.status(201).json({user, message: "Account created. Check your email to verify your account before logging in."});


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
        const userResult = await pool.query('SELECT id, name, email, password_hash, email_verified_at FROM users WHERE email = $1', [email]);

        if(userResult.rows.length === 0){
            return res.status(401).json({error: "Invalid email or password"});
        }

        const user = userResult.rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if(!isPasswordValid){
            return res.status(401).json({error: "Invalid email or password"});
        }

        if(!user.email_verified_at){
            return res.status(403).json({
                error: "Please verify your email before logging in. Check your inbox for the verification link.",
                code: "EMAIL_NOT_VERIFIED",
            });
        }

        const token = jwt.sign({id: user.id, email: user.email}, process.env.JWT_SECRET, {expiresIn: '1h'});

        res.status(200).json({message: "Login successful", token, user: {id: user.id, name: user.name, email: user.email}});

    }catch (err){
        console.error(err);
        res.status(500).json({error: "Something went wrong during login"});
    }
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if(!currentPassword || !newPassword){
        return res.status(400).json({error: "Current and new password are required"});
    }
    if(newPassword.length < 8){
        return res.status(400).json({error: "New password must be at least 8 characters"});
    }

    try{
        const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);

        if(userResult.rows.length === 0){
            return res.status(404).json({error: "User not found"});
        }

        const isCurrentValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);

        if(!isCurrentValid){
            return res.status(401).json({error: "Current password is incorrect"});
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

        res.status(200).json({message: "Password updated successfully"});

    }catch (err){
        console.error(err);
        res.status(500).json({error: "Something went wrong changing the password"});
    }
};

const updateProfile = async (req, res) => {
    const { name, email: rawEmail } = req.body;
    const userId = req.user.id;

    if(!name || !name.trim()){
        return res.status(400).json({error: "Name is required"});
    }
    if(!rawEmail || !rawEmail.trim()){
        return res.status(400).json({error: "Email is required"});
    }
    const email = rawEmail.trim().toLowerCase();

    try{
        const existing = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);

        if(existing.rows.length > 0){
            return res.status(409).json({error: "Email already in use"});
        }

        const result = await pool.query(
            'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email',
            [name.trim(), email, userId]
        );

        res.status(200).json({message: "Profile updated successfully", user: result.rows[0]});

    }catch (err){
        console.error(err);
        res.status(500).json({error: "Something went wrong updating your profile"});
    }
};

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const forgotPassword = async (req, res) => {
    const { email: rawEmail } = req.body;

    if(!rawEmail || !rawEmail.trim()){
        return res.status(400).json({error: "Email is required"});
    }
    const email = rawEmail.trim().toLowerCase();

    // Always respond the same way regardless of whether the account exists,
    // so this endpoint can't be used to check which emails are registered.
    const genericResponse = { message: "If that email is registered, we've sent a reset link" };

    try{
        const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

        if(userResult.rows.length > 0){
            const userId = userResult.rows[0].id;
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

            await pool.query(
                'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
                [userId, tokenHash, expiresAt]
            );

            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;

            try{
                await sendPasswordResetEmail(email, resetUrl);
            }catch (mailErr){
                console.error('Failed to send password reset email:', mailErr);
            }
        }

        res.status(200).json(genericResponse);

    }catch (err){
        console.error(err);
        res.status(500).json({error: "Something went wrong"});
    }
};

const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    if(!token || !newPassword){
        return res.status(400).json({error: "Token and new password are required"});
    }
    if(newPassword.length < 8){
        return res.status(400).json({error: "New password must be at least 8 characters"});
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    try{
        const tokenResult = await pool.query(
            'SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1',
            [tokenHash]
        );

        if(tokenResult.rows.length === 0){
            return res.status(400).json({error: "Invalid or expired reset link"});
        }

        const resetToken = tokenResult.rows[0];

        if(resetToken.used_at || new Date(resetToken.expires_at) < new Date()){
            return res.status(400).json({error: "Invalid or expired reset link"});
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, resetToken.user_id]);
        await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [resetToken.id]);

        res.status(200).json({message: "Password reset successfully"});

    }catch (err){
        console.error(err);
        res.status(500).json({error: "Something went wrong"});
    }
};

const verifyEmail = async (req, res) => {
    const { token } = req.body;

    if(!token){
        return res.status(400).json({error: "Token is required"});
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    try{
        const tokenResult = await pool.query(
            'SELECT id, user_id, expires_at, used_at FROM email_verification_tokens WHERE token_hash = $1',
            [tokenHash]
        );

        if(tokenResult.rows.length === 0){
            return res.status(400).json({error: "Invalid or expired verification link"});
        }

        const verificationToken = tokenResult.rows[0];

        if(verificationToken.used_at || new Date(verificationToken.expires_at) < new Date()){
            return res.status(400).json({error: "Invalid or expired verification link"});
        }

        await pool.query('UPDATE users SET email_verified_at = NOW() WHERE id = $1', [verificationToken.user_id]);
        await pool.query('UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1', [verificationToken.id]);

        res.status(200).json({message: "Email verified. You can now log in."});

    }catch (err){
        console.error(err);
        res.status(500).json({error: "Something went wrong"});
    }
};

const resendVerification = async (req, res) => {
    const { email: rawEmail } = req.body;

    if(!rawEmail || !rawEmail.trim()){
        return res.status(400).json({error: "Email is required"});
    }
    const email = rawEmail.trim().toLowerCase();

    // Same account-enumeration-safe shape as forgotPassword: always
    // respond the same way regardless of whether the account exists
    // or is already verified.
    const genericResponse = { message: "If that email needs verifying, we've sent a new link" };

    try{
        const userResult = await pool.query('SELECT id, email, email_verified_at FROM users WHERE email = $1', [email]);

        if(userResult.rows.length > 0 && !userResult.rows[0].email_verified_at){
            await issueVerificationEmail(userResult.rows[0].id, userResult.rows[0].email);
        }

        res.status(200).json(genericResponse);

    }catch (err){
        console.error(err);
        res.status(500).json({error: "Something went wrong"});
    }
};

module.exports = {signup, login, changePassword, updateProfile, forgotPassword, resetPassword, verifyEmail, resendVerification};