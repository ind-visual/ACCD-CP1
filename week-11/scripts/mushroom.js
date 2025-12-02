// mushroom.js
// Mushrooms with:
// - fixed stems
// - arc caps that overlap stems
// - organic sideways sway + squash/stretch (no vertical drift)
// - static polka dots scattered within the cap ellipse

class Mushroom {
  constructor(x, size, hue, phase) {
    this.x = x
    this.size = size
    this.hue = hue
    this.phase = phase // per-mushroom offset for motion

    // -------- PRE-GENERATED POLKA DOTS WITHIN CAP ELLIPSE --------
    this.dots = []
    const dotCount = 12 // number of dots per cap

    for (let i = 0; i < dotCount; i++) {
      // random angle across the dome (top half of ellipse)
      let angle = random(PI, TWO_PI)

      // radius with sqrt for more even distribution (less center clustering)
      let r = sqrt(random(0.25, 1.5)) // 0.1 – 0.6

      // normalized ellipse coordinates (ex, ey in [-1,1], ey <= 0)
      let ex = r * cos(angle)
      let ey = r * sin(angle)

      // dot size factor (scaled by mushroom size later)
      let fs = random(0.05, 0.07)

      this.dots.push({ ex, ey, fs })
    }
  }

  // Stem is rooted at the ground
  getStemTopY(groundY) {
    return groundY - 20
  }

  display(t, groundY) {
    const stemTopY = this.getStemTopY(groundY)

    // -------- organic cap motion (horizontal + squash only) --------
    const sway   = map(noise(t * 0.5 + this.phase + 100), 0, 1, -6, 6)
    const squash = map(noise(t * 0.3  + this.phase + 200), 0, 1, 0.9, 1.1)

    const capWidth  = this.size * 1.8
    const capHeight = this.size * 2 * squash // manual value

    // We want the bottom of the cap to be BELOW the stem top by a small amount.
    // bottom = capY + capHeight/2
    // Choose capY so: bottom = stemTopY + overlap
    const overlap = this.size * 0.65 // how far cap dips into stem
    const capY    = stemTopY + overlap - capHeight / 4 // the tuned value
    const capX    = this.x + sway

    // ---------------- STEM ----------------
    fill(40, 10, 90)
    rect(
      this.x - this.size * 0.15,
      stemTopY,
      this.size * 0.3,
      30,
      5
    );

    // ---------------- CAP (semi-circle arc) ----------------
    fill(this.hue, 65, 80)
    arc(
      capX,
      capY,
      capWidth,
      capHeight,
      PI,
      TWO_PI,
      CHORD
    );

    // ---------------- POLKA DOTS INSIDE CAP ELLIPSE ----------------
    fill(0, 0, 100, 90)

    const rx = (capWidth  / 2) * 0.8 // 0.9 keeps dots slightly inset from edge
    const ry = (capHeight / 2) * 0.8

    for (let d of this.dots) {
      // scale normalized ellipse coordinates to actual cap shape
      let dotX = capX + d.ex * rx
      let dotY = capY + d.ey * ry
      let dotSize = this.size * d.fs

      ellipse(dotX, dotY, dotSize, dotSize)
    }
  }

  // Click detection uses same cap position as display()
  isClicked(mx, my, t, groundY) {
    const stemTopY = this.getStemTopY(groundY)

    const sway   = map(noise(t * 0.5 + this.phase + 100), 0, 1, -6, 6)
    const squash = map(noise(t * 0.3  + this.phase + 200), 0, 1, 0.9, 1.1)

    const capWidth  = this.size * 1.8
    const capHeight = this.size * 2 * squash
    const overlap   = this.size * 0.65

    const capY = stemTopY + overlap - capHeight / 4
    const capX = this.x + sway

    const d = dist(mx, my, capX, capY)
    return d < this.size * 0.9
  }
}
