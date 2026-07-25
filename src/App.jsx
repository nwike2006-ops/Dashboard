import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './lib/AuthContext';
import RequireAuth from './components/RequireAuth';
import Login from './pages/Login';
import Home from './pages/Home';
import ModulePage from './pages/ModulePage';
import BibleModule, { useBibleState } from './modules/BibleModule';
import WorkoutModule, { useWorkoutState } from './modules/WorkoutModule';
import CarModule, { useCarState } from './modules/CarModule';
import BudgetModule, { useBudgetState } from './modules/BudgetModule';

function Dashboard() {
  const [bibleState, setBibleState, bibleLoading] = useBibleState();
  const [workoutState, setWorkoutState, workoutLoading] = useWorkoutState();
  const [carState, setCarState, carLoading] = useCarState();
  const [budgetState, setBudgetState, budgetLoading] = useBudgetState();

  const pageProps = { bibleState, workoutState, budgetState, carState };

  if (bibleLoading || workoutLoading || carLoading || budgetLoading) {
    return <div className="loading-screen">Loading your dashboard…</div>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Home bibleState={bibleState} carState={carState} budgetState={budgetState} />}
      />
      <Route
        path="/workout"
        element={
          <ModulePage {...pageProps}>
            <WorkoutModule state={workoutState} setState={setWorkoutState} />
          </ModulePage>
        }
      />
      <Route
        path="/bible"
        element={
          <ModulePage {...pageProps}>
            <BibleModule state={bibleState} setState={setBibleState} />
          </ModulePage>
        }
      />
      <Route
        path="/car"
        element={
          <ModulePage {...pageProps}>
            <CarModule state={carState} setState={setCarState} />
          </ModulePage>
        }
      />
      <Route
        path="/budget"
        element={
          <ModulePage {...pageProps}>
            <BudgetModule state={budgetState} setState={setBudgetState} />
          </ModulePage>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
