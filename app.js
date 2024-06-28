const video = document.getElementById("scanner");
const resultElement = document.getElementById("result");
const restartButton = document.getElementById("restart-button");
let scanning = false;

async function startScanner() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    video.srcObject = stream;
    video.setAttribute("playsinline", true);
    video.play();
    scanning = true;
    restartButton.style.display = "none";
    resultElement.textContent = "Scanning for QR code...";
    requestAnimationFrame(tick);
  } catch (err) {
    console.error("Error accessing camera:", err);
    resultElement.textContent =
      "Error accessing camera. Please make sure you have given permission to use the camera.";
  }
}

function stopScanner() {
  scanning = false;
  if (video.srcObject) {
    const tracks = video.srcObject.getTracks();
    // biome-ignore lint/complexity/noForEach: <explanation>
    tracks.forEach((track) => track.stop());
  }
  restartButton.style.display = "block";
}

function tick() {
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      resultElement.textContent = `QR Code detected: ${code.data}`;
      stopScanner();
    }
  }
  if (scanning) {
    requestAnimationFrame(tick);
  }
}

restartButton.addEventListener("click", startScanner);

startScanner();
