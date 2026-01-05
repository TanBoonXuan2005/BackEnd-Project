import { Container, Nav, Navbar, Modal, Image, NavDropdown, Button } from 'react-bootstrap';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useState, useContext } from 'react';
import { AuthContext } from './AuthProivder';
import { getAuth, signOut } from 'firebase/auth';

export default function Header() {
    const navigate = useNavigate();
    const { currentUser } = useContext(AuthContext);
    const auth = getAuth();
    const userProfileImage = currentUser?.photoURL;
    const userBackgroundImage = currentUser?.background || null;
    const [showModal, setShowModal] = useState(false);

    const handleLogout = async() => {
        try {
            await signOut(auth);
            handleClose();
            navigate('/');
        } catch (err) {
            console.error("Error: ",err);
        }
    }

    const handleShow = () => {
        setShowModal(true);
    }

    const handleClose = () => {
        setShowModal(false);
    }



    return (
        <>
            <Navbar bg="dark" variant="dark" expand="lg" sticky='top' className="shadow-sm mb-4 py-3">
                <Container>
                    <Navbar.Brand as={Link} to='/'>
                        Badminton Pro
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="ms-auto align-items-center">
                            <Nav.Link as={Link} to='/' active>Home</Nav.Link>
                            <Nav.Link as={Link} to='/courts' active>Find a Court</Nav.Link>
                            {currentUser ? (
                                <>
                                    <Nav.Link as={Link} to='/my-bookings' active>My Bookings</Nav.Link>
                                    <Nav>
                                        <NavDropdown
                                            align="end"
                                            title={
                                                userProfileImage ? (
                                                    <img 
                                                        src={userProfileImage}
                                                        alt="Profile"
                                                        className="rounded-circle"
                                                        style={{ 
                                                            width: "35px", 
                                                            height: "35px", 
                                                            objectFit: "cover", 
                                                            border: "2px solid white" 
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="bg-secondary text-white rounded-circle d-inline-flex align-items-center justify-content-center"
                                                        style={{ 
                                                            width: "35px", 
                                                            height: "35px", 
                                                            fontSize: "1.2rem", 
                                                            border: "2px solid white" 
                                                        }}
                                                    >
                                                        {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
                                                    </div>
                                                )
                                            }
                                            id="profile-dropdown"
                                        >
                                            <div style={{ minWidth: "300px", padding: 0}}>
                                                <div 
                                                    style={{ 
                                                        height: "100px", 
                                                        backgroundColor: "rgba(222, 226, 230, 1)",
                                                        backgroundImage: `url(${userBackgroundImage})`,
                                                        backgroundSize: "cover",
                                                        backgroundPosition: "center"
                                                    }}
                                                ></div>
                                                <div className="text-center px-3 pb-3">
                                                    <div style={{ marginTop: "-40px", marginBottom: "10px" }}>
                                                        {userProfileImage ? (
                                                            <Image 
                                                                src={userProfileImage} 
                                                                roundedCircle 
                                                                style={{ 
                                                                    width: "80px", 
                                                                    height: "80px", 
                                                                    objectFit: "cover", 
                                                                    border: "4px solid white", 
                                                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)" 
                                                                }} 
                                                            />
                                                        ) : (
                                                            <div 
                                                                className="bg-secondary text-white rounded-circle d-inline-flex align-items-center justify-content-center mx-auto"
                                                                style={{ 
                                                                    width: "80px", 
                                                                    height: "80px", 
                                                                    fontSize: "2.5rem", 
                                                                    border: "4px solid white", 
                                                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)" 
                                                                }}
                                                            >
                                                                {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h5 className="fw-bold mb-1">Hi, {currentUser.displayName || "User"}!</h5>
                                                    <small className="text-muted d-block mb-3">{currentUser.email}</small>
                                                    
                                                    <Link to="/profile" className="btn btn-outline-dark rounded-pill px-4">
                                                        Manage Profile
                                                    </Link>
                                                </div>

                                                <NavDropdown.Divider />

                                                <NavDropdown.Item onClick={handleShow} className="text-danger fw-bold ">
                                                    <i className="bi bi-box-arrow-right me-2"></i> Logout
                                                </NavDropdown.Item>
                                            </div>
                                        </NavDropdown>
                                    </Nav>
                                </>
                            ) : (
                                <>
                                    <Nav.Link as={Link} to='/login' active>Login</Nav.Link>
                                    <Nav.Link as={Link} to='/register' active>Sign Up</Nav.Link>
                                </>
                            )}
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            <Modal
                show={showModal}
                onHide={handleClose}
                backdrop="static"
                keyboard={false}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Logout</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure want to logout?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleLogout}>
                        Logout
                    </Button>
                </Modal.Footer>
            </Modal>
            <Container style={{minHeight: '80vh'}}>
                <Outlet/>
            </Container>
        </>
    )
}