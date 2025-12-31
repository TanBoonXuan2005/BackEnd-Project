import { Col, Row, Image, Form, Button, Container } from "react-bootstrap";
import { useNavigate } from 'react-router-dom';
import { useContext, useEffect } from "react";
import {
    GoogleAuthProvider,
    signInWithPopup,
    getAuth,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { AuthContext } from "../components/AuthProivder";

export default function Login() {
    const navigate = useNavigate();
    const loginImage = "";
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    const { currentUser } = useContext(AuthContext);

    useEffect(() => {
        if (currentUser) {
            navigate("/booking");
        }
    }, [currentUser, navigate]);


    const handleLogin = async(e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            console.error("Error: ",err);
        }
    }

    const handleGoogleLogin = async(e) => {
        e.preventDefault();
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            console.error("Error: ",err);
        }
    }

    return (
        <Container fluid className="vh-100 overflow-hidden">
            <Row className="h-100">
                <Col sm={6} className="p-0 d-none d-md-block">
                    <Image 
                        src={loginImage} 
                        style={{ width: '100' }}
                    /> 
                    <div style={{ position: "absolute", bottom: "50px", left: "50px", color: "white", textShadow: "2px 2px 4px rgba(0,0,0,0.6)" }}>
                        <h1 className="fw-bold">BadmintonPro</h1>
                        <p className="fs-5">Ready to smash it? Log in to book your court.</p>
                    </div>
                </Col> 
                <Col sm={6} className="d-flex align-items-center justify-content-center bg-light">
                    <div className="p-5 shadow-lg rounded-4 bg-white" style={{ width: '60%' }}>
                        <div className="mb-4 text-center">
                            <h2 className="fw-bold text-primary">Login</h2>
                            <p className="text-muted">Please enter your details to sign in.</p>
                        </div>
                        <Form onSubmit={handleLogin}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Email Address</Form.Label>
                                <Form.Control type="email" placeholder="name@example.com" required />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label className="fw-semibold">Password</Form.Label>
                                <Form.Control type="password" placeholder="Enter your password" required />
                            </Form.Group>

                            <Button 
                                variant="primary" 
                                type="submit" 
                                className="w-100 rounded-pill py-2 mb-2 fw-bold shadow-sm"
                                onClick={handleLogin}    
                            >
                                Log In
                            </Button>
                        </Form>

                        <div className="d-flex align-items-center my-3">
                            <hr className="flex-grow-1" />
                            <span className="mx-3 text-muted small">OR</span>
                            <hr className="flex-grow-1" />
                        </div>

                        <div className="d-grid gap-3">
                            <Button className="rounded-pill" variant="outline-dark" onClick={handleGoogleLogin}>
                                <i className="bi bi-google"></i> Sign up with Google
                            </Button>
                            <Button className="rounded-pill" variant="outline-dark">
                                <i className="bi bi-apple"></i> Sign up with Apple
                            </Button>
                        </div>

                        <div className="text-center mt-4">
                            <span className="text-muted">Don't have an account? </span>
                            <span 
                                className="text-primary fw-bold" 
                                style={{ cursor: "pointer" }} 
                                onClick={() => navigate("/register")}
                            >
                                Sign Up
                            </span>
                        </div>
                    </div>
                </Col>
            </Row>
        </Container>
    )
}