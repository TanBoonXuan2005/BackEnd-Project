import { Container, Spinner, Col, Row, Card, Form, Button, Alert } from 'react-bootstrap';
import { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../components/AuthProivder';

export default function BookingPage({ isEditMode = false }) {
    const [court, setCourt] = useState(null);
    const [courts, setCourts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [timeSlots, setTimeSlots] = useState([]);

    const { id } = useParams();
    const { currentUser } = useContext(AuthContext);
    const [selectedCourtNum, setSelectedCourtNum] = useState(null);
    const [status, setStatus] = useState({ message: "", variant: "" })

    const [formData, setFormData] = useState({
        description: "",
        phone_number: "",
        email: "",
        date: "",
        time: ""
    });

    const navigate = useNavigate();

    const generateTimeSlots = (opening_hours, close_hours, selectedDate) => {
        const slots = [];
        if (!opening_hours || !close_hours) return slots;

        let start = parseInt(opening_hours.split(':')[0]);
        let end = parseInt(close_hours.split(':')[0]);

        const now = new Date();
        const currentHour = now.getHours();

        const todayStr = now.toLocaleDateString('en-CA')
        const isToday = selectedDate === todayStr;
    

        for (let i = start; i < end; i += 2) {
            if (i + 2 > end) break;

            if (isToday && i <= currentHour) continue;

            const timeStr = i.toString().padStart(2, '0') + ':00';
            const endTimeStr = (i + 2).toString().padStart(2, '0') + ':00';

            slots.push({
                value: timeStr,
                label: `${timeStr} - ${endTimeStr}`,
            });
        }
        return slots 
    };

    const getMinDate = () => {
        const today = new Date();
        const currentHour = today.getHours();

        if (court && court.close_hours) {
            const closeHour = parseInt(court.close_hours.split(':')[0]);
            if (currentHour >= closeHour) {
                today.setDate(today.getDate() + 1);
            }
        }

        return today.toLocaleDateString('en-CA');
    };
    

    useEffect(() => {
        fetch("http://localhost:5000/courts")
            .then((res) => res.json())
            .then(data => {
                const selectedCourt  = data.find(court => court.id === String(id) || court.id === parseInt(id));
                setCourt(selectedCourt);

                const count = selectedCourt.total_courts;
                setCourts(Array.from({ length: count }, (_, index) => index + 1));

                if (selectedCourt.opening_hours && selectedCourt.close_hours) {
                    const timeSlots = generateTimeSlots(selectedCourt.opening_hours, selectedCourt.close_hours);
                    setTimeSlots(timeSlots);
                }

                setLoading(false);
            })
            .catch(err => {
                console.error("Error: ",err);
                setLoading(false);
            })

        if (currentUser) {
            setFormData(prev => ({
                ...prev,
                name: currentUser.displayName || "",
                phone_number: currentUser.phoneNumber || "",
                email: currentUser.email || "",
            }))
        }
        
    }, [currentUser, id]);

    useEffect(() => {
        if (court && court.opening_hours && court.close_hours) {
            const slots = generateTimeSlots(court.opening_hours, court.close_hours, formData.date);
            setTimeSlots(slots);

            const isTimeValid = slots.some(slot => slot.value === formData.time);
            if (!isTimeValid && formData.time !== "") {
                setFormData(prev => ({
                    ...prev,
                    time: ""
                }))
            }
        }
    }, [court, formData.date])

    useEffect(() => {
        fetch('http://localhost:5000/courts')
            .then(res => res.json())
            .then(data => {
                let selectedCourt;
                if (isEditMode) {
                    fetch(`http://localhost:5000/bookings/${id}`)
                        .then(res => res.json())
                        .then(booking => {
                            setFormData({
                                description: booking.description,
                                phone_number: booking.phone_number,
                                email: booking.email,
                                date: booking.date,
                                time: booking.time,
                                court_number: booking.court_number,
                            });
                            selectedCourt = data.find(court => court.id === booking.court_id);
                            setCourt(selectedCourt);
                        })
                } else {
                    selectedCourt = data.find(court => court.id === String(id) || court.id === parseInt(id));
                    setCourt(selectedCourt);
                }
            })
            .catch(err => {
                console.error("Error: ",err);
            })
    }, [id, isEditMode])

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            navigate("/login");
            return;
        }

        if (!formData.date || !formData.time || !selectedCourtNum) {
            setStatus({ message: "Please select Date, Time, and Court Number.", variant: "danger" });
            return;
        }

        if (formData.time < court.opening_hours || formData.time > court.close_hours) {
            setStatus({ message: `Court is closed. Open hours: ${court.opening_hours} - ${court.close_hours}`, variant: "warning" });
            return;
        }
 
        const bookingData = {
            court_id: court.id,
            user_id: currentUser.uid,
            title: `${court.name} (Court ${selectedCourtNum})`,
            description: formData.description,
            phone_number: formData.phone_number,
            email: formData.email,
            date: formData.date,
            time: formData.time,
            status: "Booked",
            court_number: selectedCourtNum,
        }

        const method = isEditMode ? "PUT" : "POST";
        const url = isEditMode 
            ? `http://localhost:5000/bookings/edit/${id}` 
            : "http://localhost:5000/bookings";

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(bookingData),
            });

            if (response.ok) {
                setStatus({ message: "Booking Successful! Redirecting...", variant: "success" });
                navigate("/my-bookings")
            } else {
                setStatus({ message: "Booking Failed. Please try again.", variant: "danger" });
            }
                
        } catch (err) {
            console.error("Error: ",err);
        }
    };

    if (loading) return <Container className="text-center py-5"><Spinner animation="border" /></Container>;
    if (!court) return <Container className="text-center py-5"><h2>Court not found</h2></Container>;

    return(
        <Container className='py-5'>
            <Row className='justify-content-center'>
                <Col md={4} className='mb-4'>
                    <Card className='shadow-sm border-0 sticky-top' style={{ top: '100px' }}>
                        <Card.Img 
                            src={court.image_url} 
                            variant="top"
                            style={{
                                height: "200px",
                                objectFit: "cover",
                            }}
                        />
                        <Card.Body>
                            <h3 className='fw-bold'>{court.name}</h3>
                            <p className="text-muted"><i className="bi bi-geo-alt-fill text-danger"></i> {court.location}</p>
                            <hr />
                            <div className="d-flex justify-content-between">
                                <span className="text-muted">Price</span>
                                <span className="fw-bold text-primary">RM {court.price_per_hour}/hr</span>
                            </div>
                            <div className="d-flex justify-content-between mt-2">
                                <span className="text-muted">Available Hours</span>
                                <span className="fw-bold">{court.opening_hours} - {court.close_hours}</span>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={8}>
                    <Card className='shadow-lg border-0 py-4 px-5'>
                        <h3 className='fw-bold mb-4'>Book Your Slot</h3>
                        {status.message && <Alert variant={status.variant} dismissible onClose={() => setStatus({})}>{status.message}</Alert>}
                        <Form onSubmit={handleSubmit}>
                            {/* Date & Time */}
                            <Form.Group className='mb-4'>
                                <Form.Label className='fw-bold text-uppercase text-secondary small'>Step 1: Select Date & Time</Form.Label>
                                <Row>
                                    <Col sm={6}>
                                        <Form.Control 
                                            type="date" 
                                            name="date" 
                                            value={formData.date} 
                                            onChange={handleChange} 
                                            min={getMinDate()}
                                            required
                                        />
                                    </Col>
                                    <Col sm={6}>
                                        <Form.Select 
                                            name="time" 
                                            value={formData.time} 
                                            onChange={handleChange} 
                                            disabled={!formData.date}
                                            required
                                        >
                                        <option value="">
                                                    {formData.date ? "Select a time slot" : "Select date first"}
                                                </option>
                                                {timeSlots.map((slot, index) => (
                                                    <option key={index} value={slot.value}>
                                                        {slot.label}
                                                    </option>
                                                ))}
                                        </Form.Select>
                                    </Col>
                                </Row>
                                <Form.Text className="text-muted">
                                    Opening Hours: {court.opening_hours} - {court.close_hours}
                                </Form.Text>
                            </Form.Group>

                            {/* Court number */}
                            <Form.Group className='mb-4'>
                                <Form.Label className='fw-bold text-uppercase text-secondary small'>Step 2: Select Court Number</Form.Label>
                                {!formData.time && (
                                    <div className="text-muted small mb-2 fst-italic">
                                        * Please select a date and time first to see available courts.
                                    </div>
                                )}
                                <div className='d-flex flex-wrap gap-3'>
                                    {courts.map((num) => (
                                        <Button 
                                            key={num}
                                            disabled={!formData.time || !formData.date}
                                            variant={selectedCourtNum === num ? "primary" : "outline-secondary"}
                                            className="rounded-3 d-flex flex-column align-items-center justify-content-center shadow-sm"
                                            style={{ width: "80px", height: "70px" }}
                                            onClick={() => setSelectedCourtNum(num)}
                                        >
                                            <span className="small text-uppercase" style={{fontSize: '0.7rem'}}>Court</span>
                                            <span className="fw-bold fs-4">{num}</span>
                                        </Button>
                                    ))}
                                </div>
                            </Form.Group>

                            <hr className='my-4 opacity-10'/>

                            <h5 className='fw-bold mb-3 text-uppercase text-secondary small'>Step 3: Contact details</h5>
                            <Row>
                                <Col sm={6}>
                                    <Form.Group className='mb-3'>
                                        <Form.Label className='text-secondary fw-bold'>Full Name</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            name="name" 
                                            value={formData.name} 
                                            onChange={handleChange} 
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col sm={6}>
                                    <Form.Group className='mb-3'>
                                        <Form.Label className='text-secondary fw-bold'>Phone Number</Form.Label>
                                        <Form.Control 
                                            type="tel" 
                                            name="phone_number" 
                                            value={formData.phone_number} 
                                            onChange={handleChange} 
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col sm={12}>
                                    <Form.Group className='mb-3'>
                                        <Form.Label className='text-secondary fw-bold'>Email</Form.Label>
                                        <Form.Control 
                                            type="email" 
                                            name="email" 
                                            value={formData.email} 
                                            onChange={handleChange} 
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Button
                                variant="success" 
                                type="submit" 
                                disabled={!formData.date || !formData.time || !selectedCourtNum || !formData.name || !formData.phone_number || !formData.email}
                                className='w-100 rounded-pill fw-bold shadow mt-3'
                                size="lg"
                            >
                                {formData.date && formData.time && selectedCourtNum 
                                    ? `Confirm Booking ${court.name} (Court ${selectedCourtNum})` 
                                    : "Complete All Steps to Book"
                                }
                            </Button>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}