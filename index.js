const express = require('express')
const bp = require('body-parser')
const mongoose = require('mongoose')
const app = express()
const cors = require('cors')
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = mongoose.Schema({
  username: String,
});

const ExerciseSchema = mongoose.Schema({
  user_id: mongoose.Schema.Types.ObjectId,
  description: String,
  duration: Number,
  date: Date
});

const User = mongoose.model('User', UserSchema);
const Exercise = mongoose.model('Exercise', ExerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.use(bp.urlencoded({ extended: false }));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', (req, res) => {
  const { username } = req.body;

  const user = new User({ username: username });

  user.save((err, user) => {
    if (err)
      return res.send({ error: err });

    res.send({
      username: user.username,
      _id: user._id
    });
  });
});

app.get('/api/users', (req, res) => {
  User.find({}, (err, users) => {
    if (err)
      return res.send({ error: err });

    res.send(users.map(user => {
      return {
        username: user.username,
        _id: user._id
      };
    }));
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  let { description, duration, date } = req.body;

  date = date ? new Date(Number(date) ? Number(date) : date) : new Date();

  User.findById(_id, (err, user) => {
    if (err)
      return res.send({ error: err });

    const exercise = new Exercise({
      user_id: _id,
      description: description,
      duration: duration,
      date: date
    });

    exercise.save((err, result) => {
      if (err)
        return res.send({ error: err });

      return res.send({
        username: user.username,
        description: description,
        duration: duration,
        date: date.toDateString(),
        _id: user._id
      });
    });
  })
});

app.get('/api/users/:_id/logs', (req, res) => {
  let { _id, from, to, limit } = req.params;

  console.log("Querying for " + _id);
  console.log(from);
  console.log(to);
  console.log(limit);

  User.findById(_id, (err, user) => {
    if (err)
      return res.send({ error: err });

    if (!user)
      return res.send({ error: 'user not found' });

    from = from ? new Date(Number(from) ? Number(from) : from) : null;
    to = to ? new Date(Number(to) ? Number(to) : to) : null;

    let option = { user_id: _id };

    if (from || to)
      option.date = {};

    if (from)
      option.date['$gte'] = from;

    if (to)
      option.date['$lte'] = to;

    console.log(option);

    let query = Exercise.find(option).select("description duration date");

    if (limit)
      query.limit(limit);

    query.exec((err, exercises) => {
        if (err)
          return res.send({ error: err });

        if (!exercises)
          return res.send({ error: 'exercises not found' });

        console.log("All exercises: ");
        console.log(exercises);

        res.send({
          username: user.username,
          count: exercises.length,
          _id: user._id,
          log: exercises.map(exercise => {
            return {
              description: exercise.description,
              duration: exercise.duration,
              date: new Date(exercise.date).toDateString()
            };
          })
        });
    });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
