const prisma = require("../config/prisma");

const getLocations = async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: {
        building: "asc",
      },
    });

    res.json({
      success: true,
      locations,
    });
  } catch (error) {
    console.error("Get locations error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching locations",
    });
  }
};

const createLocation = async (req, res) => {
  try {
    const { building, floor, room, area } = req.body;

    if (!building) {
      return res.status(400).json({
        success: false,
        message: "Building is required",
      });
    }

    const location = await prisma.location.create({
      data: {
        building,
        floor: floor || null,
        room: room || null,
        area: area || null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Location created successfully",
      location,
    });
  } catch (error) {
    console.error("Create location error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while creating location",
    });
  }
};

module.exports = {
  getLocations,
  createLocation,
};
