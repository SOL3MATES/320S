// CodePen requires a different approach for Firebase
// First, we check if the required Firebase modules are available
let app, db;
const firebaseConfig = {
  apiKey: "AIzaSyD1my79wPEDlsfsgg2oW6lCv-PI1_XqLZs",
  authDomain: "sol3mates.firebaseapp.com",
  databaseURL: "https://sol3mates-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sol3mates",
  storageBucket: "sol3mates.firebasestorage.app",
  messagingSenderId: "412759700453",
  appId: "1:412759700453:web:fc9269184892d60176350c"
};

// We'll initialize Firebase after the page loads
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Check if Firebase modules were loaded as external scripts
    if (typeof firebase !== 'undefined') {
      app = firebase.initializeApp(firebaseConfig);
      db = firebase.database();
      console.log("Firebase initialized successfully");
      
      // Initialize leaderboard once Firebase is ready
      updateLeaderboard();
    } else {
      console.error("Firebase is not loaded");
    }
  } catch (error) {
    console.error("Firebase init error:", error);
  }
  
  // Initialize the game whether Firebase worked or not
  setupGame();
});

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

function setupGame() {
  // Form submission
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    playerName = document.getElementById("formName").value.trim();
    playerEmail = document.getElementById("formEmail").value.trim();
    playerShoeSize = document.getElementById("formShoe").value.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // More permissive regex that accepts common shoe size formats
    const shoeRegex = /^(EU|UK|US)?\s?([1-9]|[1-4][0-9])(\.5)?$/i;

    if (!playerName || playerName.length < 2) return alert("Invalid name. Please enter at least 2 characters.");
    if (!emailRegex.test(playerEmail)) return alert("Invalid email address. Please check your entry.");
    if (!shoeRegex.test(playerShoeSize)) return alert("Invalid shoe size. Format examples: EU 42, UK 9.5, US 10");

    formContainer.style.display = "none";
    game.style.display = "block";
    startGame();
  });

  // Submit score to Firebase
  submitBtn.onclick = function () {
    if (!playerName) return;
    
    try {
      if (db) {
        db.ref("scores").push({
          name: playerName,
          score: score,
          email: playerEmail,
          shoeSize: playerShoeSize,
          timestamp: Date.now()
        });
        console.log("Score submitted to Firebase");
      } else {
        console.log("Score would be submitted: ", {
          name: playerName,
          score: score,
          email: playerEmail,
          shoeSize: playerShoeSize
        });
      }
      submitBtn.textContent = "Score Submitted!";
      submitBtn.disabled = true;
    } catch (error) {
      console.error("Error submitting score:", error);
      alert("Error submitting score. Please try again.");
    }
  };

  // Retry game without form
  retryBtn.onclick = function () {
    popup.style.display = "none";
    clearGame();
    startGame();
  };

  // Fix game display
  fixGameDisplay();
}

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
  
  // Progressive difficulty: more hazards as game progresses
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
      // Add visual feedback for catching
      const feedback = document.createElement("div");
      feedback.className = "catch-feedback";
      feedback.style.left = `${itemRect.left}px`;
      feedback.style.top = `${itemRect.top}px`;
      feedback.textContent = type === "good" ? "+1" : type === "bad" ? "-1" : "X";
      feedback.style.color = type === "good" ? "#4caf50" : type === "bad" ? "#ff5722" : "#f44336";
      game.appendChild(feedback);
      
      // Remove feedback after animation
      setTimeout(() => feedback.remove(), 500);
      
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
    // Cap the difficulty increase to prevent game becoming impossible
    itemFallSpeed = Math.min(15, itemFallSpeed + 0.5);
    spawnRate = Math.max(300, spawnRate - 30);
  } else if (type === "bad") {
    score--;
    // Don't allow negative scores
    if (score < 0) score = 0;
    itemFallSpeed = Math.min(15, itemFallSpeed + 0.3);
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
  submitBtn.disabled = false;
  submitBtn.textContent = "Submit your score";
}

// Remove items
function clearGame() {
  document.querySelectorAll(".item").forEach(i => i.remove());
  document.querySelectorAll(".catch-feedback").forEach(f => f.remove());
}

// Leaderboard
function updateLeaderboard() {
  if (!db) {
    scoresList.innerHTML = "<li>Harshinee Lulla: 40</li><li>Aradhana: 36</li><li>geroge: 32</li>";
    return;
  }
  
  try {
    db.ref("scores").orderByChild("score").limitToLast(3).on("value", (snapshot) => {
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
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    scoresList.innerHTML = "<li>Harshinee Lulla: 40</li><li>Aradhana: 36</li><li>geroge: 32</li>";
  }
}

// Controls
document.addEventListener("touchmove", (e) => {
  if (!gameRunning) return;
  e.preventDefault(); // Prevent scrolling
  const x = e.touches[0].clientX - catcher.offsetWidth / 2;
  catcher.style.left = `${Math.max(0, Math.min(x, game.offsetWidth - catcher.offsetWidth))}px`;
}, { passive: false });

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

// Fix for the half-gray screen issue
function fixGameDisplay() {
  // Make sure game takes up full screen
  game.style.width = "100%";
  game.style.height = "100%";
  
  // Adjust catcher position for different screen sizes
  const bottomOffset = window.innerHeight < 600 ? 80 : 100;
  catcher.style.bottom = `${bottomOffset}px`;
  
  // Add some debugging to check dimensions
  console.log("Game dimensions:", game.offsetWidth, game.offsetHeight);
  console.log("Window dimensions:", window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', fixGameDisplay);

// Make sure we're loaded properly
window.addEventListener('load', function() {
  fixGameDisplay();
  
  // Force a redraw after a slight delay to fix rendering issues
  setTimeout(fixGameDisplay, 100);
});