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


app.use(express.json());


app.use((req, res, next) => {

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200); 
    }

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
        name TEXT NOT NULL UNIQUE,
        difficulty INTEGER NOT NULL,
        correct INTEGER NOT NULL,
        incorrect INTEGER NOT NULL,
        score INTEGER NOT NULL
    );`);});
  res.send('Database regenerated!');

  CommentRequest('regenerate', `DROP TABLE IF EXISTS Scores;
        CREATE TABLE IF NOT EXISTS Scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        difficulty INTEGER NOT NULL,
        correct INTEGER NOT NULL,
        incorrect INTEGER NOT NULL,
        score INTEGER NOT NULL
    );`, 'Database has been regenerated, all data is permaently lost!');
});

app.get('/scores', (req, res) => {
    const limit = 9;
    //ROW_NUMBER() OVER (ORDER BY score DESC) as rank
    const sql = `SELECT * FROM Scores ORDER BY score DESC LIMIT ${limit};`;
    SendRequest(sql, res);
});

app.get('/scores/name/:name', (req, res) => {
    const { name } = req.params;
    const limit = 9;
    const sql = `SELECT * FROM Scores ORDER BY score DESC LIMIT ${limit};
    UNION ALL
    SELECT * FROM Scores WHERE name = '${name}';`;
    SendRequest(sql, res);
});

app.post('/scores/add', (req, res) => {
    if (!req.body) {
        return res.status(400).send({ error: "Missing request body" });
    }
    const { name, difficulty, correct, incorrect, score } = req.body;

    const sql = `
        INSERT INTO Scores (name, difficulty, correct, incorrect, score) 
        VALUES ("${name}", ${difficulty}, ${correct}, ${incorrect}, ${score})
        ON CONFLICT(name) DO UPDATE SET
            difficulty = ${difficulty},
            correct = ${correct},
            incorrect = ${incorrect},
            score = ${score};
    `;
    CommentRequest('trying to add score request', sql, '---');
    con.run(sql, res);
    CommentRequest('Request successful', "---", '---');
});

// app.post('/scores/add', (req, res) => {
//     if (!req.body) {
//         return res.status(400).send({ error: "Missing request body" });
//     }
    
//     const { name, difficulty, correct, incorrect, score } = req.body;
//     const sql = `
//         INSERT INTO Scores (name, difficulty, correct, incorrect, score) 
//         VALUES (?, ?, ?, ?, ?)
//         ON CONFLICT(name) DO UPDATE SET
//             difficulty = ?,
//             correct = ?,
//             incorrect = ?,
//             score = ?;
//     `;
//     CommentRequest('trying to add score request', sql, '---');

//     const params = [
//         name, difficulty, correct, incorrect, score, 
//         difficulty, correct, incorrect, score        
//     ];

//     con.run(sql, params, function (err) {
//         if (err) {
//             console.error("CRITICAL DATABASE ERROR:", err.message);
//             console.error("SQL query attempted:", sql);
            
//             return res.status(500).json({ 
//                 error: "Internal Server Error", 
//                 details: err.message 
//             });
//         }

//         CommentRequest('Request successful', "---", '---');
//         res.json({ 
//             success: true, 
//             message: "New score has been added or updated!",
//             changes: this.changes
//         });
//     });
// });

function SendRequest(sql, res) 
{
    try {
        con.all(sql, function (err, result) {
            res.json(result);
        });
    } catch (error) {
        console.error(`Error occurred while sending request: ${error}\nSQL: ${sql}`);
        res.status(500).json({ error: 'Internal Server Error, problems in script' });
    }
} 

function CommentRequest(name, query, additional)
{
    console.log(`
        >>>>>>> ${name} 
        >>> by query: ${query} 
        >>> additional: ${additional}`);
}