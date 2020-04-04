const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const flash = require("connect-flash");
const methodOverride = require("method-override");

const User = require("./models/user");
const seedDB = require("./seeds");

//requring routes
const campgroundsRoutes = require("./routes/campgrounds");
const commentRoutes = require("./routes/comments");
const indexRoutes = require("./routes/index");

//Modify official guide
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.set("useUnifiedTopology", true);
mongoose.connect(
  "mongodb+srv://milan:jehovah1985@cluster0-cxwkp.mongodb.net/yelp_camp?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
  }
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());

//to run the delete and populate again
//seedDB();

//PASSPORT CONFIG
app.use(
  require("express-session")({
    secret: "Jehovah1985!28-08-2019",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//middleware to pass current user to every route
app.use(function (req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  //without the next, code would just stop
  next();
});

app.use(indexRoutes);
//potential further refactor approach is to append the common start of the route "/campgrounds"
app.use("/campgrounds", campgroundsRoutes);

//potential further refactor approach is to append the common start of the route "/campgrounds/:id/comments"
//all routes with id require "mergeParams: true" parameter in routes
app.use("/campgrounds/:id/comments", commentRoutes);

//listener
var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("Our app is running on http://localhost: " + port);
});
