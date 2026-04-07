import { useWebSocket } from '../hooks/useWebSocket';
import GameCanvas from '../canvas/GameCanvas';
import ChatPanel from '../components/ChatPanel';
import TopNavbar from '../components/TopNavbar';
import { useTheme } from '../theme/ThemeProvider';

export default function CosmosPage() {
  const { publishPosition, publishChat } = useWebSocket();
  const { theme } = useTheme();

  return (
    <div className="app-shell relative h-full w-full overflow-hidden">
      <div className="relative z-10 flex h-full w-full flex-col transition-all duration-300">
        <TopNavbar />

        <div className="relative flex-1 overflow-hidden">
          <GameCanvas publishPosition={publishPosition} theme={theme} />
        </div>
      </div>

      <ChatPanel publishChat={publishChat} />
    </div>
  );
}
