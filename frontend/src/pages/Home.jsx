import { Link } from "react-router-dom";
import { Container, Row, Col, Button, Image, Card, Badge, Spinner } from "react-bootstrap";
import { motion } from 'framer-motion';
import { useState, useEffect } from "react";

export default function Home() {
   const [courts, setCourts] = useState([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      fetch("http://localhost:5000/courts")
         .then((res) => res.json())
         .then((data) => {
            setCourts(data);
            setLoading(false);
         })
         .catch((err) => {
            console.error("Error: ",err);
         });
   }, []);

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
         <Row className="align-items-center mb-5">
            <Col sm={6} className="text-center text-sm-start mb-4">
               <h1 className="display-4 fw-bold mb-3 lh-1">
                  Book Your Court <br />
                  <span className="text-primary">Play Like a Pro</span>
               </h1>
               <p className="lead text-muted mb-4">
                  The easiest, smartest tool to find and book badminton courts.
                  Book instantly, pay securely, and get on the court-hassle-free.
               </p>
               <div className="d-flex gap-3 justify-content-center justify-content-md-start">
                  <Button as={Link} to="/courts" variant="primary" className="px-4 rounded-pill shadow-sm" size="lg">
                     Book Now
                  </Button>
               </div>
            </Col>
            <Col sm={6}>
               <Image 
                  src="https://media.istockphoto.com/id/1192023529/photo/asian-badminton-player-is-hitting-in-court.jpg?s=612x612&w=0&k=20&c=32rDisHRvLTxaetdlFHZ0lsaWqu3yYO21w-hv4Z29xs=" 
                  fluid
                  className="shadow-lg"
                  rounded
               /> 
            </Col>
         </Row>

         <div className="d-flex justify-content-between align-items-center mb-4 mt-5">
            <h3 className="fw-bold m-0">🔥 Trending Courts</h3>
            <Link to="/courts" className="text-decoration-none fw-bold">View All Courts &rarr;</Link>
         </div>
         
         <div className="d-flex flex-column gap-4">
            {courts.length === 0 && (
               <div className="text-center py-5 bg-light rounded">
                  <h2>⚠️</h2>
                  <h4>No courts available at the moment</h4>
                  <p>Please check back later!</p>
               </div>
            )}

            {courts.slice(0, 3).map((court) => (
               <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true, margin: '-100px' }}
               >
                  <Card className="shadow-sm border-0 overflow-hidden">
                     <div className="d-flex flex-column flex-md-row ">
                        <div className="col-md-4 justify-content-start">
                           <Card.Img
                              src={court.image_url} 
                              variant="top"
                              style={{
                                 width: "100%",
                                 height: "250px",
                                 objectFit: "cover",
                              }}
                           />
                        </div>
                        <div className="col-md-8 p-4 d-flex flex-column justify-content-center">
                           <div className="d-flex justify-content-between align-items-start mb-2">
                              <h4 className="fw-bold mb-0">{court.name}</h4>
                              <Badge bg="danger" text="white" className="border">Trending</Badge>
                           </div>
                           <p>{court.description}</p>
                           <div className="d-flex justify-content-between align-items-center mt-auto">
                              <div>
                                 <span className="text-muted small">Starting Form</span>
                                 <div className="fw-bold text-primary fs-5">
                                    RM{court.price_per_hour} <span className="fs-6 text-muted">/hr</span>
                                 </div>
                              </div>
                              <Button as={Link} to={`/bookings/${court.id}`} variant="outline-dark" className="rounded-pill px-4">
                                 <i className="bi bi-arrow-right"></i> Book Court
                              </Button>
                           </div>
                        </div>
                     </div>
                  </Card>
               </motion.div>
            ))}
         </div>

         <footer className="text-center mt-5 pt-5 text-muted small">
            © BadmintonPro 2026. All rights reserved.
         </footer>
      </Container>
   );
}