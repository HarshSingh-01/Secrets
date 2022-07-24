//jshint esversion:6
require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const methodOverride = require('method-override');
const e = require('express');

const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(methodOverride('_method'))

app.set('trust proxy', 1) // trust first proxy

var sess = {
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {}
}

if (app.get('env') === 'production') {
  sess.cookie.secure = true // serve secure cookies
}

app.use(session(sess));

app.use(passport.initialize());
app.use(passport.session());

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://localhost:27017/userDB');
}

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { _id: user._id});
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  // userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get('/', (req, res)=>{
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });

app.get('/secrets', (req, res)=>{
    User.find({"secret": {$ne: null}}, (err, foundUsers)=>{
      if (err){
        console.log(err);
      } else {
        if (foundUsers) {
          res.render("secrets", {usersWithSecrets: foundUsers});
        }
      }
  })
});

app.route('/submit')
.get((req,res)=>{
  if (req.isAuthenticated()){ 
    res.render("submit");
  }else{
    res.redirect('/login');
  }
  })
.post((req,res)=>{
  const submittedSecret = req.body.secret;

  User.findById(req.user._id, (err, foundUser)=>{
    if(err){
      console.log(err);
    }else{
      foundUser.secret = submittedSecret;
      foundUser.save( (err)=>{
        if(err){
          console.log(err);
        }else{
          res.redirect('/secrets')
        }
      })
    }
  });
});

 app.delete('/logout', (req, res) => {
  req.logOut((err)=>{
      if (err){
          console.log(err)
      }
  })
  res.redirect('/')
})

app.route('/login')
.get((req,res)=>{
    res.render("login");
})
.post((req,res)=>{
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
    
  req.login(user, (err)=>{
    if (err){
      console.log(err);
      res.redirect('login');
    }else{
      passport.authenticate('local')(req, res, ()=>{
      res.redirect('/secrets');
    });
  }
  });
});


app.route('/register')
.get((req,res)=>{
    res.render("register");
})
.post((req,res)=>{

  User.register({username: req.body.username}, req.body.password, (err, user)=>{
    if(err){
      console.log(err);
      res.redirect('/login');
    }else{
      passport.authenticate('local')(req, res, ()=>{
        res.redirect('/secrets');
      });
    }
  }); 
});

app.listen(3000, () =>{
  console.log("Server started on port 3000");
});