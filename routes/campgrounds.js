const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");
const middleware = require("../middleware");

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

//INDEX - show all campgrounds
router.get("/", function (req, res) {
  var noMatch = null;
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), "gi");
    // Get all campgrounds from DB
    Campground.find({ name: regex }, { "author.username": regex }, function (
      err,
      allCampgrounds
    ) {
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
    });
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

//post aka new
router.post("/", middleware.isLoggedIn, function (req, res) {
  // get data from form and add to campgrounds array
  //need body-parser for this sh1t
  var name = req.body.name;
  var image = req.body.image;
  var description = req.body.description;
  var price = req.body.price;
  var author = {
    id: req.user._id,
    username: req.user.username,
  };
  var newCampground = {
    //to match the format and naming from the array/var campgrounds
    name: name,
    image: image,
    description: description,
    price: price,
    author: author,
  };
  //create new object and save to DB - Option 1
  Campground.create(newCampground, function (err, newlyCreated) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/campgrounds");
    }
  });
});

//form for the "new" data for post
router.get("/new", middleware.isLoggedIn, function (req, res) {
  res.render("campgrounds/new");
});

/*show route - more info about the camp
has to be after any specific route because of "/:id" */
router.get("/:id", function (req, res) {
  //find camp by ID from DB, populate it with comments and then execute callback
  Campground.findById(req.params.id)
    .populate("comments")
    .exec(function (err, foundCampground) {
      //handle cases where non-existing campground is called with "|| !foundCampground"
      if (err || !foundCampground) {
        req.flash("error", "There no such camp o/");
        res.redirect("back");
      } else {
        //render the show template with that specific camp
        res.render("campgrounds/show", {
          campground: foundCampground,
        });
      }
    });
});

// EDIT CAMPGROUND ROUTE - need form to edit something
router.get("/:id/edit", middleware.checkCampgroundOwnership, function (
  req,
  res
) {
  //no need to handle the err as is should be already handled in the middleware
  Campground.findById(req.params.id, function (err, foundCampground) {
    res.render("campgrounds/edit", {
      campground: foundCampground,
    });
  });
});

// POST the UPDATE ROUTE - once form is submitted

// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, function (req, res) {
  Campground.findByIdAndUpdate(req.params.id, req.body.campground, function (
    err,
    updatedCampground
  ) {
    if (err) {
      console.log(err);
      res.redirect("/campgrounds");
    } else {
      res.redirect("/campgrounds/" + req.params.id);
    }
  });
});

//DELETE / DESTROY ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, function (req, res) {
  Campground.findByIdAndRemove(req.params.id, function (err) {
    if (err) {
      console.log(err);
      req.redirect("campgrounds");
    } else {
      res.redirect("/campgrounds");
    }
  });
});

module.exports = router;
