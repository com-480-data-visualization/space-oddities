function initPhysicsPanel(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return { setPhysicsStep() {}, destroy() {} };

  // ── inject scoped styles ──────────────────────────────────────────────────
  const styleId = 'physics-panel-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #${containerId} {
        background: var(--bg-1, #091b36);
        border: 1px solid rgba(160,184,217,0.18);
        border-radius: 12px;
        padding: 20px;
        font-family: "Space Grotesk", "Segoe UI", sans-serif;
        color: var(--text, #eaf0fb);
        position: relative;
        overflow: hidden;
      }
      .physics-header {
        font-size: 1.1rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        color: var(--accent, #8ed7ff);
        margin-bottom: 14px;
        text-transform: uppercase;
      }
      #streakCanvas {
        display: block;
        width: 100%;
        height: 120px;
        border-radius: 8px;
        margin-bottom: 14px;
        background: rgba(3,5,15,0.6);
      }
      #speedChartDiv {
        margin-bottom: 14px;
      }
      #speedChartDiv svg {
        display: block;
        width: 100%;
        height: auto;
      }
      #kesslerDiv {
        position: relative;
        margin-bottom: 14px;
      }
      #kesslerDiv svg {
        display: block;
        width: 100%;
        height: auto;
      }
      .stage-panel {
        position: absolute;
        top: 0; left: 0;
        width: 100%;
        opacity: 0;
        transition: opacity 400ms ease;
        pointer-events: none;
      }
      .stage-panel.active {
        opacity: 1;
        pointer-events: auto;
      }
      .physics-callouts {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .physics-callout {
        font-size: 0.85rem;
        color: var(--muted, #9dafcc);
        border-left: 2px solid var(--accent, #8ed7ff);
        padding-left: 8px;
        line-height: 1.5;
      }
      @keyframes burst {
        0%   { r: 5;  opacity: 1; }
        100% { r: 60; opacity: 0; }
      }
      .burst-circle {
        animation: burst 600ms ease-out forwards;
      }
    `;
    document.head.appendChild(style);
  }

  // ── build DOM ─────────────────────────────────────────────────────────────
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'physics-header';
  header.textContent = 'Why Collisions Are Catastrophic';
  container.appendChild(header);

  const canvas = document.createElement('canvas');
  canvas.id = 'streakCanvas';
  container.appendChild(canvas);

  const speedChartDiv = document.createElement('div');
  speedChartDiv.id = 'speedChartDiv';
  container.appendChild(speedChartDiv);

  const kesslerDiv = document.createElement('div');
  kesslerDiv.id = 'kesslerDiv';
  container.appendChild(kesslerDiv);

  const calloutsDiv = document.createElement('div');
  calloutsDiv.className = 'physics-callouts';
  container.appendChild(calloutsDiv);

  const calloutTexts = [
    '7 km/s = 20× faster than a rifle bullet',
    'Relative closing speed in crossing orbits: up to ~14 km/s',
    'Iridium 33 × Cosmos 2251 (Feb 2009): 2,300+ new tracked fragments',
  ];
  calloutTexts.forEach(text => {
    const el = document.createElement('div');
    el.className = 'physics-callout';
    el.textContent = text;
    calloutsDiv.appendChild(el);
  });

  // ── streak canvas animation ───────────────────────────────────────────────
  let rafId = null;
  let currentStep = 0;

  // stars: pre-compute fixed positions
  const stars = Array.from({ length: 25 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.2 + 0.3,
    a: Math.random() * 0.45 + 0.1,
  }));

  // satellite state
  const sat = { x: 0, speed: 0.0042 }; // fraction of width per frame (~7 km/s feel)

  function startStreakAnimation() {
    const ctx = canvas.getContext('2d');

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || 600;
      canvas.height = 120;
    }
    resize();
    window.addEventListener('resize', resize);

    function drawFrame() {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // background fill
      ctx.fillStyle = 'rgba(3,5,15,0.6)';
      ctx.fillRect(0, 0, W, H);

      // stars
      stars.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${s.a})`;
        ctx.fill();
      });

      // advance satellite
      sat.x += sat.speed;
      if (sat.x > 1.05) sat.x = -0.08;

      const sx = sat.x * W;
      const sy = H * 0.5;
      const tailLen = W * 0.13;

      // comet tail gradient
      const grad = ctx.createLinearGradient(sx - tailLen, sy, sx, sy);
      grad.addColorStop(0, 'rgba(142,215,255,0)');
      grad.addColorStop(0.6, 'rgba(142,215,255,0.18)');
      grad.addColorStop(1, 'rgba(255,255,255,0.7)');

      ctx.beginPath();
      ctx.moveTo(sx - tailLen, sy - 2);
      ctx.lineTo(sx, sy - 2);
      ctx.lineTo(sx, sy + 2);
      ctx.lineTo(sx - tailLen, sy + 2);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // satellite dot
      const dotGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 6);
      dotGrad.addColorStop(0, '#ffffff');
      dotGrad.addColorStop(0.5, '#8ed7ff');
      dotGrad.addColorStop(1, 'rgba(142,215,255,0)');
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fillStyle = dotGrad;
      ctx.fill();

      // speed label
      ctx.font = '11px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#9dafcc';
      ctx.textAlign = 'right';
      ctx.fillText('7.8 km/s · 25,200 km/h · Mach 20', W - 10, H - 8);

      rafId = requestAnimationFrame(drawFrame);
    }

    rafId = requestAnimationFrame(drawFrame);
  }

  // ── D3 speed comparison bar chart ────────────────────────────────────────
  function drawSpeedChart() {
    const data = [
      { label: 'Formula 1 car',           speed: 0.1,  type: 'slow' },
      { label: 'Commercial airliner',      speed: 0.25, type: 'slow' },
      { label: 'Rifle bullet',             speed: 0.9,  type: 'slow' },
      { label: 'LEO satellite',            speed: 7.8,  type: 'sat'  },
      { label: 'Relative close approach',  speed: 14.0, type: 'rel'  },
    ];

    const vbW = 360, vbH = 160;
    const marginLeft = 130, marginRight = 50, marginTop = 24, marginBottom = 24;
    const chartW = vbW - marginLeft - marginRight;
    const chartH = vbH - marginTop - marginBottom;
    const barH = Math.floor(chartH / data.length) - 4;

    const colorMap = {
      slow: '#9dafcc',
      sat:  '#8ed7ff',
      rel:  '#fb7185',
    };

    const xScale = d3.scaleLinear()
      .domain([0, 15])
      .range([0, chartW]);

    const yScale = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, chartH])
      .padding(0.22);

    const svg = d3.select(speedChartDiv)
      .append('svg')
      .attr('viewBox', `0 0 ${vbW} ${vbH}`)
      .attr('xmlns', 'http://www.w3.org/2000/svg');

    // title
    svg.append('text')
      .attr('x', vbW / 2)
      .attr('y', 13)
      .attr('text-anchor', 'middle')
      .attr('font-family', '"Space Grotesk", sans-serif')
      .attr('font-size', 9)
      .attr('font-weight', '600')
      .attr('letter-spacing', '0.08em')
      .attr('fill', '#9dafcc')
      .attr('text-transform', 'uppercase')
      .text('SPEED COMPARISON (km/s)');

    const g = svg.append('g')
      .attr('transform', `translate(${marginLeft},${marginTop})`);

    // grid lines
    g.append('g')
      .selectAll('line.grid')
      .data(xScale.ticks(5))
      .join('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', chartH)
      .attr('stroke', 'rgba(157,175,204,0.12)')
      .attr('stroke-width', 1);

    // bars
    g.selectAll('rect.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.label))
      .attr('width', d => Math.max(xScale(d.speed), 2))
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorMap[d.type])
      .attr('rx', 2);

    // label left of chart (y-axis labels)
    g.selectAll('text.ylabel')
      .data(data)
      .join('text')
      .attr('class', 'ylabel')
      .attr('x', -6)
      .attr('y', d => yScale(d.label) + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', '"Space Grotesk", sans-serif')
      .attr('font-size', 9)
      .attr('fill', '#9dafcc')
      .text(d => d.label);

    // speed value right of bar
    g.selectAll('text.val')
      .data(data)
      .join('text')
      .attr('class', 'val')
      .attr('x', d => xScale(d.speed) + 4)
      .attr('y', d => yScale(d.label) + yScale.bandwidth() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-family', '"Space Grotesk", sans-serif')
      .attr('font-size', 9)
      .attr('fill', d => colorMap[d.type])
      .text(d => `${d.speed} km/s`);

    // bottom note
    svg.append('text')
      .attr('x', 8)
      .attr('y', vbH - 4)
      .attr('font-family', '"Space Grotesk", sans-serif')
      .attr('font-size', 8.5)
      .attr('fill', '#fb7185')
      .text('★ "1 cm bolt at orbital speed = kinetic energy of a hand grenade"');
  }

  // ── Kessler cascade SVG ───────────────────────────────────────────────────
  function buildKesslerSVG() {
    const vbW = 400, vbH = 200;

    // wrapper keeps relative stacking for the stage divs
    kesslerDiv.style.position = 'relative';

    const wrapSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    wrapSvg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
    wrapSvg.style.width = '100%';
    wrapSvg.style.height = 'auto';
    wrapSvg.style.display = 'block';

    // ── helper to create an SVG element ──────────────────────────────────────
    function svgEl(tag, attrs) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      return el;
    }

    function makeArrow(x1, y1, x2, y2, color) {
      const g = svgEl('g', {});
      g.appendChild(svgEl('line', {
        x1, y1, x2, y2,
        stroke: color, 'stroke-width': 2,
        'marker-end': `url(#arr-${color.replace('#','')})`
      }));
      return g;
    }

    // defs: arrowheads
    const defs = svgEl('defs', {});
    [['arr-8ed7ff','#8ed7ff'],['arr-fb7185','#fb7185'],['arr-fbbf24','#fbbf24']].forEach(([id, col]) => {
      const marker = svgEl('marker', {
        id, markerWidth: 6, markerHeight: 6,
        refX: 5, refY: 3, orient: 'auto'
      });
      const path = svgEl('path', { d: 'M0,0 L6,3 L0,6 Z', fill: col });
      marker.appendChild(path);
      defs.appendChild(marker);
    });
    wrapSvg.appendChild(defs);

    const stages = [];

    // ── Stage 0 — Approach ───────────────────────────────────────────────────
    {
      const g = svgEl('g', { class: 'stage-panel active', 'data-stage': '0' });

      // object A
      g.appendChild(svgEl('circle', { cx: 80, cy: 100, r: 10, fill: '#8ed7ff' }));
      g.appendChild(svgEl('text', { x: 80, y: 104, 'text-anchor': 'middle',
        'font-size': 9, fill: '#03050f', 'font-family': 'Space Grotesk,sans-serif',
        'font-weight': 700 })).textContent = 'A';

      // object B
      g.appendChild(svgEl('circle', { cx: 320, cy: 100, r: 10, fill: '#fbbf24' }));
      g.appendChild(svgEl('text', { x: 320, y: 104, 'text-anchor': 'middle',
        'font-size': 9, fill: '#03050f', 'font-family': 'Space Grotesk,sans-serif',
        'font-weight': 700 })).textContent = 'B';

      // arrows toward center
      g.appendChild(svgEl('line', {
        x1: 100, y1: 100, x2: 170, y2: 100,
        stroke: '#8ed7ff', 'stroke-width': 2,
        'marker-end': 'url(#arr-8ed7ff)'
      }));
      g.appendChild(svgEl('line', {
        x1: 300, y1: 100, x2: 230, y2: 100,
        stroke: '#fbbf24', 'stroke-width': 2,
        'marker-end': 'url(#arr-fbbf24)'
      }));

      // label
      const label = svgEl('text', {
        x: 200, y: 175, 'text-anchor': 'middle',
        'font-size': 11, fill: '#9dafcc',
        'font-family': 'Space Grotesk,sans-serif'
      });
      label.textContent = 'Two objects on collision course';
      g.appendChild(label);

      wrapSvg.appendChild(g);
      stages.push(g);
    }

    // ── Stage 1 — Imminent collision ─────────────────────────────────────────
    {
      const g = svgEl('g', { class: 'stage-panel', 'data-stage': '1' });

      g.appendChild(svgEl('circle', { cx: 160, cy: 100, r: 10, fill: '#8ed7ff' }));
      g.appendChild(svgEl('text', { x: 160, y: 104, 'text-anchor': 'middle',
        'font-size': 9, fill: '#03050f', 'font-family': 'Space Grotesk,sans-serif',
        'font-weight': 700 })).textContent = 'A';

      g.appendChild(svgEl('circle', { cx: 240, cy: 100, r: 10, fill: '#fbbf24' }));
      g.appendChild(svgEl('text', { x: 240, y: 104, 'text-anchor': 'middle',
        'font-size': 9, fill: '#03050f', 'font-family': 'Space Grotesk,sans-serif',
        'font-weight': 700 })).textContent = 'B';

      // shorter arrows
      g.appendChild(svgEl('line', {
        x1: 175, y1: 100, x2: 194, y2: 100,
        stroke: '#8ed7ff', 'stroke-width': 2,
        'marker-end': 'url(#arr-8ed7ff)'
      }));
      g.appendChild(svgEl('line', {
        x1: 225, y1: 100, x2: 206, y2: 100,
        stroke: '#fbbf24', 'stroke-width': 2,
        'marker-end': 'url(#arr-fbbf24)'
      }));

      // miss-distance brace
      g.appendChild(svgEl('line', {
        x1: 170, y1: 130, x2: 230, y2: 130,
        stroke: '#9dafcc', 'stroke-width': 1, 'stroke-dasharray': '3,2'
      }));
      const bd = svgEl('text', {
        x: 200, y: 143, 'text-anchor': 'middle',
        'font-size': 9, fill: '#9dafcc',
        'font-family': 'Space Grotesk,sans-serif'
      });
      bd.textContent = '~500 m';
      g.appendChild(bd);

      const label = svgEl('text', {
        x: 200, y: 175, 'text-anchor': 'middle',
        'font-size': 11, fill: '#9dafcc',
        'font-family': 'Space Grotesk,sans-serif'
      });
      label.textContent = 'Miss distance: ~500 m';
      g.appendChild(label);

      wrapSvg.appendChild(g);
      stages.push(g);
    }

    // ── Stage 2 — Explosion ───────────────────────────────────────────────────
    {
      const g = svgEl('g', { class: 'stage-panel', 'data-stage': '2' });

      // flash rect
      g.appendChild(svgEl('rect', {
        x: 150, y: 50, width: 100, height: 100,
        fill: 'rgba(255,255,255,0.08)', rx: 4
      }));

      // overlapping objects
      g.appendChild(svgEl('circle', { cx: 196, cy: 100, r: 10, fill: '#8ed7ff' }));
      g.appendChild(svgEl('circle', { cx: 204, cy: 100, r: 10, fill: '#fbbf24' }));

      // burst circle placeholder (class added on activation)
      const burst = svgEl('circle', {
        cx: 200, cy: 100, r: 5,
        fill: 'none', stroke: '#fb7185', 'stroke-width': 2,
        opacity: 0
      });
      burst.classList.add('burst-placeholder');
      g.appendChild(burst);

      const label = svgEl('text', {
        x: 200, y: 175, 'text-anchor': 'middle',
        'font-size': 11, fill: '#9dafcc',
        'font-family': 'Space Grotesk,sans-serif'
      });
      label.textContent = 'Impact at ~14 km/s relative velocity';
      g.appendChild(label);

      wrapSvg.appendChild(g);
      stages.push(g);
    }

    // ── Stage 3 — Debris fan ──────────────────────────────────────────────────
    {
      const g = svgEl('g', { class: 'stage-panel', 'data-stage': '3' });

      // 16 debris dots fanning out radially
      const numDebris = 16;
      for (let i = 0; i < numDebris; i++) {
        const angle = (i / numDebris) * Math.PI * 2;
        // bias toward rightward cone
        const biasedAngle = angle * 0.7 - Math.PI * 0.1;
        const r = 55 + (i % 4) * 15;
        const dx = Math.cos(biasedAngle) * r;
        const dy = Math.sin(biasedAngle) * r;
        const cx = Math.max(30, Math.min(370, 200 + dx));
        const cy = Math.max(20, Math.min(170, 100 + dy));
        g.appendChild(svgEl('circle', {
          cx, cy, r: 3, fill: '#fb7185', opacity: 0.9
        }));
      }

      const label = svgEl('text', {
        x: 200, y: 185, 'text-anchor': 'middle',
        'font-size': 11, fill: '#9dafcc',
        'font-family': 'Space Grotesk,sans-serif'
      });
      label.textContent = '2,000+ new debris fragments';
      g.appendChild(label);

      wrapSvg.appendChild(g);
      stages.push(g);
    }

    // ── Stage 4 — Cascade ─────────────────────────────────────────────────────
    {
      const g = svgEl('g', { class: 'stage-panel', 'data-stage': '4' });

      // smaller more-spread debris (16 dots)
      const numDebris = 16;
      for (let i = 0; i < numDebris; i++) {
        const angle = (i / numDebris) * Math.PI * 2;
        const biasedAngle = angle * 0.75 - Math.PI * 0.15;
        const r = 70 + (i % 5) * 14;
        const dx = Math.cos(biasedAngle) * r;
        const dy = Math.sin(biasedAngle) * r;
        const cx = Math.max(15, Math.min(385, 200 + dx));
        const cy = Math.max(10, Math.min(185, 100 + dy));
        g.appendChild(svgEl('circle', {
          cx, cy, r: 2.5, fill: '#fb7185', opacity: 0.75
        }));
      }

      // 8 additional tiny dots
      const tiny = [
        [50,60],[60,140],[340,55],[350,145],[30,100],[370,100],[100,30],[300,165]
      ];
      tiny.forEach(([cx,cy]) => {
        g.appendChild(svgEl('circle', { cx, cy, r: 2, fill: '#fb7185', opacity: 0.5 }));
      });

      // 2 target satellites
      const targets = [[60, 55], [340, 145]];
      targets.forEach(([cx,cy], i) => {
        g.appendChild(svgEl('circle', { cx, cy, r: 7,
          fill: i === 0 ? '#7dd3fc' : '#a78bfa', opacity: 0.9 }));
      });

      // threat lines from 2 debris pieces toward targets
      const threatPairs = [
        [120, 80,  60,  55],
        [280, 135, 340, 145],
      ];
      threatPairs.forEach(([x1,y1,x2,y2]) => {
        g.appendChild(svgEl('line', {
          x1, y1, x2, y2,
          stroke: '#fb7185', 'stroke-width': 1.5,
          'stroke-dasharray': '5,3', opacity: 0.85,
          'marker-end': 'url(#arr-fb7185)'
        }));
      });

      const label = svgEl('text', {
        x: 200, y: 195, 'text-anchor': 'middle',
        'font-size': 10, fill: '#fb7185',
        'font-family': 'Space Grotesk,sans-serif', 'font-weight': 600
      });
      label.textContent = 'Kessler Syndrome: cascade of collisions';
      g.appendChild(label);

      wrapSvg.appendChild(g);
      stages.push(g);
    }

    kesslerDiv.appendChild(wrapSvg);
    return stages;
  }

  // ── initialise everything ─────────────────────────────────────────────────
  startStreakAnimation();
  drawSpeedChart();
  const stagePanels = buildKesslerSVG();

  // ── public API ────────────────────────────────────────────────────────────
  const physicsPanel = {
    setPhysicsStep(step) {
      currentStep = Math.max(0, Math.min(4, step));
      stagePanels.forEach((panel, i) => {
        if (i === currentStep) {
          panel.classList.add('active');
          // trigger burst animation on stage 2
          if (currentStep === 2) {
            const bp = panel.querySelector('.burst-placeholder');
            if (bp) {
              // clone-replace to restart animation
              const clone = bp.cloneNode(true);
              clone.classList.remove('burst-placeholder');
              clone.classList.add('burst-circle');
              clone.setAttribute('opacity', 1);
              clone.setAttribute('r', 5);
              bp.parentNode.insertBefore(clone, bp);
              // remove after animation
              setTimeout(() => clone.remove(), 650);
            }
          }
        } else {
          panel.classList.remove('active');
        }
      });
    },

    destroy() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener('resize', () => {});
      container.innerHTML = '';
      const s = document.getElementById(styleId);
      if (s) s.remove();
    },
  };

  return physicsPanel;
}
