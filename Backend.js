const sqlite3 = require('sqlite3').verbose();
const express = require('express');

const port = 8000;

const con = new sqlite3.Database('MultiplayerDB.sqlite', (err) => {
    if (err) {
        console.error("Could not connect to SQLite file:", err.message);
    } else {
        console.log("Connected to local SQLite file!");
    }
});

const app = express();

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.append("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.append("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.append("Access-Control-Allow-Credentials", "true");
    res.append("Content-Type", "application/json");
    next();
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

app.get('/', (req, res) => {
    res.send('This is a SQLite database server for the game-project.');
});

app.get('/regenerate', (req, res) => {
    con.serialize(() => {
        con.run(`DROP TABLE IF EXISTS Scores;`);
        con.run(`CREATE TABLE IF NOT EXISTS Scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        difficulty INTEGER NOT NULL,
        correct INTEGER NOT NULL,
        incorrect INTEGER NOT NULL,
        score INTEGER NOT NULL
    );`);});
  res.send('Database regenerated!');
});

app.get('/scores', (req, res) => {
    const limit = 9;
    //ROW_NUMBER() OVER (ORDER BY score DESC) as rank
    const sql = `SELECT * FROM Scores ORDER BY score DESC, * LIMIT ${limit};`;
    SendRequest(sql, res);
});

app.get('/scores/name/:name', (req, res) => {
    const { name } = req.params;
    const limit = 9;
    const sql = `SELECT *, ROW_NUMBER() OVER (ORDER BY score DESC) as rank FROM Scores ORDER BY score DESC LIMIT ${limit};
    UNION ALL
    SELECT *, ROW_NUMBER() OVER (ORDER BY score DESC) as rank FROM Scores WHERE name = '${name}';`;
    SendRequest(sql, res);
});

app.post('/scores/add', (req, res) => {
    const { name, difficulty, correct, incorrect, score } = req.body;

    const sql = `
        INSERT INTO Scores (name, difficulty, correct, incorrect, score) 
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
            difficulty = excluded.difficulty,
            correct = excluded.correct,
            incorrect = excluded.incorrect,
            score = excluded.score;
    `;

    const params = [name, difficulty, correct, incorrect, score];

    con.run(sql, params);
});

function SendRequest(sql, res) 
{
    con.all(sql, function (err, result) {
        if (err) throw err;
        res.json(result);
    });
} 