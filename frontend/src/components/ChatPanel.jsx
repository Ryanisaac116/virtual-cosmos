import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameState, useGameDispatch } from '../store/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { MessageCircle, Send, Radio } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';
import { getProximityCandidates, PROXIMITY_EXIT_RADIUS } from '../lib/proximity';
import { PROXIMITY_RADIUS } from '../types/constants';

function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildMessageGroups(messages, currentUserId) {
  return messages.reduce((groups, message) => {
    const isMe = message.senderId === currentUserId;
    const lastGroup = groups[groups.length - 1];

    if (!lastGroup || lastGroup.senderId !== message.senderId) {
      groups.push({
        senderId: message.senderId,
        senderUsername: message.senderUsername,
        isMe,
        items: [message],
      });
      return groups;
    }

    lastGroup.items.push(message);
    return groups;
  }, []);
}

function Bubble({ children, isMe, isFirst, isLast, timeStr }) {
  // Ultra-compact WhatsApp sizing: minimal paddings, inline flow, smaller border-radiuses.
  return (
    <div
      className={cn(
        'relative shadow-sm',
        isMe
          ? 'bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_100%)] text-white'
          : 'border border-slate-200/90 bg-white text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100'
      )}
      style={{
        padding: '6px 10px 6px 12px',
        display: 'inline-block',
        maxWidth: '100%',
        boxSizing: 'border-box',
        borderRadius: isMe
          ? `${isFirst ? '14px' : '8px'} 14px ${isLast ? '3px' : '10px'} 14px`
          : `14px ${isFirst ? '14px' : '8px'} 14px ${isLast ? '3px' : '10px'}`
      }}
    >
      <div style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '8px' }}>
        <div style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '14.5px', fontWeight: 500, lineHeight: 1.4, textAlign: 'left' }}>
          {children}
        </div>
        
        {timeStr && (
          <div 
            className={isMe ? "text-indigo-200/90" : "text-slate-400 dark:text-slate-500"}
            style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.01em', position: 'relative', top: '3px', marginLeft: 'auto', flexShrink: 0 }}
          >
            {timeStr}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatMessageGroup({ group }) {
  const lastMessage = group.items[group.items.length - 1];
  const timeStr = formatMessageTime(lastMessage?.timestamp);

  return (
    <div
      className={cn(
        'flex w-full',
        group.isMe ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'flex min-w-0 max-w-[75%] flex-col',
          group.isMe ? 'items-end' : 'items-start'
        )}
      >
        {!group.isMe && (
          <div className="mb-2 px-1 text-[12px] font-semibold tracking-[-0.01em] text-slate-500 dark:text-slate-400">
            {group.senderUsername}
          </div>
        )}

        <div className={cn('flex w-full flex-col gap-1', group.isMe ? 'items-end' : 'items-start')}>
          {group.items.map((message, index) => (
            <div key={`${message.senderId}-${message.timestamp}-${index}`} className="max-w-full">
              <Bubble
                isMe={group.isMe}
                isFirst={index === 0}
                isLast={index === group.items.length - 1}
                timeStr={formatMessageTime(message.timestamp)}
              >
                {message.content}
              </Bubble>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel({ publishChat }) {
  const { isDark } = useTheme();
  const { currentUser, chatMessages, activeChatRoom, isConnected, players, localPosition } = useGameState();
  const dispatch = useGameDispatch();
  const [inputValue, setInputValue] = useState('');
  const [visiblePartnerId, setVisiblePartnerId] = useState(null);
  const threadRef = useRef(null);
  const proximityCandidates = useMemo(
    () => getProximityCandidates(currentUser, players, localPosition),
    [currentUser, players, localPosition]
  );
  const activePartnerId = visiblePartnerId;
  const derivedRoomId = currentUser && visiblePartnerId
    ? [currentUser.userId, activePartnerId].sort().join('_')
    : null;
  const resolvedRoomId = derivedRoomId || activeChatRoom;
  const messages = resolvedRoomId ? (chatMessages[resolvedRoomId] || []) : [];
  const groupedMessages = useMemo(
    () => buildMessageGroups(messages, currentUser?.userId),
    [messages, currentUser?.userId]
  );
  const nearbyPartner = players.find((p) => p.userId === activePartnerId);
  const isChatActive = Boolean(visiblePartnerId && resolvedRoomId);
  const isPanelVisible = Boolean(visiblePartnerId);

  useEffect(() => {
    const distanceByUserId = new Map(
      proximityCandidates.map((entry) => [entry.userId, entry.distance])
    );

    const currentDistance = visiblePartnerId ? distanceByUserId.get(visiblePartnerId) : null;
    if (visiblePartnerId && currentDistance != null && currentDistance <= PROXIMITY_EXIT_RADIUS) {
      return;
    }

    const nearestPartner = proximityCandidates[0];
    if (nearestPartner && nearestPartner.distance <= PROXIMITY_RADIUS) {
      setVisiblePartnerId(nearestPartner.userId);
      return;
    }

    if (visiblePartnerId !== null) {
      setVisiblePartnerId(null);
    }
  }, [proximityCandidates, visiblePartnerId]);

  useEffect(() => {
    if (!resolvedRoomId) return;
    fetch(`/api/chat/${resolvedRoomId}`)
      .then((res) => {
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then((data) => {
        dispatch({
          type: 'SET_CHAT_MESSAGES',
          payload: { roomId: resolvedRoomId, messages: data },
        });
      })
      .catch((err) => console.error('Failed to fetch chat history', err));
  }, [resolvedRoomId, dispatch]);

  useEffect(() => {
    if (!isPanelVisible || !threadRef.current) return;
    threadRef.current.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [groupedMessages, isPanelVisible]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !resolvedRoomId || !currentUser || !publishChat) return;

    publishChat({
      senderId: currentUser.userId,
      senderUsername: currentUser.username,
      roomId: resolvedRoomId,
      content: inputValue.trim(),
    });
    setInputValue('');
  };

  const partnerName = nearbyPartner?.username || 'Proximity Chat';
  const partnerInitials = (partnerName.slice(0, 2) || 'VC').toUpperCase();

  if (!currentUser || typeof document === 'undefined' || !isPanelVisible) return null;

  const panel = (
    <div
      className="fixed right-3 top-[88px] bottom-4 z-[9999] flex min-h-0 w-[min(332px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[24px] transition-all duration-300 ease-out will-change-transform sm:right-5 sm:top-[96px] sm:bottom-6 sm:w-[332px]"
      style={{
        background: isDark
          ? 'linear-gradient(180deg, rgba(10,18,33,0.98) 0%, rgba(9,16,30,0.99) 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(244,247,251,0.98) 100%)',
        border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(148,163,184,0.18)',
        boxShadow: isDark
          ? '0 28px 70px -26px rgba(2,6,23,0.82)'
          : '0 30px 70px -30px rgba(15,23,42,0.25)',
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-3.5 dark:border-white/6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative">
            <Avatar
              className="h-10 w-10 border border-slate-200/80 shadow-sm dark:border-white/8"
              style={{ background: nearbyPartner?.avatarColor || '#6366f1' }}
            >
              <AvatarFallback className="bg-transparent text-[10px] font-bold uppercase text-white">
                {partnerInitials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-950" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-white">
              {partnerName}
            </div>
            <div className="flex items-center gap-1.5">
              <Radio className="h-2.5 w-2.5 text-emerald-400" strokeWidth={3} />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {isChatActive ? 'In proximity' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:bg-white/5 dark:text-slate-400">
          Chat
        </div>
      </div>

      <div
        ref={threadRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-5"
        style={{
          background: isDark
            ? 'radial-gradient(circle at top right, rgba(88,101,242,0.07), transparent 24%), radial-gradient(circle at bottom left, rgba(56,189,248,0.04), transparent 24%), linear-gradient(180deg, rgba(11,22,40,0.98) 0%, rgba(10,20,36,0.99) 100%)'
            : 'radial-gradient(circle at top right, rgba(99,102,241,0.08), transparent 22%), radial-gradient(circle at bottom left, rgba(14,165,233,0.05), transparent 20%), linear-gradient(180deg, rgba(250,252,255,0.98) 0%, rgba(241,245,249,0.98) 100%)',
        }}
      >
        {groupedMessages.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/10">
              <MessageCircle className="h-5 w-5 text-indigo-500 dark:text-indigo-300" strokeWidth={2} />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {isChatActive ? 'Start a conversation' : 'Proximity chat'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isChatActive
                ? `You're near ${partnerName}. Say something!`
                : 'Move your avatar close to another person and this chat will activate.'}
            </p>
          </div>
        ) : (
          <div className="flex min-h-full min-w-0 flex-col justify-end gap-0.5">
            {groupedMessages.map((group, index) => (
              <div key={`${group.senderId}-${group.items[0]?.timestamp}-${index}`} className="mb-4 last:mb-0">
                <ChatMessageGroup group={group} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 shrink-0 border-t border-slate-200/75 bg-white/70 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl dark:border-white/6 dark:bg-[rgba(9,16,29,0.92)]">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            disabled={!resolvedRoomId || !isConnected || !isChatActive}
            className="h-11 rounded-[18px] border-slate-200/90 bg-white/85 px-4 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus-visible:border-indigo-400/50 focus-visible:ring-4 focus-visible:ring-indigo-500/12 dark:border-white/7 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!resolvedRoomId || !inputValue.trim() || !isConnected || !isChatActive}
            className="h-11 w-11 shrink-0 rounded-[18px] bg-[linear-gradient(135deg,#7c6cff_0%,#6a5cff_45%,#a855f7_100%)] text-white shadow-[0_18px_30px_-18px_rgba(99,102,241,0.75)] transition-transform hover:scale-[1.02] hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:shadow-none"
          >
            <Send className="h-4 w-4" strokeWidth={2.4} />
          </Button>
        </form>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
