let playButton = document.getElementById("playSlideshow")
let pauseButton = document.getElementById("pauseSlideshow")

const hImage = document.getElementById("heroImage")
const aThumb = document.getElementById("thumbnail-3")
const bThumb = document.getElementById("thumbnail-4")
const cThumb = document.getElementById("thumbnail-5")
const dThumb = document.getElementById("thumbnail-6")

const heroImages = [
  "images/summer25-03-a-dam.jpg",
  "images/summer25-04-a-dam.jpg",
  "images/summer25-05-molly.jpg",
  "images/summer25-06-paris.jpg"
]

let currentIndex = 0

function changeHeroImage(newSrc) {
  hImage.src = newSrc
}

function toggleImage() {
  currentIndex = (currentIndex + 1) % heroImages.length
  changeHeroImage(heroImages[currentIndex])
}

let slideshowInterval = setInterval(toggleImage, 2000)

function pauseSlideshow() {
  clearInterval(slideshowInterval)
}

function playSlideshow() {
  pauseSlideshow()
  slideshowInterval = setInterval(toggleImage, 2000)
}

pauseButton.addEventListener("click", pauseSlideshow)
playButton.addEventListener("click", playSlideshow)

aThumb.addEventListener("click", () => {
  changeHeroImage(heroImages[0])
  currentIndex = 0
  pauseSlideshow()
})
bThumb.addEventListener("click", () => {
  changeHeroImage(heroImages[1])
  currentIndex = 1
  pauseSlideshow()
})
cThumb.addEventListener("click", () => {
  changeHeroImage(heroImages[2])
  currentIndex = 2
  pauseSlideshow()
})
dThumb.addEventListener("click", () => {
  changeHeroImage(heroImages[3])
  currentIndex = 3
  pauseSlideshow()
})