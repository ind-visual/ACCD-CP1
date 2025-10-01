let cStage = document.getElementById("colorStage")
let cButton = document.getElementById("colorButton")


const qImage = document.getElementById("quokkaImage")
const qButton = document.getElementById("imageToggle")
const tButton = document.getElementById("triggerImage")

let changeColor = function() 
{
    let rComp = Math.random() * 255
    let gComp = Math.random() * 255
    let bComp = Math.random() * 255

    cStage.style.background = "rgb(" + rComp + ", " + gComp + ", " + bComp + ")"
}

let toggleImage = () =>
{
    console.log(qImage.src)
    if(qImage.src.includes("quokka-01")) {
        qImage.src = "images/quokka-02.jpeg"
    }
    else {
        qImage.src = "images/quokka-01.jpeg"
    }
}

setInterval(toggleImage, 1000)

qButton.addEventListener("click", toggleImage)
tButton.addEventListener("click", toggleImage)
cButton.addEventListener("click", changeColor)
window.addEventListener("load", changeColor)