const express = require("express");
const passport = require("passport");
const router = express.Router();
const User = require("../models/user");
const Campground = require("../models/campground");
const Notification = require("../models/notification");
const async = require("async");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
var { isLoggedIn } = require("../middleware");
var { isProfileOwner } = require("../middleware");
var { isNotVerified } = require("../middleware");
// require sendgrid/mail
const sgMail = require("@sendgrid/mail");
const user = require("../models/user");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

//root route
router.get("/", function (req, res) {
  res.render("landing", {
    currentUser: req.user,
  });
});

// show register form
router.get("/register", function (req, res) {
  res.render("users/register", { page: "register" });
});

//handle signup / register logic
//we first create a new user and then check and login that new user
router.post("/register", async function (req, res) {
  var newUser = new User({
    username: req.body.username,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    emailToken: crypto.randomBytes(64).toString("hex"),
    isVerified: false,
    avatar: req.body.avatar,
  });
  if (req.body.adminCode === process.env.ADMIN_CODE) {
    newUser.isAdmin = true;
  }
  User.register(newUser, req.body.password, async function (err, user) {
    if (err) {
      console.log(err);
      req.flash("error", err.message);
      return res.render("/register");
    }
    const msg = {
      from: "milan.nakic@gmail.com",
      to: user.email,
      subject: "Something by MN - verify your email",
      text: `
       Hi,
       thanks for registering.
       Please verify your email by copying and pasting the address below.
       http://${req.headers.host}/verify-email?token=${user.emailToken}
      `,
      html: `
      <h1>Hello,</h1>
      <p>thanks for registering.</p>
      <p>Please verify your email by copying and pasting the address below.</p>
      <a href="http://${req.headers.host}/verify-email?token=${user.emailToken}">Verify your email</a>
      `,
    };
    try {
      await sgMail.send(msg);
      req.flash(
        "success",
        "Thanks for registering. Please check your email to verify your email"
      );
      res.redirect("/");
    } catch (error) {
      console.log(error);
      req.flash("error", error.message);
      res.redirect("/campgrounds");
    }
  });
});

// Email verification route
router.get("/verify-email", async (req, res, next) => {
  try {
    const user = await User.findOne({ emailToken: req.query.token });
    if (!user) {
      req.flash("error", "Token is invalid, please contact support");
      return res.redirect("/campgrounds");
    }
    user.emailToken = null;
    user.isVerified = true;
    await user.save();
    await req.login(user, async (err) => {
      if (err) return next(err);
      req.flash("success", `Welcome to Something by MN ${user.username}`);
      const redirectUrl = req.session.redirectTo || "/campgrounds";
      delete req.session.redirectTo;
      res.redirect(redirectUrl);
    });
  } catch (error) {
    console.log(error);
    req.flash("error", error.message);
    res.redirect("/campgrounds");
  }
});

//show login form
router.get("/login", function (req, res) {
  res.render("users/login", { page: "login" });
});

//handling login logic
router.post(
  "/login",
  isNotVerified,
  passport.authenticate("local", {
    successRedirect: "/campgrounds",
    failureRedirect: "/login",
    failureFlash: true,
    successFlash: "Welcome to Something by MN!",
  }),
  function (req, res) {}
);

// logout route
router.get("/logout", function (req, res) {
  req.logout();
  req.flash("success", "Bye Bye!");
  res.redirect("/campgrounds");
});

// forgot password
router.get("/forgot", function (req, res) {
  res.render("users/forgot");
});

// forgot password - enter email/post
router.post("/forgot", function (req, res, next) {
  async.waterfall(
    [
      function (done) {
        crypto.randomBytes(20, function (err, buf) {
          var token = buf.toString("hex");
          done(err, token);
        });
      },
      function (token, done) {
        User.findOne({ email: req.body.email }, function (err, user) {
          if (!user) {
            req.flash("error", "There is no account with that email address.");
            return res.redirect("/forgot");
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 7200000; // 2 hours

          user.save(function (err) {
            done(err, token, user);
          });
        });
      },
      function (token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: "milan.nakic@gmail.com",
            pass: process.env.GMAILPW,
          },
        });
        var mailOptions = {
          to: user.email,
          from: "milan.nakic@gmail.com",
          subject: "Password Reset for Something by MN",
          text:
            "Hi " +
            user.username +
            "," +
            "\n\n" +
            "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
            "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
            "http://" +
            req.headers.host +
            "/reset/" +
            token +
            "\n\n" +
            "If you did not request this, please ignore this email and your password will remain unchanged.\n",
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          console.log("reset password mail sent to: " + user.email);
          var d = Date(Date.now()).toString();
          console.log.call(console, d);
          req.flash(
            "success",
            "Reset e-mail has been sent to " +
              user.email +
              " with further instructions."
          );
          done(err, "done");
        });
      },
    ],
    function (err) {
      if (err) return next(err);
      res.redirect("/forgot");
    }
  );
});

// forgot password get token
router.get("/reset/:token", function (req, res) {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    },
    function (err, user) {
      if (!user) {
        req.flash("error", "Password reset token is invalid or has expired.");
        return res.redirect("/forgot");
      }
      res.render("users/reset", { token: req.params.token });
    }
  );
});

// forgot password - post, reset using token
router.post("/reset/:token", function (req, res) {
  async.waterfall(
    [
      function (done) {
        User.findOne(
          {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() },
          },
          function (err, user) {
            if (!user) {
              req.flash(
                "error",
                "Password reset token is invalid or has expired."
              );
              return res.redirect("back");
            }
            if (req.body.password === req.body.confirm) {
              user.setPassword(req.body.password, function (err) {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;

                user.save(function (err) {
                  req.logIn(user, function (err) {
                    done(err, user);
                  });
                });
              });
            } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect("back");
            }
          }
        );
      },
      function (user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: "milan.nakic@gmail.com",
            pass: process.env.GMAILPW,
          },
        });
        var mailOptions = {
          to: user.email,
          from: "mail.nakic@mail.com",
          subject: "Your password for Something by MN has been changed",
          text:
            "Hello,\n\n" +
            "This is a confirmation that the password for your account " +
            user.email +
            " has just been changed.\n",
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          req.flash("success", "Success! Your password has been changed.");
          done(err);
        });
      },
    ],
    function (err) {
      res.redirect("/campgrounds");
    }
  );
});

// user profile
router.get("/users/:id", async function (req, res) {
  try {
    let user = await User.findById(req.params.id).populate("followers").exec();
    let campgrounds = await Campground.find()
      .where("author.id")
      .equals(req.params.id)
      .populate("campgrounds")
      .exec();
    res.render("users/profile", { user, campgrounds });
  } catch (err) {
    req.flash("error", err.message);
    return res.redirect("back");
  }
});

// edit profile route
router.get("/users/:id/edit", isLoggedIn, isProfileOwner, async function (
  req,
  res
) {
  try {
    let user = await User.findById(req.params.id);
    res.render("users/edit", { user });
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("back");
  }
});

// update / PUT user
router.put("/users/:id", isLoggedIn, isProfileOwner, function (req, res) {
  User.findByIdAndUpdate(req.params.id, req.body.user, function (
    err,
    updatedUser
  ) {
    if (err) {
      req.flash("error", err.message);
      res.redirect("back");
    } else {
      res.redirect("/users/" + req.params.id);
    }
  });
});

// follow user
router.get("/follow/:id", isLoggedIn, async function (req, res) {
  try {
    let user = await User.findById(req.params.id);
    user.followers.push(req.user._id);
    user.save();
    req.flash("success", "Successfully followed " + user.username + "!");
    res.redirect("/users/" + req.params.id);
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("back");
  }
});

// view all notifications
router.get("/notifications", isLoggedIn, async function (req, res) {
  try {
    let user = await User.findById(req.user._id)
      .populate({
        path: "notifications",
        options: { sort: { _id: -1 } },
      })
      .exec();
    let allNotifications = user.notifications;
    res.render("notifications/index", { allNotifications });
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("back");
  }
});

// handle notification
router.get("/notifications/:id", isLoggedIn, async function (req, res) {
  try {
    let notification = await Notification.findById(req.params.id);
    notification.isRead = true;
    notification.save();
    res.redirect(`/campgrounds/${notification.campgroundId}`);
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("back");
  }
});

// GET /contact
router.get("/contact", isLoggedIn, (req, res) => {
  res.render("contact");
});

// POST /contact
router.post("/contact", async (req, res) => {
  let { name, email, message } = req.body;
  name = req.sanitize(name);
  email = req.sanitize(email);
  message = req.sanitize(message);
  const msg = {
    to: "milan.nakic@gmail.com",
    from: "milan.nakic@gmail.com",
    subject: `Something By MN Contact Form, sender: ${name}`,
    text: message,
    html: `<h4>Hi there, this email is from, ${name}</h4>
    <br>
    <p> Sender email address: ${email}, </p>
    <br>
    <p>Message text: ${message}</p>
    `,
  };
  try {
    await sgMail.send(msg);
    req.flash(
      "success",
      "Thank you for your email, we will get back to you shortly."
    );
    res.redirect("/contact");
    console.log(
      "|| Contact form used by user: " + name + " ,email address: " + email
    );
    var d = Date(Date.now()).toString();
    console.log.call(console, d);
  } catch (error) {
    console.error(error);
    if (error.response) {
      console.error(error.response.body);
    }
    req.flash("error", "Sorry, something went wrong, please contact Milan");
    res.redirect("back");
  }
});

module.exports = router;
