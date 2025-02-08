const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer'); // Import Nodemailer

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',      // XAMPP default
  user: 'root',           // Default user
  password: 'your_password_here',           // Default password is blank
  database: 'techfest' // Database name
});

// Connect to Database
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1); // Exit the app if database doesn't connect
  }
  console.log('Connected to MySQL Database.');
});

// Route for the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use Gmail for sending emails
  auth: {
    user: 'harsagrawal7270@gmail.com', // Your email address
    pass: 'eifs kxxx qthr kajc'  // Your email password or app-specific password
  }
});

// Login Endpoint
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = results[0];

    // Compare the input password with the hashed password stored in the DB
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      res.json({ message: 'Login successful!' });
    } else {
      res.status(401).json({ message: 'Incorrect password.' });
    }
  });
});

// Forgot Password Endpoint
app.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  // Check if email exists in the database
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      res.status(500).json({ message: 'Database error.' });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ message: 'Email not found.' });
      return;
    }

    // A random password for every user
    const temporaryPassword = Math.random().toString(36).slice(-8);

    // function to hash the new pass and store in db
    async function updatePassword() {
      try {
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email], (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ message: 'Error updating password in the database.' });
          }

          // Send email
          sendResetEmail(email, temporaryPassword, res);
        });
      } catch (error) {
        return res.status(500).json({ message: 'Error hashing password.' });
      }
    }

    updatePassword();
  });
});


    // Send Email
    function sendResetEmail(email, temporaryPassword, res) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'harsagrawal7270@gmail.com',
          pass: 'eifs kxxx qthr kajc' // Replace with your email app password
        }
      });

      const mailOptions = {
        from: 'harsagrawal7270@gmail.com',
        to: email,
        subject: 'Password Reset Request',
        html:` 
          <p>Your password reset request has been processed.</p>
          <p>Your new temporary password is: <strong>${temporaryPassword}</strong></p>
          <p>Regards,<br><strong>DevMatch</strong></p>
        `
      };


      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res.status(500).json({ message: 'Error sending email.' });
        } else {
          console.log('Email sent:', info.response);
          return res.json({ message: 'Password reset email sent successfully!' });
        }
      });
    }

// Register Endpoint (For adding a new user)
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // Check if the email already exists
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error.' });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: 'Email already exists.' });
    }

    // Hash the password before saving it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user with the hashed password
    db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error registering user.' });
      }
      res.status(201).json({ message: 'User registered successfully.' });
    });
  });
});

// Start the Server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
