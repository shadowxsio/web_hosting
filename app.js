document.addEventListener('DOMContentLoaded', () => {
    const runsContainer = document.getElementById('runs-container');
    const prContainer = document.getElementById('pr-container');

    // Convert time string "HH:MM:SS" or "MM:SS" to total seconds
    function timeToSeconds(timeStr) {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }
        return 0;
    }

    // Format seconds to "HH:MM:SS" or "MM:SS"
    function secondsToTime(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // Calculate pace (min/km)
    function calculatePace(timeStr, distanceStr) {
        const seconds = timeToSeconds(timeStr);
        const distance = parseFloat(distanceStr.replace(' km', ''));
        if (distance > 0 && seconds > 0) {
            const paceSeconds = Math.round(seconds / distance);
            return secondsToTime(paceSeconds) + ' /km';
        }
        return '';
    }

    // Process runs for PRs
    function calculatePRs(runs) {
        const prs = {};
        
        runs.forEach(run => {
            // Group distances roughly (e.g. 21.1 km -> Semi, 42.2 km -> Marathon, 5.0 km -> 5k)
            let distanceCategory = run.distance;
            const distNum = parseFloat(run.distance);
            
            if (Math.abs(distNum - 42.2) < 1) distanceCategory = "Marathon";
            else if (Math.abs(distNum - 21.1) < 1) distanceCategory = "Semi-Marathon";
            else if (Math.abs(distNum - 10) < 0.5) distanceCategory = "10 km";
            else if (Math.abs(distNum - 5) < 0.5) distanceCategory = "5 km";
            else distanceCategory = `${distNum} km`; // Custom distances for trails

            const currentSeconds = timeToSeconds(run.time);
            
            if (!prs[distanceCategory] || currentSeconds < timeToSeconds(prs[distanceCategory].time)) {
                prs[distanceCategory] = {
                    distance: distanceCategory,
                    time: run.time,
                    pace: calculatePace(run.time, run.distance)
                };
            }
        });
        
        return Object.values(prs).sort((a, b) => {
            // Sort standard distances first if possible
            const order = {"5 km": 1, "10 km": 2, "Semi-Marathon": 3, "Marathon": 4};
            return (order[a.distance] || 99) - (order[b.distance] || 99);
        });
    }

    // Fetch the runs data
    fetch('data/runs.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Données introuvables');
            }
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

            // --- Render PRs ---
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

            // --- Render Runs ---
            runs.forEach((run, index) => {
                const runCard = document.createElement('div');
                runCard.className = 'run-card';
                // Add animation delay for stagger effect
                runCard.style.animationDelay = `${index * 0.1}s`;

                // Date formatting for Canada/French
                const dateObj = new Date(run.date);
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                const formattedDate = dateObj.toLocaleDateString('fr-CA', options);
                
                // Calculate pace
                const pace = calculatePace(run.time, run.distance);
                
                let sourceLink = run.source;
                if (run.url) {
                    sourceLink = `<a href="${run.url}" target="_blank" rel="noopener noreferrer">${run.source} ↗</a>`;
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
                        <div class="run-source">${sourceLink}</div>
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
            runsContainer.innerHTML = `<p class="loading">Erreur lors du chargement des courses. Vérifiez que data/runs.json existe.</p>`;
            prContainer.innerHTML = '';
        });
});
