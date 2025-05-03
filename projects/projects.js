import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projectsContainer = document.querySelector('.projects');
const titleElement = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');

let allProjects = [];
let query = '';
let selectedIndex = -1;

// 🎯 Refactor pie chart rendering to a reusable function
function renderPieChart(projectsGiven) {
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');
  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  if (projectsGiven.length === 0) return;

  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const sliceGenerator = d3.pie().value(d => d.value);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  const rolledData = d3.rollups(
    projectsGiven,
    v => v.length,
    d => d.year
  );

  const data = rolledData.map(([year, count]) => ({
    label: year,
    value: count
  }));

  const arcData = sliceGenerator(data);

  arcData.forEach((d, i) => {
    svg.append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(i))
      .attr('class', selectedIndex === i ? 'selected' : '')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
      
        const visible = allProjects.filter((p) => {
          const matchesSearch = Object.values(p).join('\n').toLowerCase().includes(query.toLowerCase());
          const matchesYear = selectedIndex === -1 || p.year === data[selectedIndex].label;
          return matchesSearch && matchesYear;
        });
      
        renderProjects(visible, projectsContainer, 'h2');
        renderPieChart(allProjects); // ✅ Not 'visible'
      });      
  });

  // Draw legend
  data.forEach((d, i) => {
    legend.append('li')
      .attr('style', `--color:${colors(i)}`)
      .attr('class', `legend-item ${selectedIndex === i ? 'selected' : ''}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;

        const visible = allProjects.filter((p) => {
          const matchesSearch = Object.values(p).join('\n').toLowerCase().includes(query.toLowerCase());
          const matchesYear = selectedIndex === -1 || p.year === d.label;
          return matchesSearch && matchesYear;
        });

        renderProjects(visible, projectsContainer, 'h2');
        renderPieChart(visible);
      });
  });
}


// 🔁 Search event: update query, filter projects, re-render
searchInput.addEventListener('input', (event) => {
  query = event.target.value.toLowerCase();

  const visible = allProjects.filter((p) => {
    const matchesSearch = Object.values(p).join('\n').toLowerCase().includes(query);
    const matchesYear = selectedIndex === -1 || p.year === getSelectedYear();
    return matchesSearch && matchesYear;
  });

  renderProjects(visible, projectsContainer, 'h2');
  renderPieChart(visible);
});

function getSelectedYear() {
  const rolled = d3.rollups(allProjects, v => v.length, d => d.year);
  const data = rolled.map(([year, count]) => ({ label: year, value: count }));
  return selectedIndex !== -1 ? data[selectedIndex].label : null;
}



// 🚀 On page load: fetch data, render projects + chart
fetchJSON('../lib/projects.json').then(projects => {
  allProjects = projects;
  renderProjects(allProjects, projectsContainer, 'h2');
  titleElement.textContent += ` (${projects.length})`;
  renderPieChart(allProjects);
});
