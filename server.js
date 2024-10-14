const mongoose = require("mongoose");
const colors = require('colors');
const app = require("./index.js");
const dotenv = require("dotenv").config();

const port = process.env.PORT || 9000;

app.listen(port, () =>{
    console.log('Bite Bazaar Server running on port: '.yellow.italic, `${port}`.red.bold);
})
