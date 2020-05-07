var Comment = require("../models/comment");
var Campground = require("../models/campground");
var User = require("../models/user");

module.exports = {
  isLoggedIn: function (req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash("error", "Yo, you must be signed in to do that!");
    res.redirect("/login");
  },
  checkUserCampground: function (req, res, next) {
    Campground.findById(req.params.id, function (err, foundCampground) {
      if (err || !foundCampground) {
        console.log(err);
        req.flash("error", "Sorry, that post does not exist!");
        res.redirect("/campgrounds");
      } else if (
        foundCampground.author.id.equals(req.user._id) ||
        req.user.isAdmin
      ) {
        req.campground = foundCampground;
        next();
      } else {
        req.flash("error", "Dude, you don't have permission to do that!");
        res.redirect("/campgrounds/" + req.params.id);
      }
    });
  },
  isProfileOwner: function (req, res, next) {
    User.findById(req.params.id, function (err, foundUser) {
      if (err || !foundUser) {
        console.log(err);
        req.flash("error", "Sorry, that user does not exist!");
        res.redirect("/campgrounds");
      } else if (req.user._id.equals(foundUser.id) || req.user.isAdmin) {
        req.user = foundUser;
        next();
      } else {
        req.flash("error", "Forbidden, you are not this user");
        res.redirect("/campgrounds");
      }
    });
  },
  checkUserComment: function (req, res, next) {
    Comment.findById(req.params.commentId, function (err, foundComment) {
      if (err || !foundComment) {
        console.log(err);
        req.flash("error", "Sorry, that comment does not exist!");
        res.redirect("/campgrounds");
      } else if (
        foundComment.author.id.equals(req.user._id) ||
        req.user.isAdmin
      ) {
        req.comment = foundComment;
        next();
      } else {
        req.flash(
          "error",
          "Oh no you didn't!? You don't have permission to do that!"
        );
        res.redirect("/campgrounds/" + req.params.id);
      }
    });
  },
  isAdmin: function (req, res, next) {
    if (req.user.isAdmin) {
      next();
    } else {
      req.flash(
        "error",
        "This site is now read only thanks to spam and trolls."
      );
      res.redirect("back");
    }
  },
  isSafe: function (req, res, next) {
    if (req.body.image.match(/^https:\/\/images\.unsplash\.com\/.*/)) {
      next();
    } else {
      req.flash(
        "error",
        "Only images from images.unsplash.com allowed.\nSee https://youtu.be/Bn3weNRQRDE for how to copy image urls from unsplash."
      );
      res.redirect("back");
    }
  },
};
