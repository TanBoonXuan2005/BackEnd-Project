import { Container } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = "http://localhost:5000/bookings";

export default function BookingPage() {
    const [booking, setBooking] = useState([]);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        phone_number: "",
        email: "",
        date: "",
        time: "",
        court_number: "Court 1",
        user_id: "user_123"
    });
    const navigate = useNavigate();


    useEffect(() => {
        fetchBooking();
    }, []);

    const fetchBooking = async () => {
        try {
            const response = await fetch(API_URL);
            if (response.ok) {
                const data = await response.json();
                setBooking(data);
            }
        } catch (err) {
            console.error("Error: ",err);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/login")
            return;
        }

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });
                
        } catch (err) {
            console.error("Error: ",err);
        }
    };

    const handleDelete = async (id) => {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                fetchBooking();
            };
        } catch (err) {
            console.error("Error: ",err);
        }
    };

    return(
        <Container>
            
        </Container>
    );
}