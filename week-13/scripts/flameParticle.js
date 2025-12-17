// flameParticle.js
// Flame sprite particles (uses flame.png reliably in WEBGL)

class FlameSpriteParticle {
  constructor(x, y, img) {
    this.img = img
    this.pos = createVector(x, y)
    this.vel = createVector(random(-0.6, 0.6), random(-3.6, -2.0))
    this.life = random(28, 60)
    this.maxLife = this.life
    this.size = random(26, 52)

    this.wob = random(1000)
    this.rot = random(-0.25, 0.25)
    this.spin = random(-0.04, 0.04)
  }

  update() {
    this.vel.x += (noise(this.wob + frameCount * 0.1) - 0.5) * 0.28
    this.pos.add(this.vel)
    this.rot += this.spin
    this.life--
  }

  draw() {
    if (!this.img) return

    const t = this.life / this.maxLife
    const a = 255 * t

    push()
    translate(this.pos.x, this.pos.y)
    rotate(this.rot)

    const s = 0.9 + 0.2 * noise(this.wob + frameCount * 0.12)
    const w = this.size * s
    const h = this.size * s

    imageMode(CENTER)
    tint(255, a)
    image(this.img, 0, 0, w, h)
    noTint()

    pop()
  }

  isDead() {
    return this.life <= 0
  }
}
