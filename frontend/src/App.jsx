import { RouterProvider } from "react-router-dom";
import router from "./routes.jsx";
import { AuthProvider } from "./components/AuthProvider.jsx";
import { ThemeProvider } from "./components/ThemeProvider.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}