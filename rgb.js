const sleep = ms => new Promise(end => setTimeout(end, ms))
const { Client, utils } = require("openrgb-sdk")
const { exec } = require('child_process');
const path = require('path');

let connecting = true, controllerCount = 0, deviceList = []
const client = new Client("Flux", 6742, "localhost")

// Function to check if the process with the given arguments is running
async function isProcessRunning(processName) {
  const cmd = `tasklist /FI "IMAGENAME eq ${processName}"`;
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error('Error in executing tasklist command:', err);
        reject(err);
        return;
      }

      const isRunning = stdout.includes(processName);
      console.log(`Process "${processName}" is running: ${isRunning}`);
      resolve(isRunning);
    });
  });
}
// Function to start the openrgb.exe --server process
async function startOpenRGBServer() {
  const openRGBPath = path.join(__dirname, 'openrgb server', 'OpenRGB.exe');
  const args = '--server';

  try {
    await exec(`"${openRGBPath}" ${args}`);
    console.log('openrgb.exe --server launched okay');
    await sleep(5000)
  } catch (error) {
    console.error('Error starting openrgb.exe --server:', error.message);
  }
}

// Function to gracefully stop the openrgb.exe --server process
function stopOpenRGBServer() {
  if (openRGBProcess) {
    openRGBProcess.kill(); // Send the SIGINT signal to the process to gracefully stop it
    console.log('openrgb.exe --server stopped.');
  }
}

// Handle the shutdown event (e.g., when the user presses Ctrl+C)
process.on('SIGINT', () => {
  console.log('Received shutdown command. Stopping the server...');
  stopOpenRGBServer();
  process.exit(); // Exit the Node.js process
});

// The main function
async function connectToSDK() {
  console.log(`Connect to SDK started`)
  connecting = true;
  while (true) {
    try {
      // Check if openrgb.exe --server is already running
      const isRunning = await isProcessRunning('OpenRGB.exe', '--server');
      if (!isRunning) {
        // If not running, start the process
        await startOpenRGBServer();
      }

      await client.connect()
      console.log('connected to openrgb sdk server');
      break;
    } catch (error) {
      console.error(error.message);
      await sleep(2500);
    }
  }
  connecting = false;
  controllerCount = await client.getControllerCount()
  console.log(`${controllerCount} controllers found`)
  deviceList = []
  for (let deviceId = 0; deviceId < controllerCount; deviceId++) {
  	deviceList.push(await client.getControllerData(deviceId))		
  }
  console.log(deviceList)
}

connectToSDK()

async function rgblights(color) {
  let red, green, blue;
  if(typeof color === "string") {
    color = color. replace('#', '');
    red = parseInt(color.slice(0, 2), 16);
    green = parseInt(color.slice(2, 4), 16);
    blue = parseInt(color.slice(4, 6), 16);
  } else {
    red = color.red; green = color.green; blue = color.blue;
  }
  if(connecting === true) return
  console.log(`Setting to ${red} ${green} ${blue}`)
  for(const device of deviceList) {
    const colors = Array(device.colors.length).fill(utils.color(red, green, blue))
    try {
      client.updateLeds(0, colors)
    } catch (error) {
      console.error(error.message)
      connectToSDK()
    }
  }
}

module.exports = {rgblights}