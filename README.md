# 🏆 Team Formatter App

A high-performance, interactive web application designed to automate team generation for the JKKNIU CSE FEST 2025 sports tournaments (Cricket & Football). This tool replaces manual sorting with a smart, weighted draft system wrapped in a futuristic Tech UI.

---

## ✨ Key Features

### 🎯 Smart Drafting System

- **Live Draft Wheel**: A visually stunning, canvas-based spinning wheel that randomly assigns players to teams in real-time.
- **Weighted Balancing Algorithm**: The system doesn't just pick randomly; it calculates team strength in the background to ensure fair play.
  - **Category A**: 100 Points
  - **Category B**: 50 Points
  - **Category C**: 10 Points
  - The wheel dynamically adjusts probabilities to favor teams with lower total scores, ensuring no team becomes overpowered.

### 🛠 Dynamic Configuration

- **Event Switching**: Seamlessly toggle between Cricket and Football modes, preserving separate player pools for each.
- **Player Management**: Add players with detailed attributes: Name, Position (Sport-specific), Category (A/B/C), Batch, and Profile Photo.
- **Custom Team Setup**: Configure any number of teams (2-10) and customize their names (e.g., "Team Alpha", "Team Beta").

### 📊 User Experience (UI/UX)

- **Immersive Draft Room**: A dedicated "Live Stage" view for the draft process, featuring a spotlight on the current player and a history log of recent picks.
- **Visual Feedback**: Real-time progress bars showing how many Category A/B/C players each team has acquired.
- **Atomic Consistency**: The visual wheel spin is mathematically synchronized with the backend assignment logic—no "glitches" or wrong assignments.

### 📄 Export & Share

- **PDF Generation**: One-click export of the final team rosters into a clean, printer-friendly PDF format using `html2pdf.js`.

---

## 🚀 Tech Stack

- **Frontend Framework**: React (Vite)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PDF Generation**: `html2pdf.js`
- **Canvas API**: Used for the custom high-performance spinning wheel

---

## 🛠️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/hussain-anjum/team-formatter.git
cd team-formatter
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Development Server

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
```

---

## 🎨 How It Works

1. **Setup**: The admin selects the sport (Cricket/Football) and defines the number of teams.
2. **Pool Creation**: Players are added to the pool with their specific categories (Tier A, B, or C).
3. **The Draft**:
   - The admin enters the "Live Draft Room".
   - The system selects a player from the pool.
   - The wheel spins to determine which team gets the player.
   - Behind the scenes: The algorithm calculates which teams still need players of that category and adjusts the wheel's "slice sizes" to maintain balance.
4. **Results**: Once all players are assigned, the final rosters are displayed and can be downloaded as a PDF.

---

## 🌐 Live Demo

**[Launch Team Formatter](https://teamformatter.vercel.app)**

Experience the live application deployed on Vercel!

---

## 👤 Developer

**Md. Hussain Anjum Ratul**

- Department of Computer Science and Engineering
- Jatiya Kabi Kazi Nazrul Islam University

Developed for JKKNIU CSE FEST 2025

---

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!
