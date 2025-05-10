import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let xScale, yScale, usableArea, commits; // Global scope for shared use

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
    });
}

function renderCommitInfo(data, commits) {
  const dl = d3.select("#stats").append("dl").attr("class", "stats");
  dl.append("dt").html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append("dd").text(data.length);
  dl.append("dt").text("Total commits");
  dl.append("dd").text(commits.length);
  dl.append("dt").text("Files");
  dl.append("dd").text(d3.groups(data, (d) => d.file).length);
  dl.append("dt").text("Max depth");
  dl.append("dd").text(d3.max(data, (d) => d.depth));
  dl.append("dt").text("Longest line");
  dl.append("dd").text(d3.max(data, (d) => d.length));
  const fileLineCounts = d3.rollups(
    data,
    (v) => v.length,
    (d) => d.file,
  );
  dl.append("dt").text("Max lines in file");
  dl.append("dd").text(d3.max(fileLineCounts, (d) => d[1]));
}

function renderTooltipContent(commit) {
  if (!commit) return;
  document.getElementById("commit-link").href = commit.url;
  document.getElementById("commit-link").textContent = commit.id;
  document.getElementById("commit-date").textContent =
    commit.datetime.toLocaleDateString();
  document.getElementById("commit-time").textContent =
    commit.datetime.toLocaleTimeString();
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
    .call(d3.axisBottom(xScale));

  svg
    .append("g")
    .attr("transform", `translate(${usableArea.left}, 0)`)
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, "0") + ":00"),
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
    .data(sortedCommits)
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

// Initial load + render
//
const data = await loadData();
const commitData = processCommits(data);
renderCommitInfo(data, commitData);
renderScatterPlot(data, commitData);
