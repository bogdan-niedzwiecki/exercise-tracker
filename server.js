const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require("body-parser")

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true })

const exerciseSchema = new mongoose.Schema({
  username: String,
  userid: String,
  description: String,
  duration: Number,
  timestamp: Date,
  date: String,
}, { versionKey: false });

const Exercise = mongoose.model('Exercise', exerciseSchema);

const userSchema = new mongoose.Schema({
  username: String
}, { versionKey: false });

const User = mongoose.model('User', userSchema);

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', function (req, res) {
  if (!req.body.username) {
    return res.send("username is required");
  }

  const user = new User({ username: req.body.username });
  user.save().then(savedUser => {
    res.json(savedUser)
  });
});

app.get('/api/users', function (req, res) {
  User.find().then(users => {
    res.json(users);
  })
})

app.use('/api/users/exercises', function (req, res) {
  res.send("userId is required");
})

app.post('/api/users/:_id/exercises', function (req, res) {
  if (!req.body.description) {
    return res.send("description is required");
  }

  if (!req.body.duration) {
    return res.send("duration is required");
  }

  User.findById(req.params._id, function (err, userFound) {
    if (err) return console.log(err);
    const timestamp = req.body.date ? new Date(req.body.date) : new Date()
    if (userFound) {
      const exercise = new Exercise({
        username: userFound.username,
        userid: req.params._id,
        description: req.body.description,
        duration: req.body.duration,
        timestamp,
        date: timestamp.toDateString()
      });
      exercise.save().then(savedExercise => {
        const { username, description, duration, date, userid } = savedExercise
        res.json({ username, description, duration, date, _id: userid })
      });
    } else {
      res.send("Unknown userId");
    }
  })
});

app.use('/api/users/:_id/logs', function (req, res) {
  User.findById(req.params._id, function (err, userFound) {
    if (err) return console.log(err);
    if (!userFound) {
      return res.send("unknown userId");
    }

    Exercise.find({
      userid: req.params._id,
      timestamp: {
        $gte: req.query.from ? new Date(req.query.from) : new Date(-8640000000000000),
        $lte: req.query.to ? new Date(req.query.to) : new Date(8640000000000000)
      }
    })
      .sort({ timestamp: 1 })
      .select({ _id: 0, username: 0, userid: 0, timestamp: 0 })
      .limit(Number(req.query.limit))
      .exec(function (err, log) {
        if (err) return console.log(err);
        res.json({
          username: userFound.username,
          count: log.length,
          _id: userFound._id,
          log
        });
      })
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
