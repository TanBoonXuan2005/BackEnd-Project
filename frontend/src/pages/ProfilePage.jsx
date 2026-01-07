import { Container, Row, Card, Col, Button, Image, Form, Badge, Modal, Spinner, ListGroup, Alert } from "react-bootstrap";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../components/AuthProvider";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

export default function ProfilePage() {
    const { currentUser } = useContext(AuthContext);

    // State
    const [name, setName] = useState(currentUser.displayName || "User");
    const [email, setEmail] = useState(currentUser.email);

    const [imageFile, setImageFile] = useState(null);
    const [backgroundFile, setBackgroundFile] = useState(null);

    const [profileImage, setProfileImage] = useState(currentUser.photoURL || '');
    const [imageError, setImageError] = useState(false);
    const [backgroundImage, setBackgroundImage] = useState(
        localStorage.getItem(`bg_${currentUser.uid}`) || ''
    );
    const [showProfileImageModal, setShowProfileImageModal] = useState(false);
    const [showBackgroundImageModal, setShowBackgroundImageModal] = useState(false);

    const [message, setMessage] = useState({  text: "", type: "" });
    const [showMessageModal, setShowMessageModal] = useState(false);
    
    // Stats
    const [bookings, setBookings] = useState([]);
    const [bookingStats, setBookingStats] = useState({ total: 0, booked: 0, spent: 0 });
    const [loadingStats, setLoadingStats] = useState(true);

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    const now = new Date();
    const activeBookings = bookings.filter(booking => {
        const datePart = booking.date.split('T')[0];
        const bookingDate = new Date(`${datePart}T${booking.time}`);
        return bookingDate >= now;
    });
    useEffect(() => {
        if (currentUser) {
            fetch(`${API_URL}/bookings?user_id=${currentUser.uid}`)
                .then((res) => res.json())
                .then((data) => {
                    const sortedData = data.sort((a, b) => b.id - a.id)
                    setBookings(sortedData);

                    const now = new Date();
                    const activeBookings = data.filter(booking => {
                        const datePart = booking.date.split('T')[0];
                        const bookingDate = new Date(`${datePart}T${booking.time}`);
                        return bookingDate >= now;
                    });

                    const total = data.length;
                    const booked = activeBookings.length;
                    const spent = data.reduce((acc, curr) => acc + parseFloat(curr.total_price), 0)
                    setBookingStats({ total, booked, spent });
                    setLoadingStats(false);
                })
                .catch((err) => {
                    console.error("Error: ",err);
                });
        }
    }, [currentUser]);

    const showNotification = (text, type) => {
        setMessage({ text, type });
        setShowMessageModal(true);
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    }


    const handleProfileImageChange = async() => {
        if (!imageFile) return;

        try {
            const storageRef = ref(storage, `profile_images/${currentUser.uid}`);
            await uploadBytes(storageRef, imageFile);
            const newPhotoUrl = await getDownloadURL(storageRef);
            
            await updateProfile(currentUser, {
                photoURL: newPhotoUrl,
            });
            setProfileImage(newPhotoUrl);
            setShowProfileImageModal(false);
            setImageFile(null);
            showNotification("Profile picture updated!", "success")
        } catch (err) {
            showNotification("Something went wrong!", "error")
        }
    }

    const handleBackgroundChange = async() => {
        if (!backgroundFile) return;

        try {
            const storageRef = ref(storage, `background_images/${currentUser.uid}`);
            await uploadBytes(storageRef, backgroundFile);
            const newBackgroundUrl = await getDownloadURL(storageRef);
            
            localStorage.setItem(`bg_${currentUser.uid}`, newBackgroundUrl);
            setBackgroundImage(newBackgroundUrl);
            setShowBackgroundImageModal(false);
            showNotification("Background picture updated!", "success")
        } catch (err) {
            showNotification("Something went wrong!", "error")
        }

    }

    if (loadingStats) {
        return (
            <Container className="text-center py-5 mt-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">Loading...</p>
            </Container>
            )
    }

    return (
        <Container className="py-3">
            <div className="container text-center mb-5">
                <h1 className="display-4 fw-bold">👤 My Profile</h1>
            </div>
            <Row className="justify-content-center mb-5">
                <Col md={8}>
                    <Card className="shadow-sm border-1 overflow-hidden">
                        <div
                            style={{ 
                                height: "200px", 
                                backgroundColor: "rgba(222, 226, 230, 1)",
                                backgroundImage: `url(${backgroundImage})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                position: "relative"
                            }}
                        >
                            <Button 
                                variant="light" 
                                size="sm"
                                className="position-absolute top-0 end-0 m-3 opacity-75"
                                onClick={() => setShowBackgroundImageModal(true)}
                            >
                                <i className="bi bi-pencil-fill me-1"></i> Edit
                            </Button>
                        </div>
                        <Card.Body className="text-center p-4 pt-0">
                            <div className="position-relative d-inline-block" style={{marginTop: '-70px'}}>
                                <div>
                                    {!imageError && profileImage ? (
                                    <Image 
                                        src={profileImage} 
                                        roundedCircle 
                                        style={{ width: "140px", height: "140px", objectFit: "cover", border: "5px solid white" }}
                                        onError={() => setImageError(true)}
                                    />
                                    ) : (
                                        <div 
                                            className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto"
                                            style={{ width: "140px", height: "140px", fontSize: "3rem", border: "5px solid white" }}
                                        >
                                            {name ? name.charAt(0).toUpperCase() : "User"}
                                        </div>
                                    )}
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="position-absolute bottom-0 end-0 rounded-circle border-white"
                                        style={{ width: '40px', height: '40px', border: '3px solid white' }}
                                        onClick={() => setShowProfileImageModal(true)}
                                    >
                                        <i className="bi bi-camera-fill"></i>
                                    </Button>
                                </div>            
                            </div>

                            <h3 className="fw-bold">{name || "User"}</h3>
                            <p className="text-muted">{email}</p>
                            <Badge bg="info" className="mt-2 px-3 py-2 rounded-pill">Badminton Pro Member</Badge>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            
            <Row className="justify-content-center mb-5 g-4">
                <Col md={4} lg={3}>
                    <Card className="h-100 shadow-sm border-0 bg-primary text-white rounded-4">
                        <Card.Body className="text-center py-4">
                            <div className="fs-1 mb-2">
                                <i className="bi bi-calendar-check"></i>
                            </div>
                            <h3 className="display-5 fw-bold mb-0">{bookingStats.total}</h3>
                            <p className="mb-0 opacity-75">Total Bookings</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4} lg={3}>
                    <Card className="h-100 shadow-sm border-0 bg-danger text-white rounded-4">
                        <Card.Body className="text-center py-4">
                            <div className="fs-1 mb-2">
                                <i className="bi bi-wallet2"></i>
                            </div>
                            <h3 className="display-5 fw-bold mb-0">RM {bookingStats.spent}</h3>
                            <p className="mb-0 opacity-75">Total Spent</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4} lg={3}>
                    <Card className="h-100 shadow-sm border-0 bg-success text-white rounded-4">
                        <Card.Body className="text-center py-4">
                            <div className="fs-1 mb-2">
                                <i className="bi bi-check-circle"></i>
                            </div>
                            <h3 className="display-5 fw-bold mb-0">{bookingStats.booked}</h3>
                            <p className="mb-0 opacity-75">Active Bookings</p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="justify-content-center">
                <Col lg={10}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h4 className="fw-bold">🏸 Recent Activity</h4>
                    </div>
                    
                    {bookings.length > 0 ? (
                        <ListGroup className="shadow-sm rounded-4 overflow-hidden">
                            {bookings.slice(0, 3).map((booking, index) => (
                                <ListGroup.Item key={index} className="p-4 border-0 border-bottom d-flex justify-content-between align-items-center">
                                    <div>
                                        <h5 className="fw-bold mb-1">
                                            {booking.title}
                                        </h5>
                                        <p className="text-muted mb-0 small">
                                            <i className="bi bi-clock me-1"></i> 
                                            {booking.date.split('T')[0]} • {booking.time}
                                        </p>
                                    </div>
                                    <div className="text-end">
                                        <h5 className="text-primary fw-bold mb-1">
                                            RM {booking.total_price ? parseFloat(booking.total_price).toFixed(2) : "0.00"}
                                        </h5>
                                        <Badge bg="success" text="white" className="border">
                                            {booking.status || "Completed"}
                                        </Badge>
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    ) : (
                        <Alert variant="light" className="text-center py-5 shadow-sm border-0">
                            <div className="fs-1 text-muted mb-"><i className="bi bi-emoji-frown"></i></div>
                            <h5 className="mb-3">No bookings yet</h5>
                            <Button variant="primary" href="/courts">Find a Court</Button>
                        </Alert>
                    )}
                </Col>
            </Row>

            {/* Modal Edit Profile Picture */}
            <Modal show={showProfileImageModal} onHide={() => setShowProfileImageModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Update Profile Picture</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* URL Input Section */}
                    <Form.Group>
                        <Form.Label>Choose Image File</Form.Label>
                        <Form.Control 
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <Form.Text className="text-muted"> 
                            Supported formats: jpg, png, jpeg.
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="danger" onClick={() => setShowProfileImageModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={handleProfileImageChange} disabled={!imageFile}>
                        Upload & Save
                    </Button>
                </Modal.Footer>    
            </Modal>

            {/* Modal Edit Background Picture */}
            <Modal show={showBackgroundImageModal} onHide={() => setShowBackgroundImageModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Update Background Picture</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Choose Background Image</Form.Label>
                        <Form.Control 
                            type="file"
                            accept="image/*"
                            onChange={(e) => setBackgroundFile(e.target.files[0])}
                        />
                        <Form.Text className="text-muted">
                            Recommended size: 800x200 pixels
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="danger" onClick={() => setShowBackgroundImageModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={handleBackgroundChange} disabled={!backgroundFile}>
                        Upload Background
                    </Button>
                </Modal.Footer>    
            </Modal>

            <Modal show={showMessageModal} onHide={() => setShowMessageModal(false)} centered>
                <Modal.Header closeButton className={message.type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'}>
                    <Modal.Title>
                        {message.type === 'success' ? 'Success' : 'Error'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center p-4">
                    <div className="mb-3">
                        {message.type === 'success' ? (
                            <i className="bi bi-check-circle-fill text-success display-3"></i>
                        ) : (
                            <i className="bi bi-exclamation-triangle-fill text-danger display-3"></i>
                        )}
                    </div>
                    <h5 className="mb-0">{message.text}</h5>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant={message.type === 'success' ? 'success' : 'danger'} onClick={() => setShowMessageModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    )
}