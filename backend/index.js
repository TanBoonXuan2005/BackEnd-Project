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
    const result = await pool.query("SELECT * FROM bookings");
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Add a new booking
app.post("/bookings", async (req, res) => {
  const client = await pool.connect();
  try {
    const startTime = parseInt(req.body.time.split(":")[0])
    
    const data = {
      title: req.body.title,
      description: req.body.description,
      phone_number: req.body.phone_number,
      date: req.body.date,
      time: req.body.time,
      user_id: req.body.user_id,
    };
    const query =
      "INSERT INTO bookings (title, description, phone_number, date, time, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *";
    const values = [
      data.title,
      data.description,
      data.phone_number,
      data.date,
      data.time,
      data.user_id,
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
app.put("/bookings/:id", async (req, res) => {
  const client = await pool.connect();
  const id = req.params.id;
  try {
    const updateQuery =
      "UPDATE bookings SET title = $1, description = $2, phone_number = $3, date = $4, time = $5 WHERE id = $6 RETURNING *";
    const updateData = [
      req.body.title,
      req.body.description,
      req.body.phone_number,
      req.body.date,
      req.body.time,
      id,
    ];
    const result = await client.query(updateQuery, updateData);
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Booking not found" });
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
