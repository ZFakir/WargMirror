const { test, expect } = require('@playwright/test');

test.describe('Client-Side Anti-Spoofing Sensors', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock the geolocation API to simulate movement
    await page.addInitScript(() => {
      let geoCount = 0;
      const coords = [
        { latitude: -26.192000, longitude: 28.030000, accuracy: 10 },
        { latitude: -26.192001, longitude: 28.030001, accuracy: 10 },
        { latitude: -26.192002, longitude: 28.030002, accuracy: 10 },
        { latitude: -26.192003, longitude: 28.030003, accuracy: 10 },
        { latitude: -26.192004, longitude: 28.030004, accuracy: 10 },
        { latitude: -26.192005, longitude: 28.030005, accuracy: 10 }
      ];
      
      navigator.geolocation = {
        watchPosition: (success) => {
          // Fire multiple coordinates to fill the buffer
          coords.forEach(coord => {
            setTimeout(() => success({ coords: coord }), geoCount++ * 100);
          });
          return 1; // watch ID
        },
        getCurrentPosition: (success) => {
          success({ coords: coords[0] });
        }
      };
      
      // Mock DeviceMotionEvent for pedometer
      window.DeviceMotionEvent = class DeviceMotionEvent extends Event {
        constructor(type, eventInitDict) {
          super(type, eventInitDict);
          this.acceleration = eventInitDict.acceleration;
        }
      };
    });
  });

  test('should include buffer and steps in waypoint interaction payload', async ({ page }) => {
    // Go to a game page (assuming ARG ID 1)
    await page.goto('/game.html?id=1');
    
    // Simulate some walking (peaks > 1.2 m/s^2)
    await page.evaluate(() => {
      // Simulate 3 distinct steps
      for(let i=0; i<3; i++) {
        window.dispatchEvent(new DeviceMotionEvent('devicemotion', {
          acceleration: { x: 0, y: 2.0, z: 0 }
        }));
        window.dispatchEvent(new DeviceMotionEvent('devicemotion', {
          acceleration: { x: 0, y: 0.5, z: 0 } // drop below threshold
        }));
      }
    });

    // Wait a moment for the geolocation watchPosition to populate the buffer
    await page.waitForTimeout(1000);

    // Intercept the API call to /waypoint/:id/arrive
    const requestPromise = page.waitForRequest(request => 
      request.url().includes('/waypoint/') && 
      request.url().includes('/arrive') && 
      request.method() === 'POST'
    );

    // Mock the map node click and "arrive" action
    // In actual Playwright tests, you'd click the map marker, but we can emit the event directly to simulate it reliably
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('warg:play-node', {
        detail: {
          id: '10',
          name: 'Test Node',
          desc: 'Test description',
          status: 'unlocked',
          minigames: [] // simple gps proximity
        }
      }));
    });

    // Capture the request payload
    const request = await requestPromise;
    const postData = JSON.parse(request.postData());

    // Assert that anti-spoofing data was injected
    expect(postData).toHaveProperty('lat');
    expect(postData).toHaveProperty('lng');
    expect(postData).toHaveProperty('buffer');
    expect(postData).toHaveProperty('steps');
    
    expect(postData.steps).toBe(3);
    expect(Array.isArray(postData.buffer)).toBeTruthy();
    expect(postData.buffer.length).toBeGreaterThanOrEqual(5); // We pushed 6 coords
  });
});
