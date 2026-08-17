const axios = require("axios");
const fs = require("fs");
const path = require("path");

console.log("Starting prediction test...");

const csvPath = path.join(
    __dirname,
    "..",
    "test_smote.csv"
);

console.log("CSV path:", csvPath);


// Read CSV
const csv = fs.readFileSync(csvPath, "utf8");

console.log("CSV loaded.");


// Split rows
const rows = csv.trim().split(/\r?\n/);

console.log("Total rows:", rows.length);


// Headers
const headers = rows[0].split(",");


// Row 840
const row = rows[841].split(",");


// Find Class column
const classIndex = headers.indexOf("Class");

console.log("Class column index:", classIndex);


// Create 34 features
const features = row
    .filter((_, index) => index !== classIndex)
    .map(Number);


console.log(
    "Number of features:",
    features.length
);

console.log(
    "Actual class:",
    Number(row[classIndex])
);


// Check for invalid values
if (features.length !== 34) {

    console.error(
        "ERROR: Expected 34 features but got",
        features.length
    );

    process.exit(1);
}


if (features.some(Number.isNaN)) {

    console.error(
        "ERROR: Some features are not numbers."
    );

    process.exit(1);
}


console.log(
    "Sending request to Node backend..."
);


// Send request
axios.post(
    "http://localhost:5000/api/predict",
    {
        features: features
    },
    {
        timeout: 10000
    }
)
.then(response => {

    console.log("\n==============================");
    console.log("PREDICTION SUCCESS");
    console.log("==============================");

    console.log(
        JSON.stringify(
            response.data,
            null,
            2
        )
    );

})
.catch(error => {

    console.error("\n==============================");
    console.error("PREDICTION FAILED");
    console.error("==============================");

    if (error.response) {

        console.error(
            "Status:",
            error.response.status
        );

        console.error(
            "Response:",
            error.response.data
        );

    } else {

        console.error(
            "Error:",
            error.message
        );
    }

});
