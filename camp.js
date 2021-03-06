require("dotenv").config();

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const LocalStrategy = require("passport-local");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const User = require("./models/user");
const Campground = require("./models/campground");
const Comment = require("./models/comment");
const expressSanitizer = require("express-sanitizer");
//const seedDB = require("./seeds");

const indexRoutes = require("./routes/index");
const campgroundsRoutes = require("./routes/campgrounds");
const commentRoutes = require("./routes/comments");

const uri = process.env.DATABASEURL;
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
    var d = Date(Date.now()).toString();
    console.log.call(console, d);
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
app.use(cookieParser("secret"));
app.locals.moment = require("moment");

// Mount express-sanitizer middleware here
app.use(expressSanitizer());
//seedDB();

//PASSPORT CONFIG
app.use(
  require("express-session")({
    secret: "Jehovah1985!28-08-2019",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//middleware to pass current user to every route
app.use(async function (req, res, next) {
  res.locals.currentUser = req.user;
  if (req.user) {
    try {
      let user = await User.findById(req.user._id)
        .populate("notifications", null, { isRead: false })
        .exec();
      res.locals.notifications = user.notifications.reverse();
    } catch (err) {
      console.log(err.message);
    }
  }
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

app.use("/", indexRoutes);
app.use("/campgrounds", campgroundsRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

//listener adapted to cover HEROKU and local
var port = process.env.PORT || 15743;
app.listen(port, function () {
  console.log("App is running on PORT: " + port);
});
