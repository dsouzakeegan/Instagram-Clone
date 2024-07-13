var express = require("express");
var router = express.Router();
const userModel = require("./users");
const postModel = require("./post");
const storyModel = require("./story");
const passport = require("passport");
const localStrategy = require("passport-local");
const upload = require("./multer");
const { Store } = require("express-session");
const post = require("./post");

passport.use(new localStrategy(userModel.authenticate()));

router.get("/", function (req, res, next) {
  res.render("index", { footer: false });
});

router.get("/login", function (req, res, next) {
  res.render("login", { footer: false });
});

router.get("/feed", isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate("posts");
  const stories = await storyModel.find({ user: { $ne: user._id } }).populate("user");
  const posts = await postModel.find().populate("user");
  
  res.render("feed", { footer: true, posts, user, stories });
});

router.get("/profile", isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate("posts");
  res.render("profile", { footer: true, user });
});

router.get("/search", isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({username: req.session.passport.user});
  res.render("search", { footer: true, user });
});

router.get("/edit", isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("edit", { footer: true, user });
});

router.get("/upload", isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("upload", { footer: true, user });
});

router.get("/search/:user", isLoggedIn, async function (req, res, next) {
  // const regex = new RegExp('^${req.params.username}', 'i');
  // const users = await userModel.find({ username: regex });
  const searchTerm = `^${req.params.user}`;
  const regex = new RegExp(searchTerm);

  let users = await userModel.find({ username: { $regex: regex } });
  res.json(users);
});

router.get("/like/post/:id", isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate("posts");
  const post = await postModel.findOne({_id: req.params.id});

  if(post.like.indexOf(user._id) === -1){
    post.like.push(user._id);
  } else {
    post.like.splice(post.like.indexOf(user._id), 1)
  }
  await post.save();
  res.redirect("/feed");
});

router.post("/register", function (req, res, next) {
  const user = new userModel({
    username: req.body.username,
    email: req.body.email,
    name: req.body.fullname,
  });
  userModel.register(user, req.body.password).then(function () {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/profile");
    });
  });
});

router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    successRedirect: "/profile",
  }),
  function (req, res, next) {}
);

router.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

router.post("/update", upload.single("image"), async function (req, res, next) {
  const user = await userModel.findOneAndUpdate(
    { username: req.session.passport.user },
    { username: req.body.username, name: req.body.name, bio: req.body.bio },
    { new: true }
  );

  if (req.file) {
    user.picture = req.file.filename;
  }
  await user.save();
  res.redirect("/profile");
});

router.post("/upload", isLoggedIn, upload.single("image"), async function (req, res) {
    const user = await userModel.findOne({username: req.session.passport.user});
    const post = await postModel.create({
      picture: req.file.filename,
      user: user._id,
      caption: req.body.caption,
    })

    user.posts.push(post._id);
    await user.save();
    res.redirect("/feed");
  }
);

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}

module.exports = router;
