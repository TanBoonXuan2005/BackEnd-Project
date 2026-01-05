import { useNavigate } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../components/AuthProivder";
import { Container, Table, Button, Spinner, Badge, Modal, Row, Col } from "react-bootstrap";

export default function MyBookings() {
    const { currentUser } = useContext(AuthContext);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState(null);

    const fetchBookings = async() => {
        if (!currentUser) return;

        try {
            const response = await fetch(`http://localhost:5000/bookings?user_id=${currentUser.uid}`);
            const data = await response.json();
            setBookings(data);
            setLoading(false);
        } catch (err) {
            console.error("Error: ",err);
            setLoading(false);
        }
    }

    useEffect(() => {
       if (currentUser) {
        fetchBookings();
       } else {
        navigate("/login");
       }
    }, [currentUser, navigate]);

    const confirmDelete = (bookingId) => {
        setSelectedBookingId(bookingId);
        setShowDeleteModal(true);
    };

    const handleDelete = async() => {
        try {
            const response = await fetch(`http://localhost:5000/bookings/${selectedBookingId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setBookings(prevBookings => prevBookings.filter(booking => booking.id !== selectedBookingId));
                setShowDeleteModal(false);
            } else {
                console.error("Failed to delete booking");
            }
        } catch (err) {
            console.error("Error: ",err);
        }
    };
    
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
            <h2 className="mb-4 fw-bold">My Bookings</h2>
            {bookings.length === 0 ? (
                <div className="text-center py-5 rounded">
                    <h2>⚠️</h2>
                    <h4>You haven't booked any courts yet.</h4>
                    <Button variant="primary" className="mt-3 rounded-pill px-4" onClick={() => navigate("/courts")}>
                        Find a Court
                    </Button>
                </div>
            ) : (
                <div className="table-responsive shadow-sm rounded">
                    <Table className="align-middle mb-0 bg-white" hover>
                        <thead className="bg-light text-secondary">
                            <tr>
                                <th className="ps-4 py-3" style={{ width: '35%' }}>Court Name</th>
                                <th style={{ width: '15% '}}>Date</th>
                                <th style={{ width: '15% '}}>Time</th>
                                <th style={{ width: '15%' }}>Status</th>
                                <th className="text-end pe-4" style={{ width: '20%' }}>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {bookings.map((booking) => ( 
                                <tr key={booking.id}>
                                    <td className="ps-4 fw-bold">{booking.title}</td>
                                    <td>{booking.date}</td>
                                    <td>{booking.time}</td>
                                    <td>
                                        <Badge bg={booking.status === "Booked" ? "success" : "secondary"}>
                                            {booking.status || "Booked"}
                                        </Badge>
                                    </td>
                                    <td className="text-center">
                                        <div className="d-flex justify-content-end gap-2">
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                style={{ width: '80px' }} 
                                                onClick={() => navigate(`/bookings/edit/${booking.id}`)}
                                            >
                                                <i className="bi bi-pencil-square"></i> Edit
                                            </Button>

                                            <Button 
                                                variant="danger" 
                                                size="sm"
                                                style={{ width: '90px' }}
                                                onClick={() => confirmDelete(booking.id)}
                                            >
                                                <i className="bi bi-trash"></i> Delete
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            )}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Delete</Modal.Title>
                </Modal.Header>
                <Modal.Body>Are you sure want to remove this booking?</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    )
}