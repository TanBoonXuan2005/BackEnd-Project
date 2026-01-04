import { useNavigate } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../components/AuthProivder";
import { Container, Table, Button, Spinner, Badge, Modal } from "react-bootstrap";

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
            await fetch(`http://localhost:5000/bookings/${selectedBookingId}`, {
                method: "DELETE",
            });
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
                        <thead className="bg-light">

                        </thead>
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