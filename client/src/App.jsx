import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChallengeList from './components/ChallengeList';
import ChallengeView from './components/ChallengeView';
import Leaderboard from './components/Leaderboard';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<ChallengeList />} />
          <Route path="/challenge/:id" element={<ChallengeView />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
