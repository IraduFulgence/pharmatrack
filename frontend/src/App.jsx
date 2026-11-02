import React from 'react';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Navbar from './components/navbar';
import Hero from './components/hero';
import WhyChooseUs from './components/whyus';
import HowItWorks from './components/how';
import Footer from './components/footer';
import Login from './pages/login';
import Register from './pages/register';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Dashboard from './pages/dashboard/dashboard';
const Layout =({children}) =>(
  <div className="min-h-screen w-full bg-white dark:bg-gray-950 transition-colors flex flex-col">
    <Navbar />
    <main className="flex-grow">{children}</main>
    <Footer />
  </div>
);

const Home = () =>(
<>
      <Hero />
      <WhyChooseUs />
      <HowItWorks />
</>
);
function App() {

  return (
    <GoogleOAuthProvider>
      <Router>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/login" element={<Layout><Login /></Layout>} />
        <Route path="/register" element={<Layout><Register /></Layout>} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
