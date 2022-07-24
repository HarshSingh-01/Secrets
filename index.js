//jshint esversion:6
require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const encrypt = require('mongoose-encryption');
const ejs = require("ejs");
const bcrypt = require('bcrypt');
const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const saltRounds = 10;

const mongoose = require('mongoose');

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://localhost:27017/userDB');
}

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

// const secret = process.env.SECRET;
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);



app.get('/', (req, res)=>{
    res.render("home");
});

app.get('/logout', (req,res)=>{
    res.render("home");
})

app.get('/login', (req,res)=>{
    res.render("login");
});

app.get('/register',(req,res)=>{
    res.render("register");
});

app.post('/register', (req,res)=>{

    bcrypt.genSalt(saltRounds, function(err, salt){
        bcrypt.hash(req.body.password, salt, function(err, hash){
            const user = User({
                email: req.body.username,
                password: hash
            });
            user.save((err)=>{
                if(err){
                    console.log(err);
                }else{
                    res.render("secrets");
                }
        });
    });
    })
});

app.post("/login", (req,res)=>{
    const email = req.body.username;
    const password = req.body.password;

    User.findOne({email: email}, (err, foundUser)=>{
        if (err){
            console.log(err);
        } else{
            if (foundUser){
            bcrypt.compare(password, foundUser.password, function(err, result){
                if (result){
                    res.render("secrets");
                }
                else{
                    console.log(err);
                }
            }); 
        }
    }
    });
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
