import { Container, Nav, Navbar, Modal } from 'react-bootstrap';
import { Outlet, useNavigate, Link } from 'react-router-dom';

export default function Header() {
    const navigate = useNavigate();
    const isLogin = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login')
    }

    return (
        <>
            <Navbar bg="dark" variant="dark" expand="lg" sticky='top' className="shadow-sm mb-4 py-3">
                <Container>
                    <Navbar.Brand as={Link} to='/'>
                        <img src="" alt="" />Badminton Pro
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="ms-auto align-items-center">
                            <Nav.Link as={Link} to='/' active>Home</Nav.Link>
                            <Nav.Link as={Link} to='/booking' active>Booking</Nav.Link>
                            {isLogin ? (
                                <>
                                    <Nav.Link as={Link} to='/profile' active>Profile</Nav.Link>
                                    <Nav.Link onClick={handleLogout}>Logout</Nav.Link>
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
            <Modal>

            </Modal>
            <Container style={{minHeight: '80vh'}}>
                <Outlet/>
            </Container>
        </>
    )
}