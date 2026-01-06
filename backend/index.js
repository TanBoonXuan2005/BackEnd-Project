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
    const { user_id, date, court_id } = req.query;
    let query = "SELECT * FROM bookings WHERE 1=1"
    let params = []
    let counter = 1

    if (user_id) {
      query += ` AND user_id = $${counter}`;
      params.push(user_id);
      counter++;
    }

    if (court_id) {
      query += ` AND court_id = $${counter}`;
      params.push(court_id);
      counter++;
    }

    if (date) {
      query += ` AND date = $${counter}`;
      params.push(date);
      counter++;
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
    const {
      title,
      phone_number,
      date,
      time,
      email,
      user_id,
      court_number,
      court_id, 
      name,     
    } = req.body;

    const courtQuery = "SELECT price_per_hour, name FROM courts WHERE id = $1";
    const courtResult = await client.query(courtQuery, [court_id]);

    if (courtResult.rows.length === 0) {
      return res.status(404).json({ error: "Court not found" });
    }

    const court = courtResult.rows[0];
    const pricePerHour = parseFloat(court.price_per_hour);

    const calculatedTotal = pricePerHour * 2;

    const query = `
      INSERT INTO bookings (
        title,  
        date, 
        time, 
        phone_number,
        email, 
        user_id, 
        court_number, 
        status, 
        name, 
        total_price, 
        court_id
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *
    `;

    const values = [
      title,       
      date,
      time,
      phone_number,
      email,
      user_id, 
      court_number,        
      'booked',         
      name,
      calculatedTotal,  
      court_id
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
      `UPDATE bookings SET title = $1, date = $2, time = $3, phone_number = $4, 
      email = $5, user_id = $6, court_number = $7, status = $8, name = $9 WHERE id = $10 RETURNING *`;

    const updateData = [
      req.body.title,
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
