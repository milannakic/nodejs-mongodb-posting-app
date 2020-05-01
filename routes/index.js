const express = require("express");
const passport = require("passport");
const router = express.Router();
const User = require("../models/user");

//root route
router.get("/", function (req, res) {
  res.render("landing", {
    currentUser: req.user,
  });
});

//show register form
router.get("/register", function (req, res) {
  res.render("register");
});

//handle signup logic
//we first create a new user and then check and login that new user
router.post("/register", function (req, res) {
  var newUser = new User({
    username: req.body.username,
  });
  if (req.body.adminCode === process.env.ADMIN_CODE) {
    newUser.isAdmin = true;
  }
  User.register(newUser, req.body.password, function (err, newlyCreatedUser) {
    if (err) {
      req.flash("error", err.message);
      return res.render("register");
    }
    //already built-in method for checking if the username exists in the DB
    passport.authenticate("local")(req, res, function () {
      //we could user req.body.username but newlyCreatedUser.username is safer as the DB could maybe change it somehow
      req.flash("success", "Welcome " + newlyCreatedUser.username);
      res.redirect("/campgrounds");
    });
  });
});

//show login form
router.get("/login", function (req, res) {
  res.render("login");
});

//handling login logic
//passport.authenticate is the middleware
//we just check if user exists and decide what to do
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/campgrounds",
    failureRedirect: "/login",
  }),
  function (req, res) {}
);

//logout route
router.get("/logout", function (req, res) {
  //already defined by added packages
  req.logOut();
  req.flash("success", "Logged you out cunt!");
  res.redirect("/campgrounds");
});

module.exports = router;
