require('dotenv').config();

var express = require('express');
var cors = require('cors');
var initDb = require('./database/db').initDb;

var authRoutes = require('./routes/authRoutes');
var adminRoutes = require('./routes/adminRoutes');
var petRoutes = require('./routes/petRoutes');
var appointmentRoutes = require('./routes/appointmentRoutes');
var recordRoutes = require('./routes/recordRoutes');
var reminderRoutes = require('./routes/reminderRoutes');

var app = express();
app.use(cors());
app.use(express.json());

initDb();

app.get('/', function(req, res) {
  res.json({ message: "Pet Care Backend is running" });
});

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/pets', petRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/records', recordRoutes);
app.use('/reminders', reminderRoutes);

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Server running on port " + port);
});
