const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const User = require("./models/user");
//const seedDB = require("./seeds");
const campgroundsRoutes = require("./routes/campgrounds");
const commentRoutes = require("./routes/comments");
const indexRoutes = require("./routes/index");

//LOCAL DB CONNECTION
/* mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.set("useUnifiedTopology", true);
mongoose.connect("mongodb://localhost:27017/yelp_camp", {
  useNewUrlParser: true,
}); */

//REMOTE CONNECTION 2 - Works as well but not connection close as well
const uri =
  "mongodb+srv://milan:jehovah1985@cluster0-cxwkp.mongodb.net/yelp_camp?retryWrites=true&w=majority";
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
  autoIndex: false, // Don't build indexes
  poolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
};
mongoose.connect(uri, options).then(
  () => {},
  (err) => {
    console.log(err);
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
app.use("/campgrounds", campgroundsRoutes);
//potential further refactor approach is to append the common start of the route "/campgrounds/:id/comments"
//all routes with id require "mergeParams: true" parameter in routes
app.use("/campgrounds/:id/comments", commentRoutes);

//listener adapted to cover HEROKU and local
var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("Our app is running on http://localhost: " + port);
});
