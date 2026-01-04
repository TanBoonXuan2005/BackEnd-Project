import { createBrowserRouter } from "react-router-dom";
import BookingPage from "./pages/BookingPage";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Header from "./components/Header";
import ProfilePage from "./pages/ProfilePage";
import ErrorPage from "./pages/ErrorPage";
import Courts from "./pages/Courts";
import MyBookings from "./pages/MyBookings";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Header />,
        children: [
            {
                index: true,
                element: <Home/>
            },
            {
                path: 'bookings/:id',
                element: <BookingPage/>
            },
            {
                path: 'bookings/edit/:id',
                element: <BookingPage isEditMode={true}/>
            },
            {
                path: 'courts',
                element: <Courts/>
            },
            {
                path: 'my-bookings',
                element: <MyBookings/>
            },
            {
                path: 'profile',
                element: <ProfilePage/>
            },
            {
                path: '*',
                element: <ErrorPage/>
            }
        ],
    },
    {
      path: '/login',
      element: <Login/>
    },
    {
      path: '/register',
      element: <Register/>
    }
]);

export default router;
