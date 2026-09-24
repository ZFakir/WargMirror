// client/scripts/sensors.js
// Handles client-side anti-spoofing data collection

let coordinateBuffer = [];
let stepCount = 0;
let lastAccel = 0;
const STEP_THRESHOLD = 1.2; // Adjust based on testing for typical walking bounce

export function initSensors() {
    // 1. Pedometer (Accelerometer)
    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', (event) => {
            if (!event.acceleration) return;
            
            const { x, y, z } = event.acceleration;
            // Ignore null values
            if (x === null || y === null || z === null) return;

            const accel = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
            
            // Basic peak detection
            if (accel > STEP_THRESHOLD && lastAccel <= STEP_THRESHOLD) {
                stepCount++;
            }
            lastAccel = accel;
        });
    } else {
        console.warn("DeviceMotionEvent not supported on this device.");
    }
}

export function logPosition(lat, lng) {
    coordinateBuffer.push({ lat, lng, timestamp: Date.now() });
    // Keep only the last 10 seconds of data (assuming watchPosition fires ~1/sec)
    if (coordinateBuffer.length > 10) {
        coordinateBuffer.shift();
    }
}

export function getSensorDataAndReset() {
    const data = {
        buffer: [...coordinateBuffer],
        steps: stepCount
    };
    
    // Reset steps after an interaction
    stepCount = 0;
    
    return data;
}
