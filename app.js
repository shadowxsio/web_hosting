document.addEventListener('DOMContentLoaded', () => {
    // --- Tab Navigation Logic ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- Data Rendering Logic ---
    const runsContainer = document.getElementById('runs-container');
    const prContainer = document.getElementById('pr-container');

    function timeToSeconds(timeStr) {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return 0;
    }

    function secondsToTime(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function calculatePace(timeStr, distanceStr) {
        const seconds = timeToSeconds(timeStr);
        const distance = parseFloat(distanceStr.replace(' km', ''));
        if (distance > 0 && seconds > 0) {
            const paceSeconds = Math.round(seconds / distance);
            return secondsToTime(paceSeconds) + ' /km';
        }
        return '';
    }

    function calculatePRs(runs) {
        const prs = {
            "5 km": { distance: "5 km", time: "--:--", pace: "--" },
            "10 km": { distance: "10 km", time: "--:--", pace: "--" },
            "Semi-Marathon": { distance: "Semi-Marathon", time: "--:--", pace: "--" },
            "Marathon": { distance: "Marathon", time: "--:--", pace: "--" }
        };
        
        runs.forEach(run => {
            const distNum = parseFloat(run.distance);
            let distanceCategory = null;
            
            if (Math.abs(distNum - 42.2) < 1) distanceCategory = "Marathon";
            else if (Math.abs(distNum - 21.1) < 1) distanceCategory = "Semi-Marathon";
            else if (Math.abs(distNum - 10) < 0.5) distanceCategory = "10 km";
            else if (Math.abs(distNum - 5) < 0.5) distanceCategory = "5 km";

            if (distanceCategory) {
                const currentSeconds = timeToSeconds(run.time);
                if (prs[distanceCategory].time === "--:--" || currentSeconds < timeToSeconds(prs[distanceCategory].time)) {
                    prs[distanceCategory] = {
                        distance: distanceCategory,
                        time: run.time,
                        pace: calculatePace(run.time, run.distance)
                    };
                }
            }
        });
        return [prs["5 km"], prs["10 km"], prs["Semi-Marathon"], prs["Marathon"]];
    }

    fetch('data/runs.json')
        .then(response => {
            if (!response.ok) throw new Error('Données introuvables');
            return response.json();
        })
        .then(runs => {
            runsContainer.innerHTML = '';
            prContainer.innerHTML = '';
            
            if (runs.length === 0) {
                runsContainer.innerHTML = '<p class="loading">Aucune course trouvée.</p>';
                prContainer.innerHTML = '<p class="loading">Aucun record calculé.</p>';
                return;
            }

            // Render PRs
            const prs = calculatePRs(runs);
            prs.forEach(pr => {
                const prCard = document.createElement('div');
                prCard.className = 'pr-card';
                prCard.innerHTML = `
                    <div class="pr-distance">${pr.distance}</div>
                    <div class="pr-time">${pr.time}</div>
                    <div class="pr-pace">${pr.pace}</div>
                `;
                prContainer.appendChild(prCard);
            });

            // Render Runs
            runs.forEach((run, index) => {
                const runCard = document.createElement('div');
                runCard.className = 'run-card';
                runCard.style.animationDelay = `${index * 0.1}s`;

                const dateObj = new Date(run.date);
                const formattedDate = dateObj.toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
                const pace = calculatePace(run.time, run.distance);
                
                let sourceHtml = '';
                if (run.url && run.url.includes("strava.com")) {
                    // Strava button
                    sourceHtml = `
                    <div class="run-source">
                        <a href="${run.url}" target="_blank" rel="noopener noreferrer">
                            <svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor">
                                <path d="M120.35 282.84L213.92 95.73h71.07l-164.64 329.3-91.86-184.2h71.86z"/>
                                <path d="M420.38 282.84l-45.74 91.56-45.92-91.56h-54.67l100.59 200.7 100.41-200.7z"/>
                            </svg>
                            Voir sur Strava
                        </a>
                    </div>`;
                } else if (run.source) {
                    sourceHtml = `<div class="run-source manual">${run.source}</div>`;
                }

                let elevationHtml = '';
                if (run.elevation) {
                    elevationHtml = `
                        <div class="stat">
                            <span class="stat-label">Dénivelé</span>
                            <span class="stat-value stat-elevation">⛰️ ${run.elevation}</span>
                        </div>
                    `;
                }

                runCard.innerHTML = `
                    <div class="run-header">
                        <div>
                            <div class="run-date">${formattedDate}</div>
                            <h3 class="run-title">${run.event_name}</h3>
                        </div>
                        ${sourceHtml}
                    </div>
                    <div class="run-stats">
                        <div class="stat">
                            <span class="stat-label">Distance</span>
                            <span class="stat-value">${run.distance}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Temps</span>
                            <span class="stat-value">${run.time}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Allure</span>
                            <span class="stat-value">${pace}</span>
                        </div>
                        ${elevationHtml}
                    </div>
                `;
                runsContainer.appendChild(runCard);
            });
        })
        .catch(error => {
            console.error('Error fetching runs:', error);
            runsContainer.innerHTML = '<p class="loading">Erreur lors du chargement des données.</p>';
        });
});
