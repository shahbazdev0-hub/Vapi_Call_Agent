import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Header from './components/Header';
import ConversationReports from './components/ConversationReports';
import Home from './pages/Home';
import CreateOrder from './pages/CreateOrder';
import UploadSpreadsheet from './pages/UploadSpreadsheet';
import OrderStatus from './pages/OrderStatus';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

// Styles
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create-order" element={<CreateOrder />} />
            <Route path="/upload/:orderId" element={<UploadSpreadsheet />} />
            <Route path="/order/:orderId" element={<OrderStatus />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
            {/* NEW ROUTES FOR CONVERSATION REPORTS */}
            <Route path="/reports/:orderId" element={<ConversationReports />} />
            <Route path="/conversations/:orderId" element={<ConversationReports />} />
            
          </Routes>
        </main>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </Router>
  );
}

export default App;
