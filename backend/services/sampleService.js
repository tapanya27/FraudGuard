const fs = require("fs");
const os = require("os");
const path = require("path");

const FEATURE_NAMES = [
  "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10",
  "V11", "V12", "V13", "V14", "V15", "V16", "V17", "V18", "V19", "V20",
  "V21", "V22", "V23", "V24", "V25", "V26", "V27", "V28",
  "Amount", "Hour", "is_night", "log_amount", "amount_to_mean", "is_high_amount",
];

const INTERPRETABLE_FIELDS = [
  "Amount",
  "Hour",
  "is_night",
  "log_amount",
  "amount_to_mean",
  "is_high_amount",
];

const ADVANCED_FIELDS = FEATURE_NAMES.filter((name) => name.startsWith("V"));

const LOCAL_CSV_PATH = path.join(__dirname, "..", "..", "test_smote.csv");
const HF_CACHE_PATH = path.join(os.tmpdir(), "test_smote.csv");

let cache = null;
let downloadPromise = null;

function wrapDbError(message, status = 500) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parseCsvLine(line) {
  return line.split(",");
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
  } catch {
    return false;
  }
}

function isHfConfigured() {
  return Boolean(
    process.env.HF_TOKEN &&
      process.env.HF_DATASET_REPO &&
      process.env.HF_DATASET_FILE
  );
}

async function downloadFromHuggingFace(destPath) {
  const repo = String(process.env.HF_DATASET_REPO).trim();
  const file = String(process.env.HF_DATASET_FILE).trim();
  const token = process.env.HF_TOKEN;

  console.info("Downloading sample dataset from Hugging Face Hub", {
    repo,
    file,
  });

  let blob;
  try {
    const { downloadFile } = await import("@huggingface/hub");
    blob = await downloadFile({
      repo: { type: "dataset", name: repo },
      path: file,
      accessToken: token,
    });
  } catch (error) {
    console.error("Hugging Face dataset download failed", {
      repo,
      file,
      message: error.message,
    });
    throw wrapDbError(
      "Failed to download sample dataset test_smote.csv from Hugging Face Hub",
      503
    );
  }

  if (!blob) {
    throw wrapDbError(
      "Sample dataset test_smote.csv not found on Hugging Face Hub",
      500
    );
  }

  const partialPath = `${destPath}.partial`;
  try {
    const buffer = Buffer.from(await blob.arrayBuffer());
    if (buffer.length === 0) {
      throw wrapDbError("Downloaded sample dataset is empty", 500);
    }
    fs.writeFileSync(partialPath, buffer);
    fs.renameSync(partialPath, destPath);
    console.info("Sample dataset cached", { bytes: buffer.length });
  } catch (error) {
    try {
      if (fs.existsSync(partialPath)) {
        fs.unlinkSync(partialPath);
      }
    } catch {
      // ignore cleanup errors
    }
    if (error.status) {
      throw error;
    }
    console.error("Failed to write downloaded sample dataset", {
      message: error.message,
    });
    throw wrapDbError(
      "Failed to store sample dataset test_smote.csv",
      500
    );
  }
}

async function resolveCsvPath() {
  if (fileExists(LOCAL_CSV_PATH)) {
    return LOCAL_CSV_PATH;
  }

  if (fileExists(HF_CACHE_PATH)) {
    return HF_CACHE_PATH;
  }

  if (!isHfConfigured()) {
    throw wrapDbError("Sample dataset test_smote.csv not found", 500);
  }

  if (!downloadPromise) {
    downloadPromise = downloadFromHuggingFace(HF_CACHE_PATH).finally(() => {
      downloadPromise = null;
    });
  }

  await downloadPromise;
  return HF_CACHE_PATH;
}

function parseDataset(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8").trim();
  const lines = raw.split(/\r?\n/);

  if (lines.length < 2) {
    throw wrapDbError("Sample dataset is empty", 500);
  }

  const headers = parseCsvLine(lines[0]);
  const headerIndex = Object.fromEntries(headers.map((h, i) => [h.trim(), i]));

  for (const name of FEATURE_NAMES) {
    if (headerIndex[name] === undefined) {
      throw wrapDbError(`Dataset missing feature column: ${name}`, 500);
    }
  }

  if (headerIndex.Class === undefined) {
    throw wrapDbError("Dataset missing Class column", 500);
  }

  const rows = [];
  const fraudIndices = [];
  const legitimateIndices = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < headers.length) {
      continue;
    }

    const features = FEATURE_NAMES.map((name) => {
      const value = Number(cols[headerIndex[name]]);
      if (!Number.isFinite(value)) {
        throw wrapDbError(`Non-numeric value for ${name} at row ${i - 1}`, 500);
      }
      return value;
    });

    const classValue = Number(cols[headerIndex.Class]);
    if (classValue !== 0 && classValue !== 1) {
      throw wrapDbError(`Invalid Class at row ${i - 1}`, 500);
    }

    const index = i - 1;
    const row = {
      index,
      features,
      class: classValue,
      interpretable: Object.fromEntries(
        INTERPRETABLE_FIELDS.map((name) => [
          name,
          features[FEATURE_NAMES.indexOf(name)],
        ])
      ),
      advanced_features: Object.fromEntries(
        ADVANCED_FIELDS.map((name) => [
          name,
          features[FEATURE_NAMES.indexOf(name)],
        ])
      ),
    };

    rows.push(row);

    if (classValue === 1) {
      fraudIndices.push(index);
    } else {
      legitimateIndices.push(index);
    }
  }

  return {
    rows,
    fraudIndices,
    legitimateIndices,
    total: rows.length,
  };
}

async function loadDataset() {
  if (cache) {
    return cache;
  }

  const csvPath = await resolveCsvPath();
  cache = parseDataset(csvPath);
  return cache;
}

function buildSummary(row) {
  return {
    index: row.index,
    Amount: row.interpretable.Amount,
    Hour: row.interpretable.Hour,
    is_night: row.interpretable.is_night,
    log_amount: row.interpretable.log_amount,
    amount_to_mean: row.interpretable.amount_to_mean,
    is_high_amount: row.interpretable.is_high_amount,
    class: row.class,
    label: row.class === 1 ? "FRAUD" : "LEGITIMATE",
  };
}

function buildDetail(row) {
  return {
    index: row.index,
    demo: true,
    source: "test_smote.csv",
    interpretable: row.interpretable,
    ground_truth: {
      Class: row.class,
      label: row.class === 1 ? "FRAUD" : "LEGITIMATE",
    },
    advanced_features: row.advanced_features,
    features: row.features,
    feature_names: FEATURE_NAMES,
    feature_count: FEATURE_NAMES.length,
  };
}

async function listSamples(type = "fraud", limit = 25) {
  const dataset = await loadDataset();
  const normalized = String(type || "fraud").toLowerCase();
  let indices;

  if (normalized === "fraud") {
    indices = dataset.fraudIndices;
  } else if (normalized === "legitimate") {
    indices = dataset.legitimateIndices;
  } else {
    throw wrapDbError("type must be fraud or legitimate", 400);
  }

  const size = Math.min(Math.max(Number(limit) || 25, 1), 50);
  const selected = indices.slice(0, size).map((idx) => buildSummary(dataset.rows[idx]));

  return {
    type: normalized,
    total_available: indices.length,
    returned: selected.length,
    data: selected,
  };
}

async function getSampleByIndex(index) {
  const dataset = await loadDataset();
  const idx = Number.parseInt(index, 10);

  if (!Number.isFinite(idx) || idx < 0 || idx >= dataset.rows.length) {
    throw wrapDbError("Sample transaction not found", 404);
  }

  return buildDetail(dataset.rows[idx]);
}

async function getRandomSample(type = "any") {
  const dataset = await loadDataset();
  const normalized = String(type || "any").toLowerCase();
  let pool;

  if (normalized === "fraud") {
    pool = dataset.fraudIndices;
  } else if (normalized === "legitimate") {
    pool = dataset.legitimateIndices;
  } else if (normalized === "any" || normalized === "random") {
    pool = dataset.rows.map((row) => row.index);
  } else {
    throw wrapDbError("type must be fraud, legitimate, or any", 400);
  }

  if (pool.length === 0) {
    throw wrapDbError("No sample transactions available for this type", 404);
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];
  return buildDetail(dataset.rows[pick]);
}

async function getDatasetStats() {
  const dataset = await loadDataset();
  return {
    total: dataset.total,
    fraud: dataset.fraudIndices.length,
    legitimate: dataset.legitimateIndices.length,
    source: "test_smote.csv",
    feature_count: FEATURE_NAMES.length,
  };
}

module.exports = {
  FEATURE_NAMES,
  listSamples,
  getSampleByIndex,
  getRandomSample,
  getDatasetStats,
};
