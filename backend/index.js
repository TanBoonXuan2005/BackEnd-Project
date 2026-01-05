require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { DATABASE_URL } = process.env;

let app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function getPostgresVersion() {
  const client = await pool.connect();
  try {
    const response = await client.query("SELECT version()");
    console.log(response.rows[0]);
  } finally {
    client.release();
  }
}

getPostgresVersion();

// Get court
app.get("/courts", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM courts')
    res.json(result.rows)
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: 'Internal Server Error' })
  }
})

// Get all bookings
app.get("/bookings", async (req, res) => {
  try {
    const { user_id } = req.query;
    let query = "SELECT * FROM bookings"
    let params = []
    if (user_id) {
      query += " WHERE user_id = $1"
      params.push(user_id);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get a single booking
app.get("/bookings/:id", async (req, res) => {
  const client = await pool.connect();
  const { id } = req.params;
  try {
    const query = "SELECT * FROM bookings WHERE id = $1";
    const result = await client.query(query, [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Booking not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
})

// Add a new booking
app.post("/bookings", async (req, res) => {
  const client = await pool.connect();
  try {
    const data = {
      title: req.body.title,
      description: req.body.description,
      phone_number: req.body.phone_number,
      date: req.body.date,
      time: req.body.time,
      email: req.body.email,
      user_id: req.body.user_id,
      court_number: req.body.court_number,
      status: req.body.status,
      name: req.body.name,
    };
    const query =
      `INSERT INTO bookings (title, description, date, time, phone_number, email, user_id, court_number, status, name) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`;
    const values = [
      data.title,
      data.description,
      data.date,
      data.time,
      data.phone_number,
      data.email,
      data.user_id,
      data.court_number,
      data.status,
      data.name,
    ];
    const result = await client.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

// Update a booking
app.put("/bookings/edit/:id", async (req, res) => {
  const client = await pool.connect();
  const id = parseInt(req.params.id);
  try {
    const updateQuery =
      `UPDATE bookings SET title = $1, description = $2, date = $3, time = $4, phone_number = $5, 
      email = $6, user_id = $7, court_number = $8, status = $9, name = $10 WHERE id = $11 RETURNING *`;

    const updateData = [
      req.body.title,
      req.body.description,
      req.body.date,
      req.body.time,
      req.body.phone_number,
      req.body.email,
      req.body.user_id,
      req.body.court_number,
      req.body.status, 
      req.body.name,
      id
    ];
    const result = await client.query(updateQuery, updateData);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    console.log("Booking updated successfully");
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

// Delete a booking
app.delete("/bookings/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const id = req.params.id;
    const query = "DELETE FROM bookings WHERE id = $1 RETURNING *";
    const result = await client.query(query, [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Booking not found" });
    }
    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
