// let gT1 = document.getElementById("galleryThumb1")
// let gT2 = document.getElementById("galleryThumb2")
// let gT3 = document.getElementById("galleryThumb3")
// let gT4 = document.getElementById("galleryThumb4")
let thumbImages = document.querySelectorAll(".gallery-thumb > img")
console.log(thumbImages)
let scImage = document.getElementById("showcaseImage")

function changeImage(event) 
{
  let thumbSrc = event.target.src
  scImage.src = thumbSrc

  // something.parentElement.classList.remove("current-thumb")

  thumbImages.forEach(function(elem) {
    elem.parentElement.classList.remove("current-thumb")
  })

  event.target.parentElement.classList.add("current-thumb")
}

for(let i = 0; i < thumbImages.length; i++) {
  thumbImages[i].addEventListener("click", changeImage)
}

// gT1.addEventListener("click", changeImage)
// gT2.addEventListener("click", changeImage)
// gT3.addEventListener("click", changeImage)
// gT4.addEventListener("click", changeImage)