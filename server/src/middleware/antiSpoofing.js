const { User, LocationEvent, TrustEvent } = require('../models');

// Simple Haversine formula to calculate distance in meters
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in m
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function calculateVariance(arr) {
  if (!arr || arr.length === 0) return 0;
  const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
  return arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;
}

const antiSpoofing = async (req, res, next) => {
  try {
    const { lat, lng, buffer, steps } = req.body;
    const userId = req.user ? req.user.user_id : null;

    if (!userId || lat === undefined || lng === undefined) {
      // Missing vital information, but might not be an authenticated location endpoint.
      // If used on a protected route, authMiddleware should have caught it.
      return next();
    }

    const currentLoc = { lat: parseFloat(lat), lng: parseFloat(lng) };
    let isSuspicious = false;
    const flags = [];
    let deltaScore = 1.0; // Positive reinforcement for legitimate interaction

    // 1. Drift Check
    if (buffer && Array.isArray(buffer) && buffer.length >= 5) {
      const latVariance = calculateVariance(buffer.map(c => parseFloat(c.lat)));
      const lngVariance = calculateVariance(buffer.map(c => parseFloat(c.lng)));
      
      const DRIFT_THRESHOLD = 0.0000001; // 1e-7
      if (latVariance < DRIFT_THRESHOLD && lngVariance < DRIFT_THRESHOLD) {
        isSuspicious = true;
        flags.push({ reason: 'drift_anomaly', variance: { lat: latVariance, lng: lngVariance } });
        deltaScore -= 10.0;
      }
    }

    // Fetch the last known location event for this user
    const lastEvent = await LocationEvent.findOne({
      where: { user_id: userId },
      order: [['recorded_at', 'DESC']]
    });

    if (lastEvent && lastEvent.location && lastEvent.location.coordinates) {
      // GeoJSON point in Sequelize: coordinates are [longitude, latitude]
      const lastLng = lastEvent.location.coordinates[0];
      const lastLat = lastEvent.location.coordinates[1];
      const distance = getDistanceFromLatLonInM(lastLat, lastLng, currentLoc.lat, currentLoc.lng);
      
      const timeDiffSeconds = (Date.now() - new Date(lastEvent.recorded_at).getTime()) / 1000;

      // 2. Speed Check
      if (timeDiffSeconds > 0) {
        const speed = distance / timeDiffSeconds;
        const MAX_WALKING_SPEED = 4.0; // m/s
        
        if (speed > MAX_WALKING_SPEED) {
          isSuspicious = true;
          flags.push({ reason: 'speed_violation', speed_ms: speed, distance, timeDiffSeconds });
          deltaScore -= 15.0;
        }
      }

      // 3. Pedometer Check
      if (steps !== undefined && distance > 20) { // Only evaluate for meaningful distances
        const parsedSteps = parseInt(steps, 10);
        // Average step ~0.75m. If distance is more than 2.5x the theoretical max distance from steps, flag it.
        const theoreticalMaxDistance = parsedSteps * 1.5; // generous upper bound
        
        if (parsedSteps === 0 || distance > theoreticalMaxDistance) {
          isSuspicious = true;
          flags.push({ reason: 'pedometer_mismatch', steps: parsedSteps, distance });
          deltaScore -= 20.0;
        }
      }
    }

    // Update User Trust Score
    const user = await User.findByPk(userId);
    if (user) {
      // Ensure score stays between 0 and 100
      let newScore = parseFloat(user.trust_score) + deltaScore;
      newScore = Math.max(0, Math.min(100, newScore));
      
      user.trust_score = newScore;
      if (newScore < 50) {
        user.is_flagged = true;
      }
      await user.save();
    }

    // Log Location Event
    // SRID 4326 Point: Note that Sequelize/MySQL often expects [longitude, latitude] for GeoJSON Points
    const locationData = {
      type: 'Point',
      coordinates: [currentLoc.lng, currentLoc.lat], // GeoJSON format
      crs: { type: 'name', properties: { name: 'EPSG:4326' } }
    };

    await LocationEvent.create({
      user_id: userId,
      location: locationData,
      is_suspicious: isSuspicious,
      flags_json: flags.length > 0 ? flags : null
    });

    // Log Trust Event if suspicious or if we want to audit score changes
    if (isSuspicious) {
      for (const flag of flags) {
        await TrustEvent.create({
          user_id: userId,
          event_type: flag.reason,
          delta_score: (flag.reason === 'drift_anomaly' ? -10.0 : flag.reason === 'speed_violation' ? -15.0 : -20.0),
          context_json: flag
        });
      }
      
      // Stop the request here if they are spoofing
      return res.status(403).json({
        error: 'Interaction denied due to suspicious location activity.',
        flags
      });
    }

    // Optionally log a positive trust event if no flags and deltaScore > 0
    if (deltaScore > 0) {
      await TrustEvent.create({
        user_id: userId,
        event_type: 'verified_interaction',
        delta_score: deltaScore,
        context_json: { lat: currentLoc.lat, lng: currentLoc.lng }
      });
    }

    next();
  } catch (error) {
    console.error('Anti-Spoofing Middleware Error:', error);
    // Don't block legitimate gameplay if the anti-spoofing engine fails internally
    next();
  }
};

module.exports = antiSpoofing;
