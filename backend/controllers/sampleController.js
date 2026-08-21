const {
  listSamples,
  getSampleByIndex,
  getRandomSample,
  getDatasetStats,
} = require("../services/sampleService");

async function listSampleTransactions(req, res, next) {
  try {
    const type = req.query.type || "fraud";
    const limit = req.query.limit || 25;
    const result = await listSamples(type, limit);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

async function getSampleTransaction(req, res, next) {
  try {
    const data = await getSampleByIndex(req.params.index);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getRandomSampleTransaction(req, res, next) {
  try {
    const type = req.query.type || "any";
    const data = await getRandomSample(type);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getSampleStats(req, res, next) {
  try {
    const stats = await getDatasetStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listSampleTransactions,
  getSampleTransaction,
  getRandomSampleTransaction,
  getSampleStats,
};
