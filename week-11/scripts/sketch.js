// sketch.js
// RAIN & MUSHROOM FIELD GAME

// TIME / MOTION
let t = 0                 // general time counter for smooth motion

// RAIN STATE
let lastRain = 0
let rainInterval = 1200   // how often storms can happen (ms)
let rainDuration = 500   // how long each storm lasts (ms)
let raining = false
let rainStart = 0

// MUSHROOMS
let mushrooms = []
let groundY
let maxMushrooms = 20     // takeover limit

// GAME OVER / RESET
let gameOver = false
let gameOverTime = 0

// COLLECTED MUSHROOM + GAME REWARD
let collectedThisRound = 0;  // how many mushrooms player has clicked this round
let rewardShown = false;     // are we currently showing a reward message?
let rewardTime = 0;          // when did we start showing it?
let rewardThreshold = 20;    // change this to whatever number you want


function setup() {
  const cnv = createCanvas(900, 500)
  cnv.parent("sketch-holder")
  colorMode(HSB, 360, 100, 100, 100)
  groundY = height - 60
}

function draw() {
  background(210, 20, 10);   // darkish sky
  t += 0.02

  drawGround();

  // 1. CLOUD: repeated oscillation using sin()
  let cloudX = width / 2 + sin(t) * 120
  let cloudY = 120
  drawCloud(cloudX, cloudY)

  if (!gameOver) {
    // 2. Time interval system controlling storms
    handleRainTiming()

    // 3. Spawn mushrooms during rain
    if (raining) {
      drawRain(cloudX, cloudY)
      maybeSpawnMushroom()
    }

    // 4. Draw & animate mushrooms
    drawMushrooms()

    // 5. Check takeover condition
    if (mushrooms.length > maxMushrooms) {
      resetGame()
    }
  } else {
    drawMushrooms()
  }

  // UI text
  fill(0, 0, 100)
  textAlign(CENTER)
  textSize(16)
  text("Collect 20 mushrooms before they take over the field", width / 2, 30)
  textSize(12)
  // text("The storms are scattered & random.", width / 2, 50)
  
  // 👉 mushroom counter (top-right)
  textAlign(RIGHT)
  textSize(14)
  text("Collected: " + collectedThisRound, width - 20, 30)

  if (gameOver) {
  fill(0, 0, 100)
  textSize(26)

  if (rewardShown) {
    textAlign(CENTER)
    // ✅ WIN STATE: show win message, no auto-reset
    text("✨🍄 Nice work! You collected " + collectedThisRound + " mushrooms! 🍄✨", width / 2, height / 2) 
  } else {
    // ❌ LOSE STATE: mushrooms took over
    textAlign(CENTER)
    text("The mushrooms took over! Resetting the field", width / 2, height / 2)

    if (millis() - gameOverTime > 1500) {
      gameOver = false
    }
  }
}

}

// =============================
// DRAWING HELPERS
// =============================

function drawGround() {
  noStroke()
  fill(140, 40, 30)
  rect(0, groundY, width, height - groundY)
}

function drawCloud(x, y) {
  noStroke()
  fill(210, 10, 95)
  ellipse(x, y, 140, 70)
  ellipse(x - 50, y + 10, 90, 50)
  ellipse(x + 50, y + 10, 90, 50)
}

// =============================
// RAIN LOGIC
// =============================

function handleRainTiming() {
  let now = millis()

  if (!raining && now - lastRain > rainInterval) {
    raining = true
    rainStart = now
  }

  if (raining && now - rainStart > rainDuration) {
    raining = false
    lastRain = now
    rainInterval = random(500, 1500)
  }
}

function drawRain(cloudX, cloudY) {
  stroke(200, 30, 100, 80)
  strokeWeight(3)
  noFill()

  for (let i = -3; i <= 3; i++) {
    let baseX = cloudX + i * 15
    let startY = cloudY + 35
    let len = 80             // how long the drop is
    let phase = i            // different wave offset per drop

    drawWavyDrop(baseX, startY, len, phase)
  }
  noStroke()
}

function drawWavyDrop(baseX, startY, len, phase) {
  beginShape()
  for (let dy = 0; dy <= len; dy += 5) {
    // 1) dy goes down the drop
    // 2) sin(...) wiggles left/right
    let wiggle = sin(t * 4 + phase + dy * 0.1) * 6;

    let x = baseX + wiggle
    let y = startY + dy

    vertex(x, y)
  }
  endShape()
}


// =============================
// MUSHROOM LOGIC (using Mushroom class)
// =============================

function maybeSpawnMushroom() {
  if (random() < 0.15) {
    let x = random(40, width - 40)

    // Style / variation lives here:
    // tweak these numbers to change look & feel without touching mushroom.js
    let size = random(45, 90)       // big + varied
    let hue = random(1, 55)       // colorful caps
    let phase = random(TWO_PI)      // different bobbing offsets

    // Create a new Mushroom instance from our blueprint
    mushrooms.push(new Mushroom(x, size, hue, phase))
  }
}

function drawMushrooms() {
  for (let m of mushrooms) {
    m.display(t, groundY)
  }
}

// =============================
// INTERACTION & RESET
// =============================

function mousePressed() {
  if (gameOver) return;  // optional: ignore clicks when game is over

  // Loop backwards so we can safely remove while iterating
  for (let i = mushrooms.length - 1; i >= 0; i--) {
    let m = mushrooms[i]
    if (m.isClicked(mouseX, mouseY, t, groundY)) {
      mushrooms.splice(i, 1)
      collectedThisRound++    // ✅ count this collected mushroom
    }
  }

  // ✅ WIN CONDITION: collected enough mushrooms
  if (!gameOver && collectedThisRound >= rewardThreshold) {
    rewardShown = true
    rewardTime = millis()
    gameOver = true          // ✅ pause the field
    gameOverTime = millis()
  }
}

function resetGame() {
  mushrooms = []
  raining = false
  lastRain = millis()
  rainInterval = random(500, 1500)

  gameOver = true
  gameOverTime = millis()
  
  // 👇 reset for next round
  collectedThisRound = 0
  rewardShown = false
}
