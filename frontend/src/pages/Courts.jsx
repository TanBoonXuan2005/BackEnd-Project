import { Container, Row, Col, Card, Image, Button, Form, Spinner, Alert, Modal } from "react-bootstrap"
import { useState, useEffect, useContext } from "react";
import { motion } from 'framer-motion';
import { AuthContext } from "../components/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function Courts() {
    const [courts, setCourts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const [showLoginModal, setShowLoginModal] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    useEffect(() => {
        fetch(`${API_URL}/courts`)
            .then((res) => res.json())
            .then((data) => {
                setCourts(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error: ",err);
                setLoading(false);
            });
    }, []);

    const handleBook = (courtId) => {
        if (!currentUser) {
            setShowLoginModal(true);
        } else {
            navigate(`/bookings/${courtId}`);
        }
    }

    const handleNavigation = (path) => {
        setShowLoginModal(false);
        navigate(path);
    }
    
    if (loading) {
        return (
            <Container className="text-center py-5 mt-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">Loading...</p>
            </Container>
        )
    }

    return (
        <Container className="py-5">
            <div className="text-center mb-5">
                <h1 className="fw-bold display-5 text-primary">Find Your Courts</h1>
                <p className="text-muted">Browse all our premium locations</p>
            </div>
            <Row>
                {courts.length === 0 && (
                <div className="text-center py-5 bg-light rounded">
                    <h2>⚠️</h2>
                    <h4>No courts available at the moment</h4>
                    <p>Please check back later!</p>
                </div>
                )}

                {courts.map((court, index) => (
                    <Col key={court.id} md={6} lg={4} className="mb-4">
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="h-100 shadow-sm border-0 overflow-hidden">
                                <div style={{ position: "relative", overflow: "hidden", borderRadius: "8px 8px 0 0" }}>
                                    <Card.Img 
                                        src={court.image_url} 
                                        variant="top"
                                        style={{
                                            width: "100%",
                                            height: "220px",
                                            objectFit: "cover",
                                        }}
                                    />
                                </div>
                                <Card.Body className="d-flex flex-column">
                                    <Card.Title className="fw-bold">{court.name}</Card.Title>
                                    <Card.Text className="text-muted small mb-3">
                                        <i className="bi bi-geo-alt-fill me-1 text-danger"></i>
                                        {court.location}
                                    </Card.Text>
                                    <Card.Text className="small text-secondary flex-grow-1">
                                        {court.description ? court.description.substring(0, 80) + "..." : "Premium facilities available."}
                                    </Card.Text>
                                    <div className="text-end">
                                        <span className="text-muted small">Starting Form</span>
                                        <div className="fw-bold text-primary fs-5">
                                            RM{court.price_per_hour} <span className="fs-6 text-muted">/hr</span>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <Button 
                                            variant="dark" 
                                            className="w-100 rounded-pill"
                                            onClick={() => handleBook(court.id)}
                                        >
                                            <i className="bi bi-arrow-right"></i> Book Court
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </motion.div>
                    </Col>
                ))} 
            </Row>
            <Modal show={showLoginModal} onHide={() => setShowLoginModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">Login Required</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center py-4">
                    <div className="mb-3">
                        <i className="bi bi-shield-lock text-primary" style={{ fontSize: "3rem" }}></i>
                    </div>
                    <h5>You need to be logged in to book a court</h5>
                    <p className="text-muted">Please sign in to your account or create a new one to continue with your booking.</p>
                </Modal.Body>
                <Modal.Footer className="justify-content-center border-0 pb-4">
                    <Button 
                        variant="outline-secondary" 
                        className="rounded-pill px-4"
                        onClick={() => handleNavigation("/register")}
                    >
                        Register
                    </Button>
                    <Button 
                        variant="primary" 
                        className="rounded-pill px-4"
                        onClick={() => handleNavigation("/login")}
                    >
                        Login
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    )
}