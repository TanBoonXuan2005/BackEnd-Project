import { Row, Col, Image, Form, Button, Container } from "react-bootstrap";
import { useState } from "react";
import { useNavigate } from 'react-router-dom';


export default function Register() {
    const navigate = useNavigate();
    const isLogin = localStorage.getItem("token");
    const registerImage = "";

    const handleRegister = (e) => {
        e.preventDefault();

        try {
            navigate('/login')
        } catch (err) {
            console.error("Error: ",err)
        }
    }
    
    const [formData, setFormData] = useState({
        name: "",
        phone_number: "",
        email: "",
        password: "",
        confirm_password: "" 
    });
    
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <Container fluid className="vh-100 overflow-hidden">
            <Row className="h-100">
                <Col sm={6} className="p-0 d-none d-md-block">
                    <Image 
                        src={registerImage} 
                        style={{ width: '100%', height: '100vh', objectFit: 'cover' }}
                    /> 
                    <div style={{ position: "absolute", top: "50px", left: "50px", color: "white", textShadow: "2px 2px 4px rgba(0,0,0,0.6)" }}>
                        <h1 className="display-4 fw-bold">Join the Member.</h1>
                        <p className="fs-4">Book faster. Play better.</p>
                    </div>
                </Col> 
                <Col sm={6} className="d-flex justify-content-center align-items-center bg-light">
                    <div className="p-5 shadow-lg rounded-4 bg-white" style={{ width: '100%', maxWidth: '550px'}}>
                        <div className="mb-4 text-center">
                            <h2 className="fw-bold text-primary">Create Account</h2>
                            <p className="text-muted">Please enter your details to sign in.</p>
                        </div>
                        <Form onSubmit={handleRegister}>
                            <Form.Group className="mb-3">
                                <Form.Label style={{fontSize: 20}}>Full Name</Form.Label>
                                <Form.Control 
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter your name" 
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label style={{fontSize: 20}} className="mt-3">Contact Number</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    name="phone_number"
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    placeholder="Enter your phone number" 
                                    required/> 
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label style={{fontSize: 20}} className="mt-3">Email address</Form.Label>
                                <Form.Control 
                                    type="email" 
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email" 
                                    required
                                />
                            </Form.Group>

                            <Row>
                                <Col sm={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label style={{fontSize: 20}} className="mt-3">Password</Form.Label>
                                        <Form.Control 
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="********" 
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col sm={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label style={{fontSize: 20}} className="mt-3">Confirm Password</Form.Label>
                                        <Form.Control 
                                            type="password"
                                            name='confirm_password'
                                            value={formData.confirm_password}
                                            onChange={handleChange}
                                            placeholder="******" 
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Button variant="dark" type="submit" className="w-100 rounded-pill py-2 mt-3 fw-bold shadow-sm">
                                Sign Up
                            </Button>
                        </Form>
                        <div className="text-center mt-4">
                            <span className="text-muted">Already a member? </span>
                            <span 
                                className="text-primary fw-bold" 
                                style={{ cursor: "pointer" }} 
                                onClick={() => navigate("/login")}
                            >
                                Login here
                            </span>
                        </div>
                    </div>
                </Col>
            </Row>
        </Container>
    )
}