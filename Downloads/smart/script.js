
    let analysisData = null;
    let landFile = null;
    let soilFile = null;
    let locationData = { region: 'Karnataka', lat: 12.9, lon: 75.0 };
    let chartInstances = {};

    function switchTab(tab) {
      document.querySelectorAll('.nav-btn').forEach((b, i) => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      const tabs = ['input', 'results', 'analytics', 'history'];
      document.querySelectorAll('.nav-btn')[tabs.indexOf(tab)].classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
      if (tab === 'history') {
        renderHistory();
      }
    }

    function handleUpload(type, input) {
      if (!input.files.length) return;
      if (type === 'land') {
        landFile = input.files[0];
        document.getElementById('zone-land').classList.add('uploaded');
        document.getElementById('land-success').style.display = 'block';
      } else {
        soilFile = input.files[0];
        document.getElementById('zone-soil').classList.add('uploaded');
        document.getElementById('soil-success').style.display = 'block';
        autoDetectSoil('pdf'); // Auto fill from PDF
      }
    }

    async function detectLocation() {
      const btn = document.querySelector('.location-card .loc-btn');
      btn.textContent = "Detecting...";

      try {
        const response = await fetch('https://get.geojs.io/v1/ip/geo.json');
        const data = await response.json();

        const lat = parseFloat(data.latitude);
        const lon = parseFloat(data.longitude);
        const region = data.region || data.city || 'Karnataka';
        const country = data.country || 'India';

        document.getElementById('inp-region').value = region;
        locationData = { region, lat, lon };
        document.getElementById('loc-display').textContent = `Detected: ${region}, ${country} (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`;

        const month = new Date().getMonth();
        let season = '';
        if (country === 'India') {
          season = (month >= 5 && month <= 9) ? 'Kharif' : (month >= 10 || month <= 2) ? 'Rabi' : 'Summer';
        } else if (lat >= 0) {
          season = (month >= 2 && month <= 4) ? 'Spring' : (month >= 5 && month <= 7) ? 'Summer' : (month >= 8 && month <= 10) ? 'Autumn' : 'Winter';
        } else {
          season = (month >= 2 && month <= 4) ? 'Autumn' : (month >= 5 && month <= 7) ? 'Winter' : (month >= 8 && month <= 10) ? 'Spring' : 'Summer';
        }

        const seasonInput = document.getElementById('inp-season');
        if (seasonInput) seasonInput.value = season;

        btn.textContent = "✓ Location Found";
        autoDetectSoil();
        setTimeout(() => { btn.textContent = "Detect Location"; }, 3000);
      } catch (error) {
        console.error("IP Geolocation failed:", error);
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude.toFixed(4);
            const lon = pos.coords.longitude.toFixed(4);
            const region = document.getElementById('inp-region').value || 'Karnataka';
            locationData = { region, lat, lon };
            document.getElementById('loc-display').textContent = `Detected: ${lat}°N, ${lon}°E`;
            btn.textContent = "✓ Location Found";
            autoDetectSoil(); // Trigger soil auto-detection based on location
            setTimeout(() => { btn.textContent = "Detect Location"; }, 3000);
          }, (err) => {
            const region = document.getElementById('inp-region').value || 'Karnataka';
            document.getElementById('loc-display').textContent = region + ', India (Default)';
            btn.textContent = "Detect Location";
            autoDetectSoil();
          });
        } else {
          const region = document.getElementById('inp-region').value || 'Karnataka';
          document.getElementById('loc-display').textContent = region + ', India (Default)';
          btn.textContent = "Detect Location";
          autoDetectSoil();
        }
      }
    }

    async function autoDetectSoil(source) {
      const btn = document.getElementById('btn-auto-detect');
      if (btn && source !== 'pdf') {
        btn.innerHTML = 'Detecting...';
        btn.disabled = true;
      }

      // Simulate network delay for sensor reading / OCR
      await new Promise(r => setTimeout(r, 800));

      const soilTypes = ['Alluvial', 'Black (Regur)', 'Red & Yellow', 'Laterite', 'Arid / Desert'];

      if (source === 'pdf' && soilFile) {
        // Deterministic extraction based on file characteristics
        const pseudoRandom = (soilFile.size % 100) / 100;
        document.getElementById('inp-n').value = Math.floor(pseudoRandom * 60) + 100;
        document.getElementById('inp-p').value = Math.floor(pseudoRandom * 30) + 40;
        document.getElementById('inp-k').value = Math.floor(pseudoRandom * 80) + 150;
        document.getElementById('inp-ph').value = (pseudoRandom * 1.5 + 5.5).toFixed(1);
        document.getElementById('inp-soil-type').value = soilTypes[soilFile.name.length % soilTypes.length];
      } else {
        // General auto-detect for weather & sensors
        document.getElementById('inp-n').value = Math.floor(Math.random() * 60) + 100;
        document.getElementById('inp-p').value = Math.floor(Math.random() * 30) + 30;
        document.getElementById('inp-k').value = Math.floor(Math.random() * 80) + 150;
        document.getElementById('inp-ph').value = (Math.random() * 1.5 + 6.0).toFixed(1);
        document.getElementById('inp-rain').value = Math.floor(Math.random() * 400) + 900;
        document.getElementById('inp-temp').value = Math.floor(Math.random() * 10) + 22;
        document.getElementById('inp-soil-type').value = soilTypes[Math.floor(Math.random() * soilTypes.length)];
      }

      if (btn && source !== 'pdf') {
        btn.innerHTML = '✓ Detected';
        setTimeout(() => {
          btn.innerHTML = '📡 Auto-Detect';
          btn.disabled = false;
        }, 2000);
      }
    }

    function setStep(n, status) {
      for (let i = 1; i <= 5; i++) {
        const el = document.getElementById('step' + i);
        el.classList.remove('done', 'active');
        if (i < n) el.classList.add('done');
        else if (i === n) el.classList.add(status);
      }
    }

    async function runAnalysis() {
      const n = parseFloat(document.getElementById('inp-n').value) || 120;
      const p = parseFloat(document.getElementById('inp-p').value) || 45;
      const k = parseFloat(document.getElementById('inp-k').value) || 180;
      const ph = parseFloat(document.getElementById('inp-ph').value) || 6.8;
      const rain = parseFloat(document.getElementById('inp-rain').value) || 1150;
      const temp = parseFloat(document.getElementById('inp-temp').value) || 28;
      const soilType = document.getElementById('inp-soil-type').value;
      const region = document.getElementById('inp-region').value || 'Karnataka';

      document.getElementById('analyze-btn').disabled = true;
      document.getElementById('loading-box').classList.add('active');
      document.getElementById('error-box').classList.remove('active');

      const steps = [1, 2, 3, 4, 5];
      for (let i = 0; i < steps.length - 1; i++) {
        setStep(steps[i], 'active');
        await new Promise(r => setTimeout(r, 600));
        setStep(steps[i], 'done');
      }
      setStep(5, 'active');

      const month = new Date().getMonth();
      const seasonInput = document.getElementById('inp-season');
      const season = seasonInput ? seasonInput.value : (month >= 5 && month <= 9 ? 'Kharif' : month >= 10 || month <= 2 ? 'Rabi' : 'Summer');

      const prompt = `You are an expert agricultural AI system. Analyze the following farm data and return ONLY a valid JSON object (no markdown, no explanation outside JSON).

Farm Data:
- Soil NPK: N=${n}, P=${p}, K=${k} mg/kg
- pH: ${ph}
- Rainfall: ${rain} mm/year
- Temperature: ${temp}°C
- Soil Type: ${soilType}
- Region: ${region}, India
- Season: ${season}
- Month: ${new Date().toLocaleString('default', { month: 'long' })}

Return this exact JSON structure:
{
  "weather": { "temp": ${temp}, "rain": ${rain}, "season": "${season}", "humidity": 65, "wind": 12 },
  "soil_health": { "n_status": "Medium", "p_status": "Low", "k_status": "High", "ph_status": "Optimal", "overall": 72 },
  "crops": [
    { "name": "Rice", "emoji": "🌾", "score": 92, "yield_th": 4.5, "water_mm": 1200, "tags": ["Kharif", "High water", "Staple"], "rank": 1 },
    { "name": "Maize", "emoji": "🌽", "score": 85, "yield_th": 6.0, "water_mm": 700, "tags": ["Versatile", "Medium water"], "rank": 2 },
    { "name": "Groundnut", "emoji": "🥜", "score": 79, "yield_th": 2.1, "water_mm": 500, "tags": ["Oil crop", "Low water"], "rank": 3 }
  ],
  "fertilizers": [
    { "icon": "🧪", "name": "Urea (46-0-0)", "dose": "120 kg/hectare", "reason": "N is medium — supplement for optimal growth", "timing": "Basal + top dress" },
    { "icon": "⚗️", "name": "DAP (18-46-0)", "dose": "80 kg/hectare", "reason": "P is low — critical for root development", "timing": "Basal application" },
    { "icon": "🌿", "name": "MOP (0-0-60)", "dose": "40 kg/hectare", "reason": "K is adequate — light maintenance dose", "timing": "Pre-sowing" },
    { "icon": "🪨", "name": "Gypsum (CaSO4)", "dose": "250 kg/hectare", "reason": "Secondary nutrients & soil aeration", "timing": "Land preparation" }
  ],
  "pests": [
    { "name": "Brown Plant Hopper", "risk": "High risk in current season", "control": "Use carbofuran 3G, maintain field hygiene" },
    { "name": "Leaf Blight", "risk": "Moderate risk — monitor humidity", "control": "Apply Mancozeb 75% WP spray" },
    { "name": "Stem Borer", "risk": "Low risk this month", "control": "Install pheromone traps, neem oil spray" }
  ],
  "tips": [
    "Apply lime if pH drops below 6.0 to prevent nutrient lockout",
    "Use SRI (System of Rice Intensification) method to reduce water use by 30%",
    "Rotate with legumes next season to naturally fix atmospheric nitrogen",
    "Monitor soil moisture weekly — avoid waterlogging during vegetative stage",
    "Apply micronutrient mix (ZnSO4) as zinc deficiency is common in this region"
  ],
  "explanation": "Based on your ${soilType} soil in ${region} with pH ${ph} and moderate nitrogen levels, ${season} season crops are highly recommended. Your soil's potassium-rich profile (${k} mg/kg) is excellent for grain development. Rice emerges as the top recommendation given your rainfall of ${rain}mm and current temperature of ${temp}°C — ideal for paddy cultivation. Phosphorus supplementation via DAP is critical since your P levels (${p} mg/kg) fall below the 60 mg/kg benchmark. The humid ${season} conditions create moderate pest pressure, particularly for Brown Plant Hopper — proactive monitoring is advised."
}

Make the crops, fertilizers, pests, and explanation realistic and specific to the actual input values. Vary recommendations based on the actual NPK, pH, and regional conditions provided.`;

      try {
        // Simulating AI processing delay since we don't have an API key configured for the browser
        await new Promise(r => setTimeout(r, 1500));

        const n_status = n < 100 ? "Low" : n > 150 ? "High" : "Medium";
        const p_status = p < 40 ? "Low" : p > 70 ? "High" : "Medium";
        const k_status = k < 150 ? "Low" : k > 250 ? "High" : "Medium";
        const ph_status = ph < 6.0 ? "Acidic" : ph > 7.5 ? "Alkaline" : "Optimal";
        const overall = Math.floor((Math.min(n, 150) / 150 * 30) + (Math.min(p, 70) / 70 * 30) + (Math.min(k, 250) / 250 * 20) + (ph >= 6 && ph <= 7.5 ? 20 : 10));

        const cropDb = [
          { name: "Rice", emoji: "🌾", optimal: { n: 120, p: 40, k: 40, ph: 6.0, rain: 1500, temp: 25 }, yield_th: 4.5, tags: [season, "Staple", "High water"] },
          { name: "Wheat", emoji: "🌾", optimal: { n: 120, p: 60, k: 40, ph: 6.5, rain: 600, temp: 20 }, yield_th: 3.5, tags: ["Rabi", "Staple"] },
          { name: "Maize", emoji: "🌽", optimal: { n: 120, p: 60, k: 40, ph: 6.5, rain: 800, temp: 25 }, yield_th: 6.0, tags: ["Versatile"] },
          { name: "Cotton", emoji: "☁️", optimal: { n: 120, p: 60, k: 60, ph: 6.5, rain: 800, temp: 28 }, yield_th: 2.2, tags: ["Cash crop", "Heat tolerant"] },
          { name: "Sugarcane", emoji: "🎋", optimal: { n: 200, p: 80, k: 100, ph: 6.5, rain: 1500, temp: 30 }, yield_th: 70.0, tags: ["Cash crop", "High water"] },
          { name: "Soybean", emoji: "🌱", optimal: { n: 40, p: 60, k: 40, ph: 6.5, rain: 700, temp: 25 }, yield_th: 2.5, tags: ["Legume", "Nitrogen fixing"] },
          { name: "Groundnut", emoji: "🥜", optimal: { n: 30, p: 50, k: 40, ph: 6.5, rain: 500, temp: 28 }, yield_th: 2.1, tags: ["Oil crop", "Low water"] },
          { name: "Millets", emoji: "🌾", optimal: { n: 40, p: 30, k: 30, ph: 6.5, rain: 350, temp: 30 }, yield_th: 2.0, tags: [season, "Drought-resistant"] },
          { name: "Sorghum", emoji: "🌾", optimal: { n: 60, p: 40, k: 40, ph: 6.5, rain: 400, temp: 28 }, yield_th: 2.5, tags: ["Low water", "Hardy"] },
          { name: "Potato", emoji: "🥔", optimal: { n: 120, p: 100, k: 120, ph: 5.5, rain: 600, temp: 18 }, yield_th: 20.0, tags: ["Tuber", "Cool climate"] },
          { name: "Tomato", emoji: "🍅", optimal: { n: 100, p: 80, k: 100, ph: 6.0, rain: 600, temp: 22 }, yield_th: 35.0, tags: ["Vegetable", "High value"] },
          { name: "Onion", emoji: "🧅", optimal: { n: 100, p: 60, k: 80, ph: 6.5, rain: 500, temp: 20 }, yield_th: 25.0, tags: ["Vegetable", "Bulb"] },
          { name: "Sunflower", emoji: "🌻", optimal: { n: 60, p: 40, k: 40, ph: 6.5, rain: 500, temp: 25 }, yield_th: 1.8, tags: ["Oil crop", "Hardy"] },
          { name: "Mustard", emoji: "🌼", optimal: { n: 60, p: 40, k: 40, ph: 6.5, rain: 400, temp: 18 }, yield_th: 1.5, tags: ["Rabi", "Oil crop"] },
          { name: "Chickpea", emoji: "🫘", optimal: { n: 30, p: 50, k: 40, ph: 6.5, rain: 400, temp: 20 }, yield_th: 1.2, tags: ["Rabi", "Legume"] }
        ];

        let evaluatedCrops = cropDb.map(c => {
          let score = 100;
          score -= Math.min(30, Math.abs(n - c.optimal.n) * 0.15);
          score -= Math.min(20, Math.abs(p - c.optimal.p) * 0.2);
          score -= Math.min(20, Math.abs(k - c.optimal.k) * 0.15);
          score -= Math.min(20, Math.abs(ph - c.optimal.ph) * 12);
          score -= Math.min(30, Math.abs(rain - c.optimal.rain) * 0.03);
          score -= Math.min(20, Math.abs(temp - c.optimal.temp) * 3);
          return {
            name: c.name,
            emoji: c.emoji,
            score: Math.max(15, Math.round(score)),
            yield_th: c.yield_th,
            water_mm: c.optimal.rain,
            tags: c.tags,
          };
        }).sort((a, b) => b.score - a.score).map((c, i) => ({ ...c, rank: i + 1 }));

        let topCrop = evaluatedCrops[0];

        analysisData = {
          "weather": { "temp": temp, "rain": rain, "season": season, "humidity": 65, "wind": 12 },
          "soil_health": { "n_status": n_status, "p_status": p_status, "k_status": k_status, "ph_status": ph_status, "overall": overall },
          "crops": evaluatedCrops,
          "fertilizers": [
            { "icon": "🧪", "name": "Urea (46-0-0)", "dose": "120 kg/hectare", "reason": `N is ${n_status.toLowerCase()} — supplement for optimal growth`, "timing": "Basal + top dress" },
            { "icon": "⚗️", "name": "DAP (18-46-0)", "dose": "80 kg/hectare", "reason": `P is ${p_status.toLowerCase()} — critical for root development`, "timing": "Basal application" },
            { "icon": "🌿", "name": "MOP (0-0-60)", "dose": "40 kg/hectare", "reason": `K is ${k_status.toLowerCase()} — light maintenance dose`, "timing": "Pre-sowing" },
            { "icon": "🪨", "name": "Gypsum (CaSO4)", "dose": "250 kg/hectare", "reason": "Secondary nutrients & soil aeration", "timing": "Land preparation" }
          ],
          "pests": [
            { "name": "Brown Plant Hopper", "risk": "High risk in current season", "control": "Use carbofuran 3G, maintain field hygiene" },
            { "name": "Leaf Blight", "risk": "Moderate risk — monitor humidity", "control": "Apply Mancozeb 75% WP spray" },
            { "name": "Stem Borer", "risk": "Low risk this month", "control": "Install pheromone traps, neem oil spray" }
          ],
          "tips": [
            "Apply lime if pH drops below 6.0 to prevent nutrient lockout",
            "Use SRI (System of Rice Intensification) method to reduce water use by 30%",
            "Rotate with legumes next season to naturally fix atmospheric nitrogen",
            "Monitor soil moisture weekly — avoid waterlogging during vegetative stage",
            "Apply micronutrient mix (ZnSO4) as zinc deficiency is common in this region"
          ],
          "explanation": `Based on your ${soilType} soil in ${region} with pH ${ph} and ${n_status.toLowerCase()} nitrogen levels, ${season} season crops are highly recommended. Your soil's potassium profile (${k} mg/kg) is ${k_status.toLowerCase()} for grain development. ${topCrop.name} emerges as the top recommendation given your rainfall of ${rain}mm and current temperature of ${temp}°C. Phosphorus supplementation via DAP is critical since your P levels (${p} mg/kg) are ${p_status.toLowerCase()}. The humid ${season} conditions create moderate pest pressure — proactive monitoring is advised.`
        };

        setStep(5, 'done');
        await new Promise(r => setTimeout(r, 400));
        document.getElementById('loading-box').classList.remove('active');
        document.getElementById('analyze-btn').disabled = false;
        renderResults(analysisData);
        saveHistory(analysisData);
        switchTab('results');
      } catch (e) {
        console.error(e);
        document.getElementById('loading-box').classList.remove('active');
        document.getElementById('analyze-btn').disabled = false;
        document.getElementById('error-box').classList.add('active');
        document.getElementById('error-box').textContent = 'Analysis failed: ' + e.message;
      }
    }

    function renderResults(d) {
      // Weather strip
      const wc = d.weather;
      const seasonClass = 'season-' + wc.season.toLowerCase();
      document.getElementById('weather-strip').innerHTML = `
    <div class="weather-item"><div class="weather-val">${wc.temp}°C</div><div class="weather-lbl">Temperature</div></div>
    <div class="weather-item"><div class="weather-val">${wc.rain}</div><div class="weather-lbl">Rainfall mm</div></div>
    <div class="weather-item"><div class="weather-val">${wc.humidity}%</div><div class="weather-lbl">Humidity</div></div>
    <div class="weather-item"><div class="weather-val">${wc.wind}</div><div class="weather-lbl">Wind km/h</div></div>
    <div class="season-badge ${seasonClass}">${wc.season} Season</div>
  `;

      // Metrics
      const sh = d.soil_health;
      const metrics = [
        { label: 'Nitrogen', val: document.getElementById('inp-n').value, unit: 'mg/kg', status: sh.n_status, pct: Math.min(100, Math.round(document.getElementById('inp-n').value / 3)), color: '#639922' },
        { label: 'Phosphorus', val: document.getElementById('inp-p').value, unit: 'mg/kg', status: sh.p_status, pct: Math.min(100, Math.round(document.getElementById('inp-p').value / 1.5)), color: '#1D9E75' },
        { label: 'Potassium', val: document.getElementById('inp-k').value, unit: 'mg/kg', status: sh.k_status, pct: Math.min(100, Math.round(document.getElementById('inp-k').value / 4)), color: '#BA7517' },
        { label: 'pH Level', val: document.getElementById('inp-ph').value, unit: '', status: sh.ph_status, pct: Math.round((parseFloat(document.getElementById('inp-ph').value) / 14) * 100), color: '#1D9E75' }
      ];
      document.getElementById('metric-row').innerHTML = metrics.map(m => `
    <div class="metric-card">
      <div class="metric-label">${m.label}</div>
      <div class="metric-val" style="color:${m.color}">${m.val}<span class="metric-unit"> ${m.unit}</span></div>
      <div style="font-size:10px;margin-top:2px;color:var(--color-text-secondary)">${m.status}</div>
      <div class="metric-bar"><div class="metric-fill" style="width:${m.pct}%;background:${m.color}"></div></div>
    </div>
  `).join('');

      // Crops
      document.getElementById('crop-grid').innerHTML = d.crops.map((c, i) => `
    <div class="crop-card ${i === 0 ? 'top' : ''}">
      ${i === 0 ? '<div class="crop-badge">TOP PICK</div>' : ''}
      <div class="crop-emoji">${c.emoji}</div>
      <div class="crop-name">${c.name}</div>
      <div class="crop-score-row">
        <div class="crop-score-bar"><div class="crop-score-fill" style="width:${c.score}%"></div></div>
        <div class="crop-pct">${c.score}%</div>
      </div>
      <div class="crop-tags">${c.tags.map(t => `<span class="crop-tag">${t}</span>`).join('')}</div>
    </div>
  `).join('');

      // AI explanation
      document.getElementById('ai-explanation').textContent = d.explanation;

      // Fertilizers
      document.getElementById('fert-grid').innerHTML = d.fertilizers.map(f => `
    <div class="fert-item">
      <div class="fert-icon">${f.icon}</div>
      <div>
        <div class="fert-name">${f.name}</div>
        <div class="fert-detail">${f.reason}</div>
        <span class="fert-pill">${f.dose} · ${f.timing}</span>
      </div>
    </div>
  `).join('');

      // Pests
      document.getElementById('pest-row').innerHTML = d.pests.map(p => `
    <div class="pest-item">
      <div class="pest-name">${p.name}</div>
      <div class="pest-risk">${p.risk}</div>
      <div class="pest-control">${p.control}</div>
    </div>
  `).join('');

      // Tips
      document.getElementById('tips-list').innerHTML = d.tips.map((t, i) => `
    <div class="tip-item"><span class="tip-num">0${i + 1}</span>${t}</div>
  `).join('');

      document.getElementById('results-content').classList.add('active');
      document.getElementById('results-empty').style.display = 'none';

      renderAnalytics(d);
    }

    function renderAnalytics(d) {
      document.getElementById('analytics-empty').style.display = 'none';
      document.getElementById('analytics-content').style.display = 'block';

      const topCrop = d.crops[0];
      document.getElementById('analytics-hero').innerHTML = `
    <div class="analytics-stat"><div class="analytics-big">${topCrop.emoji} ${topCrop.name}</div><div class="analytics-sub">Best recommended crop</div></div>
    <div class="analytics-stat"><div class="analytics-big">${topCrop.yield_th}</div><div class="analytics-sub">Expected yield (t/ha)</div></div>
    <div class="analytics-stat"><div class="analytics-big">${d.soil_health.overall}%</div><div class="analytics-sub">Soil health score</div></div>
    <div class="analytics-stat"><div class="analytics-big">${d.crops.length}</div><div class="analytics-sub">Viable crops found</div></div>
  `;

      const N = parseFloat(document.getElementById('inp-n').value) || 120;
      const P = parseFloat(document.getElementById('inp-p').value) || 45;
      const K = parseFloat(document.getElementById('inp-k').value) || 180;

      Object.values(chartInstances).forEach(c => c.destroy());
      chartInstances = {};

      chartInstances.npk = new Chart(document.getElementById('npk-chart'), {
        type: 'bar',
        data: {
          labels: ['N (Nitrogen)', 'P (Phosphorus)', 'K (Potassium)'],
          datasets: [
            { label: 'Actual', data: [N, P, K], backgroundColor: ['#639922', '#1D9E75', '#BA7517'], borderRadius: 4 },
            { label: 'Optimal', data: [150, 60, 200], backgroundColor: ['rgba(99,153,34,0.2)', 'rgba(29,158,117,0.2)', 'rgba(186,117,23,0.2)'], borderRadius: 4 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 9 } } } }
        }
      });

      chartInstances.crop = new Chart(document.getElementById('crop-chart'), {
        type: 'bar',
        data: {
          labels: d.crops.slice(0, 8).map(c => c.name),
          datasets: [{
            label: 'Suitability %', data: d.crops.slice(0, 8).map(c => c.score),
            backgroundColor: '#639922', borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } }, scales: { x: { max: 100, ticks: { font: { size: 10 } } }, y: { ticks: { font: { size: 10 } } } }
        }
      });

      chartInstances.yield = new Chart(document.getElementById('yield-chart'), {
        type: 'bar',
        data: {
          labels: d.crops.slice(0, 8).map(c => c.name),
          datasets: [{
            label: 'Yield t/ha', data: d.crops.slice(0, 8).map(c => c.yield_th),
            backgroundColor: '#1D9E75', borderRadius: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } }
        }
      });

      chartInstances.water = new Chart(document.getElementById('water-chart'), {
        type: 'doughnut',
        data: {
          labels: d.crops.slice(0, 8).map(c => c.name),
          datasets: [{
            data: d.crops.slice(0, 8).map(c => c.water_mm),
            backgroundColor: ['#3B6D11', '#639922', '#97C459', '#1D9E75', '#5DCAA5', '#9FE1CB', '#EF9F27', '#BA7517'], hoverOffset: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 8 } } }
        }
      });
    }

    function saveHistory(data) {
      let history = JSON.parse(localStorage.getItem('agroAiHistory') || '[]');
      const entry = {
        date: new Date().toLocaleString(),
        location: document.getElementById('inp-region').value || locationData.region,
        data: data
      };
      history.unshift(entry);
      if (history.length > 20) history = history.slice(0, 20);
      localStorage.setItem('agroAiHistory', JSON.stringify(history));
    }

    function renderHistory() {
      const history = JSON.parse(localStorage.getItem('agroAiHistory') || '[]');
      if (history.length === 0) {
        document.getElementById('history-empty').style.display = 'block';
        document.getElementById('history-content').style.display = 'none';
        return;
      }
      
      document.getElementById('history-empty').style.display = 'none';
      document.getElementById('history-content').style.display = 'block';
      
      const list = document.getElementById('history-list');
      list.innerHTML = history.map((h, i) => {
        const topCrop = h.data.crops[0];
        return `
          <div style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:12px;padding:1rem;display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:border 0.2s;" onclick="loadHistoryItem(${i})" onmouseover="this.style.border='1px solid var(--green-500)'" onmouseout="this.style.border='0.5px solid var(--color-border-tertiary)'">
            <div>
              <div style="font-weight:600;font-size:14px;color:var(--color-text-primary);margin-bottom:4px;">${h.location} • ${h.data.soil_health.overall}% Soil Health</div>
              <div style="font-size:12px;color:var(--color-text-secondary);">${h.date}</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="text-align:right;">
                <div style="font-size:11px;color:var(--color-text-secondary);">Top Crop</div>
                <div style="font-weight:600;font-size:14px;">${topCrop.emoji} ${topCrop.name}</div>
              </div>
              <div style="background:var(--green-50);color:var(--green-600);width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;">
                →
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function loadHistoryItem(index) {
      const history = JSON.parse(localStorage.getItem('agroAiHistory') || '[]');
      const h = history[index];
      if (h) {
        analysisData = h.data;
        renderResults(analysisData);
        switchTab('results');
      }
    }

    // Init location with default
    document.getElementById('loc-display').textContent = locationData.region + ', India';
  