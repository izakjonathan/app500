
"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CURRENT_GAME_ID, supabase } from "../lib/supabaseClient";

type Player = { id: string; name: string; color: string };
type Round = { id: string; scores: Record<string, number>; closedBy: string | null; starterId: string; deleted?: boolean };
type HistoryItem = { gameId: string; gameName: string; winnerName: string; rounds: number; finishedAt: string };
type Game = { gameId: string | null; gameName: string; players: Player[]; targetScore: number; starterId: string; rounds: Round[]; status: "active" | "finished"; winnerId: string | null; updatedAt?: string; archived?: boolean };
type SyncStatus = "loading" | "synced" | "syncing" | "offline";
type DevicePresence = { clientId: string; name: string; joinedAt: string; gameName: string };
type CloudGame = Game & { __sync?: { clientId: string; version: number } };

const DEFAULT_PLAYERS: Player[] = [
  { id: "p1", name: "You", color: "#ffd36b" },
  { id: "p2", name: "GF", color: "#82efaa" },
  { id: "p3", name: "Player 3", color: "#93c5fd" },
  { id: "p4", name: "Player 4", color: "#f0abfc" }
];

const STORAGE_KEY = "rummy500_clean_v51";
const HISTORY_KEY = "rummy500_clean_v51_history";
const CLOUD_UPDATED_KEY = "rummy500_clean_v51_cloud_updated_at";
const CLIENT_ID_KEY = "rummy500_clean_v51_client_id";
const SAVE_DEBOUNCE_MS = 700;
const PENDING_SYNC_KEY = "rummy500_clean_v52_pending_sync";

const GAME_LIBRARY_KEY = "rummy500_multi_game_library_v139";
const GAME_LIBRARY_BACKUP_KEY = "rummy500_multi_game_library_backup_v149";
const GAME_LIBRARY_INDEX_KEY = "rummy500_multi_game_index_v149";
const ACTIVE_GAME_KEY = "rummy500_active_game_id_v139";
const DEVICE_NAME_KEY = "rummy500_device_name_v144";

function cloudUpdatedKey(gameId: string) { return `${CLOUD_UPDATED_KEY}_${gameId}`; }
function pendingSyncKey(gameId: string) { return `${PENDING_SYNC_KEY}_${gameId}`; }
function gameCloudId(game: Game) { return game.gameId || CURRENT_GAME_ID; }
function formatGameUpdated(value?: string) {
  if (!value) return "Not played yet";
  try { return new Date(value).toLocaleDateString(); } catch { return "Saved"; }
}
function getUrlGameId() {
  if (typeof window === "undefined") return "";
  try { return new URL(window.location.href).searchParams.get("game") || ""; } catch { return ""; }
}
function setUrlGameId(gameId: string) {
  if (typeof window === "undefined" || !gameId) return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("game", gameId);
    window.history.replaceState({}, "", url.toString());
  } catch {}
}
function gameStorageKey(gameId: string) { return `rummy500_saved_game_${gameId}`; }

function readStoredGame(gameId: string): Game | null {
  if (typeof window === "undefined" || !gameId) return null;

  try {
    const raw = localStorage.getItem(gameStorageKey(gameId));
    return raw ? JSON.parse(raw) as Game : null;
  } catch {
    return null;
  }
}

function mergeGameLists(...lists: Game[][]) {
  const byId = new Map<string, Game>();

  lists.flat().forEach((item) => {
    if (!item?.gameId) return;

    const previous = byId.get(item.gameId);
    if (!previous) {
      byId.set(item.gameId, item);
      return;
    }

    const previousUpdated = String(previous.updatedAt || "");
    const itemUpdated = String(item.updatedAt || "");

    byId.set(item.gameId, itemUpdated >= previousUpdated ? item : previous);
  });

  return sortGameLibrary(Array.from(byId.values()));
}

function readGameArray(key: string): Game[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as Game[] : [];
  } catch {
    return [];
  }
}

function readGameLibrary(): Game[] {
  if (typeof window === "undefined") return [];

  const primary = readGameArray(GAME_LIBRARY_KEY);
  const backup = readGameArray(GAME_LIBRARY_BACKUP_KEY);

  let indexed: Game[] = [];
  try {
    const rawIndex = localStorage.getItem(GAME_LIBRARY_INDEX_KEY);
    const ids = rawIndex ? JSON.parse(rawIndex) : [];
    if (Array.isArray(ids)) {
      indexed = ids
        .map((id) => readStoredGame(String(id)))
        .filter(Boolean) as Game[];
    }
  } catch {}

  let legacy: Game[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Game : null;
    if (parsed?.gameId) legacy = [parsed];
  } catch {}

  return mergeGameLists(primary, backup, indexed, legacy);
}

function writeGameLibrary(games: Game[]) {
  if (typeof window === "undefined") return;

  const next = sortGameLibrary(games.filter((item) => item?.gameId));

  try {
    localStorage.setItem(GAME_LIBRARY_KEY, JSON.stringify(next));
    localStorage.setItem(GAME_LIBRARY_BACKUP_KEY, JSON.stringify(next));
    localStorage.setItem(GAME_LIBRARY_INDEX_KEY, JSON.stringify(next.map((item) => item.gameId)));
    next.forEach((item) => {
      if (item.gameId) localStorage.setItem(gameStorageKey(item.gameId), JSON.stringify(item));
    });
  } catch {}
}

function removeGameFromStorage(gameId: string) {
  if (typeof window === "undefined" || !gameId) return;

  try {
    localStorage.removeItem(gameStorageKey(gameId));
    const remaining = readGameLibrary().filter((item) => item.gameId !== gameId);
    localStorage.setItem(GAME_LIBRARY_INDEX_KEY, JSON.stringify(remaining.map((item) => item.gameId)));
    localStorage.setItem(GAME_LIBRARY_KEY, JSON.stringify(remaining));
    localStorage.setItem(GAME_LIBRARY_BACKUP_KEY, JSON.stringify(remaining));
  } catch {}
}

function touchGame(game: Game) {
  return { ...game, updatedAt: new Date().toISOString() };
}

function sortGameLibrary(games: Game[]) {
  return [...games].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

function upsertGameInLibrary(games: Game[], game: Game) {
  if (!game.gameId) return games;

  const previous = games.find((item) => item.gameId === game.gameId);
  const isPlaceholder = game.gameName.startsWith("Loading shared game") && game.rounds.length === 0;

  if (previous && isPlaceholder) return sortGameLibrary(games);

  const saved = touchGame({ ...game, archived: game.archived ?? previous?.archived ?? false });
  const next = mergeGameLists([saved], games.filter((item) => item.gameId !== game.gameId));
  return next;
}

function visibleSavedGames(games: Game[], showArchived: boolean) {
  return sortGameLibrary(games).filter((item) => showArchived || !item.archived);
}

function libraryRowFromGame(game: Game) {
  const players = game.players.map((player) => player.name).join(" · ");
  return {
    id: game.gameId,
    game_name: game.gameName || "Untitled game",
    game_state: game,
    players,
    player_count: game.players.length,
    target_score: game.targetScore,
    rounds_count: activeRounds(game.rounds).length,
    archived: Boolean(game.archived),
    updated_at: game.updatedAt || new Date().toISOString()
  };
}

async function upsertGameLibraryRow(game: Game) {
  if (!supabase || !game.gameId) return false;

  const { error } = await supabase
    .from("rummy_game_library")
    .upsert(libraryRowFromGame(touchGame(game)), { onConflict: "id" });

  return !error;
}

async function deleteGameLibraryRow(gameId: string) {
  if (!supabase || !gameId) return false;

  const { error } = await supabase
    .from("rummy_game_library")
    .delete()
    .eq("id", gameId);

  return !error;
}

async function loadCloudGameLibrary() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("rummy_game_library")
    .select("game_state, updated_at")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return data
    .map((row: { game_state?: Game; updated_at?: string }) => {
      if (!row.game_state?.gameId) return null;
      return { ...row.game_state, updatedAt: row.updated_at || row.game_state.updatedAt };
    })
    .filter(Boolean) as Game[];
}
function shortGameCode(gameId?: string | null) {
  return gameId ? gameId.slice(0, 6).toUpperCase() : "LOCAL";
}
function getDeviceName() {
  if (typeof window === "undefined") return "This device";

  try {
    const saved = localStorage.getItem(DEVICE_NAME_KEY);
    if (saved) return saved;

    const ua = navigator.userAgent || "";
    const type = /iPhone/i.test(ua) ? "iPhone" : /iPad/i.test(ua) ? "iPad" : /Android/i.test(ua) ? "Android" : "Device";
    const name = `${type} ${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    localStorage.setItem(DEVICE_NAME_KEY, name);
    return name;
  } catch {
    return "This device";
  }
}
function uniquePresence(devices: DevicePresence[]) {
  const byId = new Map<string, DevicePresence>();
  devices.forEach((device) => {
    if (device?.clientId) byId.set(device.clientId, device);
  });
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

type UiStudioTab = "type" | "space" | "radius" | "color" | "layout" | "presets";

const UI_STUDIO_DEFAULTS: Record<string, string> = {
  "--font-size-caption": "10px",
  "--font-size-body": "14px",
  "--font-size-title": "16px",
  "--font-size-display": "28px",
  "--font-size-input": "34px",
  "--font-size-score": "42px",
  "--font-weight-label": "700",
  "--font-weight-body": "600",
  "--font-weight-title": "800",
  "--font-weight-score": "900",
  "--radius-sm": "12px",
  "--radius-lg": "24px",
  "--radius-xl": "32px",
  "--ui-density-scale": "1",
  "--top-section-gap": "16px",
  "--scoreboard-gap": "16px",
  "--last-round-gap": "8px",
  "--input-card-gap": "18px",
  "--penalty-gap": "14px",
  "--bottom-gap": "12px",
  "--passport-blue": "#244cdd",
  "--passport-bg": "#efe9dc",
  "--passport-muted": "#244cdd"
};

const UI_STUDIO_PRESETS: Record<string, Record<string, string>> = {
  Default: UI_STUDIO_DEFAULTS,
  Compact: {
    ...UI_STUDIO_DEFAULTS,
    "--font-size-caption": "9px",
    "--font-size-body": "12px",
    "--font-size-title": "15px",
    "--font-size-display": "24px",
    "--font-size-input": "30px",
    "--font-size-score": "38px",
    "--ui-density-scale": "0.9",
    "--top-section-gap": "12px",
    "--scoreboard-gap": "12px",
    "--last-round-gap": "5px",
    "--input-card-gap": "14px",
    "--penalty-gap": "10px",
    "--bottom-gap": "8px"
  },
  Large: {
    ...UI_STUDIO_DEFAULTS,
    "--font-size-caption": "11px",
    "--font-size-body": "15px",
    "--font-size-title": "18px",
    "--font-size-display": "32px",
    "--font-size-input": "40px",
    "--font-size-score": "50px",
    "--ui-density-scale": "1.12",
    "--top-section-gap": "20px",
    "--scoreboard-gap": "20px",
    "--last-round-gap": "10px",
    "--input-card-gap": "22px",
    "--penalty-gap": "16px",
    "--bottom-gap": "14px"
  }
};


function createDefaultGame(): Game {
  return { gameId: null, gameName: "No game", players: DEFAULT_PLAYERS.slice(0, 2), targetScore: 1500, starterId: "p1", rounds: [], status: "active", winnerId: null };
}

function activeRounds(rounds: Round[]) { return rounds.filter((round) => !round.deleted); }

function nextStarterId(players: Player[], currentStarterId: string) {
  const index = players.findIndex((player) => player.id === currentStarterId);
  const safeIndex = index >= 0 ? index : 0;
  return players[(safeIndex + 1) % players.length]?.id || players[0]?.id || currentStarterId;
}

function totals(game: Game) {
  const result: Record<string, number> = {};
  game.players.forEach((player) => { result[player.id] = 0; });
  activeRounds(game.rounds).forEach((round) => {
    game.players.forEach((player) => {
      result[player.id] += Number(round.scores[player.id] || 0);
      if (round.closedBy === player.id) result[player.id] += 15;
    });
  });
  return result;
}

function signed(value: number) { return value > 0 ? `+${value}` : String(value); }

function getRoundScore(round: Round, playerId: string) {
  return Number(round.scores[playerId] || 0) + (round.closedBy === playerId ? 15 : 0);
}

function getRoundsOverviewRows(game: Game) {
  const runningTotals: Record<string, number> = {};
  game.players.forEach((player) => { runningTotals[player.id] = 0; });

  return activeRounds(game.rounds).map((round, index) => {
    const playerScores = game.players.map((player) => {
      const score = getRoundScore(round, player.id);
      runningTotals[player.id] = (runningTotals[player.id] || 0) + score;
      return { player, score, total: runningTotals[player.id] || 0 };
    });

    return {
      round,
      index,
      playerScores,
      totals: { ...runningTotals }
    };
  });
}

function getRoundsOverviewStats(game: Game) {
  const rounds = activeRounds(game.rounds);
  const closedCounts: Record<string, number> = {};
  let highest: { playerName: string; score: number } | null = null;

  game.players.forEach((player) => { closedCounts[player.id] = 0; });

  rounds.forEach((round) => {
    if (round.closedBy) closedCounts[round.closedBy] = (closedCounts[round.closedBy] || 0) + 1;

    game.players.forEach((player) => {
      const score = getRoundScore(round, player.id);
      if (!highest || score > highest.score) highest = { playerName: player.name, score };
    });
  });

  const closedLeader = game.players
    .map((player) => ({ playerName: player.name, count: closedCounts[player.id] || 0 }))
    .sort((a, b) => b.count - a.count)[0];

  return {
    closedMost: closedLeader && closedLeader.count > 0 ? `${closedLeader.playerName} (${closedLeader.count})` : "None",
    highestRound: highest ? `${highest.playerName} ${signed(highest.score)}` : "None"
  };
}
function haptic(pattern: number | number[] = 8) { if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern); }
function stripSync(raw: unknown): Game {
  const value = raw as CloudGame;
  const { __sync: _ignored, ...game } = value;
  return game as Game;
}
function gameSignature(game: Game) { return JSON.stringify(game); }
function isUntouchedDefault(game: Game) { return !game.gameId && game.rounds.length === 0 && game.gameName === "No game"; }
function getClientId() {
  if (typeof window === "undefined") return "server";
  const existing = localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(CLIENT_ID_KEY, id);
  return id;
}

function getAnalytics(game: Game, history: HistoryItem[]) {
  const rounds = activeRounds(game.rounds);
  const scoreTotals = totals(game);
  const totalRoundPoints = rounds.reduce((sum, round) => {
    return sum + game.players.reduce((inner, player) => inner + Number(round.scores[player.id] || 0), 0);
  }, 0);

  const leader = [...game.players].sort((a, b) => (scoreTotals[b.id] || 0) - (scoreTotals[a.id] || 0))[0];

  return {
    roundsPlayed: rounds.length,
    averageRoundPoints: rounds.length ? Math.round(totalRoundPoints / rounds.length) : 0,
    leaderName: leader?.name || "None",
    gamesFinished: history.length
  };
}

function getShareUrl(game: Game) {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("game", game.gameId || CURRENT_GAME_ID);
  return url.toString();
}


type ScoreboardProps = { game: Game; scoreTotals: Record<string, number> };
const Scoreboard = memo(function Scoreboard({ game, scoreTotals }: ScoreboardProps) {
  return (
    <section className="glass scoreboard scoreboard-stable">
      <div className="label">Scoreboard</div>
      {game.players.map((player) => {
        const total = scoreTotals[player.id] || 0;
        const progress = Math.max(0, Math.min(100, Math.round((total / game.targetScore) * 100)));
        return (
          <div key={player.id} className="glass-soft player-card score-transition">
            <div className="ring" style={{ color: player.color }}>{progress}%</div>
            <div>
              <div className="player-name">{player.name}</div>
              <div className="progress"><div className="progress-fill" style={{ width: `${progress}%`, background: player.color }} /></div>
            </div>
            <div className="total score-transition">{total}</div>
          </div>
        );
      })}
    </section>
  );
});

export default function RummyApp() {
  const [game, setGame] = useState<Game>(() => createDefaultGame());
  const [savedGames, setSavedGames] = useState<Game[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [closedBy, setClosedBy] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [typographyOpen, setTypographyOpen] = useState(false);
  const [uiStudioTab, setUiStudioTab] = useState<UiStudioTab>("type");
  const [uiValues, setUiValues] = useState<Record<string, string>>(() => ({ ...UI_STUDIO_DEFAULTS }));
  const [showRoundsPopup, setShowRoundsPopup] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showArchivedGames, setShowArchivedGames] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);
  const [playerCount, setPlayerCount] = useState(2);
  const [target, setTarget] = useState<number | "custom">(1500);
  const [customTarget, setCustomTarget] = useState("");
  const [gameName, setGameName] = useState("");
  const [names, setNames] = useState<string[]>(DEFAULT_PLAYERS.map((p) => p.name));
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [roomLoadStatus, setRoomLoadStatus] = useState<"idle" | "loading" | "loaded" | "missing">("idle");
  const [isCommitting, setIsCommitting] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "shared">("idle");
  const [connectedDevices, setConnectedDevices] = useState<DevicePresence[]>([]);
  const [librarySyncStatus, setLibrarySyncStatus] = useState<"idle" | "loading" | "synced" | "offline">("idle");

  const clientId = useRef("");
  const cloudLoaded = useRef(false);
  const applyingRemote = useRef(false);
  const initialSyncFinished = useRef(false);
  const currentSignature = useRef("");
  const localVersion = useRef(0);
  const pendingGame = useRef<Game | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncInFlight = useRef(false);
  const localLibraryLoaded = useRef(false);
  const suppressNextSaveForRemoteLoad = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      clientId.current = getClientId();
      window.history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
    }
  }, []);


  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    try {
      const library = readGameLibrary();
      const savedGame = localStorage.getItem(STORAGE_KEY);
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      const urlGameId = getUrlGameId();
      const activeGameId = urlGameId || localStorage.getItem(ACTIVE_GAME_KEY) || "";
      let nextLibrary = library;

      if (savedGame) {
        const legacyGame = JSON.parse(savedGame) as Game;
        if (legacyGame.gameId && !nextLibrary.some((item) => item.gameId === legacyGame.gameId)) {
          nextLibrary = upsertGameInLibrary(nextLibrary, legacyGame);
          writeGameLibrary(nextLibrary);
        }
      }

      setSavedGames(sortGameLibrary(nextLibrary));

      const selectedGame = activeGameId
        ? nextLibrary.find((item) => item.gameId === activeGameId) || null
        : (savedGame ? JSON.parse(savedGame) as Game : null);

      if (selectedGame) {
        currentSignature.current = gameSignature(selectedGame);
        setGame(selectedGame);
        if (selectedGame.gameId) setUrlGameId(selectedGame.gameId);
      } else if (urlGameId) {
        const placeholder = { ...createDefaultGame(), gameId: urlGameId, gameName: `Loading shared game ${urlGameId.slice(0, 5).toUpperCase()}` };
        suppressNextSaveForRemoteLoad.current = true;
        setRoomLoadStatus("loading");
        currentSignature.current = gameSignature(placeholder);
        setGame(placeholder);
        setUrlGameId(urlGameId);
      } else if (savedGame) {
        const parsed = JSON.parse(savedGame) as Game;
        currentSignature.current = gameSignature(parsed);
        setGame(parsed);
        if (parsed.gameId) setUrlGameId(parsed.gameId);
      }

      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch {}

    localLibraryLoaded.current = true;
  }, []);

  const queueCloudSave = useCallback((nextGame: Game) => {
    if (!cloudLoaded.current || applyingRemote.current || !initialSyncFinished.current || isUntouchedDefault(nextGame)) return;

    const cloudId = gameCloudId(nextGame);
    pendingGame.current = nextGame;
    try { localStorage.setItem(pendingSyncKey(cloudId), JSON.stringify(nextGame)); } catch {}
    setSyncStatus("syncing");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!pendingGame.current || syncInFlight.current) return;

      syncInFlight.current = true;
      const version = Date.now();
      localVersion.current = Math.max(localVersion.current, version);
      const gameToSave = pendingGame.current;
      const cloudId = gameCloudId(gameToSave);
      const cloudGame: CloudGame = {
        ...gameToSave,
        __sync: {
          clientId: clientId.current,
          version
        }
      };

      const { data, error } = await supabase
        .from("rummy_current_game")
        .upsert(
          {
            id: cloudId,
            game_state: cloudGame,
            updated_at: new Date(version).toISOString()
          },
          { onConflict: "id" }
        )
        .select("updated_at")
        .single();

      syncInFlight.current = false;

      if (error) {
        setSyncStatus("offline");
        return;
      }

      if (data?.updated_at) {
        try { localStorage.setItem(cloudUpdatedKey(cloudId), data.updated_at); } catch {}
      }

      await upsertGameLibraryRow({ ...gameToSave, updatedAt: data?.updated_at || new Date(version).toISOString() });

      pendingGame.current = null;
      try { localStorage.removeItem(pendingSyncKey(cloudId)); } catch {}
      setSyncStatus("synced");
    }, SAVE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    if (!localLibraryLoaded.current) return;

    if (suppressNextSaveForRemoteLoad.current && roomLoadStatus === "loading") return;

    const signature = gameSignature(game);
    currentSignature.current = signature;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
      if (game.gameId) {
        localStorage.setItem(ACTIVE_GAME_KEY, game.gameId);
        setUrlGameId(game.gameId);
      }
    } catch {}

    if (game.gameId) {
      setSavedGames((previous) => {
        const next = upsertGameInLibrary(previous, game);
        writeGameLibrary(next);
        return next;
      });
      upsertGameLibraryRow(game).catch(() => setLibrarySyncStatus("offline"));
    }

    if (!applyingRemote.current) {
      localVersion.current = Math.max(localVersion.current, Date.now());
      queueCloudSave(game);
    }
  }, [game, queueCloudSave]);

  useEffect(() => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {} }, [history]);

  useEffect(() => {
    if (!localLibraryLoaded.current || !supabase) return;

    let cancelled = false;

    async function syncCloudLibrary() {
      setLibrarySyncStatus("loading");

      const cloudGames = await loadCloudGameLibrary();
      if (cancelled) return;

      if (!cloudGames.length) {
        setLibrarySyncStatus("synced");
        return;
      }

      setSavedGames((previous) => {
        const next = mergeGameLists(previous, cloudGames);
        writeGameLibrary(next);
        return next;
      });

      setLibrarySyncStatus("synced");
    }

    syncCloudLibrary().catch(() => setLibrarySyncStatus("offline"));

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const activeCloudId = gameCloudId(game);

    cloudLoaded.current = false;
    initialSyncFinished.current = false;
    pendingGame.current = null;

    async function loadCloud() {
      setSyncStatus("loading");
      setRoomLoadStatus("loading");

      if (!supabase) {
        cloudLoaded.current = true;
        initialSyncFinished.current = true;
        suppressNextSaveForRemoteLoad.current = false;
        setSyncStatus("offline");
        setRoomLoadStatus("missing");
        return;
      }

      const { data, error } = await supabase
        .from("rummy_current_game")
        .select("game_state, updated_at")
        .eq("id", activeCloudId)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        cloudLoaded.current = true;
        initialSyncFinished.current = true;
        suppressNextSaveForRemoteLoad.current = false;
        setSyncStatus("offline");
        setRoomLoadStatus("missing");
        return;
      }

      if (data?.game_state) {
        const remoteRaw = data.game_state as CloudGame;
        const remoteGame = { ...stripSync(remoteRaw), gameId: activeCloudId, updatedAt: data.updated_at || new Date().toISOString() };
        const remoteSignature = gameSignature(remoteGame);
        const localUpdated = localStorage.getItem(cloudUpdatedKey(activeCloudId)) || "";
        const remoteUpdated = data.updated_at || "";
        const shouldApplyRemote =
          !isUntouchedDefault(remoteGame) &&
          remoteSignature !== currentSignature.current &&
          (!localUpdated || remoteUpdated >= localUpdated);

        if (shouldApplyRemote) {
          applyingRemote.current = true;
          currentSignature.current = remoteSignature;
          setGame(remoteGame);
          setSavedGames((previous) => {
            const next = upsertGameInLibrary(previous, remoteGame);
            writeGameLibrary(next);
            return next;
          });
          upsertGameLibraryRow(remoteGame).catch(() => setLibrarySyncStatus("offline"));
          upsertGameLibraryRow(remoteGame).catch(() => setLibrarySyncStatus("offline"));
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteGame));
            localStorage.setItem(ACTIVE_GAME_KEY, activeCloudId);
            localStorage.setItem(cloudUpdatedKey(activeCloudId), remoteUpdated);
          } catch {}
          suppressNextSaveForRemoteLoad.current = false;
          setRoomLoadStatus("loaded");
          setTimeout(() => { applyingRemote.current = false; }, 0);
        }
      }

      if (!data?.game_state) {
        setRoomLoadStatus("missing");
        suppressNextSaveForRemoteLoad.current = false;
      } else {
        setRoomLoadStatus("loaded");
        suppressNextSaveForRemoteLoad.current = false;
      }

      cloudLoaded.current = true;
      initialSyncFinished.current = true;
      setSyncStatus("synced");
    }

    loadCloud();

    const channel = supabase
      .channel(`rummy-live-${activeCloudId}-${clientId.current || "client"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rummy_current_game",
          filter: `id=eq.${activeCloudId}`
        },
        (payload) => {
          const row = payload.new as { game_state?: CloudGame; updated_at?: string };
          if (!row?.game_state) return;

          const meta = row.game_state.__sync;
          if (meta?.clientId && meta.clientId === clientId.current) {
            setSyncStatus("synced");
            return;
          }

          const remoteGame = { ...stripSync(row.game_state), gameId: activeCloudId, updatedAt: row.updated_at || new Date().toISOString() };
          if (isUntouchedDefault(remoteGame)) return;

          const remoteSignature = gameSignature(remoteGame);
          if (remoteSignature === currentSignature.current) {
            setSyncStatus("synced");
            return;
          }

          if (meta?.version && meta.version < localVersion.current && pendingGame.current) {
            return;
          }

          applyingRemote.current = true;
          currentSignature.current = remoteSignature;
          setGame(remoteGame);
          setSavedGames((previous) => {
            const next = upsertGameInLibrary(previous, remoteGame);
            writeGameLibrary(next);
            return next;
          });
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteGame));
            localStorage.setItem(ACTIVE_GAME_KEY, activeCloudId);
            if (row.updated_at) localStorage.setItem(cloudUpdatedKey(activeCloudId), row.updated_at);
          } catch {}

          suppressNextSaveForRemoteLoad.current = false;
          setRoomLoadStatus("loaded");
          setTimeout(() => { applyingRemote.current = false; }, 0);
          setSyncStatus("synced");
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setSyncStatus("synced");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setSyncStatus("offline");
          if (roomLoadStatus === "loading") setRoomLoadStatus("missing");
        }
      });

    return () => {
      mounted = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      supabase.removeChannel(channel);
    };
  }, [game.gameId]);


  useEffect(() => {
    const activeCloudId = gameCloudId(game);

    if (!clientId.current) clientId.current = getClientId();

    const localPresence: DevicePresence = {
      clientId: clientId.current || "local",
      name: getDeviceName(),
      joinedAt: new Date().toISOString(),
      gameName: game.gameName || "Rummy 500"
    };

    if (!supabase || !activeCloudId) {
      setConnectedDevices([localPresence]);
      return;
    }

    const channel = supabase.channel(`rummy-presence-${activeCloudId}`, {
      config: { presence: { key: localPresence.clientId } }
    });

    const updatePresence = () => {
      const state = channel.presenceState() as Record<string, DevicePresence[]>;
      const remoteDevices = Object.values(state).flat();
      setConnectedDevices(uniquePresence(remoteDevices.length ? remoteDevices : [localPresence]));
    };

    channel
      .on("presence", { event: "sync" }, updatePresence)
      .on("presence", { event: "join" }, updatePresence)
      .on("presence", { event: "leave" }, updatePresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track(localPresence);
          updatePresence();
        }
      });

    return () => {
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
    };
  }, [game.gameId, game.gameName]);

  useEffect(() => {
    function flushPendingSync() {
      try {
        const pending = localStorage.getItem(pendingSyncKey(gameCloudId(game)));
        if (pending) {
          queueCloudSave(JSON.parse(pending) as Game);
        }
      } catch {}
    }

    window.addEventListener("online", flushPendingSync);
    flushPendingSync();

    return () => window.removeEventListener("online", flushPendingSync);
  }, [queueCloudSave, game.gameId]);

  const rounds = useMemo(() => activeRounds(game.rounds), [game.rounds]);
  const scoreTotals = useMemo(() => totals(game), [game]);
  const winner = game.winnerId ? game.players.find((player) => player.id === game.winnerId) : null;
  const latestRound = rounds[rounds.length - 1];
  const analytics = useMemo(() => getAnalytics(game, history), [game, history]);
  const roundsOverviewRows = useMemo(() => getRoundsOverviewRows(game), [game]);
  const roundsOverviewStats = useMemo(() => getRoundsOverviewStats(game), [game]);

  function createGame() {
    const players = DEFAULT_PLAYERS.slice(0, playerCount).map((player, index) => ({ ...player, name: names[index]?.trim() || player.name }));
    const nextGame: Game = touchGame({ gameId: crypto.randomUUID(), gameName: gameName.trim() || `Game ${new Date().toLocaleDateString()}`, players, targetScore: target === "custom" ? Number(customTarget || 1500) : target, starterId: players[0].id, rounds: [], status: "active", winnerId: null, archived: false });
    setGame(nextGame);
    setSavedGames((previous) => {
      const next = upsertGameInLibrary(previous, nextGame);
      writeGameLibrary(next);
      return next;
    });
    if (nextGame.gameId) setUrlGameId(nextGame.gameId);
    upsertGameLibraryRow(nextGame).catch(() => setLibrarySyncStatus("offline"));
    setInputs({}); setClosedBy(null); setGameOpen(false); haptic([8, 18, 8]);
  }

  function toggleStarter() {
    setGame((previous: Game) => ({ ...previous, starterId: nextStarterId(previous.players, previous.starterId) }));
  }

  function quick(playerId: string, amount: number) {
    if (isCommitting) return;
    setInputs((previous: Record<string, string>) => ({ ...previous, [playerId]: String((Number(previous[playerId] || 0) || 0) + amount) }));
    haptic(8);
  }

  function negative(playerId: string) {
    if (isCommitting) return;
    setInputs((previous: Record<string, string>) => {
      const value = String(previous[playerId] || "0");
      return { ...previous, [playerId]: value.startsWith("-") ? value.slice(1) : `-${value || "0"}` };
    });
  }

  function addRound() {
    if (isCommitting) return;
    if (!game.gameId) { setGameOpen(true); return; }

    setIsCommitting(true);

    const scores: Record<string, number> = {};
    game.players.forEach((player) => { scores[player.id] = Number(String(inputs[player.id] || "0").replace(",", ".")) || 0; });
    const round: Round = { id: crypto.randomUUID(), scores, closedBy, starterId: game.starterId };

    setGame((previous: Game) => {
      const nextRounds = [...previous.rounds, round];
      const nextStarter = nextStarterId(previous.players, previous.starterId);
      const draft = { ...previous, rounds: nextRounds, starterId: nextStarter };
      const nextTotals = totals(draft);
      const winnerPlayer = previous.players.find((player) => (nextTotals[player.id] || 0) >= previous.targetScore);
      if (winnerPlayer) {
        const item: HistoryItem = { gameId: previous.gameId || crypto.randomUUID(), gameName: previous.gameName, winnerName: winnerPlayer.name, rounds: activeRounds(nextRounds).length, finishedAt: new Date().toISOString() };
        setHistory((old: HistoryItem[]) => [item, ...old].slice(0, 20));
        return { ...draft, status: "finished", winnerId: winnerPlayer.id };
      }
      return draft;
    });

    setInputs({});
    setClosedBy(null);
    haptic([8, 18, 8]);
    setTimeout(() => setIsCommitting(false), 220);
  }

  function undo() {
    setGame((previous: Game) => {
      const nextRounds = [...previous.rounds];
      for (let index = nextRounds.length - 1; index >= 0; index -= 1) {
        if (!nextRounds[index].deleted) { nextRounds[index] = { ...nextRounds[index], deleted: true }; break; }
      }
      return { ...previous, rounds: nextRounds, status: "active", winnerId: null };
    });
    haptic([10, 24, 10]);
  }

  function resetGame() { setGame((previous: Game) => ({ ...previous, rounds: [], status: "active", winnerId: null })); setInputs({}); setClosedBy(null); setSettingsOpen(false); }
  function rematch() { setGame((previous: Game) => ({ ...previous, gameId: crypto.randomUUID(), gameName: `${previous.gameName} rematch`, rounds: [], status: "active", winnerId: null })); setInputs({}); setClosedBy(null); }
  function newSetup() { setGame(createDefaultGame()); setInputs({}); setClosedBy(null); setGameOpen(true); }

  
  function uiValue(name: string) {
    return uiValues[name] || UI_STUDIO_DEFAULTS[name] || "0";
  }

  function setUiVar(name: string, value: string) {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty(name, value);
    }

    setUiValues((previous) => ({ ...previous, [name]: value }));

    try {
      localStorage.setItem(`rummy-type-${name}`, value);
    } catch {}
  }

  function editUiVar(name: string, fallback: string) {
    const current = uiValue(name) || fallback;
    const value = typeof window !== "undefined" ? window.prompt(`Set ${name}`, current) : null;
    if (!value) return;

    setUiVar(name, value.trim());
  }

  function adjustUiVar(
    name: string,
    step: number,
    fallback: number,
    unit: "px" | "number" | "opacity" = "px",
    min = 0,
    max = 999
  ) {
    const current = uiValue(name);
    const parsed = parseFloat(current || String(fallback));
    const nextNumber = Math.min(max, Math.max(min, parsed + step));
    const rounded = unit === "opacity" ? Math.round(nextNumber * 100) / 100 : Math.round(nextNumber);
    const value = unit === "px" ? `${rounded}px` : `${rounded}`;

    setUiVar(name, value);
  }

  function updateTypeVar(name: string, value: string) {
    setUiVar(name, value);
  }

  function applyUiPreset(values: Record<string, string>) {
    Object.entries(values).forEach(([name, value]) => setUiVar(name, value));
  }

  function getStoredUiPresets(): Record<string, Record<string, string>> {
    try {
      const raw = localStorage.getItem("rummy-ui-custom-presets");
      return raw ? JSON.parse(raw) as Record<string, Record<string, string>> : {};
    } catch {
      return {};
    }
  }

  function setStoredUiPresets(presets: Record<string, Record<string, string>>) {
    try {
      localStorage.setItem("rummy-ui-custom-presets", JSON.stringify(presets));
    } catch {}
  }

  function saveCustomUiPreset() {
    if (typeof window === "undefined") return;
    const name = window.prompt("Preset name", "My UI");
    if (!name) return;

    const presets = getStoredUiPresets();
    presets[name] = uiValues;
    setStoredUiPresets(presets);
  }

  function loadCustomUiPreset() {
    if (typeof window === "undefined") return;
    const presets = getStoredUiPresets();
    const names = Object.keys(presets);

    if (!names.length) return;
    const name = window.prompt(`Load preset:\n${names.join("\n")}`, names[0]);
    if (!name || !presets[name]) return;

    applyUiPreset(presets[name]);
  }

  function renameCustomUiPreset() {
    if (typeof window === "undefined") return;
    const presets = getStoredUiPresets();
    const names = Object.keys(presets);

    if (!names.length) return;
    const oldName = window.prompt(`Rename preset:\n${names.join("\n")}`, names[0]);
    if (!oldName || !presets[oldName]) return;
    const newName = window.prompt("New preset name", oldName);
    if (!newName || newName === oldName) return;

    presets[newName] = presets[oldName];
    delete presets[oldName];
    setStoredUiPresets(presets);
  }

  function deleteCustomUiPreset() {
    if (typeof window === "undefined") return;
    const presets = getStoredUiPresets();
    const names = Object.keys(presets);

    if (!names.length) return;
    const name = window.prompt(`Delete preset:\n${names.join("\n")}`, names[0]);
    if (!name || !presets[name]) return;

    delete presets[name];
    setStoredUiPresets(presets);
  }

  function exportUiPreset() {
    try {
      navigator.clipboard?.writeText(JSON.stringify(uiValues, null, 2));
    } catch {}
  }

  function importUiPreset() {
    const value = typeof window !== "undefined" ? window.prompt("Paste UI preset JSON") : null;
    if (!value) return;

    try {
      applyUiPreset(JSON.parse(value) as Record<string, string>);
    } catch {}
  }

  useEffect(() => {
    if (typeof document === "undefined") return;

    const nextValues: Record<string, string> = { ...UI_STUDIO_DEFAULTS };

    Object.keys(UI_STUDIO_DEFAULTS).forEach((name) => {
      try {
        const saved = localStorage.getItem(`rummy-type-${name}`);
        const value = saved || UI_STUDIO_DEFAULTS[name];
        nextValues[name] = value;
        document.documentElement.style.setProperty(name, value);
      } catch {}
    });

    setUiValues(nextValues);
  }, []);


  function openGameLibrary() {
    setSettingsOpen(false);
    setGamesOpen(true);
  }

  async function repairSavedGamesLibrary() {
    const local = readGameLibrary();
    const cloud = await loadCloudGameLibrary().catch(() => []);
    const repaired = mergeGameLists(local, cloud);
    setSavedGames(repaired);
    writeGameLibrary(repaired);
    repaired.forEach((item) => upsertGameLibraryRow(item).catch(() => setLibrarySyncStatus("offline")));
    setLibrarySyncStatus(cloud.length ? "synced" : librarySyncStatus);
    haptic(8);
  }

  function switchSavedGame(nextGame: Game) {
    const opened = touchGame(nextGame);
    applyingRemote.current = true;
    currentSignature.current = gameSignature(opened);
    setGame(opened);
    setInputs({});
    setClosedBy(null);
    setGamesOpen(false);
    if (opened.gameId) {
      setUrlGameId(opened.gameId);
      try { localStorage.setItem(ACTIVE_GAME_KEY, opened.gameId); } catch {}
    }
    setSavedGames((previous) => {
      const next = upsertGameInLibrary(previous, opened);
      writeGameLibrary(next);
      return next;
    });
    upsertGameLibraryRow(opened).catch(() => setLibrarySyncStatus("offline"));
    setTimeout(() => { applyingRemote.current = false; }, 0);
  }

  function deleteSavedGame(gameId: string) {
    const next = savedGames.filter((item) => item.gameId !== gameId);
    setSavedGames(next);
    removeGameFromStorage(gameId);
    writeGameLibrary(next);
    deleteGameLibraryRow(gameId).catch(() => setLibrarySyncStatus("offline"));

    if (game.gameId === gameId) {
      const fallback = next[0] || createDefaultGame();
      setGame(fallback);
      if (fallback.gameId) setUrlGameId(fallback.gameId);
    }
  }

  function duplicateCurrentGame() {
    const copy: Game = touchGame({
      ...game,
      gameId: crypto.randomUUID(),
      gameName: `${game.gameName || "Game"} copy`,
      status: "active",
      winnerId: null,
      archived: false
    });
    setGame(copy);
    upsertGameLibraryRow(copy).catch(() => setLibrarySyncStatus("offline"));
    setInputs({});
    setClosedBy(null);
    setGamesOpen(false);
    haptic([8, 18, 8]);
  }

  async function copySavedGameLink(nextGame: Game) {
    const url = getShareUrl(nextGame);

    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      haptic(8);
    } catch {}

    setTimeout(() => setShareStatus("idle"), 1400);
  }

  function openInvitePanel() {
    setSettingsOpen(false);
    setGamesOpen(false);
    setInviteOpen(true);
  }

  async function copyCurrentGameLink() {
    await copySavedGameLink(game);
  }

  async function shareCurrentGame() {
    const url = getShareUrl(game);
    const text = `Join my Rummy 500 game: ${game.gameName || "Rummy 500"}\n${url}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: game.gameName || "Rummy 500", text, url });
        setShareStatus("copied");
        haptic(8);
      } else {
        await navigator.clipboard.writeText(text);
        setShareStatus("copied");
        haptic(8);
      }
    } catch {}

    setTimeout(() => setShareStatus("idle"), 1400);
  }

  function renameSavedGame(gameId: string) {
    const current = savedGames.find((item) => item.gameId === gameId);
    if (!current) return;

    const nextName = typeof window !== "undefined" ? window.prompt("Game name", current.gameName || "Game") : null;
    if (!nextName?.trim()) return;

    const renamed = touchGame({ ...current, gameName: nextName.trim() });
    const next = upsertGameInLibrary(savedGames.filter((item) => item.gameId !== gameId), renamed);
    setSavedGames(next);
    writeGameLibrary(next);
    upsertGameLibraryRow(renamed).catch(() => setLibrarySyncStatus("offline"));

    if (game.gameId === gameId) setGame(renamed);
  }

  function archiveSavedGame(gameId: string) {
    const current = savedGames.find((item) => item.gameId === gameId);
    if (!current) return;

    const archived = touchGame({ ...current, archived: !current.archived });
    const next = upsertGameInLibrary(savedGames.filter((item) => item.gameId !== gameId), archived);
    setSavedGames(next);
    writeGameLibrary(next);
    upsertGameLibraryRow(archived).catch(() => setLibrarySyncStatus("offline"));

    if (game.gameId === gameId) setGame(archived);
  }

  function saveGame() { queueCloudSave(game); setSettingsOpen(false); }

  async function shareGame() {
    const url = getShareUrl(game);

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Rummy 500",
          text: "Join the current Rummy 500 game",
          url
        });
        setShareStatus("shared");
      } else {
        await navigator.clipboard.writeText(url);
        setShareStatus("copied");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setShareStatus("copied");
      } catch {}
    }

    setTimeout(() => setShareStatus("idle"), 1600);
  }

  return (
    <motion.main className={`app players-${game.players.length}`} initial={{ opacity: 0.98 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
      <div className="bg" aria-hidden="true" />
      <div className="ui">
        <header className="header">
          <button type="button" onClick={toggleStarter} className="glass-soft pill">Starter: {game.players.find((player) => player.id === game.starterId)?.name || "You"}</button>
          <button type="button" onClick={() => setSettingsOpen(true)} className="glass-soft pill">{game.gameId ? `${game.gameName} · ${game.targetScore}` : "No game"}<span className={`sync-dot sync-${syncStatus}`} /></button>
        </header>

        <Scoreboard game={game} scoreTotals={scoreTotals} />

        <section className="rounds">
          <button
            type="button"
            className="glass rounds-card"
            onClick={() => setShowRoundsPopup(true)}
            aria-label="Open rounds overview"
          >
            {rounds.length === 0 ? (
              <>
                <div className="empty-title">No rounds yet</div>
                <div className="empty-sub">Tap to view round history</div>
              </>
            ) : (
              <>
                <div className="last-round-top centered">
                  <div className="last-round-label">LAST ROUND #{rounds.length}</div>
                </div>

                <div
                  className="last-round-grid"
                  style={{ gridTemplateColumns: `repeat(${game.players.length}, minmax(0, 1fr))` }}
                >
                  {game.players.map((player) => {
                    const value = Number(latestRound?.scores[player.id] || 0) + (latestRound?.closedBy === player.id ? 15 : 0);
                    return (
                      <div key={player.id} className="last-round-player">
                        <div className="last-round-player-name" style={{ color: player.color }}>{player.name}</div>
                        <div className="last-round-player-score">{signed(value)}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="last-round-hint">Tap for full rounds overview</div>
              </>
            )}
          </button>
        </section>
      </div>

      <section className="dock">
        <div className={`glass dock-panel ${isCommitting ? "is-committing" : ""}`}>
          {game.players.map((player) => (
            <div key={player.id} className="input-row input-transition">
              <div className="input-main">
                <div className="input-name" style={{ color: player.color }}>{player.name}</div>
                <button type="button" disabled={isCommitting} onClick={() => negative(player.id)} className="icon-btn">−</button>
                <input disabled={isCommitting} value={inputs[player.id] || ""} onChange={(event) => setInputs((previous: Record<string, string>) => ({ ...previous, [player.id]: event.target.value }))} inputMode="decimal" placeholder="0" className="round-input" />
                <button type="button" disabled={isCommitting} onClick={() => setClosedBy(closedBy === player.id ? null : player.id)} className={`icon-btn closed-toggle ${closedBy === player.id ? "active" : ""}`} aria-label={`Mark ${player.name} closed`}>✓</button>
              </div>
              <div className="quick-grid">{[5, 10, 20, 50].map((amount) => <button key={amount} disabled={isCommitting} type="button" onClick={() => quick(player.id, amount)} className="quick">+{amount}</button>)}</div>
            </div>
          ))}
          <button type="button" disabled={isCommitting} onClick={addRound} className="glass-soft add-round"><span>{isCommitting ? "Adding…" : "Add round"}</span></button>
        </div>
      </section>

      {settingsOpen && (
        <>
          <div className="modal-shade" onClick={() => setSettingsOpen(false)} />
          <section className="glass modal settings-modal">
            <div className="modal-title">Settings</div>
            <div className="sync-line">Cloud sync: {syncStatus}</div>
            <div className="sync-line">Room {shortGameCode(game.gameId)} · {roomLoadStatus}</div>
            <div className="room-meta-row">
              <span>Shared game</span>
              <span>Anyone with link can edit</span>
              <span>{connectedDevices.length} connected</span>
            </div>
            <div className="analytics-grid">
              <div><span>Rounds</span><strong>{analytics.roundsPlayed}</strong></div>
              <div><span>Avg</span><strong>{analytics.averageRoundPoints}</strong></div>
              <div><span>Leader</span><strong>{analytics.leaderName}</strong></div>
              <div><span>Games</span><strong>{analytics.gamesFinished}</strong></div>
            </div>
            <button type="button" onClick={shareGame} className="glass-soft modal-btn share-game-btn">
              {shareStatus === "copied" ? "Copied link" : shareStatus === "shared" ? "Shared" : "Share current game"}
            </button>
            <button type="button" onClick={() => { setSettingsOpen(false); setTypographyOpen(true); }} className="glass-soft modal-btn typography-settings-button">UI Studio</button>
            <div className="modal-grid">
              <button type="button" onClick={undo} className="glass-soft modal-btn">Undo</button>
              <button type="button" onClick={openGameLibrary} className="glass-soft modal-btn">Saved Games</button>
              <button type="button" onClick={openInvitePanel} className="glass-soft modal-btn">Invite</button>
              <button type="button" onClick={() => { setSettingsOpen(false); setGameOpen(true); }} className="glass-soft modal-btn">Game</button>
              <button type="button" onClick={saveGame} className="glass-soft modal-btn">Save</button>
              <button type="button" onClick={resetGame} className="glass-soft modal-btn danger">Reset</button>
              
            </div>
          </section>
        </>
      )}



      {inviteOpen && (
        <>
          <div className="modal-shade" onClick={() => setInviteOpen(false)} />
          <section className="glass sheet invite-panel">
            <div className="modal-title">Invite Players</div>
            <div className="sync-line">Share this game with anyone who should play or follow along.</div>
            <div className={`room-status room-status-${roomLoadStatus}`}>Room status: {roomLoadStatus}</div>
            <div className="room-meta-row">
              <span>Room: {shortGameCode(game.gameId)}</span>
              <span>Shared game</span>
              <span>Anyone with link can edit</span>
            </div>

            <div className="invite-card">
              <div className="invite-code-label">Game code</div>
              <div className="invite-code">{shortGameCode(game.gameId)}</div>
              <div className="invite-game-name">{game.gameName || "Untitled game"}</div>
              <div className="invite-url">{getShareUrl(game)}</div>
            </div>

            <div className="invite-section-title">Players in this game</div>
            <div className="invite-players">
              {game.players.map((player) => (
                <div key={player.id} className="invite-player">
                  <span>{player.name}</span>
                </div>
              ))}
            </div>

            <div className="invite-section-title">Connected devices</div>
            <div className="presence-list">
              {connectedDevices.length === 0 ? (
                <div className="presence-item">Only this device</div>
              ) : connectedDevices.map((device) => (
                <div key={device.clientId} className="presence-item">
                  <span>{device.name}</span>
                  <small>{device.clientId === clientId.current ? "You" : "Connected"}</small>
                </div>
              ))}
            </div>

            {roomLoadStatus === "missing" && (
              <div className="room-warning">This room has not been found in cloud sync yet. Create or save the game on the original phone, then reopen this link.</div>
            )}

            <div className="modal-grid">
              <button type="button" onClick={copyCurrentGameLink} className="glass-soft modal-btn">{shareStatus === "copied" ? "Copied" : "Copy link"}</button>
              <button type="button" onClick={shareCurrentGame} className="glass-soft modal-btn">Share</button>
              <button type="button" onClick={() => { setInviteOpen(false); setGamesOpen(true); }} className="glass-soft modal-btn">Saved Games</button>
              <button type="button" onClick={() => setInviteOpen(false)} className="glass-soft modal-btn">Done</button>
            </div>
          </section>
        </>
      )}

      {gamesOpen && (
        <>
          <div className="modal-shade" onClick={() => setGamesOpen(false)} />
          <section className="glass sheet game-library-panel">
            <div className="modal-title">Saved Games</div>
            <div className="sync-line">Each game has its own shared link and sync room.</div>
            <div className="sync-line">Cloud library: {librarySyncStatus}</div>

            <div className="game-library-toolbar">
              <button type="button" onClick={() => { setGamesOpen(false); setGameOpen(true); }} className="glass-soft modal-btn">New game</button>
              <button type="button" onClick={duplicateCurrentGame} className="glass-soft modal-btn">Duplicate</button>
              <button type="button" onClick={openInvitePanel} className="glass-soft modal-btn">Invite current</button>
              <button type="button" onClick={() => setShowArchivedGames((value) => !value)} className="glass-soft modal-btn">
                {showArchivedGames ? "Hide archived" : "Show archived"}
              </button>
              <button type="button" onClick={repairSavedGamesLibrary} className="glass-soft modal-btn">Repair list</button>
            </div>

            <div className="history game-library-list">
              {visibleSavedGames(savedGames, showArchivedGames).length === 0 ? (
                <div className="history-item">No saved games yet</div>
              ) : visibleSavedGames(savedGames, showArchivedGames).map((item) => (
                <div key={item.gameId || item.gameName} className={`history-item game-library-item ${item.gameId === game.gameId ? "active" : ""} ${item.archived ? "archived" : ""}`}>
                  <button type="button" onClick={() => switchSavedGame(item)} className="game-library-main">
                    <strong>{item.gameName || "Untitled game"}</strong>
                    <span>{item.players.map((player) => player.name).join(" · ")}</span>
                    <span>{item.players.length} players · {activeRounds(item.rounds).length} rounds · {item.targetScore} target · Room {shortGameCode(item.gameId)} · Shared</span>
                    <span>{item.archived ? "Archived" : `Last opened ${formatGameUpdated(item.updatedAt)}`}</span>
                  </button>
                  <div className="game-library-actions">
                    <button type="button" onClick={() => copySavedGameLink(item)}>{shareStatus === "copied" ? "Copied" : "Link"}</button>
                    <button type="button" onClick={() => item.gameId && renameSavedGame(item.gameId)}>Rename</button>
                    <button type="button" onClick={() => item.gameId && archiveSavedGame(item.gameId)}>{item.archived ? "Unarchive" : "Archive"}</button>
                    <button type="button" onClick={() => item.gameId && deleteSavedGame(item.gameId)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {showRoundsPopup && (
        <>
          <div className="modal-shade" onClick={() => setShowRoundsPopup(false)} />
          <div className="sheet glass">
            <div className="modal-title rounds-popup-title">Rounds Overview</div>

            <div className="rounds-overview-stats">
              <div>
                <span>Closed most</span>
                <strong>{roundsOverviewStats.closedMost}</strong>
              </div>
              <div>
                <span>Highest round</span>
                <strong>{roundsOverviewStats.highestRound}</strong>
              </div>
            </div>

            <div className="history rounds-overview-list">
              {roundsOverviewRows.length === 0 ? <div className="history-item">No rounds yet</div> : roundsOverviewRows.map((row) => (
                <div key={row.round.id} className="history-item round-overview-row">
                  <span className="round-number">{row.index + 1}.</span>
                  <span className="round-score-line">
                    {row.playerScores.map(({ player, score }) => (
                      <span key={`${row.round.id}-${player.id}`} className="round-player-score">
                        <span style={{ color: player.color }}>{player.name}</span> {signed(score)}
                      </span>
                    ))}
                    <span className="round-final-total">
                      {row.playerScores.map(({ total }) => total).join("/")}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}


      {typographyOpen && (
        <>
          <div className="modal-shade" onClick={() => setTypographyOpen(false)} />
          <section className="glass sheet typography-panel ui-studio-panel">
            <div className="modal-title">UI Studio</div>

            <div className="ui-studio-tabs">
              {[
                ["type", "Type"],
                ["space", "Space"],
                ["radius", "Radius"],
                ["color", "Color"],
                ["layout", "Layout"],
                ["presets", "Presets"]
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={uiStudioTab === id ? "active" : ""}
                  onClick={() => setUiStudioTab(id as UiStudioTab)}
                >
                  {label}
                </button>
              ))}
            </div>

            {uiStudioTab === "type" && (
              <div className="ui-studio-page">
                <div className="ui-studio-section">Font sizes</div>
                {[
                  ["Caption", "--font-size-caption", 1, 10, "px", 6, 20],
                  ["Body", "--font-size-body", 1, 14, "px", 8, 26],
                  ["Title", "--font-size-title", 1, 16, "px", 10, 32],
                  ["Display", "--font-size-display", 1, 28, "px", 14, 54],
                  ["Input", "--font-size-input", 1, 34, "px", 20, 70],
                  ["Total score", "--font-size-score", 1, 42, "px", 24, 82]
                ].map(([label, name, step, fallback, unit, min, max]) => (
                  <div key={String(name)} className="ui-control-row">
                    <span>{label}</span>
                    <button type="button" onClick={() => adjustUiVar(String(name), -Number(step), Number(fallback), unit as "px", Number(min), Number(max))}>−</button>
                    <button type="button" className="ui-value-button" onClick={() => editUiVar(String(name), UI_STUDIO_DEFAULTS[String(name)] || String(fallback))}>{uiValue(String(name))}</button>
                    <button type="button" onClick={() => adjustUiVar(String(name), Number(step), Number(fallback), unit as "px", Number(min), Number(max))}>+</button>
                    <button type="button" className="mini-reset" onClick={() => setUiVar(String(name), UI_STUDIO_DEFAULTS[String(name)])}>Reset</button>
                  </div>
                ))}

                <div className="ui-studio-section">Weights</div>
                {[
                  ["Label", "--font-weight-label", 100, 700],
                  ["Body", "--font-weight-body", 100, 600],
                  ["Title", "--font-weight-title", 100, 800],
                  ["Score", "--font-weight-score", 100, 900]
                ].map(([label, name, step, fallback]) => (
                  <div key={String(name)} className="ui-control-row">
                    <span>{label}</span>
                    <button type="button" onClick={() => adjustUiVar(String(name), -Number(step), Number(fallback), "number", 100, 950)}>−</button>
                    <button type="button" className="ui-value-button" onClick={() => editUiVar(String(name), UI_STUDIO_DEFAULTS[String(name)] || String(fallback))}>{uiValue(String(name))}</button>
                    <button type="button" onClick={() => adjustUiVar(String(name), Number(step), Number(fallback), "number", 100, 950)}>+</button>
                    <button type="button" className="mini-reset" onClick={() => setUiVar(String(name), UI_STUDIO_DEFAULTS[String(name)])}>Reset</button>
                  </div>
                ))}
              </div>
            )}

            {uiStudioTab === "space" && (
              <div className="ui-studio-page">
                <div className="ui-studio-section">Main section gaps</div>
                {[
                  ["Top gap", "--top-section-gap", 1, 16, 4, 30],
                  ["Score gap", "--scoreboard-gap", 1, 16, 4, 30],
                  ["Last → Controls", "--last-round-gap", 1, 8, 0, 24]
                ].map(([label, name, step, fallback, min, max]) => (
                  <div key={String(name)} className="ui-control-row">
                    <span>{label}</span>
                    <button type="button" onClick={() => adjustUiVar(String(name), -Number(step), Number(fallback), "px", Number(min), Number(max))}>−</button>
                    <button type="button" className="ui-value-button" onClick={() => editUiVar(String(name), UI_STUDIO_DEFAULTS[String(name)] || `${fallback}px`)}>{uiValue(String(name))}</button>
                    <button type="button" onClick={() => adjustUiVar(String(name), Number(step), Number(fallback), "px", Number(min), Number(max))}>+</button>
                    <button type="button" className="mini-reset" onClick={() => setUiVar(String(name), UI_STUDIO_DEFAULTS[String(name)])}>Reset</button>
                  </div>
                ))}

                <div className="ui-studio-section">Bottom gaps</div>
                {[
                  ["Input cards", "--input-card-gap", 1, 18, 6, 32],
                  ["Penalty gap", "--penalty-gap", 1, 14, 4, 28],
                  ["Bottom gap", "--bottom-gap", 1, 12, 0, 28]
                ].map(([label, name, step, fallback, min, max]) => (
                  <div key={String(name)} className="ui-control-row">
                    <span>{label}</span>
                    <button type="button" onClick={() => adjustUiVar(String(name), -Number(step), Number(fallback), "px", Number(min), Number(max))}>−</button>
                    <button type="button" className="ui-value-button" onClick={() => editUiVar(String(name), UI_STUDIO_DEFAULTS[String(name)] || `${fallback}px`)}>{uiValue(String(name))}</button>
                    <button type="button" onClick={() => adjustUiVar(String(name), Number(step), Number(fallback), "px", Number(min), Number(max))}>+</button>
                    <button type="button" className="mini-reset" onClick={() => setUiVar(String(name), UI_STUDIO_DEFAULTS[String(name)])}>Reset</button>
                  </div>
                ))}
              </div>
            )}

            {uiStudioTab === "radius" && (
              <div className="ui-studio-page">
                <div className="ui-studio-section">Corner radius</div>
                {[
                  ["Small controls", "--radius-sm", 1, 12, 0, 30],
                  ["Cards", "--radius-lg", 1, 24, 0, 48],
                  ["Large modules", "--radius-xl", 1, 32, 0, 64]
                ].map(([label, name, step, fallback, min, max]) => (
                  <div key={String(name)} className="ui-control-row">
                    <span>{label}</span>
                    <button type="button" onClick={() => adjustUiVar(String(name), -Number(step), Number(fallback), "px", Number(min), Number(max))}>−</button>
                    <button type="button" className="ui-value-button" onClick={() => editUiVar(String(name), UI_STUDIO_DEFAULTS[String(name)] || `${fallback}px`)}>{uiValue(String(name))}</button>
                    <button type="button" onClick={() => adjustUiVar(String(name), Number(step), Number(fallback), "px", Number(min), Number(max))}>+</button>
                    <button type="button" className="mini-reset" onClick={() => setUiVar(String(name), UI_STUDIO_DEFAULTS[String(name)])}>Reset</button>
                  </div>
                ))}
              </div>
            )}

            {uiStudioTab === "color" && (
              <div className="ui-studio-page">
                <div className="ui-studio-section">Blueprint colors</div>
                {[
                  ["Text / Border Blue", "--passport-blue", "#244cdd"],
                  ["Background Beige", "--passport-bg", "#efe9dc"],
                  ["Soft Line", "--passport-muted", "#244cdd"]
                ].map(([label, name, fallback]) => (
                  <div key={String(name)} className="ui-control-row color-control-row">
                    <span>{label}</span>
                    <input
                      type="color"
                      className="ui-color-picker"
                      value={uiValue(String(name)).startsWith("#") ? uiValue(String(name)) : String(fallback)}
                      onChange={(event) => setUiVar(String(name), event.target.value)}
                      aria-label={String(label)}
                    />
                    <button type="button" className="ui-value-button color-value-button" onClick={() => editUiVar(String(name), String(fallback))}>{uiValue(String(name))}</button>
                    <button type="button" className="mini-reset" onClick={() => setUiVar(String(name), UI_STUDIO_DEFAULTS[String(name)])}>Reset</button>
                  </div>
                ))}
              </div>
            )}

            {uiStudioTab === "layout" && (
              <div className="ui-studio-page">
                <div className="ui-studio-section">Density</div>
                <div className="ui-control-row">
                  <span>Density</span>
                  <button type="button" onClick={() => adjustUiVar("--ui-density-scale", -0.05, 1, "opacity", 0.75, 1.25)}>−</button>
                  <button type="button" className="ui-value-button" onClick={() => editUiVar("--ui-density-scale", UI_STUDIO_DEFAULTS["--ui-density-scale"])}>{uiValue("--ui-density-scale")}</button>
                  <button type="button" onClick={() => adjustUiVar("--ui-density-scale", 0.05, 1, "opacity", 0.75, 1.25)}>+</button>
                  <button type="button" className="mini-reset" onClick={() => setUiVar("--ui-density-scale", UI_STUDIO_DEFAULTS["--ui-density-scale"])}>Reset</button>
                </div>

                <div className="ui-studio-section">Quick density</div>
                {[
                  ["Compact", "0.9"],
                  ["Balanced", "1"],
                  ["Comfortable", "1.08"],
                  ["Large", "1.16"]
                ].map(([label, value]) => (
                  <button key={label} type="button" className="ui-studio-wide-btn" onClick={() => setUiVar("--ui-density-scale", value)}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {uiStudioTab === "presets" && (
              <div className="ui-studio-page">
                <div className="ui-studio-section">Presets</div>
                <div className="ui-preset-grid">
                  {Object.entries(UI_STUDIO_PRESETS).map(([name, values]) => (
                    <button key={name} type="button" onClick={() => applyUiPreset(values)}>{name}</button>
                  ))}
                </div>

                <div className="ui-studio-section">Custom</div>
                <div className="ui-preset-grid">
                  <button type="button" onClick={saveCustomUiPreset}>Save</button>
                  <button type="button" onClick={loadCustomUiPreset}>Load</button>
                  <button type="button" onClick={renameCustomUiPreset}>Rename</button>
                  <button type="button" onClick={deleteCustomUiPreset}>Delete</button>
                  <button type="button" onClick={exportUiPreset}>Copy JSON</button>
                  <button type="button" onClick={importUiPreset}>Paste JSON</button>
                  <button type="button" onClick={() => applyUiPreset(UI_STUDIO_DEFAULTS)}>Reset all</button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {gameOpen && (
        <>
          <div className="modal-shade" onClick={() => setGameOpen(false)} />
          <section className="glass sheet">
            <div className="modal-title">Game</div>
            <div className="form-grid">
              <input value={gameName} onChange={(event) => setGameName(event.target.value)} placeholder="Game name" className="form-input" />
              <div className="segment" style={{ "--count": 5 } as React.CSSProperties}>{[500, 1000, 1500, 2000, "custom"].map((value) => <button key={String(value)} type="button" onClick={() => setTarget(value as number | "custom")} className={target === value ? "selected" : ""}>{value === "custom" ? "Custom" : value}</button>)}</div>
              {target === "custom" && <input value={customTarget} onChange={(event) => setCustomTarget(event.target.value)} inputMode="numeric" placeholder="Custom target" className="form-input" />}
              <div className="segment" style={{ "--count": 3 } as React.CSSProperties}>{[2, 3, 4].map((count) => <button key={count} type="button" onClick={() => setPlayerCount(count)} className={playerCount === count ? "selected" : ""}>{count}</button>)}</div>
              {Array.from({ length: playerCount }, (_, index) => <input key={index} value={names[index] || ""} onChange={(event) => setNames((previous: string[]) => previous.map((name, nameIndex) => nameIndex === index ? event.target.value : name))} placeholder={DEFAULT_PLAYERS[index]?.name || `Player ${index + 1}`} className="form-input" />)}
              <button type="button" onClick={createGame} className="primary">Create / save game</button>
            </div>
            <div className="history">{history.slice(0, 5).map((item) => <div key={item.gameId} className="history-item"><strong>{item.gameName}</strong><span>{item.winnerName}</span></div>)}</div>
          </section>
        </>
      )}

      {game.status === "finished" && winner && (
        <>
          <div className="modal-shade" />
          <section className="glass modal">
            <div className="modal-title">Winner</div>
            <div style={{ textAlign: "center", fontSize: 42, fontWeight: 900, letterSpacing: "-.08em" }}>{winner.name}</div>
            <div className="modal-grid" style={{ marginTop: 16 }}>
              <button type="button" onClick={rematch} className="glass-soft modal-btn">Rematch</button>
              <button type="button" onClick={newSetup} className="glass-soft modal-btn">New game</button>
            </div>
          </section>
        </>
      )}
    </motion.main>
  );
}
