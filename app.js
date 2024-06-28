const video = document.getElementById("scanner");
const resultElement = document.getElementById("result");
const restartButton = document.getElementById("restart-button");
const scannerContainer = document.getElementById("scanner-container");
let scanning = false;
let lastFrameUrl = null;

async function startScanner() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    video.srcObject = stream;
    video.setAttribute("playsinline", true);
    video.style.display = "block";
    if (lastFrameUrl) {
      URL.revokeObjectURL(lastFrameUrl);
      lastFrameUrl = null;
    }
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
    tracks.forEach((track) => track.stop());
  }
  captureLastFrame();
  restartButton.style.display = "block";
}

function captureLastFrame() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    lastFrameUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      video.style.display = "none";
      scannerContainer.appendChild(img);
    };
    img.src = lastFrameUrl;
  }, "image/jpeg");
}

function isValidURL(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function displayResult(text) {
  if (isValidURL(text)) {
    const link = document.createElement("a");
    link.href = text;
    link.textContent = text;
    link.target = "_blank"; // Open link in a new tab
    resultElement.innerHTML = "QR Code detected (click to open): ";
    resultElement.appendChild(link);
  } else {
    resultElement.textContent = `QR Code detected: ${text}`;
  }
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
      displayResult(code.data);
      stopScanner();
    }
  }
  if (scanning) {
    requestAnimationFrame(tick);
  }
}

restartButton.addEventListener("click", () => {
  const lastFrame = scannerContainer.querySelector("img");
  if (lastFrame) {
    scannerContainer.removeChild(lastFrame);
  }
  startScanner();
});

startScanner();
