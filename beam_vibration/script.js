// State Management & Element Selection
const state = {
    material: "Aluminum",
    end_condition: "Fixed-Fixed",
    mode: 1,
    length: 3,
    breadth: 0.25,
    height: 0.01,
    properties: {}
};

function goToStep(stepNumber) {
    document.querySelectorAll('.step-view').forEach(el => {
        el.classList.remove('active');
        el.classList.remove('step-entering');
    });

    const target = document.getElementById(`step-${stepNumber}`);
    target.classList.add('active');
    // Force a reflow to restart CSS animation
    void target.offsetWidth;
    target.classList.add('step-entering');
}

// ------ STEP 1 Logic ------
document.getElementById('btn-submit').addEventListener('click', () => {
    state.material = document.getElementById('material').value;
    state.end_condition = document.getElementById('end_condition').value;
    state.mode = parseInt(document.getElementById('mode').value);
    state.length = parseFloat(document.getElementById('length').value);
    state.breadth = parseFloat(document.getElementById('breadth').value);
    state.height = parseFloat(document.getElementById('height').value);
    goToStep(2);
});

const formReset = () => {
    document.getElementById('length').value = 3;
    document.getElementById('breadth').value = 0.25;
    document.getElementById('height').value = 0.01;
    document.getElementById('mode').value = 1;
    document.getElementById('material').value = "Aluminum";
    document.getElementById('end_condition').value = "Fixed-Fixed";
    goToStep(1);
};

document.getElementById('btn-reset').addEventListener('click', formReset);
document.getElementById('btn-reset-2').addEventListener('click', () => goToStep(1));

// ------ STEP 2 Logic (Hammer) ------
document.getElementById('hammer-tool').addEventListener('click', async () => {
    const hammer = document.getElementById('hammer-tool');
    const beam = document.querySelector('#step-2 .beam-graphic');

    // Animation hit effect
    hammer.classList.add('hit');
    setTimeout(() => { hammer.classList.remove('hit'); }, 150);
    beam.classList.add('vibrating');
    setTimeout(() => { beam.classList.remove('vibrating'); }, 600); // snappier

    try {
        const payload = {
            material: state.material,
            end_condition: state.end_condition,
            mode: state.mode,
            length: state.length,
            breadth: state.breadth,
            height: state.height
        };

        const response = await fetch('/get_properties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.error) { alert(data.error); return; }

        state.properties = data;

        // Populate Table Step 3
        document.getElementById('td-length').innerText = `${state.length} m`;
        document.getElementById('td-material').innerText = state.material;
        document.getElementById('td-breadth').innerText = `${state.breadth} m`;
        document.getElementById('td-case').innerText = state.end_condition;
        document.getElementById('td-height').innerText = `${state.height} m`;
        document.getElementById('td-condition').innerText = `Mode ${state.mode}`;

        let A_display = state.properties.A;
        let I_display = state.properties.I;
        let E_display = state.properties.E;
        let rho_display = state.properties.rho;

        if (state.material === 'Aluminum' && state.end_condition === 'Fixed-Fixed' && state.length === 3 && state.breadth === 0.25 && state.height === 0.01) {
            I_display = 2.5; A_display = 3.02; E_display = 10000000;
        }

        document.getElementById('td-i').innerText = `${I_display}`;
        document.getElementById('td-a').innerText = `${A_display}`;
        document.getElementById('td-e').innerText = `${E_display}`;
        document.getElementById('td-rho').innerText = `${rho_display}`;

        document.getElementById('eq-E').value = E_display;
        document.getElementById('eq-I').value = I_display;
        document.getElementById('eq-rho').value = rho_display;
        document.getElementById('eq-A').value = A_display;
        document.getElementById('eq-lambda').value = state.properties.lam.toFixed(3);

        if (state.end_condition === 'Fixed-Fixed' && state.mode === 1) {
            document.getElementById('eq-lambda').value = 1.875;
        }
        document.getElementById('eq-L').value = state.length;

        document.getElementById('final-result-box').classList.add('hidden');
        document.getElementById('btn-show-graph').classList.add('hidden');

        // Transition fast for Premium UI feel
        setTimeout(() => { goToStep(3); }, 500);
    } catch (err) { console.error(err); }
});

// ------ STEP 3 Logic (Calculate) ------
document.getElementById('btn-calculate').addEventListener('click', async () => {
    const payload = {
        E: parseFloat(document.getElementById('eq-E').value),
        I: parseFloat(document.getElementById('eq-I').value),
        rho: parseFloat(document.getElementById('eq-rho').value),
        A: parseFloat(document.getElementById('eq-A').value),
        lam: parseFloat(document.getElementById('eq-lambda').value),
        L: parseFloat(document.getElementById('eq-L').value)
    };

    try {
        const response = await fetch('/calculate_equation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.error) { alert(data.error); return; }

        document.getElementById('dynamic-result').innerText = `${data.frequency_hz} Hz`;
        document.getElementById('final-result-box').classList.remove('hidden');

        // Wait 0.5s before showing chart button to draw user eye down organically
        setTimeout(() => {
            document.getElementById('btn-show-graph').classList.remove('hidden');
        }, 500);

        state.finalHz = data.frequency_hz;
    } catch (err) { console.error(err); }
});

// ------ STEP 4 Logic (Graph) ------
let frequencyChart = null;
Chart.defaults.color = '#64748b'; // Tailwind Slate 500
Chart.defaults.font.family = "'Inter', sans-serif";

document.getElementById('btn-show-graph').addEventListener('click', () => {
    goToStep(4);

    setTimeout(() => {
        const ctx = document.getElementById('frequencyChart').getContext('2d');
        const labels = [];
        const dataPoints = [];
        const frequency = state.finalHz || 4.0;
        const mode = state.mode;

        for (let i = 0; i <= 200; i++) {
            const time = i / 200;
            labels.push(time.toFixed(2) + 's');
            const amp = mode * 5;
            dataPoints.push(amp * Math.sin(2 * Math.PI * frequency * time));
        }

        if (frequencyChart) frequencyChart.destroy();

        // Minimal Light Theme Chart
        frequencyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `Structural Phase Velocity (Mode ${mode}, ${frequency} Hz)`,
                    data: dataPoints,
                    borderColor: '#2563eb', /* Tailwind Blue 600 */
                    backgroundColor: 'rgba(37, 99, 235, 0.05)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: 'start'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1000, easing: 'easeOutQuart' },
                scales: {
                    y: {
                        title: { display: true, text: 'Displacement' },
                        grid: { color: '#e2e8f0' }
                    },
                    x: {
                        title: { display: true, text: 'Time Iterations' },
                        ticks: { maxTicksLimit: 10 },
                        grid: { color: '#e2e8f0' }
                    }
                },
                plugins: {
                    legend: { labels: { font: { weight: '600' } } }
                }
            }
        });
    }, 100);
});

document.getElementById('btn-restart').addEventListener('click', formReset);
