import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Trophy,
  Users,
  Activity,
  UserPlus,
  Trash2,
  Cpu,
  Loader2,
  Camera,
  History,
  Download,
  Github,
  Linkedin,
  Mail,
  Play,
  FastForward,
} from "lucide-react";

// --- Helpers: Pure Logic (Outside Component) ---
// We move ALL random logic here to satisfy strict linters
// const getRandomIndex = (length) => Math.floor(Math.random() * length);
const getRandomFloat = (max) => Math.random() * max;
const getRandomOffset = () => Math.random() * 20 - 10; // +/- 10 degrees randomness

const SCORES = {
  "Category A": 100,
  "Category B": 50,
  "Category C": 10,
};

// Pure helper to calculate score
const getTeamScore = (team) => {
  return (
    team.stats["Category A"] * SCORES["Category A"] +
    team.stats["Category B"] * SCORES["Category B"] +
    team.stats["Category C"] * SCORES["Category C"]
  );
};

// A palette of distinct, app-themed colors for wheel segments
const WHEEL_COLORS = [
  "#0f172a", // Slate-900
  "#1e293b", // Slate-800
  "#334155", // Slate-700
  "#0891b2", // Cyan-600
  "#0e7490", // Cyan-700
  "#155e75", // Cyan-800
  "#164e63", // Cyan-900
  "#0c4a6e", // Sky-900
  "#075985", // Sky-800
  "#0369a1", // Sky-700
];

const App = () => {
  // --- Constants ---
  const positionOptions = {
    Cricket: ["All-rounder", "Batsman", "Bowler", "Wicket Keeper"],
    Football: ["Striker", "Midfielder", "Defender", "Goalkeeper"],
  };

  const batchOptions = [15, 16, 17, 18, 19, 20];

  // --- State Management ---
  const [eventName, setEventName] = useState("Cricket");
  const [teamCount, setTeamCount] = useState(2);

  // Input States
  const [inputName, setInputName] = useState("");
  const [inputPosition, setInputPosition] = useState(
    positionOptions["Cricket"][0]
  );
  const [inputCategory, setInputCategory] = useState("Category A");
  const [inputBatch, setInputBatch] = useState("Batch 19");
  const [inputPhoto, setInputPhoto] = useState(null);

  // Data States
  const [players, setPlayers] = useState([]);
  const [teamNames, setTeamNames] = useState(["Team Alpha", "Team Beta"]);
  const [generatedTeams, setGeneratedTeams] = useState([]); // Fixed: Missing state added

  // Draft System States
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftQueue, setDraftQueue] = useState([]);
  const [currentDraftPlayer, setCurrentDraftPlayer] = useState(null);
  const [draftedTeams, setDraftedTeams] = useState([]);
  const [draftHistory, setDraftHistory] = useState([]);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showFinalResults, setShowFinalResults] = useState(false);

  // History State
  const [eventHistory, setEventHistory] = useState({
    Cricket: {
      players: [],
      teamCount: 2,
      teamNames: ["Team Alpha", "Team Beta"],
    },
    Football: {
      players: [],
      teamCount: 2,
      teamNames: ["Team Alpha", "Team Beta"],
    },
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    document.title = "Team Formatter App";
  }, []);

  // --- Load PDF Library ---
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const theme = {
    bg: "bg-slate-950",
    cardBg: "bg-slate-900",
    accent: "text-cyan-400",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_20px_rgba(34,211,238,0.15)]",
    button:
      "bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold uppercase tracking-wider",
  };

  // --- Handlers ---

  const handleSwitchEvent = (newEvent) => {
    if (newEvent === eventName) return;
    setEventHistory((prev) => ({
      ...prev,
      [eventName]: { players, teamCount, teamNames },
    }));
    const savedData = eventHistory[newEvent];
    setEventName(newEvent);
    setPlayers(savedData.players || []);
    setTeamCount(savedData.teamCount || 2);
    setTeamNames(
      savedData.teamNames ||
        Array.from(
          { length: savedData.teamCount || 2 },
          (_, i) => `Team ${String.fromCharCode(65 + i)}`
        )
    );
    setInputPosition(positionOptions[newEvent][0]);
    setIsDrafting(false);
    setShowFinalResults(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setInputPhoto(imageUrl);
    }
  };

  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (!inputName || !inputPosition) return;
    const newPlayer = {
      id: Date.now(),
      name: inputName,
      position: inputPosition,
      category: inputCategory,
      batch: inputBatch,
      photo: inputPhoto,
    };
    setPlayers([...players, newPlayer]);
    setInputName("");
    setInputPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePlayer = (id) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const handleTeamCountChange = (count) => {
    const newCount = Number(count);
    setTeamCount(newCount);
    setTeamNames((prev) => {
      const newNames = [...prev];
      if (newCount > prev.length) {
        for (let i = prev.length; i < newCount; i++) {
          newNames.push(`Team ${String.fromCharCode(65 + i)}`);
        }
      } else {
        newNames.length = newCount;
      }
      return newNames;
    });
  };

  const handleTeamNameEdit = (index, value) => {
    const newNames = [...teamNames];
    newNames[index] = value;
    setTeamNames(newNames);
  };

  // --- DRAFT LOGIC ---

  // REPLACED: useEffect with useMemo for stability
  // This calculates segments automatically whenever the player or teams change
  const wheelSegments = useMemo(() => {
    if (!currentDraftPlayer) return [];

    const category = currentDraftPlayer.category;
    const totalInCategory = players.filter(
      (p) => p.category === category
    ).length;
    const capPerTeam = Math.ceil(totalInCategory / teamCount);

    let eligibleTeams = draftedTeams.filter(
      (team) => team.stats[category] < capPerTeam
    );
    if (eligibleTeams.length === 0) eligibleTeams = draftedTeams;

    const scores = eligibleTeams.map((t) => getTeamScore(t));
    const maxScore = Math.max(...scores);

    // Weight Formula: Lower score = Higher weight
    return eligibleTeams.map((team) => {
      const score = getTeamScore(team);
      const weight = maxScore - score + 20;
      return { ...team, weight };
    });
  }, [currentDraftPlayer, draftedTeams, players, teamCount]);

  const startDraft = () => {
    if (players.length < teamCount) {
      alert("Not enough players to create teams!");
      return;
    }

    // Use helper for sorting to avoid "impure" warning
    const shuffle = (array) => array.sort(() => getRandomOffset());
    const catA = shuffle(players.filter((p) => p.category === "Category A"));
    const catB = shuffle(players.filter((p) => p.category === "Category B"));
    const catC = shuffle(players.filter((p) => p.category === "Category C"));

    const queue = [...catA, ...catB, ...catC];

    const initialTeams = Array.from({ length: teamCount }, (_, i) => ({
      id: i,
      name: teamNames[i] || `Team ${String.fromCharCode(65 + i)}`,
      members: [],
      stats: { "Category A": 0, "Category B": 0, "Category C": 0 },
      totalScore: 0,
    }));

    setDraftQueue(queue);
    setDraftedTeams(initialTeams);
    setDraftHistory([]);
    setCurrentDraftPlayer(queue[0]);
    setIsDrafting(true);
    setShowFinalResults(false);
  };

  const spinWheel = () => {
    if (isSpinning || !currentDraftPlayer || wheelSegments.length === 0) return;

    setIsSpinning(true);

    // 1. Determine Winner
    const totalWeight = wheelSegments.reduce((sum, t) => sum + t.weight, 0);
    // FIXED: Use external helper
    let randomNum = getRandomFloat(totalWeight);
    let winnerTeam = wheelSegments[0];

    for (let team of wheelSegments) {
      if (randomNum < team.weight) {
        winnerTeam = team;
        break;
      }
      randomNum -= team.weight;
    }

    // 2. Calculate Rotation
    let currentAngle = 0;
    const sliceAngles = wheelSegments.map((t) => {
      const angle = (t.weight / totalWeight) * 360;
      const segment = {
        ...t,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
      };
      currentAngle += angle;
      return segment;
    });

    const winnerSegment = sliceAngles.find((s) => s.id === winnerTeam.id);
    const segmentCenter =
      winnerSegment.startAngle +
      (winnerSegment.endAngle - winnerSegment.startAngle) / 2;

    const landingRotation = 360 - segmentCenter;
    const fullSpins = 360 * 5;
    const currentMod = wheelRotation % 360;
    const distanceToTarget = landingRotation - currentMod;

    const targetRotation =
      wheelRotation +
      fullSpins +
      (distanceToTarget > 0 ? distanceToTarget : 360 + distanceToTarget);

    const segmentWidth = winnerSegment.endAngle - winnerSegment.startAngle;
    // FIXED: Use external helper
    const safeOffset = getRandomFloat(segmentWidth * 0.6) - segmentWidth * 0.3;

    const newRotation = targetRotation + safeOffset;

    // FIXED: Used the variable
    setWheelRotation(newRotation);

    setTimeout(() => {
      assignPlayerToTeam(winnerTeam);
      setIsSpinning(false);
    }, 3000);
  };

  const assignPlayerToTeam = (team) => {
    if (!team) return;

    const updatedTeams = draftedTeams.map((t) => {
      if (t.id === team.id) {
        return {
          ...t,
          members: [...t.members, currentDraftPlayer],
          stats: {
            ...t.stats,
            [currentDraftPlayer.category]:
              t.stats[currentDraftPlayer.category] + 1,
          },
          totalScore: getTeamScore(t) + SCORES[currentDraftPlayer.category],
        };
      }
      return t;
    });
    setDraftedTeams(updatedTeams);
    setDraftHistory((prev) => [
      { player: currentDraftPlayer, team: team },
      ...prev,
    ]);

    const remainingQueue = draftQueue.slice(1);
    setDraftQueue(remainingQueue);

    if (remainingQueue.length > 0) {
      setCurrentDraftPlayer(remainingQueue[0]);
    } else {
      setCurrentDraftPlayer(null);
      setTimeout(() => {
        setGeneratedTeams(updatedTeams);
        setIsDrafting(false);
        setShowFinalResults(true);
      }, 1500);
    }
  };

  const autoDraftRemaining = () => {
    let tempQueue = [...draftQueue];
    let tempTeams = JSON.parse(JSON.stringify(draftedTeams));

    tempQueue.forEach((player) => {
      const category = player.category;
      const totalInCategory = players.filter(
        (p) => p.category === category
      ).length;
      const capPerTeam = Math.ceil(totalInCategory / teamCount);

      let available = tempTeams.filter((t) => t.stats[category] < capPerTeam);
      if (available.length === 0) available = tempTeams;

      const scores = available.map((t) => getTeamScore(t));
      const maxScore = Math.max(...scores);
      const weightedAvailable = available.map((t, i) => ({
        ...t,
        weight: maxScore - scores[i] + 20,
      }));

      const totalWeight = weightedAvailable.reduce(
        (sum, t) => sum + t.weight,
        0
      );
      // FIXED: Use external helper
      let randomNum = getRandomFloat(totalWeight);
      let winner = weightedAvailable[0];

      for (let t of weightedAvailable) {
        if (randomNum < t.weight) {
          winner = t;
          break;
        }
        randomNum -= t.weight;
      }

      const teamIndex = tempTeams.findIndex((t) => t.id === winner.id);
      tempTeams[teamIndex].members.push(player);
      tempTeams[teamIndex].stats[category] += 1;
      tempTeams[teamIndex].totalScore += SCORES[category];
    });

    setGeneratedTeams(tempTeams);
    setDraftQueue([]);
    setIsDrafting(false);
    setShowFinalResults(true);
  };

  const handleDownloadPDF = () => {
    if (!window.html2pdf) {
      alert("PDF Lib loading...");
      return;
    }
    const element = document.getElementById("roster-grid");
    if (!element) {
      alert("No roster!");
      return;
    }

    const clone = element.cloneNode(true);
    clone.style.width = "1200px";
    clone.style.padding = "20px";
    clone.style.background = "#fff";
    clone.style.color = "#000";
    const nodes = clone.querySelectorAll("*");
    nodes.forEach((n) => {
      n.classList.remove(
        "text-white",
        "text-slate-200",
        "text-slate-400",
        "bg-slate-900",
        "bg-slate-950",
        "bg-gradient-to-br"
      );
      n.style.color = "#000";
      n.style.borderColor = "#000";
      if (n.classList.contains("rounded-2xl")) {
        n.style.background = "#fff";
        n.style.border = "2px solid #000";
        n.style.marginBottom = "20px";
      }
    });
    const title = document.createElement("div");
    title.innerHTML = `<h1>JKKNIU CSE FEST 2025</h1><h2>${eventName} - Final Roster</h2>`;
    clone.insertBefore(title, clone.firstChild);
    document.body.appendChild(clone);

    const opt = {
      margin: 10,
      filename: `JKKNIU_${eventName}_Roster.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    };

    setIsSpinning(true);
    window
      .html2pdf()
      .set(opt)
      .from(clone)
      .save()
      .then(() => {
        document.body.removeChild(clone);
        setIsSpinning(false);
      })
      .catch((err) => {
        console.error(err);
        setIsSpinning(false);
      });
  };

  return (
    <div
      className={`min-h-screen ${theme.bg} text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-900 pb-20 overflow-x-hidden`}
    >
      <header className="relative border-b border-slate-800 bg-slate-900/80 backdrop-blur-md pt-12 pb-10 text-center overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-70"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 text-xs md:text-sm font-bold tracking-[0.3em] text-cyan-400 uppercase border border-cyan-500/20 px-4 py-1 rounded-full bg-cyan-950/30">
            <Cpu size={14} /> JKKNIU CSE FEST 2025
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic text-white drop-shadow-2xl">
            Team{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Formatter
            </span>
          </h1>
          <p className="mt-2 text-slate-400 text-xs md:text-sm tracking-[0.2em] uppercase">
            Create • Shuffle • Compete
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        {isDrafting ? (
          <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col animate-in fade-in duration-500 overflow-y-auto">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur">
              <div className="flex items-center gap-4">
                <Activity className="text-cyan-400 animate-pulse" />
                <div>
                  <h2 className="text-2xl font-black uppercase italic text-white">
                    Live Draft Room
                  </h2>
                  <p className="text-xs text-slate-400">
                    Balancing Teams • Randomizing Picks
                  </p>
                </div>
              </div>
              <button
                onClick={autoDraftRemaining}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-slate-700 transition-colors"
              >
                <FastForward size={16} /> Auto-Finish Draft
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
              <div className="lg:col-span-3 flex flex-col gap-4">
                <div className="bg-slate-900 border border-cyan-500/30 p-6 rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.1)] flex flex-col items-center text-center relative overflow-hidden">
                  <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">
                    Current Player On Block
                  </h3>
                  <div className="w-32 h-32 rounded-full border-4 border-slate-800 shadow-xl overflow-hidden mb-4 relative">
                    {currentDraftPlayer?.photo ? (
                      <img
                        src={currentDraftPlayer.photo}
                        alt="Player"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-3xl font-bold text-slate-600">
                        ?
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full border border-white/10"></div>
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase italic">
                    {currentDraftPlayer?.name || "Loading..."}
                  </h2>
                  <div className="flex gap-2 mt-2 justify-center">
                    <span className="bg-slate-800 px-2 py-1 rounded text-xs font-mono uppercase text-slate-400">
                      {currentDraftPlayer?.position}
                    </span>
                    <span className="bg-slate-800 px-2 py-1 rounded text-xs font-mono uppercase text-slate-400">
                      {currentDraftPlayer?.batch}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        currentDraftPlayer?.category === "Category A"
                          ? "bg-yellow-500 text-black"
                          : currentDraftPlayer?.category === "Category B"
                          ? "bg-blue-500 text-white"
                          : "bg-slate-600 text-white"
                      }`}
                    >
                      {currentDraftPlayer?.category}
                    </span>
                  </div>
                </div>

                <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 overflow-hidden flex flex-col">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <History size={12} /> Recent Picks
                  </h3>
                  <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar flex-1 max-h-[200px] lg:max-h-none">
                    {draftHistory.map((log, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs animate-in slide-in-from-left-4 fade-in duration-300"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-8 bg-cyan-500 rounded-full"></div>
                          <div>
                            <p className="font-bold text-slate-200">
                              {log.player.name}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase">
                              {log.player.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-cyan-400">
                            {log.team.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[400px]">
                <div className="relative w-80 h-80 md:w-96 md:h-96">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 text-cyan-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                    <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-cyan-500"></div>
                  </div>
                  <div
                    className="w-full h-full rounded-full border-8 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden transition-transform duration-[3000ms] cubic-bezier(0.25, 1, 0.5, 1)"
                    style={{
                      transform: `rotate(${wheelRotation}deg)`,
                      background: `conic-gradient(
                                        ${wheelSegments
                                          .map((team, i, arr) => {
                                            const totalWeight = arr.reduce(
                                              (sum, t) => sum + t.weight,
                                              0
                                            );
                                            const weightPercentage =
                                              team.weight / totalWeight;
                                            const sliceDeg =
                                              weightPercentage * 360;
                                            let startDeg = 0;
                                            for (let j = 0; j < i; j++)
                                              startDeg +=
                                                (arr[j].weight / totalWeight) *
                                                360;
                                            // Use unique color from palette based on index
                                            const color =
                                              WHEEL_COLORS[
                                                i % WHEEL_COLORS.length
                                              ];
                                            return `${color} ${startDeg}deg ${
                                              startDeg + sliceDeg
                                            }deg`;
                                          })
                                          .join(", ")}
                                    )`,
                    }}
                  >
                    {wheelSegments.map((team, i, arr) => {
                      const totalWeight = arr.reduce(
                        (sum, t) => sum + t.weight,
                        0
                      );
                      let startDeg = 0;
                      for (let j = 0; j < i; j++)
                        startDeg += (arr[j].weight / totalWeight) * 360;
                      const sliceDeg = (team.weight / totalWeight) * 360;
                      const rotate = startDeg + sliceDeg / 2;
                      return (
                        <div
                          key={team.id}
                          className="absolute top-0 left-1/2 h-1/2 w-12 -translate-x-1/2 origin-bottom flex items-center justify-center pt-4"
                          style={{
                            transform: `rotate(${rotate}deg)`,
                          }}
                        >
                          <span
                            className="text-white font-black uppercase text-xs md:text-sm tracking-widest drop-shadow-md whitespace-nowrap origin-center"
                            style={{
                              transform: `rotate(-90deg)`,
                            }}
                          >
                            {team.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-slate-900 border-4 border-cyan-500 rounded-full flex items-center justify-center z-10 shadow-[0_0_30px_cyan]">
                    <button
                      onClick={spinWheel}
                      disabled={isSpinning}
                      className="w-full h-full rounded-full flex flex-col items-center justify-center hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      {isSpinning ? (
                        <Loader2 className="animate-spin text-cyan-400" />
                      ) : (
                        <Play className="ml-1 text-white fill-current" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="mt-8 text-slate-400 font-mono text-sm uppercase tracking-widest animate-pulse">
                  {isSpinning
                    ? "Randomizing Selection..."
                    : "Press Play to Draft"}
                </p>
              </div>

              <div className="lg:col-span-3 flex flex-col gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl h-full overflow-y-auto">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Activity size={14} className="text-cyan-400" /> Live
                    Balance
                  </h3>
                  <div className="space-y-6">
                    {draftedTeams.map((team) => (
                      <div
                        key={team.id}
                        className="bg-slate-950 p-4 rounded-xl border border-slate-800"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-white uppercase">
                            {team.name}
                          </h4>
                          <span className="text-xs bg-slate-800 px-2 py-1 rounded text-cyan-400 font-mono">
                            {team.members.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {["Category A", "Category B", "Category C"].map(
                            (cat) => {
                              const totalCat = players.filter(
                                (p) => p.category === cat
                              ).length;
                              const target = Math.ceil(totalCat / teamCount);
                              const current = team.stats[cat];
                              const percent =
                                target > 0
                                  ? Math.min(100, (current / target) * 100)
                                  : 0;
                              return (
                                <div key={cat} className="space-y-1">
                                  <div className="flex justify-between text-[10px] uppercase text-slate-500">
                                    <span>{cat}</span>
                                    <span>
                                      {current} / {target}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        cat === "Category A"
                                          ? "bg-yellow-500"
                                          : cat === "Category B"
                                          ? "bg-blue-500"
                                          : "bg-slate-500"
                                      }`}
                                      style={{ width: `${percent}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div
              className={`lg:col-span-5 ${theme.cardBg} border ${theme.border} p-6 md:p-8 rounded-2xl relative overflow-hidden shadow-2xl`}
            >
              <h2 className="text-xl font-bold uppercase mb-6 flex items-center gap-3 text-white">
                <div className="w-1 h-8 bg-cyan-500 shadow-[0_0_10px_cyan]"></div>{" "}
                Setup Config
              </h2>
              <div className="space-y-6 relative z-10">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 flex items-center gap-2">
                    <History size={12} /> Tournament Event
                  </label>
                  <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                    <button
                      onClick={() => handleSwitchEvent("Cricket")}
                      className={`flex-1 py-3 text-xs md:text-sm font-black uppercase tracking-wider rounded-lg transition-all ${
                        eventName === "Cricket"
                          ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Cricket
                    </button>
                    <button
                      onClick={() => handleSwitchEvent("Football")}
                      className={`flex-1 py-3 text-xs md:text-sm font-black uppercase tracking-wider rounded-lg transition-all ${
                        eventName === "Football"
                          ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Football
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 block">
                    Teams Configuration
                  </label>
                  <div className="relative mb-3">
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={teamCount}
                      onChange={(e) => handleTeamCountChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 font-mono text-lg"
                    />
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none text-xs font-bold">
                      COUNT
                    </div>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    {teamNames.map((name, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <span className="text-xs text-slate-500 w-4">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) =>
                            handleTeamNameEdit(idx, e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-200 focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="h-[1px] bg-slate-800 w-full"></div>
                <form onSubmit={handleAddPlayer} className="space-y-4">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <UserPlus size={12} /> Add New Player
                  </h3>
                  <div className="flex gap-3">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-12 h-12 flex-shrink-0 bg-slate-950 border border-slate-700 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-cyan-500 transition-colors overflow-hidden group"
                    >
                      {inputPhoto ? (
                        <img
                          src={inputPhoto}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera
                          size={16}
                          className="text-slate-500 group-hover:text-cyan-400"
                        />
                      )}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        accept="image/*"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Player Name"
                      value={inputName}
                      onChange={(e) => setInputName(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="relative w-full">
                      <select
                        value={inputPosition}
                        onChange={(e) => setInputPosition(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-white text-xs md:text-sm focus:outline-none focus:border-cyan-500 appearance-none"
                      >
                        {positionOptions[eventName].map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <Activity size={12} />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <select
                        value={inputBatch}
                        onChange={(e) => setInputBatch(e.target.value)}
                        className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-3 text-white text-xs md:text-sm focus:outline-none focus:border-cyan-500"
                      >
                        {batchOptions.map((b) => (
                          <option key={b} value={`Batch ${b}`}>
                            Batch {b}
                          </option>
                        ))}
                      </select>
                      <select
                        value={inputCategory}
                        onChange={(e) => setInputCategory(e.target.value)}
                        className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-3 text-white text-xs md:text-sm focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Category A">Category A</option>
                        <option value="Category B">Category B</option>
                        <option value="Category C">Category C</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className={`w-full py-4 rounded-xl mt-2 flex items-center justify-center gap-2 ${theme.button} transition-all active:scale-[0.98] shadow-lg shadow-cyan-900/20 group`}
                  >
                    <UserPlus
                      size={18}
                      className="group-hover:rotate-12 transition-transform"
                    />{" "}
                    Add to Pool
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col h-full">
              <div
                className={`${theme.cardBg} border ${theme.border} rounded-2xl p-6 md:p-8 flex-1 min-h-[500px] flex flex-col shadow-2xl`}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                  <div>
                    <h2 className="text-xl font-bold uppercase flex items-center gap-3 text-white">
                      <div className="w-1 h-8 bg-cyan-500 shadow-[0_0_10px_cyan]"></div>{" "}
                      Draft Pool ({eventName})
                    </h2>
                    <p className="text-slate-400 text-xs mt-1 ml-4">
                      Batch-wise Sorting Active
                    </p>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 text-xs font-mono text-slate-400">
                      Total:{" "}
                      <span className="text-white font-bold text-sm ml-1">
                        {players.length}
                      </span>
                    </div>
                    {players.length > 0 && (
                      <button
                        onClick={startDraft}
                        className={`flex-1 md:flex-none px-8 py-3 rounded-lg font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${theme.glow} bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white transition-all shadow-lg active:scale-95`}
                      >
                        <Play size={18} fill="currentColor" /> Start Live Draft
                      </button>
                    )}
                  </div>
                </div>

                {players.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/50">
                    <div className="p-6 bg-slate-900 rounded-full mb-4 opacity-50">
                      <Users size={48} />
                    </div>
                    <p className="font-medium">
                      No players added to {eventName} yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full min-h-[500px] overflow-y-auto pr-2 custom-scrollbar content-start">
                    {["Category A", "Category B", "Category C"].map((cat) => (
                      <div key={cat} className="flex flex-col gap-3">
                        <div
                          className={`p-3 rounded-xl border border-slate-800/50 backdrop-blur-sm sticky top-0 z-10 ${
                            cat === "Category A"
                              ? "bg-yellow-950/20 border-yellow-500/20"
                              : cat === "Category B"
                              ? "bg-blue-950/20 border-blue-500/20"
                              : "bg-slate-900/50"
                          }`}
                        >
                          <h3
                            className={`text-xs font-black uppercase flex items-center gap-2 ${
                              cat === "Category A"
                                ? "text-yellow-400"
                                : cat === "Category B"
                                ? "text-blue-400"
                                : "text-slate-400"
                            }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${
                                cat === "Category A"
                                  ? "bg-yellow-500"
                                  : cat === "Category B"
                                  ? "bg-blue-500"
                                  : "bg-slate-500"
                              }`}
                            ></div>
                            {cat}
                            <span className="ml-auto bg-slate-950 px-2 py-0.5 rounded text-[10px] text-white border border-white/10">
                              {players.filter((p) => p.category === cat).length}
                            </span>
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {players
                            .filter((p) => p.category === cat)
                            .map((player) => (
                              <div
                                key={player.id}
                                className="relative group bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center gap-3 hover:bg-slate-800 hover:border-slate-600 transition-all duration-300 shadow-md"
                              >
                                <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700">
                                  {player.photo ? (
                                    <img
                                      src={player.photo}
                                      alt={player.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-slate-500 tracking-tighter">
                                      {player.batch}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-slate-100 text-xs truncate">
                                    {player.name}
                                  </h4>
                                  <div className="flex flex-wrap gap-1.5 text-[9px] mt-1 font-mono uppercase tracking-wide">
                                    <span className="text-cyan-400 bg-cyan-950/50 px-1 rounded truncate max-w-[60px]">
                                      {player.position}
                                    </span>
                                    <span className="text-slate-400 bg-slate-800 px-1 rounded">
                                      {player.batch}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => removePlayer(player.id)}
                                  className="text-slate-600 hover:text-red-500 p-1.5 rounded-md hover:bg-slate-700 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                          {players.filter((p) => p.category === cat).length ===
                            0 && (
                            <div className="text-center py-8 text-slate-600 text-xs italic border border-dashed border-slate-800 rounded-xl">
                              No Players
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showFinalResults && (
          <div
            id="results-area"
            className="mt-16 mb-20 animate-in fade-in slide-in-from-bottom-10 duration-1000"
          >
            <div className="flex items-center justify-center mb-10 gap-6">
              <div className="h-[2px] w-12 md:w-32 bg-gradient-to-r from-transparent to-cyan-500"></div>
              <div className="text-center">
                <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-widest text-white drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                  Final <span className="text-cyan-400">Rosters</span>
                </h2>
                <p className="text-slate-500 text-sm tracking-[0.3em] uppercase mt-2">
                  {eventName} Tournament
                </p>
              </div>
              <div className="h-[2px] w-12 md:w-32 bg-gradient-to-l from-transparent to-cyan-500"></div>
            </div>

            <div
              id="roster-grid"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
            >
              {generatedTeams.map((team, idx) => (
                <div
                  key={idx}
                  className={`relative group bg-slate-900 border rounded-2xl overflow-hidden transition-all shadow-2xl ${
                    idx % 2 === 0 ? "border-cyan-500/30" : "border-blue-500/30"
                  }`}
                >
                  <div
                    className={`p-5 ${
                      idx % 2 === 0
                        ? "bg-gradient-to-br from-cyan-950 to-slate-900"
                        : "bg-gradient-to-br from-blue-950 to-slate-900"
                    } border-b border-slate-800 flex justify-between items-center relative overflow-hidden`}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 rotate-12">
                      <Trophy size={64} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase italic tracking-tight text-white relative z-10">
                        {team.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-1 relative z-10">
                        {team.members.length} Players
                      </p>
                    </div>
                    <div
                      className={`p-2 rounded-lg bg-slate-900/50 border border-white/10 ${
                        idx % 2 === 0 ? "text-cyan-400" : "text-blue-400"
                      }`}
                    >
                      <Trophy size={20} />
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    {team.members.map((member, mIdx) => (
                      <div
                        key={mIdx}
                        className="flex items-center gap-4 group/player"
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden border border-white/10 ${
                            member.photo
                              ? ""
                              : "flex items-center justify-center bg-slate-800"
                          }`}
                        >
                          {member.photo ? (
                            <img
                              src={member.photo}
                              alt="P"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 tracking-tighter">
                              {member.batch}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-200">
                            {member.name}
                          </p>
                          <div className="flex gap-2">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wide">
                              {member.position}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wide">
                              {member.batch}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`text-[10px] font-black px-2 py-1 rounded border bg-opacity-20 ${
                            member.category === "Category A"
                              ? "bg-yellow-500 text-yellow-500 border-yellow-500"
                              : member.category === "Category B"
                              ? "bg-blue-500 text-blue-500 border-blue-500"
                              : "bg-slate-500 text-slate-400 border-slate-500"
                          }`}
                        >
                          {member.category === "Category A"
                            ? "A"
                            : member.category === "Category B"
                            ? "B"
                            : "C"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex justify-center no-print">
              <button
                onClick={handleDownloadPDF}
                disabled={isSpinning}
                className="flex items-center gap-2 px-8 py-3 bg-white text-slate-900 font-black uppercase tracking-widest rounded-lg hover:bg-slate-200 transition-colors shadow-xl disabled:opacity-50"
              >
                <Download size={20} />{" "}
                {isSpinning ? "Generating PDF..." : "Download PDF Roster"}
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-slate-800/50 bg-slate-900/50 py-12 text-center relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="flex items-center justify-center gap-2 text-cyan-500/40 mb-8 text-[10px] font-mono tracking-[0.3em] uppercase">
            <Cpu size={12} />
            <span>JKKNIU CSE FEST 2025</span>
            <Cpu size={12} />
          </div>
          <div className="group">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
              Developed By
            </p>
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-1 group-hover:text-cyan-400 transition-colors duration-300">
              Md. Hussain Anjum Ratul
            </h3>
            <div className="text-slate-500 text-xs uppercase tracking-wider space-y-1">
              <p>Department of Computer Science and Engineering</p>
              <p className="text-[10px] opacity-70">
                Jatiya Kabi Kazi Nazrul Islam University
              </p>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-8">
            <a
              href="https://github.com/hussain-anjum"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-white hover:scale-110 transition-all duration-300"
            >
              <Github size={20} />
            </a>
            <a
              href="https://www.linkedin.com/in/hussain-anjum02/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-blue-500 hover:scale-110 transition-all duration-300"
            >
              <Linkedin size={20} />
            </a>
            <a
              href="mailto:haratul14@gmail.com"
              className="text-slate-600 hover:text-red-500 hover:scale-110 transition-all duration-300"
            >
              <Mail size={20} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
