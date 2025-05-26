import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale, yScale, usableArea, commits; // Global scope for shared use

let commitProgress = 100;
let commitMaxTime;
let timeScale;
let filteredCommits = []; 
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// Load and parse CSV data
async function loadData() {
  const data = await d3.csv("./loc.csv", (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

// Process commits into summary objects
function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const { author, date, time, timezone, datetime } = lines[0];
      const ret = {
        id: commit,
        url: "https://github.com/vis-society/lab-7/commit/" + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, "lines", {
        value: lines,
        writable: true,
        configurable: true,
        enumerable: false,
      });

      return ret;
    })
    .sort((a, b) => d3.ascending(a.datetime, b.datetime)); // ✅ sort by datetime
}


function renderCommitInfo(data, commits) {
  const dl = d3.select("#stats").append("dl").attr("class", "stats");

  dl.append("dt").html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append("dd").attr("id", "stat-loc").text(data.length);

  dl.append("dt").text("Total commits");
  dl.append("dd").attr("id", "total-commits").text(commits.length);

  dl.append("dt").text("Files");
  dl.append("dd").attr("id", "stat-files").text(d3.groups(data, d => d.file).length);

  dl.append("dt").text("Max depth");
  dl.append("dd").attr("id", "stat-depth").text(d3.max(data, d => d.depth));

  dl.append("dt").text("Longest line");
  dl.append("dd").attr("id", "stat-length").text(d3.max(data, d => d.length));

  const fileLineCounts = d3.rollups(data, v => v.length, d => d.file);
  dl.append("dt").text("Max lines in file");
  dl.append("dd").attr("id", "stat-maxfile").text(d3.max(fileLineCounts, d => d[1]));
}


function renderTooltipContent(commit) {
  if (!commit) return;
  document.getElementById("commit-link").href = commit.url;
  document.getElementById("commit-link").textContent = commit.id;
  document.getElementById("commit-date").textContent =
    commit.datetime.toLocaleDateString();
    document.getElementById("commit-time-detail").textContent = commit.datetime.toLocaleTimeString();
  document.getElementById("commit-author").textContent = commit.author;
  document.getElementById("commit-lines").textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById("commit-tooltip").hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.style.left = `${event.clientX + 15}px`;
  tooltip.style.top = `${event.clientY + 15}px`;
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x0 <= x && x <= x1 && y0 <= y && y <= y1;
}

function renderSelectionCount(selection) {
  const selected = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  document.getElementById("selection-count").textContent = selected.length
    ? `${selected.length} commits selected`
    : "No commits selected";
  return selected;
}

function renderLanguageBreakdown(selection) {
  const selected = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const lines = selected.flatMap((d) => d.lines);
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );
  const container = document.getElementById("language-breakdown");
  container.innerHTML = "";
  for (const [language, count] of breakdown) {
    const percent = d3.format(".1%")(count / lines.length);
    container.innerHTML += `<dt>${language}</dt><dd>${count} lines (${percent})</dd>`;
  }
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll("circle").classed("selected", (d) =>
    isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function renderScatterPlot(data, allCommits) {
  commits = allCommits;

  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };

  usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const sortedCommits = d3.sort(commits, (d) => d.totalLines);
  const [minLines, maxLines] = d3.extent(sortedCommits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width));

    svg
    .append("g")
    .attr("transform", `translate(0, ${usableArea.bottom})`)
    .attr("class", "x-axis")
    .call(d3.axisBottom(xScale));
  
  svg
    .append("g")
    .attr("transform", `translate(${usableArea.left}, 0)`)
    .attr("class", "y-axis")
    .call(
      d3.axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, "0") + ":00")
    );

  const brush = d3
    .brush()
    .extent([
      [usableArea.left, usableArea.top],
      [usableArea.right, usableArea.bottom],
    ])
    .on("start brush end", brushed);
  svg.call(brush);
  svg.selectAll(".dots, .overlay ~ *").raise();

  svg
    .append("g")
    .attr("class", "dots")
    .selectAll("circle")
    .data(sortedCommits, (d) => d.id)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime) + (Math.random() - 0.5) * 8)
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.6)
    .on("mouseenter", (event, d) => {
      d3.select(event.currentTarget).style("fill-opacity", 1);
      renderTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mousemove", updateTooltipPosition)
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7);
      updateTooltipVisibility(false);
    });
}

function updateScatterPlot(data, commits) {
  const svg = d3.select("#chart").select("svg");

  xScale.domain(d3.extent(commits, (d) => d.datetime));
  const xAxis = d3.axisBottom(xScale);

  // Update X Axis
  const xAxisGroup = svg.select("g.x-axis");
  xAxisGroup.selectAll("*").remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select("g.dots");

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  dots
    .selectAll("circle")
    .data(sortedCommits, (d) => d.id)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7)
    .on("mouseenter", (event, commit) => {
      d3.select(event.currentTarget).style("fill-opacity", 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7);
      updateTooltipVisibility(false);
    });
}

function updateFileDisplay(filteredCommits) {
  let lines = filteredCommits.flatMap((d) => d.lines);

  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length); // Step 2.3

  let filesContainer = d3
    .select("#files")
    .selectAll("div")
    .data(files, (d) => d.name)
    .join((enter) =>
      enter.append("div").call((div) => {
        div.append("dt").append("code");
        div.append("dd");
      })
    );

  filesContainer.select("dt > code").html(
    (d) =>
      `${d.name} <br><small style="display:block;opacity:0.6">${d.lines.length} lines</small>`
  );

  filesContainer
    .select("dd")
    .selectAll("div")
    .data((d) => d.lines)
    .join("div")
    .attr("class", "loc")
    .attr("style", (d) => `--color: ${colors(d.type)}`); // Step 2.4
}

function updateStats(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.lines);

  document.getElementById("stat-loc").textContent = lines.length;
  document.getElementById("total-commits").textContent = filteredCommits.length;
  document.getElementById("stat-files").textContent = d3.groups(lines, d => d.file).length;
  document.getElementById("stat-depth").textContent = d3.max(lines, d => d.depth);
  document.getElementById("stat-length").textContent = d3.max(lines, d => d.length);

  const fileLineCounts = d3.rollups(lines, v => v.length, d => d.file);
  document.getElementById("stat-maxfile").textContent = d3.max(fileLineCounts, d => d[1]);
}


// Initial load + render
//
const data = await loadData();
const commitData = processCommits(data);
renderCommitInfo(data, commitData);
renderScatterPlot(data, commitData);
filteredCommits = commitData;

// Create the time scale for the slider
timeScale = d3.scaleTime()
  .domain(d3.extent(commitData, d => d.datetime))
  .range([0, 100]);

  function onTimeSliderChange() {
    commitProgress = +document.getElementById("commit-progress").value;
    commitMaxTime = timeScale.invert(commitProgress);
    document.getElementById("commit-time").textContent = commitMaxTime.toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short",
    });
  
    filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  
    updateScatterPlot(data, filteredCommits);
    updateStats(filteredCommits);         
    updateFileDisplay(filteredCommits);   
  }

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
      On ${d.datetime.toLocaleString('en', {
        dateStyle: 'full',
        timeStyle: 'short',
      })},
      I made <a href="${d.url}" target="_blank">${
        i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
      }</a>.
      I edited ${d.totalLines} lines across ${
        d3.rollups(d.lines, (D) => D.length, (d) => d.file).length
      } files.
      Then I looked over all I had made, and I saw that it was very good.
    `
  );

d3.select('#files-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
      After <a href="${d.url}" target="_blank">commit ${d.id.slice(0, 7)}</a>,
      the file structure changed dramatically with ${d.totalLines} lines across ${
        d3.rollups(d.lines, v => v.length, d => d.file).length
      } files.
    `
  );


  function onStepEnter(response) {
    const commit = response.element.__data__;
    commitMaxTime = commit.datetime;
  
    filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
    updateScatterPlot(data, filteredCommits);
    updateStats(filteredCommits);
    updateFileDisplay(filteredCommits);
  }
  
  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
    })
    .onStepEnter(onStepEnter);

    function onFileStepEnter(response) {
      const commit = response.element.__data__;
      commitMaxTime = commit.datetime;
    
      const newFiltered = commits.filter((d) => d.datetime <= commitMaxTime);
      updateFileDisplay(newFiltered);
      updateStats(newFiltered); // optional, if you want synced stats here too
    }
    
    const scroller2 = scrollama();
    scroller2
      .setup({
        container: '#scrolly-2',
        step: '#scrolly-2 .step',
      })
      .onStepEnter(onFileStepEnter);
    
  


