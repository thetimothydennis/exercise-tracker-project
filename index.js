const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
require('dotenv').config();

app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => res.sendFile(__dirname + '/views/index.html'));

app.use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: false }));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  }
});

const exerciseSchema = new mongoose.Schema({
  _uid: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  }
});

const User = mongoose.model("User", userSchema);

const Exercise = mongoose.model("Exercise", exerciseSchema);

const findUserByID = async function(input) {
  try {
    let findAUser = await User.find({ "_id": input })
    return findAUser
  }
  catch(error) {
    console.log(error)
  }
};

app.post("/api/users", (req, res) => {
  async function findUser() {
    const findUser = await User.find({ username: req.body.username })
    if (findUser.length == 0){
      let user = new User({ username: req.body.username })
      await user.save()
      let findUserAgain = await User.find({ username: req.body.username })
      return findUserAgain;
    }
    else return findUser;
  };

  findUser().then(findUser => res.json({ username: req.body.username, "_id": findUser[0]._id }))
  .catch(error => console.log(error));
});

app.post("/api/users/:_id/exercises", (req, res) => {
  async function inputExercise() {
    try {
      let responseObject = {};
      let user = await findUserByID(req.params._id);
      responseObject._id = req.params._id;
      responseObject.username = user[0].username;
      const newExercise = new Exercise({ _uid: user[0]._id, description: req.body.description, duration: req.body.duration, date: req.body.date });
      await newExercise.save()
      responseObject.date = newExercise.date.toUTCString();
      responseObject.duration = newExercise.duration;
      responseObject.description = newExercise.description;
      return responseObject
    }
    catch (error) {
      console.log(error.message)
    };
  };

  inputExercise().then(
    results => res.json({ _id: results._id, username: results.username, date: results.date, duration: results.duration, description: results.description })
    )
    .catch(
    error => console.log(error)
  );
});

app.get("/api/users/:_id/logs?", (req, res) => {
  async function getLogs() {
    let responseObject = {};
    try {
      let user = await findUserByID(req.params._id)
      responseObject._id = req.params._id;
      responseObject.username = user[0].username;
      let queryObject = {};
      if (!req.query.from && !req.query.to) queryObject = { _uid: user[0]._id};
      else if ((req.query.from.length > 0) && (!req.query.to)) {
        let newFromDate = new Date (req.query.from);
        queryObject = { _uid: user[0]._id, date: { $gte: newFromDate }};
      }
      else if (req.query.to.length > 0) {
        let newFromDate = new Date (req.query.from);
        let newToDate = new Date (req.query.to);
        queryObject = { _uid: user[0]._id, date: { $gte: newFromDate, $lte: newToDate } };
      }
      let findLogs = await Exercise.find(queryObject, { "__v": 0, "_id": 0, "_uid": 0 });
      responseObject.count = findLogs.length;
      responseObject.log = findLogs;
      if (req.query.limit > 0) responseObject.log.splice(req.query.limit);
      return responseObject;
    }
    catch (error) {
      return console.log(error);
    };
  };
  getLogs().then(
    results => {
      res.json({ _id: results._id, username: results.username, count: results.count, log: results.log })
    }
  )
  .catch(
    error => console.log(error)
  );
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
