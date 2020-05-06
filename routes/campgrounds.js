const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");
const User = require("../models/user");
const Comment = require("../models/comment");
const Notification = require("../models/notification");
const middleware = require("../middleware");
const NodeGeocoder = require("node-geocoder");

var options = {
  provider: "google",
  httpAdapter: "https",
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null,
};
var geocoder = NodeGeocoder(options);

var {
  isLoggedIn,
  checkUserCampground,
  checkUserComment,
  isAdmin,
  isSafe,
} = middleware; // destructuring assignment

// Define escapeRegex function for search feature
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

//INDEX - show all campgrounds
router.get("/", function (req, res) {
  var noMatch = null;
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), "gi");
    // Get all campgrounds from DB
    Campground.find(
      {
        $or: [
          { name: regex },
          { location: regex },
          { "author.username": regex },
        ],
      },
      function (err, allCampgrounds) {
        if (err) {
          console.log(err);
        } else {
          if (allCampgrounds.length < 1) {
            noMatch = "No campgrounds match that query, please try again.";
          }
          res.render("campgrounds/index", {
            campgrounds: allCampgrounds,
            noMatch: noMatch,
          });
        }
      }
    );
  } else {
    // Get all campgrounds from DB
    Campground.find({}, function (err, allCampgrounds) {
      if (err) {
        console.log(err);
      } else {
        res.render("campgrounds/index", {
          campgrounds: allCampgrounds,
          noMatch: noMatch,
        });
      }
    });
  }
});

//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, async function (req, res) {
  // get data from form and add to campgrounds array
  var name = req.body.name;
  var image = req.body.image;
  var desc = req.body.description;
  var author = {
    id: req.user._id,
    username: req.user.username,
  };
  var cost = req.body.cost;

  var geocode = geocoder.geocode(req.body.location, function (err, data) {
    if (err || !data.length) {
      req.flash("error", "Invalid address");
      return res.redirect("back");
    } else {
      var lat = data[0].latitude;
      var lng = data[0].longitude;
      var location = data[0].formattedAddress;
    }
    return lat, lng, location;
  });

  var newCampground = {
    name: name,
    image: image,
    description: desc,
    cost: cost,
    author: author,
    location: geocode.location,
    lat: geocode.lat,
    lng: geocode.lng,
  };

  try {
    let campground = await Campground.create(newCampground);
    let user = await User.findById(req.user._id).populate("followers").exec();
    let newNotification = {
      username: req.user.username,
      campgroundId: campground.id,
    };
    for (const follower of user.followers) {
      let notification = await Notification.create(newNotification);
      follower.notifications.push(notification);
      follower.save();
    }

    //redirect back to campgrounds page
    res.redirect("campgrounds");
    console.log(
      "|| Creator action,post: " +
        campground.name +
        " ,created by: " +
        req.user.username
    );
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("back");
  }
});

//NEW - show form to create new campground
router.get("/new", isLoggedIn, function (req, res) {
  res.render("campgrounds/new");
});

// SHOW - shows more info about one campground
router.get("/:id", function (req, res) {
  //find the campground with provided ID
  Campground.findById(req.params.id)
    .populate("comments")
    .exec(function (err, foundCampground) {
      if (err || !foundCampground) {
        console.log(err);
        req.flash("error", "Sorry, that campground does not exist!");
        return res.redirect("/campgrounds");
      }
      console.log(
        "|| Viewer action, post: " + foundCampground.name + " viewed"
      );
      //render show template with that campground
      res.render("campgrounds/show", { campground: foundCampground });
    });
});

// EDIT - shows edit form for a campground
router.get("/:id/edit", isLoggedIn, checkUserCampground, function (req, res) {
  //render edit template with that campground
  res.render("campgrounds/edit", { campground: req.campground });
});

// PUT - updates campground in the database
router.put("/:id", isSafe, function (req, res) {
  geocoder.geocode(req.body.location, function (err, data) {
    if (err || !data.length) {
      req.flash("error", "Invalid address");
      return res.redirect("back");
    }
    var lat = data[0].latitude;
    var lng = data[0].longitude;
    var location = data[0].formattedAddress;
    var newData = {
      name: req.body.name,
      image: req.body.image,
      description: req.body.description,
      cost: req.body.cost,
      location: location,
      lat: lat,
      lng: lng,
    };
    Campground.findByIdAndUpdate(req.params.id, { $set: newData }, function (
      err,
      campground
    ) {
      if (err) {
        req.flash("error", err.message);
        res.redirect("back");
      } else {
        req.flash("success", "Successfully Updated!");
        res.redirect("/campgrounds/" + campground._id);
      }
    });
  });
});

// DELETE - removes campground and its comments from the database
router.delete("/:id", isLoggedIn, checkUserCampground, function (req, res) {
  Comment.remove(
    {
      _id: {
        $in: req.campground.comments,
      },
    },
    function (err) {
      if (err) {
        req.flash("error", err.message);
        res.redirect("/");
      } else {
        req.campground.remove(function (err) {
          if (err) {
            req.flash("error", err.message);
            return res.redirect("/");
          }
          req.flash("error", "Campground deleted!");
          res.redirect("/campgrounds");
        });
      }
    }
  );
});

module.exports = router;
