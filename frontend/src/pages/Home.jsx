import { Link } from "react-router-dom";
import { Container, Row, Col, Button, Image, Card, Badge, Spinner } from "react-bootstrap";
import { motion } from 'framer-motion';
import { useState, useEffect } from "react";

export default function Home() {
   const isLogin = localStorage.getItem("token");
   const [courts, setCourts] = useState([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      
   })
   if (loading) return ;

   return (
      <Container className="py-5">
         {!isLogin && (
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
                     <Button as={Link} to="/booking" variant="primary" className="px-4 rounded-pill shadow-sm" size="lg">
                        Book Now
                     </Button>
                  </div>
               </Col>
               <Col sm={6}>
                  <Image src="" fluid/> 
               </Col>
            </Row>
         )}

         <div className="d-flex justify-content-between align-items-center mb-4 mt-5">
            <h3 className="fw-bold m-0">🔥 Trending Courts</h3>
            <Link to="/booking" className="text-decoration-none fw-bold">View All Projects &rarr;</Link>
         </div>
         
         <div className="d-flex flex-column gap-4">
            <motion.div
               initial={{ opacity: 0, y: 50 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5 }}
               viewport={{ once: true, margin: '-100px' }}
            >
               <Card className="shadow-sm border-0 overflow-hidden">
                  <div className="d-flex flex-column flex-md-row ">
                     <div className="col-md-4 justify-content-start">
                        <Image src="" fluid/>
                     </div>
                     <div className="col-md-8 p-4 d-flex flex-column justify-content-center">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                           <h4 className="fw-bold mb-0">Sunway stadium</h4>
                           <Badge bg="danger" text="white" className="border">Trending</Badge>
                        </div>
                        <p>Premium rubber flooring with air-cond</p>
                        <div className="d-flex justify-content-between align-items-center mt-auto">
                           <div>
                              <span className="text-muted small">Starting Form</span>
                              <div className="fw-bold text-primary fs-5">
                                 RM25 <span className="fs-6 text-muted">/hr</span>
                              </div>
                           </div>
                           <Button as={Link} to="/booking" variant="outline-dark" className="rounded-pill px-4">
                              <i className="bi bi-arrow-right"></i> Check court
                           </Button>
                        </div>
                     </div>
                  </div>
               </Card>
            </motion.div>
         </div>

         <footer className="text-center mt-5 pt-5 text-muted small">
            © BadmintonPro 2026. All rights reserved.
         </footer>
      </Container>
   );
}