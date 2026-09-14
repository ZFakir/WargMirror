const { UserFeedback } = require('../models');

exports.submitFeedback = async (req, res) => {
  try {
    const {
      uiExperience,
      gameExperience,
      creatorExperience,
      gpsExperience,
      socialExperience,
      perfExperience,
      nps,
      featureRequest,
      feedbackText
    } = req.body;

    const feedbackData = {
      ui_experience: uiExperience ? parseInt(uiExperience, 10) : null,
      game_experience: gameExperience ? parseInt(gameExperience, 10) : null,
      creator_experience: creatorExperience ? parseInt(creatorExperience, 10) : null,
      gps_experience: gpsExperience ? parseInt(gpsExperience, 10) : null,
      social_experience: socialExperience ? parseInt(socialExperience, 10) : null,
      perf_experience: perfExperience ? parseInt(perfExperience, 10) : null,
      nps: nps ? parseInt(nps, 10) : null,
      feature_request: featureRequest || null,
      feedback_text: feedbackText || null
    };

    // If user is authenticated, attach user_id
    if (req.user && req.user.user_id) {
      feedbackData.user_id = req.user.user_id;
    }

    const newFeedback = await UserFeedback.create(feedbackData);

    res.status(201).json({ success: true, feedback: newFeedback });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};
