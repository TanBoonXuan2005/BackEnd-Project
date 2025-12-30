import { RouterProvider } from "react-router-dom";
import router from "./routes.jsx";
import "bootstrap/dist/css/bootstrap.min.css";

export default function App() {
  return (
    <RouterProvider router={router} />
  );
}