import { createBrowserRouter } from "react-router-dom";
import BookingPage from "./pages/BookingPage";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Header from "./components/Header";
import ProfilePage from "./pages/ProfilePage";
import ErrorPage from "./pages/ErrorPage";

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
                path: 'booking',
                element: <BookingPage/>
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
