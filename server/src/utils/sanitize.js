/**
 * Strips heavy base64 reference images from Minigame config_json payloads so
 * API JSON responses stay small; clients fetch images via /reference/image.
 */

function stripConfigBase64(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return config;
  }
  if (!('reference_image_base64' in config) && !('reference_image_mimetype' in config)) {
    return config;
  }
  const copy = { ...config };
  delete copy.reference_image_base64;
  delete copy.reference_image_mimetype;
  return copy;
}

function sanitizeMinigameObject(mg) {
  if (!mg || typeof mg !== 'object') return mg;
  const plain = typeof mg.toJSON === 'function' ? mg.toJSON() : { ...mg };
  if (plain.config_json) {
    plain.config_json = stripConfigBase64(plain.config_json);
  }
  return plain;
}

function stripHeavyMinigameFields(argOrWaypoints) {
  if (!argOrWaypoints) return argOrWaypoints;

  if (Array.isArray(argOrWaypoints)) {
    return argOrWaypoints.map((wp) => {
      if (!wp || typeof wp !== 'object') return wp;
      const plainWp = typeof wp.toJSON === 'function' ? wp.toJSON() : { ...wp };
      if (Array.isArray(plainWp.Minigames)) {
        plainWp.Minigames = plainWp.Minigames.map(sanitizeMinigameObject);
      }
      if (plainWp.Minigame) {
        plainWp.Minigame = sanitizeMinigameObject(plainWp.Minigame);
      }
      return plainWp;
    });
  }

  if (typeof argOrWaypoints === 'object') {
    const plainArg = typeof argOrWaypoints.toJSON === 'function' ? argOrWaypoints.toJSON() : { ...argOrWaypoints };
    if (Array.isArray(plainArg.Waypoints)) {
      plainArg.Waypoints = stripHeavyMinigameFields(plainArg.Waypoints);
    }
    return plainArg;
  }

  return argOrWaypoints;
}

module.exports = {
  stripConfigBase64,
  stripHeavyMinigameFields
};
