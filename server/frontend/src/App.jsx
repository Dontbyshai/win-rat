import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Login from './components/auth/Login'
import Dashboard from './components/dashboard/Dashboard'
import Interact from './components/dashboard/session/Interact'
import Overview from './components/dashboard/session/Overview'
import Session from './components/dashboard/session/Session'
import Account from "./components/dashboard/Account";
import { ToastContainer } from "react-toastify";
import Executable from "./components/dashboard/Executable";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

function App() {

  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
        const storedTheme = localStorage.getItem("theme");
        if (storedTheme === "light") {
            document.documentElement.classList.add("light");
            setIsLightMode(true);
        } else {
            document.documentElement.classList.remove("light");
            setIsLightMode(false);
        }
    }, []);

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard/session" replace />} />
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }>
          <Route path='session' element={<Session />}>
            <Route index element={<Overview />} />
            <Route path="interact" element={<Interact />} />
          </Route>
          <Route path="executable" element={<Executable />} />
          <Route path="account" element={<Account />} />
        </Route>
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </AuthProvider>
  )
}

export default App
