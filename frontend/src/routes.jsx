import { createBrowserRouter } from "react-router-dom";
import BookingPage from "./pages/BookingPage";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
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
                path: '/bookings/:id',
                element: <BookingPage/>
            },
            {
                path: '/courts',
                element: <Courts/>
            },
            {
                path: '/my-bookings',
                element: <MyBookings/>
            },
            {
                path: '/profile',
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
      element: <Auth/>
    },
    {
      path: '/register',
      element: <Auth/>
    }
]);

export default router;
