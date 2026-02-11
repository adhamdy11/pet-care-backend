var sqlite3 = require('sqlite3').verbose();
var path = require('path');

var dbPath = path.join(__dirname, 'petcare.sqlite');
var db = new sqlite3.Database(dbPath);

function initDb() {
  db.serialize(function() {
    db.run("PRAGMA foreign_keys = ON;");

    db.run(
      "CREATE TABLE IF NOT EXISTS users (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
        "username TEXT NOT NULL," +
        "email TEXT NOT NULL UNIQUE," +
        "password TEXT NOT NULL," +
        "role TEXT NOT NULL DEFAULT 'user'" +
      ");"
    );

    db.run(
      "CREATE TABLE IF NOT EXISTS pets (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
        "user_id INTEGER NOT NULL," +
        "name TEXT NOT NULL," +
        "species TEXT," +
        "breed TEXT," +
        "age INTEGER," +
        "notes TEXT," +
        "FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE" +
      ");"
    );

    db.run(
      "CREATE TABLE IF NOT EXISTS appointments (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
        "user_id INTEGER NOT NULL," +
        "pet_id INTEGER NOT NULL," +
        "date TEXT NOT NULL," +
        "type TEXT NOT NULL," +
        "notes TEXT," +
        "status TEXT NOT NULL DEFAULT 'scheduled'," +
        "FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE," +
        "FOREIGN KEY(pet_id) REFERENCES pets(id) ON DELETE CASCADE" +
      ");"
    );

    db.run(
      "CREATE TABLE IF NOT EXISTS medical_records (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
        "user_id INTEGER NOT NULL," +
        "pet_id INTEGER NOT NULL," +
        "record_type TEXT NOT NULL," +
        "record_date TEXT NOT NULL," +
        "details TEXT," +
        "FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE," +
        "FOREIGN KEY(pet_id) REFERENCES pets(id) ON DELETE CASCADE" +
      ");"
    );

    db.run(
      "CREATE TABLE IF NOT EXISTS reminders (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
        "user_id INTEGER NOT NULL," +
        "pet_id INTEGER NOT NULL," +
        "title TEXT NOT NULL," +
        "due_date TEXT NOT NULL," +
        "notes TEXT," +
        "is_done INTEGER NOT NULL DEFAULT 0," +
        "FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE," +
        "FOREIGN KEY(pet_id) REFERENCES pets(id) ON DELETE CASCADE" +
      ");"
    );
  });
}

module.exports = {
  db: db,
  initDb: initDb
};
