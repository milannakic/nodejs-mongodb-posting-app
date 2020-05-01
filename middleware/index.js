var Campground = require("../models/campground");
var Comment = require("../models/comment");

// all the middleare goes here
var middlewareObj = {};

middlewareObj.checkCampgroundOwnership = function (req, res, next) {
  if (req.isAuthenticated()) {
    Campground.findById(req.params.id, function (err, foundCampground) {
      //must add || !foundCampground to cover cases where ID does match he pattern but it not valid/existing
      if (err || !foundCampground) {
        req.flash("error", "Cannot find what you are searching for");
        res.redirect("back");
      } else {
        // does user own the campground?
        if (
          foundCampground.author.id.equals(req.user._id) ||
          req.user.isAdmin
        ) {
          next();
        } else {
          req.flash("error", "Permission denied, you do not own this sh1t");
          res.redirect("back");
        }
      }
    });
  } else {
    req.flash("error", "Login first dude!");
    res.redirect("back");
  }
};

middlewareObj.checkCommentOwnership = function (req, res, next) {
  if (req.isAuthenticated()) {
    Comment.findById(req.params.comment_id, function (err, foundComment) {
      if (err || !foundComment) {
        req.flash("error", "Comment not found");
        res.redirect("back");
      } else {
        // does user own the comment?
        if (foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
          next();
        } else {
          req.flash("error", "Noup can't do so, you didn't create this dude");
          res.redirect("back");
        }
      }
    });
  } else {
    req.flash("error", "Login first ...idiot");
    res.redirect("back");
  }
};

middlewareObj.isLoggedIn = function (req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  //here we add a message to a middleware that can be called from other paces/routes
  req.flash("error", "Yo dude, you must be logged in!");
  res.redirect("/login");
};

module.exports = middlewareObj;
