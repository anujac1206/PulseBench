import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectPage from './pages/ProjectPage';
import { isLoggedIn } from './services/client';
function PrivateRoute({ children }) {
    return isLoggedIn() ? children : _jsx(Navigate, { to: "/login" });
}
export default function App() {
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/", element: _jsx(PrivateRoute, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/projects/:id", element: _jsx(PrivateRoute, { children: _jsx(ProjectPage, {}) }) })] }) }));
}
