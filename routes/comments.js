const express = require("express");

//add mergeParams: true to merge and fix issues with the id
const router = express.Router({
    mergeParams: true
});
const Campground = require("../models/campground");
const Comment = require("../models/comment");

//if the middleware file is named any different than index.js
//we would have to specify "../middleware/filename.js"
const middleware = require("../middleware");


//with added isLoggedIn it will first check if user is logged in
router.get("/new", middleware.isLoggedIn, function (req, res) {
    Campground.findById(req.params.id, function (err, campground) {
        if (err) {
            console.log(err);
        } else {
            res.render("comments/new", {
                campground: campground
            });
        }
    });
});

//with added isLoggedIn it will first check if user is logged in
router.post("/", middleware.isLoggedIn, function (req, res) {
    //lookup campground using ID
    Campground.findById(req.params.id, function (err, campground) {
        if (err) {
            console.log(err);
            res.redirect("/campgrounds");
        } else {
            Comment.create(req.body.comment, function (err, comment) {
                if (err) {
                    req.flash("error", "Dude, smthng went wrong - maybe with DB");
                    console.log(err);
                } else {
                    //add username nd id to comment
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    //save comment
                    comment.save();
                    //then we push that comment to other comments for that campground
                    campground.comments.push(comment);
                    campground.save();
                    req.flash("success", "Great, you added a comment jerk");
                    res.redirect('/campgrounds/' + campground._id);
                }
            });
        }
    });
});

//comments EDIT FORM route
router.get("/:comment_id/edit", middleware.checkCommentOwnership, function (req, res) {
    //additional findById needed to make sure that a campground like that exists at all
    //otherwise, a manual ID input (when it is a wrong id) would break the app
    Campground.findById(req.params.id, function (err, foundCampground) {
        if (err || !foundCampground) {
            req.flash("error", "Campground not found");
            return res.redirect("back");
        }
        Comment.findById(req.params.comment_id, function (err, foundComment) {
            if (err) {
                console.log(err);
                res.redirect("back");
            } else {
                res.render("comments/edit", {
                    campground_id: req.params.id,
                    comment: foundComment
                });
            }
        });
    });
});

//comments UPDATE / PUT route
router.put("/:comment_id/", middleware.checkCommentOwnership, function (req, res) {
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function (err, updatedComment) {
        if (err) {
            console.log(err);
            res.redirect("back");
        } else {
            res.redirect("/campgrounds/" + req.params.id);
        }
    });
});

//DELETE/DESTROY comments ROUTE
router.delete("/:comment_id", middleware.checkCommentOwnership, function (req, res) {
    Comment.findByIdAndDelete(req.params.comment_id, function (err) {
        if (err) {
            console.log(err);
            res.redirect("back");
        } else {
            req.flash("success", "Aaaand now it's gone idiot");
            res.redirect("/campgrounds/" + req.params.id);
        }
    });
});


module.exports = router;