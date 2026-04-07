import { useGameState } from './store/GameContext';
import JoinScreen from './components/JoinScreen';
import CosmosPage from './pages/CosmosPage';
import { TooltipProvider } from '@/components/ui/tooltip';

function AppContent() {
  const { isJoined } = useGameState();

  return isJoined ? <CosmosPage /> : <JoinScreen />;
}

export default function App() {
  return (
    <TooltipProvider>
      <AppContent />
    </TooltipProvider>
  );
}
