const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
}, {
  timestamps: true // Add createdAt and updatedAt fields
});

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;
