const express = require('express');
const app = express();
const cors = require('cors');
const userRoutes = require("./routes/user.route");
const connectDB = require('./config/db');

connectDB();

app.use(express.json());
app.use(cors({
    origin: [
        "https://bitebazaar.com.bd", 
        "https://admin.bitebazaar.com.bd",
        "http://localhost:9000",  // Allow local development origin
        "http://127.0.0.1:5500"   // Allow local development origin
    ],
    credentials: true
}));

app.get("/", (req, res) =>{
    let greetings = "<h1 style='color: #FFEA00; text-align:center;'>Bite Bazaar Web Server</h1>";
    res.send(greetings);
});

app.use('/api/users', userRoutes);

// app.use('/env', envRoutes);


// app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;