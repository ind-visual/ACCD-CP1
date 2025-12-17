// ===============================
// GLOBALS
// ===============================
let video = null

// ml5
let faceMesh
let handPose
let faces = []
let hands = []
let triangles
let uvCoords

// Type
let baseWord = "SING"

// UV textures
let uvImgNeutral
let uvImgPeak
let neutralAlpha = 0
let peakAlpha = 0

// Flame sprite
let flameImg

// Font
let uiFont

// Expressiveness + calibration
let smoothMouth = 0
let smoothSmile = 0
let neutralMouth = 0
let neutralSmile = 0
let isCalibrated = false
let isCalibrating = false
let calibFramesLeft = 0
let calibMouthSum = 0
let calibSmileSum = 0
let calibCount = 0

// Face indices
const midUpperLip = 13
const midLowerLip = 14
const mouthLeft = 78
const mouthRight = 308
const foreheadIdx = 10

// Skull curve anchors (more reliable across facemesh variants)
const leftTempleIdx = 234
const rightTempleIdx = 454

const FLIP_U_IN_UV = true

// Flames
let flames = []
let lastFlameFrame = 0
let hornsHold = 0

// Capture UI
let videoRunning = false // start paused / no capture
let toggleBtn

// ===============================
// PRELOAD / SETUP
// ===============================
function preload() {
  faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: true })
  handPose = ml5.handPose({ maxHands: 1, flipped: true })

  uvImgNeutral = loadImage("images/face-neutral.png")
  uvImgPeak = loadImage("images/face-peak.png")
  flameImg = loadImage("images/flame.png")

  // Use any font you already have; keep consistent with your project
  uiFont = loadFont("assets/Arial.ttf")
}

function setup() {
  const cnv = createCanvas(800, 600, WEBGL)
  cnv.parent("sketch-holder")

  textureMode(NORMAL)

  // WEBGL text stability: set a font immediately
  textFont(uiFont || "sans-serif")

  triangles = faceMesh.getTriangles()
  uvCoords = faceMesh.getUVCoords()

  // Button (position handled per-frame so it stays aligned)
  toggleBtn = createButton("Capture (c)")
  toggleBtn.parent("sketch-holder")
  toggleBtn.elt.style.position = "absolute"
  toggleBtn.elt.style.right = "20px"
  toggleBtn.elt.style.bottom = "24px"
  toggleBtn.style("padding", "6px 12px")
  toggleBtn.style("font-size", "12px")
  toggleBtn.style("border-radius", "6px")
  toggleBtn.style("cursor", "pointer")
  toggleBtn.mousePressed(() => toggleCamera(null))

  // Apply initial paused styling
  applyToggleStyles()
}

// ===============================
// INPUT
// ===============================
function keyPressed() {
  // Space calibrates
  if (keyCode === 32) {
    startCalibration(30)
    return false
  }

  // Capture / Pause
  if (key === "c" || key === "c") toggleCamera(true)
  if (key === "p" || key === "p") toggleCamera(false)
}

// ===============================
// DRAW LOOP
// ===============================
function draw() {
  background(15)

  // No camera requested yet: show UI only
  if (!video) {
    clearDepth()
    drawTitle()

    clearDepth()
    drawBottomCenterUI(0, true)

    return
  }

  const vidW = video.width * 1.62
  const vidH = video.height * 1.62
  const xPos = width / 2 - vidW / 2
  const yPos = 70

  // Video background
  clearDepth()
  drawVideoRect(xPos, yPos, vidW, vidH)

  clearDepth()
  drawTitle()

  // If model not producing yet, keep UI friendly
  if (faces.length === 0) {
    clearDepth()
    drawBottomCenterUI(0, true)
    return
  }

  const pts = faces[0].keypoints

  // ---------------- EXPRESSIVENESS ----------------
  const mouthOpen = dist(
    pts[midUpperLip].x, pts[midUpperLip].y,
    pts[midLowerLip].x, pts[midLowerLip].y
  )

  const smileWidth = dist(
    pts[mouthLeft].x, pts[mouthLeft].y,
    pts[mouthRight].x, pts[mouthRight].y
  )

  smoothMouth = lerp(smoothMouth, mouthOpen, 0.15)
  smoothSmile = lerp(smoothSmile, smileWidth, 0.15)

  if (!isCalibrated && !isCalibrating) startCalibration(30)

  if (isCalibrating) {
    calibMouthSum += smoothMouth
    calibSmileSum += smoothSmile
    calibCount++
    calibFramesLeft--
    if (calibFramesLeft <= 0) {
      neutralMouth = calibMouthSum / max(1, calibCount)
      neutralSmile = calibSmileSum / max(1, calibCount)
      isCalibrated = true
      isCalibrating = false
    }
  }

  let expressiveness = 0
  if (isCalibrated && !isCalibrating) {
    const mouthNorm = constrain(abs(smoothMouth - neutralMouth) / 15, 0, 1)
    const smileNorm = constrain(abs(smoothSmile - neutralSmile) / 30, 0, 1)
    expressiveness = constrain(mouthNorm * 0.65 + smileNorm * 0.35, 0, 1)
    expressiveness = constrain(expressiveness * 1.4, 0, 1)
    expressiveness = pow(expressiveness, 0.9)
  }

  // ---------------- UV FACE (fix clipping: depth clears are critical) ----------------
  clearDepth()
  drawUVFace(pts, xPos, yPos, vidW, vidH, expressiveness)

  // ---------------- GESTURES DISABLED WHILE PAUSED ----------------
  if (!videoRunning) {
    hornsHold = 0
  } else {
    const headY = yPos + (pts[foreheadIdx].y / video.height) * vidH

    let hornsNow = false
    if (hands.length > 0) {
      hornsNow = isHornsGesture(hands[0], headY, xPos, yPos, vidW, vidH)
    }

    hornsHold = hornsNow ? min(hornsHold + 1, 12) : max(hornsHold - 1, 0)

    if (hornsHold > 6 && frameCount - lastFlameFrame > 6) {
      spawnFlamesCrownSkull(pts, xPos, yPos, vidW, vidH, expressiveness)
      lastFlameFrame = frameCount
    }
  }

  // ---------------- FLAMES ----------------
  clearDepth()
  drawFlames()

  // ---------------- TYPE + BASELINE ----------------
  clearDepth()
  drawType(baseWord, expressiveness, xPos, yPos, vidW, vidH)

  // ---------------- UI ----------------
  clearDepth()
  drawBottomCenterUI(expressiveness, false)

}

// ===============================
// CAMERA CONTROL
// ===============================
function startCaptureIfNeeded() {
  if (video) return

  video = createCapture(VIDEO, { flipped: true })
  video.size(320, 240)
  video.hide()

  faceMesh.detectStart(video, r => (faces = r))
  handPose.detectStart(video, r => (hands = r))
}

function toggleCamera(forceState = null) {
  const next = forceState === null ? !videoRunning : forceState

  if (next) {
    startCaptureIfNeeded()
    video?.elt?.srcObject?.getTracks().forEach(t => (t.enabled = true))
    videoRunning = true
  } else {
    video?.elt?.srcObject?.getTracks().forEach(t => (t.enabled = false))
    videoRunning = false
    hornsHold = 0
  }

  toggleBtn.html(videoRunning ? "Pause (p)" : "Capture (c)")
  applyToggleStyles()
}

function applyToggleStyles() {
  // Filled white when capturing (as requested)
  if (videoRunning) {
    toggleBtn.style("background", "#fff")
    toggleBtn.style("color", "#000")
    toggleBtn.style("border", "1px solid #fff")
  } else {
    toggleBtn.style("background", "#111")
    toggleBtn.style("color", "#ccc")
    toggleBtn.style("border", "1px solid #666")
  }
}

// ===============================
// DRAW HELPERS
// ===============================
function drawVideoRect(xPos, yPos, vidW, vidH) {
  push()
  translate(-width / 2, -height / 2)
  translate(xPos + vidW, yPos)
  scale(-1, 1)
  image(video, 0, 0, vidW, vidH)
  pop()
}

function drawTitle() {
  push()
  translate(-width / 2, -height / 2)
  fill(150)
  noStroke()
  textSize(24)
  textAlign(LEFT, TOP)
  text("Typographic Karaoke", 20, 20)
  pop()
}

function drawBottomCenterUI(expressiveness, loading) {
  push()
  translate(-width / 2, -height / 2)

  fill(160)
  noStroke()
  textAlign(CENTER, TOP)
  textSize(14)

  const label = loading
    ? "Click Capture or press (c)"
    : "expressiveness " + nf(expressiveness, 1, 2)

  text(label, width / 2, height - 62)

  // Key pills line
  const y = height - 28
  let x = width / 2 - 110

  x += drawKeyPill("space", x, y) + 6
  fill(110)
  textAlign(LEFT, CENTER)
  text("calibrates", x, y)

  x += 78
  x += drawKeyPill("c", x, y) + 6
  fill(110)
  text("capture", x, y)

  x += 70
  x += drawKeyPill("p", x, y) + 6
  fill(110)
  text("pause", x, y)

  pop()
}

function drawKeyPill(label, x, y) {
  // Reliable WEBGL text: use uiFont (already set) and style like code
  push()
  textAlign(LEFT, CENTER)
  textSize(11)

  const padX = 7
  const w = textWidth(label) + padX * 2
  const h = 18

  noStroke()
  fill(235)
  rect(x, y - h * 0.5, w, h, 5)

  fill(20)
  text(label, x + padX, y) // tiny baseline nudge for crispness
  pop()

  return w
}

// ===============================
// UV FACE
// ===============================
function drawUVFace(pts, xPos, yPos, vidW, vidH, expressiveness) {
  // Crossfade like your original behavior
  const neutralT = constrain(map(expressiveness, 0.0, 1.1, 1, 0), 0, 1)
  const peakT = constrain(map(expressiveness, 0.75, 1.0, 0, 1), 0, 1)

  neutralAlpha = lerp(neutralAlpha, 255 * neutralT, 0.95)
  peakAlpha = lerp(peakAlpha, 255 * peakT, 0.95)

  function mapPt(p) {
    return {
      x: xPos + (p.x / video.width) * vidW,
      y: yPos + (p.y / video.height) * vidH,
      z: p.z || 0
    }
  }

  push()
  translate(-width / 2, -height / 2)
  noStroke()

  for (let pass = 0; pass < 2; pass++) {
    const img = pass === 0 ? uvImgNeutral : uvImgPeak
    const alpha = pass === 0 ? neutralAlpha : peakAlpha
    if (!img || alpha <= 1) continue

    tint(255, alpha)
    texture(img)
    beginShape(TRIANGLES)
    for (let tri of triangles) {
      for (let i of tri) {
        const p = mapPt(pts[i])
        const uv = uvCoords[i]
        const u = FLIP_U_IN_UV ? 1 - uv[0] : uv[0]
        vertex(p.x, p.y, -p.z, u, uv[1])
      }
    }
    endShape()
  }

  noTint()
  pop()
}

// ===============================
// TYPE + BASELINE (restores your sine line feel)
// ===============================
function drawType(word, e, xPos, yPos, vidW, vidH) {
  push()
  translate(-width / 2, -height / 2)

  const baseFontSize = 80
  const fontSize = baseFontSize * (1 + e * 1.5)
  const typeMidY = -fontSize * 0.15

  const spacingFactor = lerp(0.9, 1.6, e)
  const step = baseFontSize * spacingFactor
  const totalWidth = step * word.length
  const startX = xPos + vidW / 2 - totalWidth / 2 + step / 2

  const desiredY = yPos + vidH * 1.0

  push()
  textSize(fontSize)
  const a = textAscent()
  const d = textDescent()
  pop()

  const pad = 12
  const tremorT = constrain(map(e, 0.9, 1.0, 0, 1), 0, 1)

  const wiggleBase = e * 10
  const wigglePeak = 16 * tremorT
  const wiggleMax = wiggleBase + wigglePeak

  const minCenterY = pad - typeMidY + a + wiggleMax
  const maxCenterY = (height - pad) - typeMidY - d - wiggleMax
  const typeCenterY = constrain(desiredY, minCenterY, maxCenterY)

  // Baseline
  stroke(120, 180)
  strokeWeight(1.6)
  noFill()

  const amp = 4 + 18 * e
  const freq = 0.01 + 0.03 * e
  const noiseLevel = tremorT
  const noiseScale = 0.004 + 0.02 * noiseLevel
  const noiseAmp = amp * 2.2 * noiseLevel

  beginShape()
  for (let x = 0; x <= width; x += 6) {
    const t = x * freq + frameCount * 0.03
    const sineOffset = sin(t) * amp

    let noiseOffset = 0
    if (noiseLevel > 0) {
      const n = noise((x + frameCount * 2) * noiseScale)
      noiseOffset = (n - 0.5) * noiseAmp
    }

    const y = typeCenterY + typeMidY + sineOffset + noiseOffset
    vertex(x, y)
  }
  endShape()

  // Letters
  noStroke()
  fill(240)
  textAlign(CENTER, CENTER)

  for (let i = 0; i < word.length; i++) {
    const ch = word[i]
    let x = startX + i * step
    let y = typeCenterY + typeMidY + sin(frameCount * 0.05 + i) * wiggleBase

    if (tremorT > 0) {
      const jx = (noise((frameCount + i * 50) * 0.25) - 0.5) * 10 * tremorT
      const jy = (noise((frameCount + i * 70) * 0.25 + 999) - 0.5) * 10 * tremorT
      x += jx
      y += jy
    }

    textSize(fontSize)
    text(ch, x, y)
  }

  pop()
}

// ===============================
// HORNS GESTURE (robust, orientation-safe)
// ===============================
function isHornsGesture(hand, headY, xPos, yPos, vidW, vidH) {
  const pts = hand?.keypoints || null
  if (!pts || pts.length < 21) return false

  // Map hand point into drawn video-rect space
  function hp(p) {
    // normalized
    if (p.x >= 0 && p.x <= 1.5 && p.y >= 0 && p.y <= 1.5) {
      return { x: xPos + p.x * vidW, y: yPos + p.y * vidH }
    }
    // pixel coords
    return {
      x: xPos + (p.x / video.width) * vidW,
      y: yPos + (p.y / video.height) * vidH
    }
  }

  const wrist = hp(pts[0])

  const idxPIP = hp(pts[6]), idxTip = hp(pts[8])
  const midPIP = hp(pts[10]), midTip = hp(pts[12])
  const rngPIP = hp(pts[14]), rngTip = hp(pts[16])
  const pkyPIP = hp(pts[18]), pkyTip = hp(pts[20])

  const scale = dist(wrist.x, wrist.y, idxPIP.x, idxPIP.y)
  const thresh = max(8, scale * 0.22)

  function extended(tip, pip) {
    return dist(tip.x, tip.y, wrist.x, wrist.y) >
           dist(pip.x, pip.y, wrist.x, wrist.y) + thresh
  }

  const indexExt = extended(idxTip, idxPIP)
  const pinkyExt = extended(pkyTip, pkyPIP)
  const middleExt = extended(midTip, midPIP)
  const ringExt = extended(rngTip, rngPIP)

  const handUp = wrist.y < headY + 80

  return handUp && indexExt && pinkyExt && !middleExt && !ringExt
}

// ===============================
// FLAMES: skull curve spawner (the one that was working)
// ===============================
function spawnFlamesCrownSkull(pts, xPos, yPos, vidW, vidH, expressiveness) {
  function fp(p) {
    return {
      x: xPos + (p.x / video.width) * vidW,
      y: yPos + (p.y / video.height) * vidH
    }
  }

  const F = fp(pts[foreheadIdx])
  const L = fp(pts[leftTempleIdx])
  const R = fp(pts[rightTempleIdx])

  // Tangent across head
  const tx = R.x - L.x
  const ty = R.y - L.y
  const tLen = Math.hypot(tx, ty) || 1
  const ux = tx / tLen
  const uy = ty / tLen

  // Normal candidates
  let nx = -uy
  let ny = ux

  // Force normal to point toward forehead
  const cx = (L.x + R.x) * 0.5
  const cy = (L.y + R.y) * 0.5
  const toForeX = F.x - cx
  const toForeY = F.y - cy
  const dot = nx * toForeX + ny * toForeY
  if (dot < 0) {
    nx *= -1
    ny *= -1
  }

  const headW = tLen
  const crownWidth = headW * 0.78
  const crownLift = headW * 0.30
  const arcDepth = headW * 0.12

  const count = floor(8 + 18 * expressiveness)

  const baseX = F.x + nx * crownLift
  const baseY = F.y + ny * crownLift

  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1)
    const along = lerp(-crownWidth / 2, crownWidth / 2, t)

    const px = baseX + ux * along
    const py = baseY + uy * along

    const bulge = sin(t * PI) * arcDepth

    const fx = px + nx * bulge + random(-2, 2)
    const fy = py + ny * bulge + random(-2, 2)

    flames.push(new FlameSpriteParticle(fx, fy, flameImg))
  }
}

function drawFlames() {
  push()
  translate(-width / 2, -height / 2)
  blendMode(BLEND)

  for (let i = flames.length - 1; i >= 0; i--) {
    flames[i].update()
    flames[i].draw()
    if (flames[i].isDead()) flames.splice(i, 1)
  }

  pop()
}

// ===============================
// CALIBRATION
// ===============================
function startCalibration(frames) {
  isCalibrating = true
  isCalibrated = false
  calibFramesLeft = frames
  calibMouthSum = 0
  calibSmileSum = 0
  calibCount = 0
}
