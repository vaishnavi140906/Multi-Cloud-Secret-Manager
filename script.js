const API_URL = "http://localhost:5000/api/secrets";

let secrets = [];
let logs = [];


// ==========================================
// LOAD SECRETS FROM BACKEND
// ==========================================

async function loadSecrets() {

    try {

        const response = await fetch(API_URL);

        const data = await response.json();

        if (data.success) {

            secrets = data.secrets;

            displaySecrets();
            updateDashboard();
            displayAlerts();

        }

    } catch (error) {

        console.error("Error loading secrets:", error);

        alert("Cannot connect to backend. Make sure server.js is running.");

    }
}


// ==========================================
// SHOW SECTION
// ==========================================

function showSection(sectionId) {

    const sections = document.querySelectorAll(".section");

    sections.forEach(section => {
        section.classList.remove("active-section");
    });

    const selectedSection = document.getElementById(sectionId);

    if (selectedSection) {
        selectedSection.classList.add("active-section");
    }

    const navLinks = document.querySelectorAll(".sidebar nav a");

    navLinks.forEach(link => {
        link.classList.remove("active");
    });

    event.currentTarget.classList.add("active");

    if (sectionId === "alerts") {
        displayAlerts();
    }

    if (sectionId === "logs") {
        displayLogs();
    }
}


// ==========================================
// MODAL
// ==========================================

function openModal() {

    document.getElementById("secretModal").style.display = "flex";

}


function closeModal() {

    document.getElementById("secretModal").style.display = "none";

}


// ==========================================
// ADD SECRET
// ==========================================

document.getElementById("secretForm").addEventListener("submit", async function(event) {

    event.preventDefault();

    const name =
        document.getElementById("secretName").value.trim();

    const secretValue =
        document.getElementById("secretValue").value.trim();

    const provider =
        document.getElementById("cloudProvider").value;

    const expiryDate =
        document.getElementById("expiryDate").value;


    if (!name || !secretValue || !provider || !expiryDate) {

        alert("Please fill all fields.");

        return;

    }


    try {

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                name: name,

                provider: provider,

                secretValue: secretValue,

                expiryDate: expiryDate

            })

        });


        const data = await response.json();


        if (data.success) {

            alert("✅ Secret added successfully!");

            logs.unshift(
                `Secret "${name}" was added to ${provider}.`
            );

            document.getElementById("secretForm").reset();

            closeModal();

            await loadSecrets();

        } else {

            alert("Failed to add secret.");

        }


    } catch (error) {

        console.error(error);

        alert(
            "❌ Backend connection failed. Make sure Node.js server is running."
        );

    }

});


// ==========================================
// DISPLAY SECRETS
// ==========================================

function displaySecrets() {

    const table1 =
        document.getElementById("secretTable");

    const table2 =
        document.getElementById("secretTable2");


    if (table1) {
        table1.innerHTML = "";
    }

    if (table2) {
        table2.innerHTML = "";
    }


    secrets.forEach(secret => {

        const status = getStatus(secret.expiryDate);

        const row = createSecretRow(secret, status);


        if (table1) {

            table1.innerHTML += row;

        }


        if (table2) {

            table2.innerHTML += row;

        }

    });

}


// ==========================================
// CREATE TABLE ROW
// ==========================================

function createSecretRow(secret, status) {

    const expiry =
        new Date(secret.expiryDate).toLocaleDateString();


    let statusClass = "status-active";

    if (status === "Expired") {
        statusClass = "status-expired";
    }

    if (status === "Expiring Soon") {
        statusClass = "status-warning";
    }


    return `

        <tr>

            <td>
                🔐 ${escapeHTML(secret.name)}
            </td>

            <td>
                ${escapeHTML(secret.provider)}
            </td>

            <td>
                ${expiry}
            </td>

            <td>
                <span class="${statusClass}">
                    ${status}
                </span>
            </td>

            <td>
                <span class="sync-status">
                    ✓ Synced
                </span>
            </td>

            <td>

                <button
                    onclick="deleteSecret('${secret._id}')"
                    class="delete-btn"
                >
                    🗑️
                </button>

            </td>

        </tr>

    `;

}


// ==========================================
// DELETE SECRET
// ==========================================

async function deleteSecret(id) {

    const confirmDelete =
        confirm("Are you sure you want to delete this secret?");


    if (!confirmDelete) {
        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/${id}`,
            {
                method: "DELETE"
            }
        );


        const data = await response.json();


        if (data.success) {

            logs.unshift("A secret was deleted.");

            alert("Secret deleted successfully.");

            await loadSecrets();

        }

    } catch (error) {

        console.error(error);

        alert("Failed to delete secret.");

    }

}


// ==========================================
// SECRET STATUS
// ==========================================

function getStatus(expiryDate) {

    const today = new Date();

    const expiry = new Date(expiryDate);

    const difference =
        expiry.getTime() - today.getTime();

    const days =
        Math.ceil(
            difference / (1000 * 60 * 60 * 24)
        );


    if (days < 0) {

        return "Expired";

    }

    if (days <= 7) {

        return "Expiring Soon";

    }

    return "Active";

}


// ==========================================
// UPDATE DASHBOARD
// ==========================================

function updateDashboard() {

    const total =
        secrets.length;


    const expiring =
        secrets.filter(
            secret =>
                getStatus(secret.expiryDate) === "Expiring Soon"
        ).length;


    const expired =
        secrets.filter(
            secret =>
                getStatus(secret.expiryDate) === "Expired"
        ).length;


    const synced =
        secrets.length;


    document.getElementById("totalSecrets").textContent =
        total;


    document.getElementById("expiringSecrets").textContent =
        expiring;


    document.getElementById("expiredSecrets").textContent =
        expired;


    document.getElementById("syncedSecrets").textContent =
        synced;

}


// ==========================================
// EXPIRY ALERTS
// ==========================================

function displayAlerts() {

    const container =
        document.getElementById("alertsContainer");


    if (!container) {
        return;
    }


    container.innerHTML = "";


    const alertSecrets =
        secrets.filter(secret => {

            const status =
                getStatus(secret.expiryDate);

            return (
                status === "Expiring Soon" ||
                status === "Expired"
            );

        });


    if (alertSecrets.length === 0) {

        container.innerHTML = `
            <div class="secret-info">
                <h3>✅ No Expiry Alerts</h3>
                <p>All your secrets are currently valid.</p>
            </div>
        `;

        return;

    }


    alertSecrets.forEach(secret => {

        const status =
            getStatus(secret.expiryDate);


        container.innerHTML += `

            <div class="secret-info">

                <h3>
                    ${status === "Expired" ? "🚨" : "⚠️"}
                    ${escapeHTML(secret.name)}
                </h3>

                <p>
                    Provider: ${escapeHTML(secret.provider)}
                </p>

                <p>
                    Expiry:
                    ${new Date(secret.expiryDate).toLocaleDateString()}
                </p>

                <strong>
                    ${status}
                </strong>

            </div>

        `;

    });

}


// ==========================================
// SEARCH
// ==========================================

function searchSecrets() {

    const search =
        document.getElementById("searchInput")
        .value
        .toLowerCase();


    const rows =
        document.querySelectorAll("#secretTable tr");


    rows.forEach(row => {

        const text =
            row.textContent.toLowerCase();


        row.style.display =
            text.includes(search)
                ? ""
                : "none";

    });

}


// ==========================================
// SYNCHRONIZATION
// ==========================================

async function syncAll() {

    try {

        const response = await fetch("http://localhost:5000/api/sync", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (data.success) {

            const message = document.getElementById("syncMessage");

            const now = new Date().toLocaleString();

            message.innerHTML = `
                ✅ Synchronization completed successfully!<br>
                AWS ↔ Azure ↔ Google Cloud<br>
                Last synchronization: ${now}
            `;

            alert("🔄 All cloud secrets synchronized successfully!");

            // Refresh audit logs
            if (typeof loadLogs === "function") {
                loadLogs();
            }

        } else {

            alert("❌ Synchronization failed.");

        }

    } catch (error) {

        console.error("Sync Error:", error);

        alert("❌ Could not connect to backend.");
    }
}

// ==========================================
// AUDIT LOGS
// ==========================================

function displayLogs() {

    const container =
        document.getElementById("logsContainer");


    if (!container) {
        return;
    }


    if (logs.length === 0) {

        container.innerHTML = `
            <div class="secret-info">
                <h3>📋 No Audit Logs</h3>
                <p>No activities recorded yet.</p>
            </div>
        `;

        return;

    }


    container.innerHTML =
        logs.map(log => `

            <div class="secret-info">

                📋 ${escapeHTML(log)}

            </div>

        `).join("");

}


// ==========================================
// LOGOUT
// ==========================================

function logout() {

    const result =
        confirm("Are you sure you want to logout?");


    if (result) {

        alert("Logged out successfully.");

    }

}


// ==========================================
// SECURITY
// ==========================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ==========================================
// LOAD DATA WHEN PAGE OPENS
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    loadSecrets();

});