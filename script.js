// Firebase SDK (Module Import)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import {
  getDatabase, ref, push, onValue,
  query, orderByChild, limitToLast
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyD1my79wPEDlsfsgg2oW6lCv-PI1_XqLZs",
  authDomain: "sol3mates.firebaseapp.com",
  databaseURL: "https://sol3mates-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sol3mates",
  storageBucket: "sol3mates.firebasestorage.app",
  messagingSenderId: "412759700453",
  appId: "1:412759700453:web:fc9269184892d60176350c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM elements
const catcher = document.getElementById("catcher");
const scoreDisplay = document.getElementById("score");
const popup = document.getElementById("popup");
const timerDisplay = document.getElementById("timer");
const submitBtn = document.getElementById("submitScoreBtn");
const retryBtn = document.getElementById("retryBtn");
const game = document.getElementById("game");
const form = document.getElementById("playerForm");
const formContainer = document.getElementById("formContainer");
const finalScoreText = document.getElementById("finalScore");
const scoresList = document.getElementById("scores");
const startInstructions = document.getElementById("startInstructions");

let playerName = "", playerEmail = "", playerShoeSize = "";
let score = 0, gameRunning = false;
let itemFallSpeed = 5, spawnRate = 700;
let countdownInterval, timeLeft = 30, moreHazards = false;

// Form submission
form.addEventListener("submit", function (e) {
  e.preventDefault();
  playerName = document.getElementById("formName").value.trim();
  playerEmail = document.getElementById("formEmail").value.trim();
  playerShoeSize = document.getElementById("formShoe").value.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const shoeRegex = /^(EU|UK|US)\s?(?:[1-9]|[1-3][0-9]|4[0-7])(\.5)?$/i;

  if (!playerName || playerName.length < 2) return alert("Invalid name.");
  if (!emailRegex.test(playerEmail)) return alert("Invalid email.");
  if (!shoeRegex.test(playerShoeSize)) return alert("Invalid shoe size.");

  formContainer.style.display = "none";
  game.style.display = "block";
  game.style.visibility = "visible";
  startGame();
});

// Submit score to Firebase
submitBtn.onclick = function () {
  if (!playerName) return;
  push(ref(db, "scores"), {
    name: playerName,
    score: score,
    email: playerEmail,
    shoeSize: playerShoeSize,
    timestamp: Date.now()
  });
  submitBtn.style.display = "none";
};

// Retry game without form
retryBtn.onclick = function () {
  popup.style.display = "none";
  clearGame();
  startGame();
};

// Start game
function startGame() {
  score = 0;
  timeLeft = 30;
  moreHazards = false;
  itemFallSpeed = 5;
  spawnRate = 700;
  scoreDisplay.textContent = "Score: 0";
  updateTimerDisplay();
  gameRunning = true;
  showStartInstructions();
  startCountdown();
  updateLeaderboard();
  spawnItem();
}

// Show intro popup
function showStartInstructions() {
  startInstructions.style.display = "block";
  startInstructions.style.animation = "bounceFade 7s ease-in-out forwards";
  setTimeout(() => {
    startInstructions.style.display = "none";
  }, 7000);
}

// Spawn falling items
function spawnItem() {
  if (!gameRunning) return;
  const item = document.createElement("div");
  const rand = Math.random();
  let type = rand < 0.7 ? "good" : rand < 0.9 ? "bad" : "deadly";
  if (moreHazards && rand >= 0.4) type = rand < 0.8 ? "bad" : "deadly";

  item.classList.add("item", type);
  item.dataset.type = type;
  item.style.left = `${Math.random() * (game.offsetWidth - 100)}px`;
  item.style.top = "0px";
  game.appendChild(item);

  function fall() {
    if (!gameRunning) return item.remove();
    let top = parseFloat(item.style.top || 0);
    item.style.top = `${top + itemFallSpeed}px`;

    const itemRect = item.getBoundingClientRect();
    const catcherRect = catcher.getBoundingClientRect();

    const isTouching = (
      itemRect.bottom >= catcherRect.top &&
      itemRect.top <= catcherRect.bottom &&
      itemRect.right >= catcherRect.left &&
      itemRect.left <= catcherRect.right
    );

    if (isTouching) {
      handleItemCatch(type);
      item.remove();
    } else if (top > window.innerHeight) {
      item.remove();
    } else {
      requestAnimationFrame(fall);
    }
  }

  fall();
  setTimeout(spawnItem, spawnRate);
}

// Catch item logic
function handleItemCatch(type) {
  if (type === "good") {
    score++;
    itemFallSpeed += 0.5;
    spawnRate = Math.max(300, spawnRate - 30);
  } else if (type === "bad") {
    score--;
    itemFallSpeed += 0.3;
    spawnRate = Math.max(300, spawnRate - 20);
  } else if (type === "deadly") {
    gameRunning = false;
    clearInterval(countdownInterval);
    endGame();
    return;
  }
  scoreDisplay.textContent = `Score: ${score}`;
}

// Countdown timer
function startCountdown() {
  countdownInterval = setInterval(() => {
    if (!gameRunning) return clearInterval(countdownInterval);
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 23 && !moreHazards) {
      moreHazards = true;
      itemFallSpeed += 1.5;
    }
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      gameRunning = false;
      endGame();
    }
  }, 1000);
}

function updateTimerDisplay() {
  timerDisplay.textContent = `Time: ${timeLeft}`;
}

// End screen
function endGame() {
  popup.style.display = "block";
  finalScoreText.textContent = `Your score: ${score}`;
  submitBtn.style.display = "inline-block";
}

// Remove items
function clearGame() {
  document.querySelectorAll(".item").forEach(i => i.remove());
}

// Leaderboard
function updateLeaderboard() {
  const leaderboardRef = query(ref(db, "scores"), orderByChild("score"), limitToLast(3));
  onValue(leaderboardRef, (snapshot) => {
    const scores = [];
    snapshot.forEach((child) => {
      scores.push(child.val());
    });
    scores.reverse();
    scoresList.innerHTML = "";
    scores.forEach(entry => {
      const li = document.createElement("li");
      li.textContent = `${entry.name}: ${entry.score}`;
      scoresList.appendChild(li);
    });
  });
}

// Controls
document.addEventListener("touchmove", (e) => {
  if (!gameRunning) return;
  const x = e.touches[0].clientX - catcher.offsetWidth / 2;
  catcher.style.left = `${Math.max(0, Math.min(x, game.offsetWidth - catcher.offsetWidth))}px`;
});
document.addEventListener("mousemove", (e) => {
  if (!gameRunning) return;
  const x = e.clientX - catcher.offsetWidth / 2;
  catcher.style.left = `${Math.max(0, Math.min(x, game.offsetWidth - catcher.offsetWidth))}px`;
});
document.addEventListener("keydown", (e) => {
  if (!gameRunning) return;
  let x = catcher.offsetLeft;
  const step = 30;
  if (e.key === "ArrowLeft") x -= step;
  if (e.key === "ArrowRight") x += step;
  catcher.style.left = `${Math.max(0, Math.min(x, game.offsetWidth - catcher.offsetWidth))}px`;
});
