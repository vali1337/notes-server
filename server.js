const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('./models/user.js');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

mongoose.connect('mongodb://localhost/notes-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const connection = mongoose.connection;
connection.once('open', () => {
  console.log('MongoDB database connection established successfully');
});

const Note = require('./models/note.model.js');

const server = http.createServer(app);
const io = socketIo(server);

io.on('connection', (socket) => {
  console.log('A user connected');

  // Listen for noteAdded event
  socket.on('noteAdded', (newNote) => {
    const note = new Note(newNote);
    note
      .save()
      .then(() => {
        console.log('Note added:', newNote);
        io.emit('noteAdded', newNote); // Emit the event to all connected clients
      })
      .catch((err) => console.error('Error adding note:', err));
  });

  // Listen for noteDeleted event
  socket.on('noteDeleted', (noteId) => {
    Note.findByIdAndDelete(noteId)
      .then((deletedNote) => {
        console.log('Note deleted:', deletedNote);
        io.emit('noteDeleted', noteId); // Emit the event to all connected clients
      })
      .catch((err) => console.error('Error deleting note:', err));
  });
});

app.get('/api/notes', (req, res) => {
  Note.find()
    .then((notes) => res.json(notes))
    .catch((err) => res.status(400).json('Error: ' + err));
});

app.post('/api/notes/add', (req, res) => {
  const { title, content } = req.body;
  const newNote = new Note({ title, content });

  newNote
    .save()
    .then(() => {
      console.log('Note added:', newNote);
      io.emit('noteAdded', newNote); // Emit the event to all connected clients
      res.json('Note added!');
    })
    .catch((err) => res.status(400).json('Error: ' + err));
});

app.delete('/api/notes/:id', (req, res) => {
  Note.findByIdAndDelete(req.params.id)
    .then((deletedNote) => {
      console.log('Note deleted:', deletedNote);
      io.emit('noteDeleted', req.params.id); // Emit the event to all connected clients
      res.json('Note deleted.');
    })
    .catch((err) => res.status(400).json('Error: ' + err));
});

// Authentication

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Register route
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;

  // Check if the username or email already exists
  User.findOne({ $or: [{ username }, { email }] }, (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Create a new user and save it to the database
    const newUser = new User({ username, email, password });
    newUser.save((err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json({ message: 'Registration successful' });
    });
  });
});

// Login route
app.post('/api/login', passport.authenticate('local'), (req, res) => {
  const token = jwt.sign({ userId: req.user._id }, 'your-secret-key-here', {
    expiresIn: '1h',
  });
  res.json({ token });
});

// Protect routes with JWT
app.get('/api/protected-route', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ message: 'This is a protected route' });
});

server.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
