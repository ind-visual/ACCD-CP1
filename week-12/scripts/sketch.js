let video;
let facemesh;
let predictions = [];

let baseWord = "SING";

// Smoothed values for jitter reduction
let smoothMouth = 0;
let smoothSmile = 0;

function setup() {
  const canvas = createCanvas(800, 600);

  canvas.parent('sketch-holder');

  // Webcam
  video = createCapture(VIDEO);
  video.size(320, 240);
  video.hide();

  // FaceMesh (ml5 v0.12.2)
  facemesh = ml5.facemesh(video, modelReady);
  facemesh.on("predict", gotResults);
}

function modelReady() {
  console.log("FaceMesh model loaded");
}

function gotResults(results) {
  predictions = results;
}

function draw() {
  background(15);

  // ------------------------------------------------------------
  // TITLE — TOP LEFT
  // ------------------------------------------------------------
  fill(220);
  noStroke();
  textSize(32);
  textAlign(LEFT, TOP);
  text("Typographic Karaoke", 20, 20);

  let hasFace = predictions.length > 0;
  let mouthOpen = 0;
  let smileWidth = 0;

  // ------------------------------------------------------------
  // FACEMESH MEASUREMENTS
  // ------------------------------------------------------------
  if (hasFace) {
    const keypoints = predictions[0].scaledMesh;

    const upperLip = keypoints[13];
    const lowerLip = keypoints[14];
    const leftMouth = keypoints[61];
    const rightMouth = keypoints[291];

    mouthOpen = dist(upperLip[0], upperLip[1], lowerLip[0], lowerLip[1]);
    smileWidth = dist(leftMouth[0], leftMouth[1], rightMouth[0], rightMouth[1]);
  }

  // ------------------------------------------------------------
  // SMOOTHING
  // ------------------------------------------------------------
  let smoothing = 0.15;
  smoothMouth = lerp(smoothMouth, mouthOpen, smoothing);
  smoothSmile = lerp(smoothSmile, smileWidth, smoothing);

  // Normalize
  let openNorm = constrain(map(smoothMouth, 5, 30, 0, 1), 0, 1);
  let smileNorm = constrain(map(smoothSmile, 30, 80, 0, 1), 0, 1);

  // ------------------------------------------------------------
  // EXPRESSIVENESS
  // ------------------------------------------------------------
  let expressiveness = 0;

  if (hasFace) {
    let mouthExtreme = abs(openNorm - 0.5) * 2.0;
    let smileExtreme = abs(smileNorm - 0.5) * 2.0;
    expressiveness = constrain((mouthExtreme + smileExtreme) * 0.5, 0, 1);
  }

  // ------------------------------------------------------------
  // TYPOGRAPHIC DISTORTION VALUES
  // ------------------------------------------------------------
  let baseFontSize = 80;
  let stretchFactor = 1 + openNorm * 1.5;
  let fontSize = baseFontSize * stretchFactor;

  let typeMidY = -fontSize * 0.15; // vertical center of glyphs

  let spacingFactor = lerp(0.9, 1.6, smileNorm);
  let step = baseFontSize * spacingFactor;
  let totalWidth = step * baseWord.length;
  let startX = -totalWidth / 2 + step / 2;

  // ------------------------------------------------------------
  // DRAW TYPOGRAPHIC WORD + WAVY LINE
  // ------------------------------------------------------------
  push();
  translate(width / 2, height / 2);
  textAlign(CENTER, CENTER);

  // Lush baseline across full canvas
  stroke(120, 180);
  strokeWeight(1.6);
  drawWavyBaseline(
    -width / 2 - 100,
    width / 2 + 100,
    typeMidY,
    expressiveness
  );

  noStroke();
  fill(240);

  let currentX = startX;
  for (let i = 0; i < baseWord.length; i++) {
    let ch = baseWord[i];

    push();
    textSize(fontSize);

    translate(currentX, typeMidY);

    let wiggle = openNorm * 10;
    translate(0, sin(frameCount * 0.05 + i) * wiggle);

    text(ch, 0, 0);
    pop();

    currentX += step;
  }

  pop();

  // ------------------------------------------------------------
  // VIDEO PREVIEW — BOTTOM CENTER
  // ------------------------------------------------------------
  if (video) {
    push();
    let vidW = video.width * 0.6;
    let vidH = video.height * 0.6;
    let xPos = width / 2 - vidW / 2;
    let yPos = height - vidH - 20;

    translate(xPos + vidW, yPos);
    scale(-1, 1);
    image(video, 0, 0, vidW, vidH);
    pop();
  }

  // ------------------------------------------------------------
  // DEBUG PANEL — EXPRESSIVENESS + MOUTH + SMILE
  // ------------------------------------------------------------
  fill(200);
  noStroke();
  textSize(14);
  textAlign(LEFT, TOP);

  let debugX = 20;
  let debugY = height - 80;

  text("expressiveness: " + nf(expressiveness, 1, 2), debugX, debugY);

  // nested / indented values
  text("   mouthOpen:   " + nf(mouthOpen, 1, 2), debugX, debugY + 18);
  text("   smileWidth:  " + nf(smileWidth, 1, 2), debugX, debugY + 36);
}


// ------------------------------------------------------------
// WAVY BASELINE — noise only after expressiveness >= 0.5
// ------------------------------------------------------------
function drawWavyBaseline(x1, x2, yBase, expressiveness) {
  noFill();
  beginShape();

  // sine amplitude
  let amp = 4 + 18 * expressiveness;
  let freq = 0.01 + 0.03 * expressiveness;

  // noise thresholding
  let noiseStart = 0.5;
  let noiseLevel = 0;

  if (expressiveness > noiseStart) {
    noiseLevel = map(expressiveness, noiseStart, 1, 0, 1);
  }

  let noiseScale = 0.004 + 0.02 * noiseLevel;

  for (let x = x1; x <= x2; x += 4) {
    let t = x * freq + frameCount * 0.03;

    let sineOffset = sin(t) * amp;

    let noiseOffset = 0;
    if (noiseLevel > 0) {
      let n = noise((x + frameCount * 2) * noiseScale);
      noiseOffset = (n - 0.5) * amp * 2.2 * noiseLevel;
    }

    let y = yBase + sineOffset + noiseOffset;
    vertex(x, y);
  }

  endShape();
}
