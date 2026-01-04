import { Container, Row, Card, Col, Button, Image, Form, Alert, Modal, InputGroup } from "react-bootstrap";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../components/AuthProivder";
import { updateProfile } from "firebase/auth";

export default function ProfilePage() {
    const { currentUser } = useContext(AuthContext);

    // State
    const [name, setName] = useState(currentUser.displayName || "User");
    const [email, setEmail] = useState(currentUser.email);

    const [backgroundUrl, setBackgroundUrl] = useState(
        localStorage.getItem(`bg_${currentUser.uid}`) || ''
    );

    const [imageUrl, setImageUrl] = useState('');
    const [invalidUrl, setInvalidUrl] = useState(false);

    const [profileImage, setProfileImage] = useState(currentUser.photoURL || '');
    const [backgroundImage, setBackgroundImage] = useState(
        localStorage.getItem(`bg_${currentUser.uid}`) || ''
    );
    const [showProfileImageModal, setShowProfileImageModal] = useState(false);
    const [showBackgroundImageModal, setShowBackgroundImageModal] = useState(false);

    const [message, setMessage] = useState({  text: "", type: "" });
    const [showMessageModal, setShowMessageModal] = useState(false);
    
    // Stats
    const [bookingStats, setBookingStats] = useState({ total: 0, booked: 0, spent: 0 });
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        if (currentUser) {
            fetch(`http://localhost:5000/bookings?user_id=${currentUser.uid}`)
                .then((res) => res.json())
                .then((data) => {
                    const total = data.length;
                    const booked = data.filter((booking) => booking.status === "booked").length;
                    const spent = total * 20;
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

    const handleProfileImageChange = async() => {
        if (!imageUrl.trim()) return;

        try {
            await updateProfile(currentUser, {
                photoURL: imageUrl,
            });
            setProfileImage(imageUrl);
            setShowProfileImageModal(false);
            showNotification("Profile picture updated!", "success")
        } catch (err) {
            showNotification("Something went wrong!", "error")
        }
    }

    const handleBackgroundChange = async() => {
        if (!backgroundUrl.trim()) return;

        localStorage.setItem(`bg_${currentUser.uid}`, backgroundUrl);
        setBackgroundImage(backgroundUrl);
        setShowBackgroundImageModal(false);
        showNotification("Background picture updated!", "success")
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
                                    {profileImage ? (
                                    <Image 
                                        src={profileImage} 
                                        roundedCircle 
                                        style={{ width: "140px", height: "140px", objectFit: "cover", border: "5px solid white" }}
                                        onError={(e) => e.target.style.display = 'none'}
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
                            <p className="text-muted mb-4">Badminton Pro Member</p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            <h3>Booking History</h3>
            <Row className="justify-content-center my-5">
                <Col md={3} sm={6}>
                    <Card className="text-center h-100 shadow-sm border-primary">
                        <Card.Body>
                            <h1 className="display-4 fw-bold text-primary">{bookingStats.total}</h1>
                            <Card.Text className="text-muted fw-semibold">Total Bookings</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3} sm={6}>
                    <Card className="text-center h-100 shadow-sm border-primary">
                        <Card.Body>
                            <h1 className="display-4 fw-bold text-danger">RM {bookingStats.spent}</h1>
                            <Card.Text className="text-muted fw-semibold">Total spent</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3} sm={6}>
                    <Card className="text-center h-100 shadow-sm border-primary">
                        <Card.Body>
                            <h1 className="display-4 fw-bold text-success">{bookingStats.booked}</h1>
                            <Card.Text className="text-muted fw-semibold">Total booked</Card.Text>
                        </Card.Body>
                    </Card>
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
                        {imageUrl && (
                            <div>
                                <Form.Label>Preview: </Form.Label>
                                <div className="text-center my-2 p-4 bg-light rounded">
                                    <Image
                                        src={imageUrl}
                                        roundedCircle
                                        style={{ width: "120px", height: "120px", objectFit: "cover", border: "3px solid white" }}
                                        onError={() => setInvalidUrl(true)} 
                                        onLoad={() => setInvalidUrl(false)}
                                    />
                                    {invalidUrl && (
                                        <div className="text-danger mt-2">
                                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                            Invalid image URL. Please try again.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <Form.Label>Image URL</Form.Label>
                        <InputGroup>
                            <InputGroup.Text className="bg-white">
                                <i className="bi bi-link-45deg"></i>
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Paste an image URL..."
                                value={imageUrl}
                                onChange={(e) => {
                                    setImageUrl(e.target.value)
                                    setInvalidUrl(false);
                                }}
                            /> 
                        </InputGroup>
                        <Form.Text className="text-muted">
                            Paste a direct link to an image (format: jpg, png, etc).
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="danger" onClick={() => setShowProfileImageModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={handleProfileImageChange} disabled={!imageUrl.trim() || invalidUrl}>
                        Save Change
                    </Button>
                </Modal.Footer>    
            </Modal>

            {/* Modal Edit Background Picture */}
            <Modal show={showBackgroundImageModal} onHide={() => setShowBackgroundImageModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Update Background Picture</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* URL Input Section */}
                    <Form.Group>
                        {backgroundUrl && (
                            <div>
                                <Form.Label>Preview: </Form.Label>
                                <div className="text-center my-2 p-4 bg-light rounded">
                                    <Image
                                        src={backgroundUrl}
                                        fluid
                                        style={{ maxHeight: "150px", width: "100%", objectFit: "cover", borderRadius: "8px" }}
                                        onError={() => setInvalidUrl(true)} 
                                        onLoad={() => setInvalidUrl(false)}
                                    />
                                    {invalidUrl && (
                                        <div className="text-danger mt-2">
                                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                            Invalid image URL. Please try again.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <Form.Label>Image URL</Form.Label>
                        <InputGroup>
                            <InputGroup.Text className="bg-white">
                                <i className="bi bi-link-45deg"></i>
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Paste an image URL..."
                                value={backgroundUrl}
                                onChange={(e) => {
                                    setBackgroundUrl(e.target.value)
                                    setInvalidUrl(false);
                                }}
                            /> 
                        </InputGroup>
                        <Form.Text className="text-muted">
                            Paste a direct link to an image (format: jpg, png, etc).
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="danger" onClick={() => setShowBackgroundImageModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={handleBackgroundChange} disabled={!backgroundUrl.trim() || invalidUrl}>
                        Save Change
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