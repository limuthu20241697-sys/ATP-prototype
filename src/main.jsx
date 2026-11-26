/* The site's starting point. It loads the styles, then shows the right page for the address:
   the home page, All events, Venues or Sign up. The old .html addresses (events.html?city=Colombo and so on) still work,
   so links shared before the move to React open the same page. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import './styles/styles.css';
import './styles/screens.css';
import Layout from './Layout.jsx';
import Home from './pages/Home.jsx';
import Events from './pages/Events.jsx';
import Venues from './pages/Venues.jsx';
import Signup from './pages/Signup.jsx';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/index.html', element: <Home /> },
      { path: '/events.html', element: <Events /> },
      { path: '/events', element: <Events /> },
      { path: '/venues.html', element: <Venues /> },
      { path: '/venues', element: <Venues /> },
      { path: '/signup.html', element: <Signup /> },
      { path: '/signup', element: <Signup /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
