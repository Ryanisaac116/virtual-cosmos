import { createContext, useContext, useReducer } from 'react';

const GameContext = createContext(null);
const GameDispatchContext = createContext(null);

const initialState = {
  // Current user info (set after join)
  currentUser: null, // { userId, username, avatarColor }

  // Local player position used for immediate UI decisions while websocket state catches up
  localPosition: null,

  // All active players (updated from WebSocket)
  players: [], // [UserStateDTO, ...]

  // Nearby users within proximity radius
  nearbyUsers: [],

  // Chat messages by room
  chatMessages: {}, // { roomId: [ChatMessageDTO, ...] }

  // Active chat room (if any)
  activeChatRoom: null,

  // Connection status
  isConnected: false,

  // UI state
  isJoined: false,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return {
        ...state,
        currentUser: action.payload,
        localPosition: action.payload
          ? {
              x: action.payload.spawnX ?? action.payload.x ?? 0,
              y: action.payload.spawnY ?? action.payload.y ?? 0,
            }
          : null,
        isJoined: true,
      };

    case 'SET_PLAYERS':
      return { ...state, players: action.payload };

    case 'SET_NEARBY_USERS':
      return { ...state, nearbyUsers: action.payload };

    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };

    case 'SET_LOCAL_POSITION':
      return { ...state, localPosition: action.payload };

    case 'SET_ACTIVE_CHAT_ROOM':
      return { ...state, activeChatRoom: action.payload };

    case 'CLEAR_CONNECTION_STATE':
      return {
        ...state,
        players: [],
        nearbyUsers: [],
        activeChatRoom: null,
      };

    case 'ADD_CHAT_MESSAGE': {
      const { roomId, message } = action.payload;
      const existing = state.chatMessages[roomId] || [];
      // Deduplicate using timestamp and senderId
      if (existing.some(m => m.timestamp === message.timestamp && m.senderId === message.senderId)) {
        return state;
      }
      return {
        ...state,
        chatMessages: {
          ...state.chatMessages,
          [roomId]: [...existing, message],
        },
      };
    }

    case 'SET_CHAT_MESSAGES': {
      const { roomId, messages } = action.payload;
      return {
        ...state,
        chatMessages: {
          ...state.chatMessages,
          [roomId]: messages,
        },
      };
    }

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>
        {children}
      </GameDispatchContext.Provider>
    </GameContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameContext);
  if (!context && context !== initialState) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
}

export function useGameDispatch() {
  const context = useContext(GameDispatchContext);
  if (!context) {
    throw new Error('useGameDispatch must be used within a GameProvider');
  }
  return context;
}
