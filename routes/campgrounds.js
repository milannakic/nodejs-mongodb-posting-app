const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");
const User = require("../models/user");
const Comment = require("../models/comment");
const Notification = require("../models/notification");
const middleware = require("../middleware");
const NodeGeocoder = require("node-geocoder");
const multer = require("multer");
const cloudinary = require("cloudinary");

var options = {
  provider: "google",
  httpAdapter: "https",
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null,
};
var geocoder = NodeGeocoder(options);

var { isLoggedIn, checkUserCampground, checkUserComment, isAdmin } = middleware; // destructuring assignment

// Define escapeRegex function for search feature
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

var storage = multer.diskStorage({
  filename: function (req, file, callback) {
    callback(null, Date.now() + file.originalname);
  },
});
var imageFilter = function (req, file, cb) {
  // accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(
      new Error("Only image files (.jpg, .jpeg, .png and .gif) are allowed!"),
      false
    );
  }
  cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter });

cloudinary.config({
  cloud_name: "milannakic",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
            noMatch = "No results match that query, please try again.";
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

// POST
router.post("/", isLoggedIn, upload.single("image"), async function (req, res) {
  try {
    let data = await geocoder.geocode(req.body.location);
    let result = await cloudinary.v2.uploader.upload(req.file.path);

    req.body.campground.lat = data[0].latitude;
    req.body.campground.lng = data[0].longitude;
    req.body.campground.location = data[0].formattedAddress;
    // add cloudinary url for the image to the campground object under image property
    req.body.campground.image = result.secure_url;
    req.body.campground.imageId = result.public_id;
    // add author to campground
    req.body.campground.author = {
      id: req.user._id,
      username: req.user.username,
    };

    let created = await Campground.create(req.body.campground);

    console.log(
      " || Creator action, user: " +
        req.user.username +
        " created post: " +
        created.name
    );

    let author = await User.findById(req.user._id).populate("followers").exec();
    let newNotification = {
      username: req.user.username,
      campgroundId: created.id,
    };
    for (const follower of author.followers) {
      let notification = await Notification.create(newNotification);
      follower.notifications.push(notification);
      follower.save();
    }

    req.flash("success", "Created a new post!");
    res.redirect("/campgrounds");
  } catch (err) {
    console.log(err);
    req.flash("error", "Network error or invalid address, please try again");
    return res.redirect("back");
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
router.put(
  "/:id",
  isLoggedIn,
  checkUserCampground,
  upload.single("image"),
  function (req, res) {
    Campground.findById(req.params.id, async function (err, campground) {
      if (err) {
        console.log(err);
        req.flash("error", err.message);
        return res.redirect("back");
      }
      campground.name = req.body.campground.name;
      campground.price = req.body.campground.price;
      campground.description = req.body.campground.description;

      if (req.file) {
        try {
          await cloudinary.v2.uploader.destroy(campground.imageId);
          var result = await cloudinary.v2.uploader.upload(req.file.path);
          campground.imageId = result.public_id;
          campground.image = result.secure_url;
        } catch (err) {
          console.log(err);
          req.flash("error", err.message);
          return res.redirect("back");
        }
      }

      if (req.body.location != campground.location) {
        try {
          var data = await geocoder.geocode(req.body.location);
          campground.lat = data[0].latitude;
          campground.lng = data[0].longitude;
          campground.location = data[0].formattedAddress;
        } catch (err) {
          console.log(err);
          req.flash("error", err.message);
          return res.redirect("back");
        }
      }

      campground.save();
      req.flash("success", "Successfully Updated!");
      console.log(
        " || Edit/Update action, user: " +
          req.user.username +
          " updated post: " +
          campground.name
      );
      res.redirect("/campgrounds/" + campground._id);
    });
  }
);

// DELETE - removes campground and its comments from the database

router.delete("/:id", isLoggedIn, checkUserCampground, function (req, res) {
  Campground.findById(req.params.id, async function (err, campground) {
    if (err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
    try {
      await cloudinary.v2.uploader.destroy(campground.imageId);
      campground.remove();
      req.flash("success", "Post deleted successfully!");
      console.log(
        " || Delete action, user: " +
          req.user.username +
          " deleted post: " +
          campground.name
      );
      res.redirect("/campgrounds");
    } catch (err) {
      if (err) {
        req.flash("error", err.message);
        return res.redirect("back");
      }
    }
  });
});

module.exports = router;
