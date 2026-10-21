const {
  suggestCategory,
  summarizeDescription,
  flagUrgency,
} = require("../services/aiService");

const getComplaintAssistance = (req, res) => {
  try {
    const { title, description } = req.body || {};

    if (
      typeof title !== "string" ||
      typeof description !== "string" ||
      !title.trim() ||
      !description.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    if (title.length > 200 || description.length > 10000) {
      return res.status(400).json({
        success: false,
        message: "Title or description exceeds the allowed length",
      });
    }

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    return res.status(200).json({
      success: true,
      assistanceType: "rule-based",
      categorySuggestion: suggestCategory(cleanTitle, cleanDescription),
      summary: summarizeDescription(cleanDescription),
      urgency: flagUrgency(cleanTitle, cleanDescription),
      message: "Suggestions are automated hints for staff review.",
    });
  } catch (error) {
    console.error("Complaint assistance error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to analyze the complaint",
    });
  }
};

module.exports = { getComplaintAssistance };
