import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { RoomProvider } from './context/RoomContext';
import Home from './pages/Home';
import RoomDashboard from './pages/RoomDashboard';
import Room from './pages/Room';
import Admin from './pages/Admin';
import Layout from './components/Layout';

function App() {
  return (
    <RoomProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomCode" element={<RoomDashboard />} />
          <Route path="/room/:roomCode/play" element={<Room />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Layout>
    </RoomProvider>
  );
}

export default App;
