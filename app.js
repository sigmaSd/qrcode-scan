const video = document.getElementById("scanner");
const resultElement = document.getElementById("result");
const restartButton = document.getElementById("restart-button");
const scannerContainer = document.getElementById("scanner-container");
const dropZone = document.getElementById("drop-zone");
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
    dropZone.style.display = "flex";
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
    console.warn("Error accessing camera:", err);
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
    if (!blob) return;

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

function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add("dragover");
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove("dragover");
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove("dragover");

  const file = e.dataTransfer.files[0];
  if (file?.type.startsWith("image/")) {
    stopScanner();
    decodeQRFromImage(file);
  } else {
    alert("Please drop a valid image file.");
  }
}

function decodeQRFromImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      processImage(img);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function processImage(img) {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, img.width, img.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);

  if (code) {
    displayResult(code.data);
  } else {
    resultElement.textContent = "No QR code found in the image.";
  }

  // Display the image
  video.style.display = "none";
  dropZone.style.display = "none";

  // Remove any previous captured frame or dropped image
  const existingImage = scannerContainer.querySelector("img");
  if (existingImage) {
    scannerContainer.removeChild(existingImage);
  }

  // Add the new image
  const newImage = new Image();
  newImage.src = img.src;
  newImage.className = "dropped-image";
  scannerContainer.appendChild(newImage);
}

function handlePaste(e) {
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const blob = items[i].getAsFile();
      stopScanner();
      decodeQRFromImage(blob);
      break;
    }
  }
}

restartButton.addEventListener("click", () => {
  const existingImage = scannerContainer.querySelector("img");
  if (existingImage) {
    scannerContainer.removeChild(existingImage);
  }
  dropZone.style.display = "flex";
  dropZone.textContent = "Drop image here to decode";
  startScanner();
});

scannerContainer.addEventListener("dragover", handleDragOver);
scannerContainer.addEventListener("dragleave", handleDragLeave);
scannerContainer.addEventListener("drop", handleDrop);
document.addEventListener("paste", handlePaste);

startScanner();
