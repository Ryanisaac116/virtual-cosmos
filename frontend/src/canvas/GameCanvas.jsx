import { useEffect, useRef } from 'react';
import { Application, Graphics, Text, TextStyle, Container } from 'pixi.js';
import { useGameState } from '../store/GameContext';
import { PLAYER_SPEED, INTERPOLATION_FACTOR, PROXIMITY_RADIUS } from '../types/constants';

const CARD_WIDTH = 48;
const CARD_HEIGHT = 58;

export default function GameCanvas({ publishPosition, theme }) {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const keysRef = useRef({});
  const positionRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const remotePosTargets = useRef({});
  const playerContainers = useRef({});
  const sceneObjectsRef = useRef(null); // floor, rooms — repaintable without destroy

  const { currentUser, players, nearbyUsers } = useGameState();

  useEffect(() => {
    if (currentUser?.spawnX != null && currentUser?.spawnY != null) {
      positionRef.current.x = currentUser.spawnX;
      positionRef.current.y = currentUser.spawnY;
    }
  }, [currentUser?.spawnX, currentUser?.spawnY]);

  // ── Main PixiJS init — runs once per user join, NOT on theme change ──
  useEffect(() => {
    if (!canvasRef.current || !currentUser) return;
    let app;
    let tickerCallback;
    let isInitialized = false;

    const init = async () => {
      const palette = getScenePalette(theme);
      app = new Application();
      await app.init({
        resizeTo: window,
        backgroundColor: palette.backgroundColor,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (!canvasRef.current) {
        app.destroy(true);
        return;
      }

      canvasRef.current.innerHTML = '';
      canvasRef.current.appendChild(app.canvas);
      appRef.current = app;

      const worldContainer = new Container();
      app.stage.addChild(worldContainer);
      containerRef.current = worldContainer;

      // Draw scene into a dedicated container so we can repaint on theme switch
      const sceneContainer = new Container();
      sceneContainer.label = 'scene';
      worldContainer.addChild(sceneContainer);
      drawPremiumFloor(sceneContainer, palette);
      drawRoomsAndZones(sceneContainer, palette);
      sceneObjectsRef.current = sceneContainer;

      tickerCallback = (ticker) => {
        const speed = PLAYER_SPEED * ticker.deltaTime;
        let moved = false;
        const pos = positionRef.current;

        if (keysRef.current['ArrowUp'] || keysRef.current['KeyW']) { pos.y -= speed; moved = true; }
        if (keysRef.current['ArrowDown'] || keysRef.current['KeyS']) { pos.y += speed; moved = true; }
        if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) { pos.x -= speed; moved = true; }
        if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) { pos.x += speed; moved = true; }

        if (moved && publishPosition && currentUser) {
          publishPosition(currentUser.userId, pos.x, pos.y);
        }

        const selfContainer = playerContainers.current[currentUser.userId];
        if (selfContainer) {
          selfContainer.x = pos.x;
          selfContainer.y = pos.y;
        }

        Object.entries(remotePosTargets.current).forEach(([userId, target]) => {
          if (userId === currentUser.userId) return;
          const container = playerContainers.current[userId];
          if (container) {
            container.x += (target.x - container.x) * INTERPOLATION_FACTOR;
            container.y += (target.y - container.y) * INTERPOLATION_FACTOR;
          }
        });

        worldContainer.x = -pos.x + (window.innerWidth / 2);
        worldContainer.y = -pos.y + (window.innerHeight / 2);
      };

      app.ticker.add(tickerCallback);
      isInitialized = true;
    };

    init();

    return () => {
      if (app && isInitialized) {
        if (tickerCallback) app.ticker.remove(tickerCallback);
        app.destroy(true);
        appRef.current = null;
        containerRef.current = null;
        sceneObjectsRef.current = null;
        playerContainers.current = {};
        remotePosTargets.current = {};
      }
    };
    // NOTE: theme is intentionally excluded — handled by separate effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, publishPosition]);

  // ── Theme change — repaint scene + player cards in-place, no destroy ──
  useEffect(() => {
    const app = appRef.current;
    const worldContainer = containerRef.current;
    if (!app || !worldContainer) return;

    const palette = getScenePalette(theme);

    // Update canvas background color
    app.renderer.background.color = palette.backgroundColor;

    // Repaint floor + rooms
    const oldScene = sceneObjectsRef.current;
    if (oldScene) {
      worldContainer.removeChild(oldScene);
      oldScene.destroy({ children: true });
    }
    const newScene = new Container();
    newScene.label = 'scene';
    worldContainer.addChildAt(newScene, 0); // behind players
    drawPremiumFloor(newScene, palette);
    drawRoomsAndZones(newScene, palette);
    sceneObjectsRef.current = newScene;

    // Rebuild player cards with new palette colors (keep positions)
    Object.entries(playerContainers.current).forEach(([userId, container]) => {
      const player = players.find((p) => p.userId === userId);
      if (!player) return;

      const savedX = container.x;
      const savedY = container.y;

      // Remove old
      if (container.parent) container.parent.removeChild(container);
      container.destroy({ children: true });

      // Recreate with new colors
      const isCurrentUser = player.userId === currentUser?.userId;
      const isNearby = nearbyUsers.includes(player.userId);
      const color = parseInt((player.avatarColor || '#e2e8f0').replace('#', ''), 16);

      const newContainer = createPlayerContainer(player, isCurrentUser, isNearby, color, palette);
      newContainer.x = savedX;
      newContainer.y = savedY;

      worldContainer.addChild(newContainer);
      playerContainers.current[userId] = newContainer;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // ── Keyboard ──
  useEffect(() => {
    const down = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      keysRef.current[e.code] = true;
    };
    const up = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // ── Player sync ──
  useEffect(() => {
    const worldContainer = containerRef.current;
    if (!worldContainer || !currentUser) return;
    const palette = getScenePalette(theme);
    const currentPlayerIds = new Set(players.map((p) => p.userId));

    // Remove departed players
    Object.keys(playerContainers.current).forEach((id) => {
      if (!currentPlayerIds.has(id)) {
        const container = playerContainers.current[id];
        if (container.parent) container.parent.removeChild(container);
        container.destroy({ children: true });
        delete playerContainers.current[id];
        delete remotePosTargets.current[id];
      }
    });

    // Add or update players
    players.forEach((player) => {
      const isCurrentUser = player.userId === currentUser.userId;
      const isNearby = nearbyUsers.includes(player.userId);
      const color = parseInt((player.avatarColor || '#e2e8f0').replace('#', ''), 16);

      if (!isCurrentUser) {
        remotePosTargets.current[player.userId] = { x: player.x, y: player.y };
      }

      const existingContainer = playerContainers.current[player.userId];
      if (existingContainer) {
        // Update aura visibility
        const nearbyAura = existingContainer.getChildByLabel('nearbyAura');
        if (nearbyAura) nearbyAura.alpha = (isNearby || isCurrentUser) ? 1 : 0;
        const pulseRing = existingContainer.getChildByLabel('pulseRing');
        if (pulseRing) pulseRing.alpha = (isNearby || isCurrentUser) ? 1 : 0;
        return;
      }

      const container = createPlayerContainer(player, isCurrentUser, isNearby, color, palette);
      container.x = player.x;
      container.y = player.y;

      worldContainer.addChild(container);
      playerContainers.current[player.userId] = container;
    });
  }, [players, currentUser, nearbyUsers, theme]);

  return (
    <div ref={canvasRef} id="game-canvas" className="absolute inset-0 h-full w-full cursor-default" />
  );
}

// ── Shared player container builder ──
function createPlayerContainer(player, isCurrentUser, isNearby, color, palette) {
  const container = new Container();

  const aura = new Graphics();
  aura.label = 'nearbyAura';
  aura.circle(0, 0, PROXIMITY_RADIUS);
  aura.fill({ color: palette.auraColor, alpha: palette.auraAlpha });
  aura.stroke({ width: 3, color: palette.auraStroke, alpha: palette.auraStrokeAlpha });
  aura.alpha = (isNearby || isCurrentUser) ? 1 : 0;
  container.addChild(aura);

  const pulseRing = new Graphics();
  pulseRing.label = 'pulseRing';
  pulseRing.circle(0, 0, PROXIMITY_RADIUS + 12);
  pulseRing.stroke({ width: 1.5, color: palette.auraStroke, alpha: palette.pulseAlpha });
  pulseRing.alpha = (isNearby || isCurrentUser) ? 1 : 0;
  container.addChild(pulseRing);

  const shadow = new Graphics();
  shadow.roundRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2 + 8, CARD_WIDTH, CARD_HEIGHT, 12);
  shadow.fill({ color: palette.shadowColor, alpha: palette.shadowAlpha });
  container.addChild(shadow);

  const cardBg = new Graphics();
  cardBg.roundRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 12);
  cardBg.fill({ color: palette.cardColor, alpha: 1 });
  cardBg.stroke({ width: isCurrentUser ? 2.5 : 1, color: isCurrentUser ? palette.currentUserStroke : palette.cardStroke });
  container.addChild(cardBg);

  const innerColor = new Graphics();
  innerColor.roundRect(-CARD_WIDTH / 2 + 2, -CARD_HEIGHT / 2 + 2, CARD_WIDTH - 4, CARD_HEIGHT - 24, 10);
  innerColor.fill({ color, alpha: 0.16 });
  container.addChild(innerColor);

  const head = new Graphics();
  head.circle(0, -7, 10);
  head.fill({ color });
  container.addChild(head);

  const body = new Graphics();
  body.roundRect(-13, 5, 26, 10, 5);
  body.fill({ color, alpha: 0.82 });
  container.addChild(body);

  const label = new Text({
    text: isCurrentUser ? `${player.username} (You)` : player.username,
    style: new TextStyle({
      fontFamily: 'Geist Variable, Inter, sans-serif',
      fontSize: 9,
      fontWeight: '600',
      fill: palette.labelColor,
      align: 'center',
    }),
  });
  label.anchor.set(0.5, 0);
  label.y = CARD_HEIGHT / 2 - 16;
  container.addChild(label);

  const dot = new Graphics();
  dot.circle(CARD_WIDTH / 2 - 8, CARD_HEIGHT / 2 - 8, 3);
  dot.fill({ color: 0x22c55e });
  container.addChild(dot);

  return container;
}

// ── Scene drawing ──
function drawPremiumFloor(container, palette) {
  const floor = new Graphics();
  for (let y = -2000; y <= 2000; y += 60) {
    floor.moveTo(-2000, y);
    floor.lineTo(2000, y);
  }
  for (let x = -2000; x <= 2000; x += 60) {
    floor.moveTo(x, -2000);
    floor.lineTo(x, 2000);
  }
  floor.stroke({ width: 1.5, color: palette.gridColor, alpha: palette.gridAlpha });
  container.addChild(floor);

  const decal1 = new Graphics();
  decal1.circle(200, 200, 300);
  decal1.fill({ color: palette.decalPrimary, alpha: palette.decalPrimaryAlpha });
  container.addChild(decal1);

  const decal2 = new Graphics();
  decal2.circle(700, 400, 400);
  decal2.fill({ color: palette.decalSecondary, alpha: palette.decalSecondaryAlpha });
  container.addChild(decal2);
}

function drawRoomsAndZones(container, palette) {
  renderMeetingRoom(container, 'Strategy Hub', 100, 100, 450, 320, 0x6366f1, palette);
  renderMeetingRoom(container, 'Quiet Focus Zone', 650, 100, 350, 380, 0x10b981, palette);
  renderDesk(container, 250, 550, 0xf43f5e, palette);
  renderDesk(container, 450, 550, 0xf43f5e, palette);
}

function renderMeetingRoom(container, title, x, y, width, height, accentColor, palette) {
  const bg = new Graphics();
  bg.roundRect(x, y, width, height, 32);
  bg.fill({ color: palette.roomFillColor, alpha: palette.roomFillAlpha });
  bg.stroke({ width: 4, color: accentColor, alpha: palette.roomStrokeAlpha });

  const innerBg = new Graphics();
  innerBg.roundRect(x + 10, y + 10, width - 20, height - 20, 24);
  innerBg.stroke({ width: 1, color: accentColor, alpha: palette.roomInnerStrokeAlpha });
  container.addChild(bg, innerBg);

  const badge = new Graphics();
  badge.roundRect(x + 30, y - 16, 160, 32, 10);
  badge.fill({ color: accentColor });
  container.addChild(badge);

  const text = new Text({
    text: title,
    style: new TextStyle({
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 13,
      fontWeight: '800',
      fill: palette.roomTextColor,
      letterSpacing: 1,
    }),
  });
  text.x = x + 44;
  text.y = y - 10;
  container.addChild(text);
}

function renderDesk(container, x, y, tableColor, palette) {
  const desk = new Graphics();
  desk.roundRect(x, y, 90, 45, 12);
  desk.fill({ color: palette.deskFillColor, alpha: 1 });
  desk.stroke({ width: 4, color: tableColor, alpha: palette.deskStrokeAlpha });
  container.addChild(desk);
}

function getScenePalette(theme) {
  if (theme === 'dark') {
    return {
      backgroundColor: 0x08111f,
      gridColor: 0x334155,
      gridAlpha: 0.34,
      decalPrimary: 0x6366f1,
      decalPrimaryAlpha: 0.07,
      decalSecondary: 0x22d3ee,
      decalSecondaryAlpha: 0.05,
      roomFillColor: 0x0f172a,
      roomFillAlpha: 0.84,
      roomStrokeAlpha: 0.28,
      roomInnerStrokeAlpha: 0.18,
      roomTextColor: '#e2e8f0',
      deskFillColor: 0x172033,
      deskStrokeAlpha: 0.42,
      auraColor: 0x34d399,
      auraAlpha: 0.08,
      auraStroke: 0x34d399,
      auraStrokeAlpha: 0.5,
      pulseAlpha: 0.24,
      shadowColor: 0x020617,
      shadowAlpha: 0.28,
      cardColor: 0x0f172a,
      cardStroke: 0x334155,
      currentUserStroke: 0x34d399,
      labelColor: '#e2e8f0',
    };
  }

  return {
    backgroundColor: 0xf8fafc,
    gridColor: 0xcbd5e1,
    gridAlpha: 0.4,
    decalPrimary: 0x818cf8,
    decalPrimaryAlpha: 0.03,
    decalSecondary: 0x34d399,
    decalSecondaryAlpha: 0.03,
    roomFillColor: 0xffffff,
    roomFillAlpha: 0.9,
    roomStrokeAlpha: 0.2,
    roomInnerStrokeAlpha: 0.1,
    roomTextColor: '#ffffff',
    deskFillColor: 0xffffff,
    deskStrokeAlpha: 0.3,
    auraColor: 0x10b981,
    auraAlpha: 0.1,
    auraStroke: 0x10b981,
    auraStrokeAlpha: 0.45,
    pulseAlpha: 0.18,
    shadowColor: 0x000000,
    shadowAlpha: 0.15,
    cardColor: 0xffffff,
    cardStroke: 0xe2e8f0,
    currentUserStroke: 0x10b981,
    labelColor: '#334155',
  };
}
