const {
  queryTransactions,
  getTransactionById,
  getFraudTransactions,
  getLegitimateTransactions,
  getTransactionStats,
} = require("../services/transactionService");
const {
  getInvestigation,
  saveInvestigation,
} = require("./investigationController");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePagination(query) {
  let page = Number.parseInt(query.page, 10);
  let limit = Number.parseInt(query.limit, 10);

  if (!Number.isFinite(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  if (!Number.isFinite(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  }

  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function buildPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function parseListFilters(query) {
  const filters = {
    sort: query.sort || "newest",
  };

  if (query.prediction !== undefined) {
    const prediction = Number.parseInt(query.prediction, 10);
    if (prediction === 0 || prediction === 1) {
      filters.prediction = prediction;
    }
  }

  if (query.risk_level) {
    filters.risk_level = query.risk_level;
  }

  if (query.id) {
    filters.id = query.id;
  }

  if (query.investigation_status) {
    filters.investigation_status = query.investigation_status;
  }

  return filters;
}

async function listTransactions(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const filters = parseListFilters(req.query);
    const { rows, total } = await queryTransactions(limit, offset, filters);

    res.json({
      success: true,
      data: rows,
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

async function getTransaction(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    if (!Number.isFinite(id) || id < 1) {
      const err = new Error("Invalid transaction id");
      err.status = 400;
      throw err;
    }

    const transaction = await getTransactionById(id);

    if (!transaction) {
      const err = new Error("Transaction not found");
      err.status = 404;
      throw err;
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

async function listFraudTransactions(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = await getFraudTransactions(limit, offset);

    res.json({
      success: true,
      data: rows,
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

async function listLegitimateTransactions(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = await getLegitimateTransactions(limit, offset);

    res.json({
      success: true,
      data: rows,
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const stats = await getTransactionStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTransactions,
  getTransaction,
  listFraudTransactions,
  listLegitimateTransactions,
  getStats,
  getInvestigation,
  saveInvestigation,
};
