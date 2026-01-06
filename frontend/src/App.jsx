import { RouterProvider } from "react-router-dom";
import router from "./routes.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import { AuthProvider } from "./components/AuthProvider.jsx";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}